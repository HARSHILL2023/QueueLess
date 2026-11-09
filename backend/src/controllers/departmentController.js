const Department = require('../models/Department');
const Doctor = require('../models/Doctor');

const getDepartments = async (req, res, next) => {
  try {
    const { hospitalId } = req.params;
    const departments = await Department.find({ hospitalId, isActive: true }).sort({ name: 1 });
    res.json({ status: 'success', data: departments });
  } catch (error) {
    next(error);
  }
};

const getDepartmentById = async (req, res, next) => {
  try {
    const department = await Department.findOne({
      _id: req.params.id,
      hospitalId: req.params.hospitalId,
    });
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    const doctors = await Doctor.find({ departmentId: department._id, isAvailable: true });
    res.json({ status: 'success', data: { ...department.toObject(), doctors } });
  } catch (error) {
    next(error);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const { hospitalId } = req.params;
    const existing = await Department.findOne({
      hospitalId,
      code: req.body.code.toUpperCase(),
    });

    if (existing) {
      return res.status(409).json({ error: `Department code ${req.body.code} already exists in this hospital.` });
    }

    const department = await Department.create({
      ...req.body,
      hospitalId,
      code: req.body.code.toUpperCase(),
    });

    res.status(201).json({ status: 'success', data: department });
  } catch (error) {
    next(error);
  }
};

const updateDepartment = async (req, res, next) => {
  try {
    const { hospitalId, departmentId } = req.params;
    const department = await Department.findOneAndUpdate(
      { _id: departmentId, hospitalId },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json({ status: 'success', data: department });
  } catch (error) {
    next(error);
  }
};

const deleteDepartment = async (req, res, next) => {
  try {
    const { hospitalId, departmentId } = req.params;
    const department = await Department.findOneAndUpdate(
      { _id: departmentId, hospitalId },
      { isActive: false },
      { new: true }
    );

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json({ status: 'success', message: 'Department deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

const getDoctors = async (req, res, next) => {
  try {
    const { hospitalId, departmentId } = req.params;
    const doctors = await Doctor.find({ hospitalId, departmentId }).sort({ name: 1 });
    res.json({ status: 'success', data: doctors });
  } catch (error) {
    next(error);
  }
};

const addDoctor = async (req, res, next) => {
  try {
    const { hospitalId, departmentId } = req.params;
    const doctor = await Doctor.create({
      ...req.body,
      hospitalId,
      departmentId,
    });
    res.status(201).json({ status: 'success', data: doctor });
  } catch (error) {
    next(error);
  }
};

const updateDoctor = async (req, res, next) => {
  try {
    const { hospitalId, departmentId, doctorId } = req.params;
    const doctor = await Doctor.findOneAndUpdate(
      { _id: doctorId, hospitalId, departmentId },
      { $set: req.body },
      { new: true }
    );
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    res.json({ status: 'success', data: doctor });
  } catch (error) {
    next(error);
  }
};

const removeDoctor = async (req, res, next) => {
  try {
    const { hospitalId, departmentId, doctorId } = req.params;
    const doctor = await Doctor.findOneAndDelete({
      _id: doctorId,
      hospitalId,
      departmentId,
    });
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    res.json({ status: 'success', message: 'Doctor removed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDoctors,
  addDoctor,
  updateDoctor,
  removeDoctor,
};

