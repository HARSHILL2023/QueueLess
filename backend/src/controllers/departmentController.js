const Department = require('../models/Department');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Token = require('../models/Token');
const Queue = require('../models/Queue');
const { recordActivity } = require('../services/activityLogger');

const getTodayString = () => new Date().toISOString().split('T')[0];

// Fields hospital staff may change on a department. hospitalId and isActive are
// deliberately excluded so a request cannot move a department between tenants or
// silently re-activate an archived one.
const EDITABLE_FIELDS = [
  'name',
  'code',
  'description',
  'floor',
  'roomNumber',
  'avgWaitMinutes',
  'maxTokensPerDay',
];

const ACTIVE_TOKEN_STATUSES = ['waiting', 'called', 'serving'];

/**
 * Count everything that would be affected by removing a department.
 *
 * Tokens and queues are historical records: once a department has issued a
 * single token it must be archived, never deleted, so patient history and
 * reporting stay intact.
 */
const buildDepartmentImpact = async (department) => {
  const today = getTodayString();

  const [doctors, staff, issuedTokens, activeTokens, queueRecords] = await Promise.all([
    Doctor.countDocuments({ departmentId: department._id }),
    User.countDocuments({ departmentId: department._id }),
    Token.countDocuments({ departmentId: department._id }),
    Token.countDocuments({
      departmentId: department._id,
      date: today,
      status: { $in: ACTIVE_TOKEN_STATUSES },
    }),
    Queue.countDocuments({ departmentId: department._id }),
  ]);

  return {
    doctors,
    staff,
    issuedTokens,
    activeTokens,
    queueRecords,
    historicalTokens: issuedTokens - activeTokens,
    references: doctors + staff + issuedTokens + queueRecords,
  };
};

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

    const updates = Object.entries(req.body || {}).reduce((acc, [key, value]) => {
      if (EDITABLE_FIELDS.includes(key)) acc[key] = value;
      return acc;
    }, {});
    if (updates.code) updates.code = String(updates.code).toUpperCase();

    const department = await Department.findOneAndUpdate(
      { _id: departmentId, hospitalId },
      { $set: updates },
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

/**
 * Removal preview used by the confirmation dialog, so staff see exactly what
 * will happen (archive vs permanent delete) before confirming.
 */
const getDepartmentImpact = async (req, res, next) => {
  try {
    const { hospitalId, departmentId } = req.params;
    const department = await Department.findOne({ _id: departmentId, hospitalId });

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const impact = await buildDepartmentImpact(department);

    let recommendedAction = 'delete';
    if (!department.isActive) recommendedAction = 'none';
    else if (impact.activeTokens > 0) recommendedAction = 'blocked';
    else if (impact.references > 0) recommendedAction = 'archive';

    res.json({
      status: 'success',
      data: { department, impact, recommendedAction },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a department.
 *
 * - Refuses while tokens are still active today, so nobody is dropped mid-visit.
 * - Archives (isActive: false) when doctors, staff, tokens or queues reference
 *   it, preserving every historical record.
 * - Permanently deletes only a department no record points at.
 */
const deleteDepartment = async (req, res, next) => {
  try {
    const { hospitalId, departmentId } = req.params;
    const department = await Department.findOne({ _id: departmentId, hospitalId });

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    if (!department.isActive) {
      return res.status(409).json({ error: 'Department is already archived.' });
    }

    const impact = await buildDepartmentImpact(department);

    if (impact.activeTokens > 0) {
      return res.status(409).json({
        error: `Cannot remove ${department.name}: ${impact.activeTokens} token(s) are still active today. Complete or cancel them first.`,
        impact,
      });
    }

    let action = 'archived';

    if (impact.references === 0) {
      const removed = await Department.findOneAndDelete({ _id: department._id, hospitalId });
      if (!removed) {
        return res.status(404).json({ error: 'Department not found' });
      }
      action = 'deleted';
    } else {
      const archived = await Department.findOneAndUpdate(
        { _id: department._id, hospitalId, isActive: true },
        { $set: { isActive: false, archivedAt: new Date() } },
        { new: true }
      );
      if (!archived) {
        return res.status(409).json({ error: 'Department is already archived.' });
      }
    }

    await recordActivity({
      actor: req.user,
      action: action === 'deleted' ? 'department.deleted' : 'department.archived',
      targetType: 'department',
      targetId: department._id,
      targetLabel: `${department.name} (${department.code})`,
      metadata: {
        hospitalId,

        outcome: action,
        doctorRecords: impact.doctors,
        staffRecords: impact.staff,
        visitRecords: impact.issuedTokens,
        queueRecords: impact.queueRecords,
      },
    });

    res.json({
      status: 'success',
      message:
        action === 'deleted'
          ? `${department.name} was permanently deleted.`
          : `${department.name} was archived. Its existing patient visits and records are preserved.`,
      data: { action, departmentId: department._id, impact },
    });
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
    const department = await Department.findOne({ _id: departmentId, hospitalId, isActive: true });
    if (!department) {
      return res.status(404).json({ error: 'Department not found or currently inactive.' });
    }
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
  getDepartmentImpact,
  deleteDepartment,
  getDoctors,
  addDoctor,
  updateDoctor,
  removeDoctor,
};
