const crypto = require('crypto');
const User = require('../models/User');
const Token = require('../models/Token');
const Queue = require('../models/Queue');
const Invitation = require('../models/Invitation');
const Department = require('../models/Department');
const { getTodayString } = require('../services/tokenService');

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
  revokeInvitation,
  removeStaff,
};

