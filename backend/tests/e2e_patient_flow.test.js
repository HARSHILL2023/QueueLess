const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../src/server');
const Hospital = require('../src/models/Hospital');
const Department = require('../src/models/Department');
const Token = require('../src/models/Token');
const Queue = require('../src/models/Queue');

describe('E2E Audit: Patient Complete Journey', () => {
  let patientToken = null;
  let testHospital = null;
  let testDepartment = null;
  let bookedTokenId = null;

  beforeAll(async () => {
    testHospital = await Hospital.findOne({ isVerified: true, status: 'active' });
    if (!testHospital) {
      testHospital = await Hospital.create({
        name: 'Test General Hospital',
        code: `TGH${Math.floor(Math.random() * 800)}`,
        address: { city: 'AuditCity', state: 'AuditState' },
        phone: '1234567890',
        email: 'tgh@audit.com',
        isVerified: true,
        status: 'active',
      });
    }

    testDepartment = await Department.findOne({ hospitalId: testHospital._id, isActive: true });
    if (!testDepartment) {
      testDepartment = await Department.create({
        hospitalId: testHospital._id,
        name: 'Audit Cardiology',
        code: `AC${Math.floor(Math.random() * 800)}`,
        avgWaitMinutes: 12,
        maxTokensPerDay: 50,
        isActive: true,
      });
    }
  }, 30000);

  const uniqueEmail = `audit_patient_${Date.now()}@test.com`;

  it('Step 1: Patient can register with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Audit Patient',
        email: uniqueEmail,
        password: 'Password123!',
        phone: '+91 9999900001',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(uniqueEmail);
    expect(res.body.data.user.role).toBe('patient');
    expect(res.body.data.user.password).toBeUndefined();
    patientToken = res.body.data.token;
  });

  it('Step 2: Patient can login with registered credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: uniqueEmail,
        password: 'Password123!',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.token).toBeDefined();
    patientToken = res.body.data.token;
  });

  it('Step 3: Patient can access authenticated profile /auth/me', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.email).toBe(uniqueEmail);
  });

  it('Step 4: Patient can discover verified hospitals', async () => {
    const res = await request(app)
      .get('/api/hospitals?verifiedOnly=true')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    const found = res.body.data.find((h) => h._id.toString() === testHospital._id.toString());
    expect(found).toBeDefined();
    expect(found.isVerified).toBe(true);
  });

  it('Step 5: Patient can view hospital details and active departments', async () => {
    const res = await request(app)
      .get(`/api/hospitals/${testHospital._id}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.name).toBe(testHospital.name);
    expect(Array.isArray(res.body.data.departments)).toBe(true);
    expect(res.body.data.departments.length).toBeGreaterThan(0);
  });

  it('Step 6: Patient can book an online virtual token', async () => {
    const res = await request(app)
      .post('/api/queue/token')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        hospitalId: testHospital._id.toString(),
        departmentId: testDepartment._id.toString(),
        notes: 'Follow-up consultation',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.token.tokenNumber).toBeGreaterThan(0);
    expect(res.body.data.token.tokenDisplay).toMatch(new RegExp(`^${testDepartment.code}-\\d{3}$`));
    expect(res.body.data.token.status).toBe('waiting');
    bookedTokenId = res.body.data.token._id;
  });

  it('Step 7: Patient can track live active token position and estimated wait time', async () => {
    const res = await request(app)
      .get('/api/queue/token/active')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).not.toBeNull();
    expect(res.body.data.token._id.toString()).toBe(bookedTokenId.toString());
    expect(res.body.data.positionInQueue).toBeGreaterThanOrEqual(1);
    expect(res.body.data.estimatedWaitMinutes).toBeGreaterThanOrEqual(0);
  });

  it('Step 8: Patient CANNOT book duplicate active token in the same department today', async () => {
    const res = await request(app)
      .post('/api/queue/token')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        hospitalId: testHospital._id.toString(),
        departmentId: testDepartment._id.toString(),
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toContain('already have an active token');
  });

  it('Step 9: Patient can cancel their active token', async () => {
    const res = await request(app)
      .delete(`/api/queue/token/${bookedTokenId}`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ reason: 'Schedule conflict' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
    expect(res.body.data.cancellationReason).toBe('Schedule conflict');
  });

  it('Step 10: After cancellation, active token endpoint returns null', async () => {
    const res = await request(app)
      .get('/api/queue/token/active')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('Step 11: Patient history reflects cancelled token record', async () => {
    const res = await request(app)
      .get('/api/queue/history')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const item = res.body.data.find((t) => t._id.toString() === bookedTokenId.toString());
    expect(item).toBeDefined();
    expect(item.status).toBe('cancelled');
  });
});
