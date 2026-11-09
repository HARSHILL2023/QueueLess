const Token = require('../models/Token');
const Queue = require('../models/Queue');
const Department = require('../models/Department');
const {
  getTodayString,
  bookVirtualToken,
  getTokenLiveDetails,
  callNextPatient,
  markTokenServing,
  markTokenCompleted,
  markTokenNoShow,
  cancelPatientToken,
} = require('../services/tokenService');

const bookToken = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const { hospitalId, departmentId, notes } = req.body;

    const result = await bookVirtualToken({
      hospitalId,
      departmentId,
      patient: req.user,
      notes,
      io,
    });

    res.status(201).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...(error.token && { activeToken: error.token }),
      });
    }
    next(error);
  }
};

const getActiveToken = async (req, res, next) => {
  try {
    const today = getTodayString();
    const activeToken = await Token.findOne({
      patientId: req.user._id,
      date: today,
      status: { $in: ['waiting', 'called', 'serving'] },
    })
      .populate('hospitalId', 'name code address phone')
      .populate('departmentId', 'name code floor roomNumber avgWaitMinutes');

    if (!activeToken) {
      return res.json({ status: 'success', data: null });
    }

    const liveDetails = await getTokenLiveDetails(activeToken._id);
    res.json({
      status: 'success',
      data: liveDetails,
    });
  } catch (error) {
    next(error);
  }
};

const getTokenById = async (req, res, next) => {
  try {
    const liveDetails = await getTokenLiveDetails(req.params.id);
    res.json({ status: 'success', data: liveDetails });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

const cancelToken = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const { reason } = req.body;
    const token = await cancelPatientToken({
      tokenId: req.params.id,
      patientId: req.user._id,
      reason,
      io,
    });

    res.json({ status: 'success', data: token });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const tokens = await Token.find({ patientId: req.user._id })
      .populate('hospitalId', 'name code')
      .populate('departmentId', 'name code')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ status: 'success', data: tokens });
  } catch (error) {
    next(error);
  }
};

// Staff endpoint: get active queue for a department today
const getDepartmentQueue = async (req, res, next) => {
  try {
    const { hospitalId, departmentId } = req.params;
    const today = getTodayString();

    const queue = await Queue.findOne({ hospitalId, departmentId, date: today });
    const tokens = await Token.find({
      hospitalId,
      departmentId,
      date: today,
    }).sort({ tokenNumber: 1 });

    const waiting = tokens.filter((t) => t.status === 'waiting');
    const called = tokens.filter((t) => t.status === 'called');
    const serving = tokens.filter((t) => t.status === 'serving');
    const completed = tokens.filter((t) => t.status === 'completed');
    const other = tokens.filter((t) => ['cancelled', 'no-show'].includes(t.status));

    res.json({
      status: 'success',
      data: {
        queue: queue || {
          status: 'active',
          totalIssued: 0,
          currentServingTokenNumber: 0,
          lastCalledTokenNumber: 0,
          totalServed: 0,
        },
        tokens,
        grouped: {
          serving,
          called,
          waiting,
          completed,
          other,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Staff endpoint: call next patient
const callNext = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const { hospitalId, departmentId } = req.body;

    const result = await callNextPatient({ hospitalId, departmentId, io });
    res.json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

// Staff endpoint: mark serving
const markServing = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const token = await markTokenServing({ tokenId: req.params.id, io });
    res.json({ status: 'success', data: token });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

// Staff endpoint: mark completed
const markCompleted = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const { notes } = req.body;
    const token = await markTokenCompleted({ tokenId: req.params.id, notes, io });
    res.json({ status: 'success', data: token });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

// Staff endpoint: mark no-show
const markNoShow = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const token = await markTokenNoShow({ tokenId: req.params.id, io });
    res.json({ status: 'success', data: token });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

// Overview of all queues in a hospital today
const getQueueStatus = async (req, res, next) => {
  try {
    const { hospitalId } = req.params;
    const today = getTodayString();

    const departments = await Department.find({ hospitalId, isActive: true });
    const queues = await Queue.find({ hospitalId, date: today });
    const tokens = await Token.find({ hospitalId, date: today });

    const summary = departments.map((dept) => {
      const q = queues.find((item) => item.departmentId.toString() === dept._id.toString());
      const deptTokens = tokens.filter((t) => t.departmentId.toString() === dept._id.toString());

      return {
        department: {
          _id: dept._id,
          name: dept.name,
          code: dept.code,
          avgWaitMinutes: dept.avgWaitMinutes,
        },
        queue: q || null,
        activeWaiting: deptTokens.filter((t) => t.status === 'waiting').length,
        currentlyServing: deptTokens.find((t) => t.status === 'serving') || null,
        totalIssued: q ? q.totalIssued : 0,
        totalCompleted: deptTokens.filter((t) => t.status === 'completed').length,
      };
    });

    res.json({ status: 'success', data: summary });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  bookToken,
  getActiveToken,
  getTokenById,
  cancelToken,
  getHistory,
  getDepartmentQueue,
  callNext,
  markServing,
  markCompleted,
  markNoShow,
  getQueueStatus,
};
