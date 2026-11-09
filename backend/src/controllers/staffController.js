const crypto = require('crypto');
const User = require('../models/User');
const Token = require('../models/Token');
const Queue = require('../models/Queue');
const Hospital = require('../models/Hospital');
const Invitation = require('../models/Invitation');
const Department = require('../models/Department');
const { getTodayString } = require('../services/tokenService');
const { generateTokens } = require('./authController');

const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('hospitalId', 'name code address status isVerified settings')
      .populate('departmentId', 'name code floor roomNumber avgWaitMinutes');
    res.json({ status: 'success', data: user });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { name, phone } },
      { new: true }
    );
    res.json({ status: 'success', data: user });
  } catch (error) {
    next(error);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const hospitalId = req.user.hospitalId;
    const departmentId = req.user.departmentId;
    const today = getTodayString();

    const query = { date: today };
    if (hospitalId) query.hospitalId = hospitalId;
    if (departmentId) query.departmentId = departmentId;

    const tokensToday = await Token.find(query);

    const activeWaiting = tokensToday.filter((t) => t.status === 'waiting').length;
    const currentlyServing = tokensToday.filter((t) => t.status === 'serving').length;
    const completedToday = tokensToday.filter((t) => t.status === 'completed').length;
    const calledCount = tokensToday.filter((t) => t.status === 'called').length;

    let avgWaitTime = 15;
    if (departmentId) {
      const dept = await Department.findById(departmentId);
      if (dept) avgWaitTime = dept.avgWaitMinutes;
    }
    const estimatedTotalWaitMinutes = activeWaiting * avgWaitTime;

    res.json({
      status: 'success',
      data: {
        activeWaiting,
        currentlyServing,
        completedToday,
        calledCount,
        totalTokensToday: tokensToday.length,
        estimatedWaitTime: estimatedTotalWaitMinutes,
        avgConsultationMinutes: avgWaitTime,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getPatients = async (req, res, next) => {
  try {
    const { hospitalId, departmentId, search, status, date } = req.query;
    const query = {};

    // Staff can only read patients from their own hospital. Platform admins may
    // query a specific hospital, or all hospitals when none is supplied.
    if (req.user.role === 'admin') {
      if (hospitalId) query.hospitalId = hospitalId;
    } else {
      if (!req.user.hospitalId) {
        return res.status(403).json({ error: 'No hospital is assigned to your staff account.' });
      }

      if (hospitalId && hospitalId.toString() !== req.user.hospitalId.toString()) {
        return res.status(403).json({ error: 'Unauthorized: You do not belong to this hospital.' });
      }

      query.hospitalId = req.user.hospitalId;
    }

    if (departmentId) query.departmentId = departmentId;

    query.date = date || getTodayString();

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { patientName: new RegExp(search, 'i') },
        { tokenDisplay: new RegExp(search, 'i') },
        { patientPhone: new RegExp(search, 'i') },
      ];
    }

    const tokens = await Token.find(query)
      .populate('departmentId', 'name code')
      .populate('patientId', 'email phone')
      .sort({ tokenNumber: 1 });

    res.json({ status: 'success', data: tokens });
  } catch (error) {
    next(error);
  }
};

const getHospitalStaff = async (req, res, next) => {
  try {
    const { hospitalId } = req.params;
    const staff = await User.find({ hospitalId, role: 'staff' })
      .populate('departmentId', 'name code')
      .sort({ createdAt: -1 });

    const invitations = await Invitation.find({ hospitalId, status: 'pending' })
      .populate('departmentId', 'name code')
      .sort({ createdAt: -1 });

    res.json({
      status: 'success',
      data: {
        staff,
        invitations,
      },
    });
  } catch (error) {
    next(error);
  }
};

const inviteStaff = async (req, res, next) => {
  try {
    const { hospitalId } = req.params;
    const { email, departmentId, staffRole = 'staff', role = 'staff' } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.hospitalId) {
      return res.status(409).json({ error: 'This user is already associated with a hospital.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await Invitation.create({
      hospitalId,
      departmentId: departmentId || null,
      email: email.toLowerCase(),
      role,
      staffRole,
      token,
      expiresAt,
    });

    res.status(201).json({
      status: 'success',
      message: 'Invitation generated successfully',
      data: invitation,
    });
  } catch (error) {
    next(error);
  }
};

const findPendingInvitation = async (token) => {
  const invitation = await Invitation.findOne({ token: String(token) });

  if (!invitation) {
    return { error: { statusCode: 404, message: 'Invitation not found.' } };
  }

  if (invitation.status === 'pending' && invitation.expiresAt.getTime() <= Date.now()) {
    invitation.status = 'expired';
    await invitation.save();
  }

  if (invitation.status !== 'pending') {
    return { error: { statusCode: 410, message: `Invitation is ${invitation.status}.` } };
  }

  return { invitation };
};

const getInvitation = async (req, res, next) => {
  try {
    const { invitation, error } = await findPendingInvitation(req.params.token);
    if (error) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    const [hospital, department] = await Promise.all([
      Hospital.findById(invitation.hospitalId).select('name code'),
      invitation.departmentId
        ? Department.findById(invitation.departmentId).select('name code floor roomNumber')
        : null,
    ]);

    res.json({
      status: 'success',
      data: {
        email: invitation.email,
        role: invitation.role,
        staffRole: invitation.staffRole,
        hospitalId: invitation.hospitalId,
        hospitalName: hospital?.name || '',
        hospitalCode: hospital?.code || '',
        departmentId: invitation.departmentId,
        departmentName: department?.name || '',
        departmentCode: department?.code || '',
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

const acceptInvitation = async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const { invitation, error } = await findPendingInvitation(req.params.token);

    if (error) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    const existingUser = await User.findOne({ email: invitation.email }).select('+password');
    let user;
    let created = false;

    if (existingUser) {
      if (existingUser.role === 'admin') {
        return res.status(409).json({ error: 'This email belongs to a platform administrator.' });
      }

      if (
        existingUser.role === 'staff' &&
        existingUser.hospitalId &&
        existingUser.hospitalId.toString() !== invitation.hospitalId.toString()
      ) {
        return res.status(409).json({ error: 'This account is already associated with another hospital.' });
      }

      const passwordMatches = await existingUser.comparePassword(password);
      if (!passwordMatches) {
        return res.status(401).json({
          error: 'An account already exists for this email. Enter your existing password.',
        });
      }

      user = existingUser;
      if (name) user.name = name;
    } else {
      if (!name) {
        return res.status(400).json({ error: 'Name is required to create a staff account.' });
      }

      user = new User({
        name,
        email: invitation.email,
        password,
        role: 'staff',
        hospitalId: invitation.hospitalId,
        departmentId: invitation.departmentId,
        staffRole: invitation.staffRole,
        isVerified: true,
      });
      created = true;
    }

    user.role = 'staff';
    user.hospitalId = invitation.hospitalId;
    user.departmentId = invitation.departmentId;
    user.staffRole = invitation.staffRole;
    user.isVerified = true;

    const tokens = generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    invitation.status = 'accepted';
    await invitation.save();

    // Any other outstanding invitation for this email/hospital is now stale.
    await Invitation.updateMany(
      { email: invitation.email, hospitalId: invitation.hospitalId, status: 'pending', _id: { $ne: invitation._id } },
      { status: 'revoked' }
    );

    res.status(created ? 201 : 200).json({
      status: 'success',
      data: {
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        user: user.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

const revokeInvitation = async (req, res, next) => {
  try {
    const { hospitalId, invitationId } = req.params;
    const invitation = await Invitation.findOneAndUpdate(
      { _id: invitationId, hospitalId },
      { status: 'revoked' },
      { new: true }
    );

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found for this hospital.' });
    }

    res.json({ status: 'success', message: 'Invitation revoked' });
  } catch (error) {
    next(error);
  }
};

const removeStaff = async (req, res, next) => {
  try {
    const { hospitalId, staffId } = req.params;
    const staff = await User.findOneAndUpdate(
      { _id: staffId, hospitalId, role: 'staff' },
      {
        hospitalId: null,
        departmentId: null,
        role: 'patient',
        staffRole: null,
      },
      { new: true }
    );

    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found for this hospital.' });
    }

    res.json({ status: 'success', message: 'Staff member removed from hospital' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getDashboardStats,
  getPatients,
  getHospitalStaff,
  inviteStaff,
  getInvitation,
  acceptInvitation,
  revokeInvitation,
  removeStaff,
};

