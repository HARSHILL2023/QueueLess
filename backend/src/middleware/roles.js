const mongoose = require('mongoose');
const Token = require('../models/Token');
const Hospital = require('../models/Hospital');

// Header a global staff client uses to name the hospital it is currently
// managing. It is never trusted on its own: every value is validated here and
// the controllers always query with the validated id.
const HOSPITAL_HEADER = 'x-hospital-id';

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden. Role '${req.user.role}' is not authorized to access this resource.`,
      });
    }

    next();
  };
};

const isPlatformAdmin = (req) => req.user?.role === 'admin';

/**
 * Staff account holding the global permission. Deliberately scoped to
 * role 'staff': the flag can never turn an account into a platform admin.
 */
const isGlobalStaff = (req) => req.user?.role === 'staff' && req.user?.isGlobalStaff === true;

/**
 * Hospital id supplied by the client, if any: route param first, then body,
 * query and finally the selected-hospital header.
 */
const requestedHospitalId = (req) =>
  req.params?.hospitalId ||
  req.body?.hospitalId ||
  req.query?.hospitalId ||
  req.headers?.[HOSPITAL_HEADER] ||
  null;

/**
 * Ensure the request belongs to a staff member (or a platform admin).
 * Returns true when the caller may continue.
 */
const ensureStaffRole = (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return false;
  }

  if (isPlatformAdmin(req)) {
    return true;
  }

  if (req.user.role !== 'staff') {
    res.status(403).json({ error: 'Access restricted to hospital staff members.' });
    return false;
  }

  return true;
};

/**
 * Ensure a staff member only acts on their own hospital. Admins and global
 * staff bypass the ownership check; global staff still get the id validated by
 * assertHospitalExists() in the middlewares below.
 */
const ensureHospital = (req, res, hospitalId) => {
  if (isPlatformAdmin(req) || !hospitalId) {
    return true;
  }

  if (isGlobalStaff(req)) {
    return true;
  }

  if (!req.user.hospitalId || req.user.hospitalId.toString() !== hospitalId.toString()) {
    res.status(403).json({ error: 'Unauthorized: You do not belong to this hospital.' });
    return false;
  }

  return true;
};

/**
 * Validate a hospital id supplied by a privileged caller (platform admin or
 * global staff) and remember it on the request. Malformed ids are rejected
 * instead of reaching a Mongoose cast error, and unknown ids resolve to 404.
 */
const assertHospitalExists = async (req, res, hospitalId) => {
  if (!hospitalId) return true;

  const id = String(hospitalId);
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: 'Invalid hospital id.' });
    return false;
  }

  const exists = await Hospital.exists({ _id: id });
  if (!exists) {
    res.status(404).json({ error: 'Hospital not found.' });
    return false;
  }

  req.selectedHospitalId = id;
  return true;
};

/**
 * Middleware for staff routers: validates a hospital supplied by a platform
 * admin or global staff account and exposes it as req.selectedHospitalId.
 * Normal staff are untouched here; their ownership checks stay in the guards.
 */
const resolveHospitalContext = async (req, res, next) => {
  try {
    if (!isPlatformAdmin(req) && !isGlobalStaff(req)) {
      return next();
    }

    const hospitalId = requestedHospitalId(req);
    if (!hospitalId) {
      // Fall back to the account's own hospital so a global staff member who
      // has not picked one yet still gets a consistent, valid context.
      if (req.user.role === 'staff' && req.user.hospitalId) {
        req.selectedHospitalId = req.user.hospitalId.toString();
      }
      return next();
    }

    if (!(await assertHospitalExists(req, res, hospitalId))) return;
    next();
  } catch (error) {
    next(error);
  }
};

// Check if staff belongs to the specified hospital or is a platform admin.
// Reads the hospital id from the :hospitalId route param, body or query.
const requireHospitalStaff = async (req, res, next) => {
  try {
    if (!ensureStaffRole(req, res)) return;

    // Express 5 leaves req.body undefined for PATCH requests without a payload,
    // which previously crashed "Start Consultation" and "Mark No-Show".
    const hospitalId = requestedHospitalId(req);
    if (!ensureHospital(req, res, hospitalId)) return;

    if ((isPlatformAdmin(req) || isGlobalStaff(req)) && hospitalId) {
      if (!(await assertHospitalExists(req, res, hospitalId))) return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Same rule, but for routes that expose the hospital as a named route param
// (for example /api/hospitals/:id/settings).
const requireHospitalScope = (paramName = 'hospitalId') => {
  return async (req, res, next) => {
    try {
      if (!ensureStaffRole(req, res)) return;

      const hospitalId = req.params[paramName];
      if (!ensureHospital(req, res, hospitalId)) return;

      if ((isPlatformAdmin(req) || isGlobalStaff(req)) && hospitalId) {
        if (!(await assertHospitalExists(req, res, hospitalId))) return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Token-level authorization: a platform admin may read any token, global staff
 * may access any token (their selected hospital must match when they named
 * one), hospital staff may only access tokens from their own hospital, and a
 * patient may only access their own token.
 */
const requireTokenAccess = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid token id.' });
    }

    const token = await Token.findById(req.params.id).select('hospitalId patientId');

    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    if (isPlatformAdmin(req)) {
      return next();
    }

    if (isGlobalStaff(req)) {
      const contextId = req.selectedHospitalId || req.headers?.[HOSPITAL_HEADER];
      if (
        contextId &&
        mongoose.isValidObjectId(String(contextId)) &&
        token.hospitalId.toString() !== String(contextId)
      ) {
        return res.status(403).json({ error: 'Unauthorized: This token belongs to another hospital.' });
      }

      return next();
    }

    if (req.user.role === 'staff') {
      if (req.user.hospitalId && token.hospitalId.toString() === req.user.hospitalId.toString()) {
        return next();
      }

      return res.status(403).json({ error: 'Unauthorized: This token belongs to another hospital.' });
    }

    if (token.patientId.toString() === req.user._id.toString()) {
      return next();
    }

    return res.status(403).json({ error: 'Unauthorized: You do not own this token.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  HOSPITAL_HEADER,
  authorize,
  isPlatformAdmin,
  isGlobalStaff,
  requestedHospitalId,
  resolveHospitalContext,
  requireHospitalStaff,
  requireHospitalScope,
  requireTokenAccess,
};
