const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { authenticate } = require('../middleware/auth');
const { authorize, requireHospitalStaff } = require('../middleware/roles');

router.use(authenticate);

// Staff profile
router.get('/profile', authorize('staff', 'admin'), staffController.getProfile);
router.patch('/profile', authorize('staff', 'admin'), staffController.updateProfile);

// Dashboard metrics
router.get('/dashboard/stats', authorize('staff', 'admin'), staffController.getDashboardStats);

// Patients view
router.get('/patients', authorize('staff', 'admin'), staffController.getPatients);

// Staff management
router.get('/hospital/:hospitalId', requireHospitalStaff, staffController.getHospitalStaff);
router.post('/hospital/:hospitalId/invite', requireHospitalStaff, staffController.inviteStaff);
router.delete('/hospital/:hospitalId/invite/:invitationId', requireHospitalStaff, staffController.revokeInvitation);
router.delete('/hospital/:hospitalId/:staffId', requireHospitalStaff, staffController.removeStaff);

module.exports = router;
