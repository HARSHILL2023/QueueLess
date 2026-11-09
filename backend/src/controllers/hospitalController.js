const Hospital = require('../models/Hospital');
const Department = require('../models/Department');

const getHospitals = async (req, res, next) => {
  try {
    const { city, search, verifiedOnly = 'true' } = req.query;
    const query = {};

    if (verifiedOnly === 'true') {
      query.isVerified = true;
      query.status = 'active';
    }

    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { code: new RegExp(search, 'i') },
        { 'address.city': new RegExp(search, 'i') },
      ];
    }

    const hospitals = await Hospital.find(query).sort({ name: 1 });
    res.json({ status: 'success', data: hospitals });
  } catch (error) {
    next(error);
  }
};

const getHospitalById = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    // Attach active departments
    const departments = await Department.find({ hospitalId: hospital._id, isActive: true });

    res.json({
      status: 'success',
      data: {
        ...hospital.toObject(),
        departments,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createHospital = async (req, res, next) => {
  try {
    const existing = await Hospital.findOne({ code: req.body.code.toUpperCase() });
    if (existing) {
      return res.status(409).json({ error: `Hospital with code ${req.body.code} already exists.` });
    }

    const hospital = await Hospital.create({
      ...req.body,
      code: req.body.code.toUpperCase(),
      isVerified: req.user.role === 'admin',
    });

    res.status(201).json({ status: 'success', data: hospital });
  } catch (error) {
    next(error);
  }
};

const updateHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    res.json({ status: 'success', data: hospital });
  } catch (error) {
    next(error);
  }
};

const getHospitalSettings = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id).select('settings name code');
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    res.json({ status: 'success', data: hospital.settings });
  } catch (error) {
    next(error);
  }
};

const updateHospitalSettings = async (req, res, next) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { $set: { settings: req.body } },
      { new: true }
    );
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    res.json({ status: 'success', data: hospital.settings });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHospitals,
  getHospitalById,
  createHospital,
  updateHospital,
  getHospitalSettings,
  updateHospitalSettings,
};
