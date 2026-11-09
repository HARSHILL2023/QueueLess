const Token = require('../models/Token');

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
 * Ensure a staff member only acts on their own hospital. Admins bypass the check.
 */
const ensureHospital = (req, res, hospitalId) => {
  if (isPlatformAdmin(req) || !hospitalId) {
    return true;
  }

  if (!req.user.hospitalId || req.user.hospitalId.toString() !== hospitalId.toString()) {
    res.status(403).json({ error: 'Unauthorized: You do not belong to this hospital.' });
    return false;
  }

  return true;
};

// Check if staff belongs to the specified hospital or is a platform admin.
// Reads the hospital id from the :hospitalId route param, body or query.
const requireHospitalStaff = (req, res, next) => {
  if (!ensureStaffRole(req, res)) return;

  // Express 5 leaves req.body undefined for PATCH requests without a payload,
  // which previously crashed "Start Consultation" and "Mark No-Show".
  const hospitalId = req.params.hospitalId || req.body?.hospitalId || req.query?.hospitalId;
  if (!ensureHospital(req, res, hospitalId)) return;

  next();
};

// Same rule, but for routes that expose the hospital as a named route param
// (for example /api/hospitals/:id/settings).
const requireHospitalScope = (paramName = 'hospitalId') => {
  return (req, res, next) => {
    if (!ensureStaffRole(req, res)) return;
    if (!ensureHospital(req, res, req.params[paramName])) return;
    next();
  };
};

/**
 * Token-level authorization: a platform admin may read any token, hospital
 * staff may only access tokens from their own hospital, and a patient may only
 * access their own token.
 */
const requireTokenAccess = async (req, res, next) => {
  try {
    const token = await Token.findById(req.params.id).select('hospitalId patientId');

    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    if (isPlatformAdmin(req)) {
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
  authorize,
  requireHospitalStaff,
  requireHospitalScope,
  requireTokenAccess,
};
