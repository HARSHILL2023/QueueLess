const Hospital = require('../models/Hospital');
const User = require('../models/User');
const Token = require('../models/Token');
const { getTodayString } = require('../services/tokenService');

const getPendingHospitals = async (req, res, next) => {
  try {
    const hospitals = await Hospital.find({ isVerified: false });
    res.json({ status: 'success', data: hospitals });
  } catch (error) {
    next(error);
  }
};

const approveHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { isVerified: true, status: 'active' },
      { new: true }
    );
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    res.json({ status: 'success', data: hospital });
  } catch (error) {
    next(error);
  }
};

const rejectHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { isVerified: false, status: 'suspended' },
      { new: true }
    );
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    res.json({ status: 'success', data: hospital });
  } catch (error) {
    next(error);
  }
};

const getAllHospitals = async (req, res, next) => {
  try {
    const hospitals = await Hospital.find().sort({ createdAt: -1 });
    res.json({ status: 'success', data: hospitals });
  } catch (error) {
    next(error);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const today = getTodayString();
    const [totalHospitals, totalUsers, totalTokensToday, completedTokensToday] = await Promise.all([
      Hospital.countDocuments(),
      User.countDocuments(),
      Token.countDocuments({ date: today }),
      Token.countDocuments({ date: today, status: 'completed' }),
    ]);

    res.json({
      status: 'success',
      data: {
        totalHospitals,
        totalUsers,
        totalTokensToday,
        completedTokensToday,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPendingHospitals,
  approveHospital,
  rejectHospital,
  getAllHospitals,
  getAnalytics,
};
