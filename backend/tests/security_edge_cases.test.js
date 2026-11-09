const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { app } = require('../src/server');
const Hospital = require('../src/models/Hospital');
const Department = require('../src/models/Department');
const { JWT_SECRET } = require('../src/middleware/auth');

describe('Security & Edge Cases Audit: RBAC, Input Validation, Auth Gates', () => {
  let patientToken = null;
  let unverifiedHospital = null;
  let unverifiedDept = null;

  beforeAll(async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Security Subject', email: `sec_patient_${Date.now()}@test.com`, password: 'Password123!' });
    patientToken = reg.body.data.token;

    // Create an unverified hospital to test verification gate
    unverifiedHospital = await Hospital.create({
      name: 'Unverified Clinic',
      code: `UVC${Math.floor(Math.random() * 900)}`,
      address: { city: 'City', state: 'State' },
      phone: '1234567890',
      email: 'uvc@test.com',
      isVerified: false,
      status: 'pending',
    });

    unverifiedDept = await Department.create({
      hospitalId: unverifiedHospital._id,
      name: 'Unverified General',
      code: 'UVGEN',
      isActive: true,
    });
  }, 30000);

  it('1. Unauthenticated request to protected endpoint returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('2. Request with malformed token returns 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token-string-12345');
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toContain('token');
  });

  it('3. Request with expired token returns 401 TOKEN_EXPIRED', async () => {
    const expiredToken = jwt.sign(
      { id: new mongoose.Types.ObjectId(), role: 'patient' },
      JWT_SECRET,
      { expiresIn: '0s' }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
  });

  it('4. Role Restriction: Patient cannot trigger staff queue operations (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/queue/call-next')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        hospitalId: unverifiedHospital._id.toString(),
        departmentId: unverifiedDept._id.toString(),
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toContain('restricted to hospital staff members');
  });

  it('5. Role Restriction: Patient cannot access admin endpoints (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toContain('not authorized');
  });

  it('6. Validation: Registering without email returns 400 with details', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'No Email User', password: 'Password123!' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('7. Validation: Registering with invalid email format returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bad Email', email: 'not-an-email', password: 'Password123!' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('8. Validation: Password shorter than 6 characters returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Short Pass', email: 'pass@test.com', password: '123' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('9. Business Gate: Patient cannot book virtual token in unverified hospital', async () => {
    const res = await request(app)
      .post('/api/queue/token')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        hospitalId: unverifiedHospital._id.toString(),
        departmentId: unverifiedDept._id.toString(),
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('not currently verified');
  });
});
