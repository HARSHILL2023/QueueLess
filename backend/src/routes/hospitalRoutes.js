const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const departmentController = require('../controllers/departmentController');
const { authenticate } = require('../middleware/auth');
const { authorize, requireHospitalStaff, requireHospitalScope } = require('../middleware/roles');
const validate = require('../middleware/validate');
const { createHospitalSchema, createDepartmentSchema } = require('../validators/hospitalValidators');

// Public / Patient endpoints
router.get('/', hospitalController.getHospitals);
router.get('/:id', hospitalController.getHospitalById);

// Hospital settings
router.get('/:id/settings', authenticate, requireHospitalScope('id'), hospitalController.getHospitalSettings);
router.patch('/:id/settings', authenticate, requireHospitalScope('id'), hospitalController.updateHospitalSettings);

// Hospital CRUD
router.post('/', authenticate, authorize('admin'), validate(createHospitalSchema), hospitalController.createHospital);
router.patch('/:id', authenticate, requireHospitalScope('id'), hospitalController.updateHospital);

// Department endpoints nested under /hospitals/:hospitalId/departments
router.get('/:hospitalId/departments', departmentController.getDepartments);
router.get('/:hospitalId/departments/:id', departmentController.getDepartmentById);
router.post(
  '/:hospitalId/departments',
  authenticate,
  requireHospitalStaff,
  validate(createDepartmentSchema),
  departmentController.createDepartment
);
router.patch('/:hospitalId/departments/:departmentId', authenticate, requireHospitalStaff, departmentController.updateDepartment);
router.delete('/:hospitalId/departments/:departmentId', authenticate, requireHospitalStaff, departmentController.deleteDepartment);

// Doctor endpoints nested under department
router.get('/:hospitalId/departments/:departmentId/doctors', departmentController.getDoctors);
router.post('/:hospitalId/departments/:departmentId/doctors', authenticate, requireHospitalStaff, departmentController.addDoctor);
router.patch('/:hospitalId/departments/:departmentId/doctors/:doctorId', authenticate, requireHospitalStaff, departmentController.updateDoctor);
router.delete('/:hospitalId/departments/:departmentId/doctors/:doctorId', authenticate, requireHospitalStaff, departmentController.removeDoctor);

module.exports = router;

