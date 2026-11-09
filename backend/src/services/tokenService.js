const mongoose = require('mongoose');
const Queue = require('../models/Queue');
const Token = require('../models/Token');
const Hospital = require('../models/Hospital');
const Department = require('../models/Department');
const { emitQueueUpdate, emitTokenUpdate } = require('./socketService');

const getTodayString = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

/**
 * Atomically book a virtual token for a patient
 */
const bookVirtualToken = async ({ hospitalId, departmentId, patient, notes, io }) => {
  const today = getTodayString();

  // 1. Verify Hospital
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    throw { statusCode: 404, message: 'Hospital not found' };
  }
  if (!hospital.isVerified || hospital.status !== 'active') {
    throw { statusCode: 400, message: 'Hospital is not currently verified or active for online tokens.' };
  }

  // 2. Verify Department
  const department = await Department.findOne({ _id: departmentId, hospitalId, isActive: true });
  if (!department) {
    throw { statusCode: 404, message: 'Department not found or currently inactive.' };
  }

  // 3. Prevent duplicate active booking in the same department today
  const existingActiveToken = await Token.findOne({
    hospitalId,
    departmentId,
    patientId: patient._id,
    date: today,
    status: { $in: ['waiting', 'called', 'serving'] },
  });

  if (existingActiveToken) {
    throw {
      statusCode: 409,
      message: `You already have an active token (${existingActiveToken.tokenDisplay}) in this department today.`,
      token: existingActiveToken,
    };
  }

  // 4. Concurrency-Safe Atomic Token Sequence via findOneAndUpdate on Queue
  const queue = await Queue.findOneAndUpdate(
    { hospitalId, departmentId, date: today },
    {
      $inc: { totalIssued: 1 },
      $setOnInsert: {
        status: 'active',
        currentServingTokenNumber: 0,
        lastCalledTokenNumber: 0,
        totalServed: 0,
        totalCancelled: 0,
        totalNoShow: 0,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (queue.status === 'closed') {
    throw { statusCode: 400, message: 'Queue for this department is currently closed today.' };
  }

  const tokenNumber = queue.totalIssued;
  const tokenDisplay = `${department.code}-${String(tokenNumber).padStart(3, '0')}`;

  // 5. Calculate waiting tokens ahead and estimated wait minutes
  const waitingAheadCount = await Token.countDocuments({
    queueId: queue._id,
    status: { $in: ['waiting', 'called'] },
  });

  const estimatedWaitMinutes = Math.max(0, waitingAheadCount * (department.avgWaitMinutes || 15));

  // 6. Create Token record
  const token = await Token.create({
    tokenNumber,
    tokenDisplay,
    hospitalId,
    departmentId,
    queueId: queue._id,
    patientId: patient._id,
    patientName: patient.name,
    patientPhone: patient.phone || '',
    date: today,
    status: 'waiting',
    estimatedWaitMinutes,
    notes: notes || '',
  });

  // 7. Realtime Notification
  if (io) {
    emitQueueUpdate(io, departmentId.toString(), {
      type: 'TOKEN_BOOKED',
      tokenNumber,
      tokenDisplay,
      totalIssued: queue.totalIssued,
      waitingCount: waitingAheadCount + 1,
    });
    emitTokenUpdate(io, patient._id.toString(), {
      type: 'TOKEN_CREATED',
      token,
      positionInQueue: waitingAheadCount + 1,
      estimatedWaitMinutes,
    });
  }

  return {
    token,
    positionInQueue: waitingAheadCount + 1,
    estimatedWaitMinutes,
  };
};

/**
 * Get real-time status of a token, including live queue position and wait time
 */
const getTokenLiveDetails = async (tokenId) => {
  const token = await Token.findById(tokenId)
    .populate('hospitalId', 'name code address phone')
    .populate('departmentId', 'name code floor roomNumber avgWaitMinutes');

  if (!token) {
    throw { statusCode: 404, message: 'Token not found' };
  }

  if (['completed', 'cancelled', 'no-show'].includes(token.status)) {
    return {
      token,
      positionInQueue: 0,
      estimatedWaitMinutes: 0,
    };
  }

  // Count active tokens ahead in the same queue
  const aheadCount = await Token.countDocuments({
    queueId: token.queueId,
    status: { $in: ['waiting', 'called', 'serving'] },
    tokenNumber: { $lt: token.tokenNumber },
  });

  const avgTime = token.departmentId?.avgWaitMinutes || 15;
  const estimatedWaitMinutes = token.status === 'serving' ? 0 : Math.max(1, aheadCount * avgTime);

  return {
    token,
    positionInQueue: token.status === 'serving' ? 0 : aheadCount + 1,
    estimatedWaitMinutes,
  };
};

/**
 * Call the next waiting patient in the department queue
 */
const callNextPatient = async ({ hospitalId, departmentId, io }) => {
  const today = getTodayString();

  // Find next waiting token
  const nextToken = await Token.findOne({
    hospitalId,
    departmentId,
    date: today,
    status: 'waiting',
  }).sort({ tokenNumber: 1 });

  if (!nextToken) {
    return { message: 'No waiting patients in queue.', token: null };
  }

  // Mark token as called
  nextToken.status = 'called';
  nextToken.calledAt = new Date();
  await nextToken.save();

  // Update Queue state
  await Queue.findOneAndUpdate(
    { hospitalId, departmentId, date: today },
    { lastCalledTokenNumber: nextToken.tokenNumber }
  );

  // Broadcast
  if (io) {
    emitQueueUpdate(io, departmentId.toString(), {
      type: 'TOKEN_CALLED',
      token: nextToken,
    });
    emitTokenUpdate(io, nextToken.patientId.toString(), {
      type: 'YOU_ARE_CALLED',
      token: nextToken,
    });
  }

  return {
    message: `Token ${nextToken.tokenDisplay} called successfully`,
    token: nextToken,
  };
};

/**
 * Mark token as currently being served
 */
const markTokenServing = async ({ tokenId, io }) => {
  const token = await Token.findById(tokenId);
  if (!token) {
    throw { statusCode: 404, message: 'Token not found' };
  }

  token.status = 'serving';
  token.servedAt = new Date();
  await token.save();

  // Update Queue
  await Queue.findByIdAndUpdate(token.queueId, {
    currentServingTokenNumber: token.tokenNumber,
    currentServingTokenId: token._id,
  });

  if (io) {
    emitQueueUpdate(io, token.departmentId.toString(), {
      type: 'TOKEN_SERVING',
      token,
    });
    emitTokenUpdate(io, token.patientId.toString(), {
      type: 'NOW_SERVING',
      token,
    });
  }

  return token;
};

/**
 * Mark token as completed
 */
const markTokenCompleted = async ({ tokenId, notes, io }) => {
  const token = await Token.findById(tokenId);
  if (!token) {
    throw { statusCode: 404, message: 'Token not found' };
  }

  token.status = 'completed';
  token.completedAt = new Date();
  if (notes) token.notes = notes;
  await token.save();

  await Queue.findByIdAndUpdate(token.queueId, {
    $inc: { totalServed: 1 },
    $unset: token.tokenNumber === token.queueId?.currentServingTokenNumber ? { currentServingTokenId: '' } : {},
  });

  if (io) {
    emitQueueUpdate(io, token.departmentId.toString(), {
      type: 'TOKEN_COMPLETED',
      token,
    });
    emitTokenUpdate(io, token.patientId.toString(), {
      type: 'COMPLETED',
      token,
    });
  }

  return token;
};

/**
 * Mark token as no-show
 */
const markTokenNoShow = async ({ tokenId, io }) => {
  const token = await Token.findById(tokenId);
  if (!token) {
    throw { statusCode: 404, message: 'Token not found' };
  }

  token.status = 'no-show';
  await token.save();

  await Queue.findByIdAndUpdate(token.queueId, {
    $inc: { totalNoShow: 1 },
  });

  if (io) {
    emitQueueUpdate(io, token.departmentId.toString(), {
      type: 'TOKEN_NO_SHOW',
      token,
    });
    emitTokenUpdate(io, token.patientId.toString(), {
      type: 'NO_SHOW',
      token,
    });
  }

  return token;
};

/**
 * Cancel token by patient
 */
const cancelPatientToken = async ({ tokenId, patientId, reason, io }) => {
  const token = await Token.findOne({ _id: tokenId, patientId });
  if (!token) {
    throw { statusCode: 404, message: 'Active token not found or not owned by you.' };
  }

  if (['completed', 'cancelled', 'no-show'].includes(token.status)) {
    throw { statusCode: 400, message: `Token is already ${token.status}` };
  }

  token.status = 'cancelled';
  token.cancelledAt = new Date();
  token.cancellationReason = reason || 'Cancelled by patient';
  await token.save();

  await Queue.findByIdAndUpdate(token.queueId, {
    $inc: { totalCancelled: 1 },
  });

  if (io) {
    emitQueueUpdate(io, token.departmentId.toString(), {
      type: 'TOKEN_CANCELLED',
      token,
    });
    emitTokenUpdate(io, patientId.toString(), {
      type: 'CANCELLED',
      token,
    });
  }

  return token;
};

module.exports = {
  getTodayString,
  bookVirtualToken,
  getTokenLiveDetails,
  callNextPatient,
  markTokenServing,
  markTokenCompleted,
  markTokenNoShow,
  cancelPatientToken,
};
