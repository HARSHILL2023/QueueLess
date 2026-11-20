const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { authenticate } = require('../middleware/auth');
const { requireHospitalStaff, requireTokenAccess } = require('../middleware/roles');
const validate = require('../middleware/validate');
const rateLimit = require('../middleware/rateLimiter');
const { bookTokenSchema, callNextSchema, cancelTokenSchema } = require('../validators/queueValidators');

const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many token requests. Please wait before requesting another token.',
});

// Patient endpoints
router.post('/token', authenticate, bookingLimiter, validate(bookTokenSchema), queueController.bookToken);
router.get('/token/active', authenticate, queueController.getActiveToken);
router.get('/token/:id', authenticate, requireTokenAccess, queueController.getTokenById);
router.delete('/token/:id', authenticate, validate(cancelTokenSchema), queueController.cancelToken);
router.get('/history', authenticate, queueController.getHistory);

// Staff endpoints
router.get('/department/:hospitalId/:departmentId', authenticate, requireHospitalStaff, queueController.getDepartmentQueue);
router.post('/call-next', authenticate, requireHospitalStaff, validate(callNextSchema), queueController.callNext);
router.patch('/token/:id/serving', authenticate, requireHospitalStaff, requireTokenAccess, queueController.markServing);
router.patch('/token/:id/completed', authenticate, requireHospitalStaff, requireTokenAccess, queueController.markCompleted);
router.patch('/token/:id/no-show', authenticate, requireHospitalStaff, requireTokenAccess, queueController.markNoShow);
router.get('/status/:hospitalId', authenticate, requireHospitalStaff, queueController.getQueueStatus);

module.exports = router;

