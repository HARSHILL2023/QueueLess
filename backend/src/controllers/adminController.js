const mongoose = require('mongoose');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Department = require('../models/Department');
const Doctor = require('../models/Doctor');
const Token = require('../models/Token');
const ActivityLog = require('../models/ActivityLog');
const { getTodayString } = require('../services/tokenService');
const { recordActivity } = require('../services/activityLogger');

const TOKEN_STATUSES = ['waiting', 'called', 'serving', 'completed', 'cancelled', 'no-show'];

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePaging = (query, defaultLimit = 25) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

const pagination = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.max(1, Math.ceil(total / limit)),
});

const parseDays = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 30;
  return Math.min(180, Math.max(7, parsed));
};

const dateKey = (date) => new Date(date).toISOString().split('T')[0];

const buildLabelRange = (days) => {
  const labels = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - offset);
    labels.push(dateKey(day));
  }
  return labels;
};

const hospitalStatusQuery = (status) => {
  switch (status) {
    case 'pending':
      return { $or: [{ status: 'pending' }, { isVerified: false }] };
    case 'active':
      return { status: 'active', isVerified: true };
    case 'suspended':
      return { status: 'suspended' };
    default:
      return {};
  }
};

const toNumberMap = (rows, key = '_id') =>
  rows.reduce((acc, row) => {
    if (row[key] !== null && row[key] !== undefined) acc[row[key].toString()] = row;
    return acc;
  }, {});

/**
 * GET /api/admin/overview
 * Platform-wide headline numbers, time series and per-hospital/department activity.
 */
const getOverview = async (req, res, next) => {
  try {
    const days = parseDays(req.query.days);
    const labels = buildLabelRange(days);
    const sinceStr = labels[0];
    const today = getTodayString();

    const [
      totalHospitals,
      activeHospitals,
      pendingHospitals,
      suspendedHospitals,
      totalDepartments,
      totalDoctors,
      userBreakdown,
      tokenBreakdown,
      tokenSeries,
      patientSeries,
      hospitalSeries,
      hospitalActivity,
      departmentActivity,
    ] = await Promise.all([
      Hospital.countDocuments(),
      Hospital.countDocuments({ status: 'active', isVerified: true }),
      Hospital.countDocuments({ $or: [{ status: 'pending' }, { isVerified: false }] }),
      Hospital.countDocuments({ status: 'suspended' }),
      Department.countDocuments(),
      Doctor.countDocuments(),
      User.aggregate([
        { $group: { _id: { role: '$role', staffRole: '$staffRole', status: '$status' }, count: { $sum: 1 } } },
      ]),
      Token.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Token.aggregate([
        { $match: { date: { $gte: sinceStr } } },
        {
          $group: {
            _id: '$date',
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            noShow: { $sum: { $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0] } },
          },
        },
      ]),
      User.aggregate([
        { $match: { role: 'patient', createdAt: { $gte: new Date(`${sinceStr}T00:00:00.000Z`) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
      ]),
      Hospital.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
      ]),
      Token.aggregate([
        {
          $group: {
            _id: '$hospitalId',
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            noShow: { $sum: { $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0] } },
            waiting: { $sum: { $cond: [{ $eq: ['$status', 'waiting'] }, 1, 0] } },
            serving: { $sum: { $cond: [{ $in: ['$status', ['called', 'serving']] }, 1, 0] } },
            today: { $sum: { $cond: [{ $eq: ['$date', today] }, 1, 0] } },
            lastActivity: { $max: '$createdAt' },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'hospitals',
            localField: '_id',
            foreignField: '_id',
            as: 'hospital',
          },
        },
        { $unwind: { path: '$hospital', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            hospitalId: '$_id',
            name: { $ifNull: ['$hospital.name', 'Unknown hospital'] },
            code: { $ifNull: ['$hospital.code', '—'] },
            city: { $ifNull: ['$hospital.address.city', ''] },
            status: { $ifNull: ['$hospital.status', 'unknown'] },
            total: 1,
            completed: 1,
            cancelled: 1,
            noShow: 1,
            waiting: 1,
            serving: 1,
            today: 1,
            lastActivity: 1,
          },
        },
      ]),
      Token.aggregate([
        {
          $group: {
            _id: { departmentId: '$departmentId', hospitalId: '$hospitalId' },
            total: { $sum: 1 },
            waiting: { $sum: { $cond: [{ $eq: ['$status', 'waiting'] }, 1, 0] } },
            serving: { $sum: { $cond: [{ $in: ['$status', ['called', 'serving']] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            noShow: { $sum: { $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0] } },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 50 },
        {
          $lookup: {
            from: 'departments',
            localField: '_id.departmentId',
            foreignField: '_id',
            as: 'department',
          },
        },
        {
          $lookup: {
            from: 'hospitals',
            localField: '_id.hospitalId',
            foreignField: '_id',
            as: 'hospital',
          },
        },
        { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$hospital', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            departmentId: '$_id.departmentId',
            hospitalId: '$_id.hospitalId',
            name: { $ifNull: ['$department.name', 'Unknown department'] },
            code: { $ifNull: ['$department.code', '—'] },
            hospitalName: { $ifNull: ['$hospital.name', 'Unknown hospital'] },
            total: 1,
            waiting: 1,
            serving: 1,
            completed: 1,
            cancelled: 1,
            noShow: 1,
          },
        },
      ]),
    ]);

    const users = userBreakdown.reduce(
      (acc, row) => {
        const role = row._id.role || 'patient';
        const staffRole = row._id.staffRole || null;
        if (role === 'patient') acc.patients += row.count;
        if (role === 'staff' && staffRole === 'admin') acc.hospitalAdmins += row.count;
        if (role === 'staff' && staffRole !== 'admin') acc.staff += row.count;
        if (role === 'admin') acc.platformAdmins += row.count;
        if (row._id.status === 'suspended') acc.suspended += row.count;
        return acc;
      },
      { patients: 0, staff: 0, hospitalAdmins: 0, platformAdmins: 0, suspended: 0 }
    );

    const tokens = TOKEN_STATUSES.reduce((acc, status) => {
      const row = tokenBreakdown.find((item) => item._id === status);
      acc[status] = row ? row.count : 0;
      return acc;
    }, {});
    tokens.total = TOKEN_STATUSES.reduce((sum, status) => sum + tokens[status], 0);

    const series = {
      labels,
      patientRegistrations: labels.map(
        (label) => patientSeries.find((row) => row._id === label)?.count || 0
      ),
      tokensGenerated: labels.map(
        (label) => tokenSeries.find((row) => row._id === label)?.total || 0
      ),
      completedTokens: labels.map(
        (label) => tokenSeries.find((row) => row._id === label)?.completed || 0
      ),
      cancelledTokens: labels.map(
        (label) => tokenSeries.find((row) => row._id === label)?.cancelled || 0
      ),
      noShowTokens: labels.map(
        (label) => tokenSeries.find((row) => row._id === label)?.noShow || 0
      ),
    };

    let running = 0;
    const hospitalsPerDay = labels.map((label) => {
      const row = hospitalSeries.find((item) => item._id === label);
      return row ? row.count : 0;
    });
    const beforeWindow = hospitalSeries
      .filter((row) => row._id && row._id < sinceStr)
      .reduce((sum, row) => sum + row.count, 0);
    running = beforeWindow + hospitalSeries.filter((row) => !row._id).length * 0;
    series.hospitalGrowth = hospitalsPerDay.map((count) => {
      running += count;
      return running;
    });

    res.json({
      status: 'success',
      data: {
        windowDays: days,
        generatedAt: new Date().toISOString(),
        stats: {
          totalHospitals,
          activeHospitals,
          pendingHospitals,
          suspendedHospitals,
          totalDepartments,
          totalDoctors,
          totalPatients: users.patients,
          totalStaff: users.staff,
          totalHospitalAdmins: users.hospitalAdmins,
          totalPlatformAdmins: users.platformAdmins,
          suspendedAccounts: users.suspended,
          totalTokens: tokens.total,
          completedTokens: tokens.completed,
          cancelledTokens: tokens.cancelled,
          noShowTokens: tokens['no-show'],
          waitingTokens: tokens.waiting,
          servingTokens: tokens.serving + tokens.called,
        },
        series,
        hospitalActivity,
        departmentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/analytics (existing endpoint, kept for compatibility)
 */
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
      data: { totalHospitals, totalUsers, totalTokensToday, completedTokensToday },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/hospitals
 * Paginated, searchable hospital register with per-hospital counters.
 */
const getHospitals = async (req, res, next) => {
  try {
    const { search, status, city, sort = 'newest' } = req.query;
    const { page, limit, skip } = parsePaging(req.query);

    const query = { ...hospitalStatusQuery(status) };

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$and = [
        ...(query.$and || []),
        { $or: [{ name: regex }, { code: regex }, { email: regex }, { 'address.city': regex }] },
      ];
    }

    if (city) query['address.city'] = new RegExp(escapeRegex(city), 'i');

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name: { name: 1 },
    };

    const [hospitals, total] = await Promise.all([
      Hospital.find(query)
        .sort(sortMap[sort] || sortMap.newest)
        .skip(skip)
        .limit(limit),
      Hospital.countDocuments(query),
    ]);

    const hospitalIds = hospitals.map((hospital) => hospital._id);
    const today = getTodayString();

    const [departmentCounts, doctorCounts, staffCounts, tokenCounts] = await Promise.all([
      Department.aggregate([
        { $match: { hospitalId: { $in: hospitalIds } } },
        { $group: { _id: '$hospitalId', count: { $sum: 1 } } },
      ]),
      Doctor.aggregate([
        { $match: { hospitalId: { $in: hospitalIds } } },
        { $group: { _id: '$hospitalId', count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { hospitalId: { $in: hospitalIds } } },
        {
          $group: {
            _id: '$hospitalId',
            staff: { $sum: { $cond: [{ $ne: ['$staffRole', 'admin'] }, 1, 0] } },
            admins: { $sum: { $cond: [{ $eq: ['$staffRole', 'admin'] }, 1, 0] } },
          },
        },
      ]),
      Token.aggregate([
        { $match: { hospitalId: { $in: hospitalIds } } },
        {
          $group: {
            _id: '$hospitalId',
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            noShow: { $sum: { $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0] } },
            waiting: { $sum: { $cond: [{ $eq: ['$status', 'waiting'] }, 1, 0] } },
            today: { $sum: { $cond: [{ $eq: ['$date', today] }, 1, 0] } },
            lastActivity: { $max: '$createdAt' },
          },
        },
      ]),
    ]);

    const departmentsMap = toNumberMap(departmentCounts);
    const doctorsMap = toNumberMap(doctorCounts);
    const staffMap = toNumberMap(staffCounts);
    const tokensMap = toNumberMap(tokenCounts);

    const items = hospitals.map((hospital) => {
      const id = hospital._id.toString();
      const tokens = tokensMap[id] || {};
      return {
        ...hospital.toObject(),
        counts: {
          departments: departmentsMap[id]?.count || 0,
          doctors: doctorsMap[id]?.count || 0,
          staff: staffMap[id]?.staff || 0,
          admins: staffMap[id]?.admins || 0,
          totalTokens: tokens.total || 0,
          completedTokens: tokens.completed || 0,
          cancelledTokens: tokens.cancelled || 0,
          noShowTokens: tokens.noShow || 0,
          waitingTokens: tokens.waiting || 0,
          tokensToday: tokens.today || 0,
          lastActivity: tokens.lastActivity || null,
        },
      };
    });

    res.json({ status: 'success', data: { items, pagination: pagination(page, limit, total) } });
  } catch (error) {
    next(error);
  }
};

const getPendingHospitals = async (req, res, next) => {
  try {
    const hospitals = await Hospital.find({ isVerified: false }).sort({ createdAt: 1 });
    res.json({ status: 'success', data: hospitals });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/hospitals/:id
 * Complete hospital profile used by the hospital detail page.
 */
const getHospitalDetails = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid hospital id.' });
    }

    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    const hospitalId = hospital._id;
    const today = getTodayString();

    const [
      departments,
      doctors,
      admins,
      staff,
      tokenBreakdown,
      departmentActivity,
      recentTokens,
      patientActivity,
    ] = await Promise.all([
      Department.find({ hospitalId }).sort({ name: 1 }),
      Doctor.find({ hospitalId }).populate('departmentId', 'name code').sort({ name: 1 }),
      User.find({ hospitalId, role: 'staff', staffRole: 'admin' })
        .populate('departmentId', 'name code')
        .sort({ name: 1 }),
      User.find({ hospitalId, role: 'staff', staffRole: { $ne: 'admin' } })
        .populate('departmentId', 'name code')
        .sort({ name: 1 }),
      Token.aggregate([
        { $match: { hospitalId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            today: { $sum: { $cond: [{ $eq: ['$date', today] }, 1, 0] } },
          },
        },
      ]),
      Token.aggregate([
        { $match: { hospitalId } },
        {
          $group: {
            _id: '$departmentId',
            total: { $sum: 1 },
            waiting: { $sum: { $cond: [{ $eq: ['$status', 'waiting'] }, 1, 0] } },
            serving: { $sum: { $cond: [{ $in: ['$status', ['called', 'serving']] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            noShow: { $sum: { $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0] } },
            today: { $sum: { $cond: [{ $eq: ['$date', today] }, 1, 0] } },
          },
        },
      ]),
      Token.find({ hospitalId })
        .select('-notes')
        .populate('departmentId', 'name code')
        .populate('patientId', 'name email phone')
        .sort({ createdAt: -1 })
        .limit(25),
      Token.aggregate([
        { $match: { hospitalId } },
        {
          $group: {
            _id: '$patientId',
            tokens: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            lastVisit: { $max: '$createdAt' },
          },
        },
        { $sort: { lastVisit: -1 } },
        { $limit: 50 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'patient' } },
        { $unwind: { path: '$patient', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            patientId: '$_id',
            name: { $ifNull: ['$patient.name', 'Unknown patient'] },
            email: { $ifNull: ['$patient.email', ''] },
            phone: { $ifNull: ['$patient.phone', ''] },
            status: { $ifNull: ['$patient.status', 'active'] },
            tokens: 1,
            completed: 1,
            lastVisit: 1,
          },
        },
      ]),
    ]);

    const tokenStats = TOKEN_STATUSES.reduce((acc, status) => {
      const row = tokenBreakdown.find((item) => item._id === status);
      acc[status] = row ? row.count : 0;
      return acc;
    }, {});
    tokenStats.total = TOKEN_STATUSES.reduce((sum, status) => sum + tokenStats[status], 0);
    tokenStats.today = tokenBreakdown.reduce((sum, row) => sum + row.today, 0);

    const departmentMap = toNumberMap(departmentActivity);
    const departmentsWithStats = departments.map((department) => {
      const stats = departmentMap[department._id.toString()] || {};
      return {
        ...department.toObject(),
        stats: {
          total: stats.total || 0,
          waiting: stats.waiting || 0,
          serving: stats.serving || 0,
          completed: stats.completed || 0,
          cancelled: stats.cancelled || 0,
          noShow: stats.noShow || 0,
          today: stats.today || 0,
        },
      };
    });

    res.json({
      status: 'success',
      data: {
        hospital: hospital.toObject(),
        stats: tokenStats,
        departments: departmentsWithStats,
        doctors,
        admins,
        staff,
        patients: patientActivity,
        recentTokens,
      },
    });
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

    await recordActivity({
      actor: req.user,
      action: 'hospital.approved',
      targetType: 'hospital',
      targetId: hospital._id,
      targetLabel: `${hospital.name} (${hospital.code})`,
    });

    res.json({ status: 'success', data: hospital });
  } catch (error) {
    next(error);
  }
};

const rejectHospital = async (req, res, next) => {
  try {
    const { reason } = req.body || {};

    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { isVerified: false, status: 'suspended' },
      { new: true }
    );

    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    await recordActivity({
      actor: req.user,
      action: 'hospital.rejected',
      targetType: 'hospital',
      targetId: hospital._id,
      targetLabel: `${hospital.name} (${hospital.code})`,
      metadata: { reason: reason || '' },
    });

    res.json({ status: 'success', data: hospital });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/hospitals/:id/status
 * Activate or suspend a hospital. Nothing is ever deleted.
 */
const setHospitalStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;

    const updates =
      status === 'active'
        ? { status: 'active', isVerified: true }
        : { status: 'suspended' };

    const hospital = await Hospital.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    await recordActivity({
      actor: req.user,
      action: status === 'active' ? 'hospital.activated' : 'hospital.suspended',
      targetType: 'hospital',
      targetId: hospital._id,
      targetLabel: `${hospital.name} (${hospital.code})`,
      metadata: { reason: reason || '' },
    });

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

/**
 * GET /api/admin/patients
 * Patient directory with aggregate token counters. Token notes are never read.
 */
const getPatients = async (req, res, next) => {
  try {
    const { search, status, sort = 'newest' } = req.query;
    const { page, limit, skip } = parsePaging(req.query);

    const match = { role: 'patient' };

    if (status === 'active') match.status = { $ne: 'suspended' };
    if (status === 'suspended') match.status = 'suspended';

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      match.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name: { name: 1 },
    };

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'tokens',
          let: { patientId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$patientId', '$$patientId'] } } },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                noShow: { $sum: { $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0] } },
                lastActivity: { $max: '$createdAt' },
              },
            },
          ],
          as: 'tokenStats',
        },
      },
      {
        $addFields: {
          tokenStats: { $ifNull: [{ $arrayElemAt: ['$tokenStats', 0] }, {}] },
        },
      },
      {
        $project: {
          password: 0,
          refreshToken: 0,
          __v: 0,
        },
      },
      { $sort: sortMap[sort] || sortMap.newest },
      { $skip: skip },
      { $limit: limit },
    ];

    const [rows, total] = await Promise.all([
      User.aggregate(pipeline),
      User.countDocuments(match),
    ]);

    const items = rows.map((row) => ({
      _id: row._id,
      name: row.name,
      email: row.email,
      phone: row.phone || '',
      status: row.status || 'active',
      isVerified: row.isVerified,
      createdAt: row.createdAt,
      lastLoginAt: row.lastLoginAt || null,
      stats: {
        totalTokens: row.tokenStats.total || 0,
        completedTokens: row.tokenStats.completed || 0,
        cancelledTokens: row.tokenStats.cancelled || 0,
        noShowTokens: row.tokenStats.noShow || 0,
        lastActivity: row.tokenStats.lastActivity || null,
      },
    }));

    res.json({ status: 'success', data: { items, pagination: pagination(page, limit, total) } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/patients/:id
 * Profile, visit history and hospital/department breakdown for one patient.
 */
const getPatientDetails = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid patient id.' });
    }

    const patient = await User.findOne({ _id: req.params.id, role: 'patient' });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patientId = patient._id;

    const [tokens, tokenBreakdown, hospitalsVisited, departmentVisits] = await Promise.all([
      Token.find({ patientId })
        .select('-notes')
        .populate('hospitalId', 'name code address.city')
        .populate('departmentId', 'name code')
        .sort({ createdAt: -1 })
        .limit(50),
      Token.aggregate([
        { $match: { patientId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Token.aggregate([
        { $match: { patientId } },
        {
          $group: {
            _id: '$hospitalId',
            tokens: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            lastVisit: { $max: '$createdAt' },
          },
        },
        { $sort: { lastVisit: -1 } },
        { $lookup: { from: 'hospitals', localField: '_id', foreignField: '_id', as: 'hospital' } },
        { $unwind: { path: '$hospital', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            hospitalId: '$_id',
            name: { $ifNull: ['$hospital.name', 'Unknown hospital'] },
            code: { $ifNull: ['$hospital.code', '—'] },
            city: { $ifNull: ['$hospital.address.city', ''] },
            tokens: 1,
            completed: 1,
            lastVisit: 1,
          },
        },
      ]),
      Token.aggregate([
        { $match: { patientId } },
        {
          $group: {
            _id: { departmentId: '$departmentId', hospitalId: '$hospitalId' },
            tokens: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            lastVisit: { $max: '$createdAt' },
          },
        },
        { $sort: { tokens: -1 } },
        {
          $lookup: {
            from: 'departments',
            localField: '_id.departmentId',
            foreignField: '_id',
            as: 'department',
          },
        },
        { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            departmentId: '$_id.departmentId',
            name: { $ifNull: ['$department.name', 'Unknown department'] },
            code: { $ifNull: ['$department.code', '—'] },
            tokens: 1,
            completed: 1,
            lastVisit: 1,
          },
        },
      ]),
    ]);

    const stats = TOKEN_STATUSES.reduce((acc, status) => {
      const row = tokenBreakdown.find((item) => item._id === status);
      acc[status] = row ? row.count : 0;
      return acc;
    }, {});
    stats.total = TOKEN_STATUSES.reduce((sum, status) => sum + stats[status], 0);

    res.json({
      status: 'success',
      data: {
        patient: patient.toJSON(),
        stats,
        tokens,
        hospitalsVisited,
        departmentVisits,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/staff
 * All hospital staff and hospital administrators across the platform.
 */
const getStaff = async (req, res, next) => {
  try {
    const { search, role, hospitalId, status, sort = 'newest' } = req.query;
    const { page, limit, skip } = parsePaging(req.query);

    const query = { role: 'staff' };

    if (role === 'admin') query.staffRole = 'admin';
    if (role === 'staff') query.staffRole = { $ne: 'admin' };
    if (hospitalId && mongoose.isValidObjectId(hospitalId)) query.hospitalId = hospitalId;
    if (status === 'active') query.status = { $ne: 'suspended' };
    if (status === 'suspended') query.status = 'suspended';

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name: { name: 1 },
    };

    const [staff, total] = await Promise.all([
      User.find(query)
        .populate('hospitalId', 'name code address.city status')
        .populate('departmentId', 'name code')
        .sort(sortMap[sort] || sortMap.newest)
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    const items = staff.map((member) => {
      const user = member.toJSON();
      return {
        ...user,
        staffRole: user.staffRole || 'staff',
        status: user.status || 'active',
        hospitalName: user.hospitalId?.name || '',
        hospitalCode: user.hospitalId?.code || '',
        departmentName: user.departmentId?.name || '',
      };
    });

    res.json({ status: 'success', data: { items, pagination: pagination(page, limit, total) } });
  } catch (error) {
    next(error);
  }
};

const getStaffDetails = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid staff id.' });
    }

    const member = await User.findOne({ _id: req.params.id, role: 'staff' })
      .populate('hospitalId', 'name code address city status isVerified settings')
      .populate('departmentId', 'name code floor roomNumber avgWaitMinutes');

    if (!member) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const tokensHandled =
      member.hospitalId && member.departmentId
        ? await Token.countDocuments({
            hospitalId: member.hospitalId._id || member.hospitalId,
            departmentId: member.departmentId._id || member.departmentId,
            status: 'completed',
          })
        : 0;

    res.json({
      status: 'success',
      data: {
        staff: member.toJSON(),
        staffRole: member.staffRole || 'staff',
        completedTokensInDepartment: tokensHandled,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/users/:id/status
 * Suspend or reactivate a patient or staff account.
 * Platform administrator accounts cannot be suspended from here, and an admin
 * can never suspend their own account.
 */
const setUserStatus = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }

    const { status, reason } = req.body;

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot change the status of your own account.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        error: 'Platform administrator accounts cannot be suspended from the dashboard.',
      });
    }

    if (status === 'suspended') {
      user.status = 'suspended';
      user.suspendedReason = reason || '';
      user.suspendedAt = new Date();
      // Force a fresh login after reactivation.
      user.refreshToken = null;
    } else {
      user.status = 'active';
      user.suspendedReason = '';
      user.suspendedAt = null;
    }

    await user.save();

    await recordActivity({
      actor: req.user,
      action: status === 'suspended' ? 'user.suspended' : 'user.reactivated',
      targetType: 'user',
      targetId: user._id,
      targetLabel: `${user.name} (${user.email})`,
      metadata: { role: user.role, staffRole: user.staffRole || null, reason: reason || '' },
    });

    res.json({ status: 'success', data: user.toJSON() });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/activity
 */
const getActivity = async (req, res, next) => {
  try {
    const { action, targetType, search } = req.query;
    const { page, limit, skip } = parsePaging(req.query, 30);

    const query = {};
    if (action) query.action = action;
    if (targetType) query.targetType = targetType;
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ actorName: regex }, { actorEmail: regex }, { targetLabel: regex }];
    }

    const [items, total] = await Promise.all([
      ActivityLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ActivityLog.countDocuments(query),
    ]);

    res.json({ status: 'success', data: { items, pagination: pagination(page, limit, total) } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview,
  getAnalytics,
  getHospitals,
  getPendingHospitals,
  getHospitalDetails,
  getAllHospitals,
  approveHospital,
  rejectHospital,
  setHospitalStatus,
  getPatients,
  getPatientDetails,
  getStaff,
  getStaffDetails,
  setUserStatus,
  getActivity,
};
