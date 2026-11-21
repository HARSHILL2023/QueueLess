const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const hospitalController = require('../controllers/hospitalController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const validate = require('../middleware/validate');
const { createHospitalSchema } = require('../validators/hospitalValidators');
const {
  hospitalStatusSchema,
  rejectHospitalSchema,
  userStatusSchema,
} = require('../validators/adminValidators');

// Every route in this router requires an authenticated platform administrator.
router.use(authenticate, authorize('admin'));

// Platform overview & analytics
router.get('/overview', adminController.getOverview);
router.get('/analytics', adminController.getAnalytics);

// Hospital register
router.get('/hospitals', adminController.getHospitals);
router.get('/hospitals/pending', adminController.getPendingHospitals);
router.get('/hospitals/:id', adminController.getHospitalDetails);

// Hospital lifecycle (approval, rejection, activation, suspension)
router.post('/hospitals', validate(createHospitalSchema), hospitalController.createHospital);
router.patch('/hospitals/:id/approve', adminController.approveHospital);
router.patch('/hospitals/:id/reject', validate(rejectHospitalSchema), adminController.rejectHospital);
router.patch('/hospitals/:id/status', validate(hospitalStatusSchema), adminController.setHospitalStatus);

// Patients
router.get('/patients', adminController.getPatients);
router.get('/patients/:id', adminController.getPatientDetails);

// Hospital staff and hospital administrators
router.get('/staff', adminController.getStaff);
router.get('/staff/:id', adminController.getStaffDetails);

// Account lifecycle (patients and staff only)
router.patch('/users/:id/status', validate(userStatusSchema), adminController.setUserStatus);

// Audit trail
router.get('/activity', adminController.getActivity);

module.exports = router;
