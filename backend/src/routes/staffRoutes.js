const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { authenticate } = require('../middleware/auth');
const { authorize, requireHospitalStaff } = require('../middleware/roles');
const validate = require('../middleware/validate');
const rateLimit = require('../middleware/rateLimiter');
const { acceptInvitationSchema } = require('../validators/authValidators');

const invitationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many invitation attempts. Please try again after 15 minutes.',
});

// Public invitation endpoints (the invitation token is the credential)
router.get('/invitations/:token', invitationLimiter, staffController.getInvitation);
router.post(
  '/invitations/:token/accept',
  invitationLimiter,
  validate(acceptInvitationSchema),
  staffController.acceptInvitation
);

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

