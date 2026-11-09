const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

router.use(authenticate, authorize('admin'));

router.get('/hospitals/pending', adminController.getPendingHospitals);
router.patch('/hospitals/:id/approve', adminController.approveHospital);
router.patch('/hospitals/:id/reject', adminController.rejectHospital);
router.get('/hospitals', adminController.getAllHospitals);
router.get('/analytics', adminController.getAnalytics);

module.exports = router;
