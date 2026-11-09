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

// Check if staff belongs to the specified hospital or is a platform admin
const requireHospitalStaff = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role === 'admin') {
    return next();
  }

  if (req.user.role !== 'staff') {
    return res.status(403).json({ error: 'Access restricted to hospital staff members.' });
  }

  // Express 5 leaves req.body undefined for PATCH requests without a payload,
  // which previously crashed "Start Consultation" and "Mark No-Show".
  const hospitalId = req.params.hospitalId || req.body?.hospitalId || req.query?.hospitalId;
  if (hospitalId && req.user.hospitalId && req.user.hospitalId.toString() !== hospitalId.toString()) {
    return res.status(403).json({ error: 'Unauthorized: You do not belong to this hospital.' });
  }

  next();
};

module.exports = { authorize, requireHospitalStaff };

