const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../src/server');
const Hospital = require('../src/models/Hospital');
const Department = require('../src/models/Department');
const User = require('../src/models/User');

describe('E2E Audit: Hospital Staff Queue Console & Operations', () => {
  let staffToken = null;
  let patientToken = null;
  let hospital = null;
  let department = null;
  let testToken1Id = null;
  let testToken2Id = null;

  beforeAll(async () => {

    // Ensure hospital and department exist
    hospital = await Hospital.findOne({ isVerified: true, status: 'active' });
    if (!hospital) {
      hospital = await Hospital.create({
        name: 'Metro Care Center',
        code: `MCC${Math.floor(Math.random() * 800)}`,
        address: { city: 'StaffCity', state: 'StaffState' },
        phone: '1234567890',
        email: 'mcc@staff.com',
        isVerified: true,
        status: 'active',
      });
    }

    department = await Department.findOne({ hospitalId: hospital._id, isActive: true });
    if (!department) {
      department = await Department.create({
        hospitalId: hospital._id,
        name: 'Staff Cardiology',
        code: `SC${Math.floor(Math.random() * 800)}`,
        avgWaitMinutes: 15,
        maxTokensPerDay: 100,
        isActive: true,
      });
    }

    // Ensure staff user exists
    let staffUser = await User.findOne({ email: 'staff@hospital.com' });
    if (!staffUser) {
      staffUser = await User.create({
        name: 'Dr. Rajesh Staff',
        email: 'staff@hospital.com',
        password: 'Password123!',
        role: 'staff',
        staffRole: 'doctor',
        hospitalId: hospital._id,
        departmentId: department._id,
      });
    }

    // Login as staff
    const staffLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff@hospital.com', password: 'Password123!' });

    expect(staffLogin.statusCode).toBe(200);
    staffToken = staffLogin.body.data.token;

    // Register a test patient for bookings
    const pEmail = `staff_test_patient_${Date.now()}@test.com`;
    const patientReg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Queue Subject Patient', email: pEmail, password: 'Password123!' });
    patientToken = patientReg.body.data.token;
  });

  it('Step 1: Staff can retrieve live dashboard KPI statistics', async () => {
    const res = await request(app)
      .get('/api/staff/dashboard/stats')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.activeWaiting).toBeDefined();
    expect(res.body.data.currentlyServing).toBeDefined();
    expect(res.body.data.completedToday).toBeDefined();
    expect(res.body.data.estimatedWaitTime).toBeDefined();
  });

  it('Step 2: Patient books a virtual token for staff department', async () => {
    const res = await request(app)
      .post('/api/queue/token')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        hospitalId: hospital._id.toString(),
        departmentId: department._id.toString(),
      });

    expect(res.statusCode).toBe(201);
    testToken1Id = res.body.data.token._id;
  });

  it('Step 3: Staff can inspect department live queue with waiting patient listed', async () => {
    const res = await request(app)
      .get(`/api/queue/department/${hospital._id}/${department._id}`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.queue).toBeDefined();
    expect(Array.isArray(res.body.data.grouped.waiting)).toBe(true);
    const inWaiting = res.body.data.grouped.waiting.find((t) => t._id.toString() === testToken1Id.toString());
    expect(inWaiting).toBeDefined();
  });

  it('Step 4: Staff calls next patient in queue (transition to called)', async () => {
    const res = await request(app)
      .post('/api/queue/call-next')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        hospitalId: hospital._id.toString(),
        departmentId: department._id.toString(),
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.token._id.toString()).toBe(testToken1Id.toString());
    expect(res.body.data.token.status).toBe('called');
  });

  it('Step 5: Staff starts consultation (transition to serving)', async () => {
    const res = await request(app)
      .patch(`/api/queue/token/${testToken1Id}/serving`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('serving');
    expect(res.body.data.servedAt).toBeDefined();
  });

  it('Step 6: Staff completes consultation with clinical notes (transition to completed)', async () => {
    const res = await request(app)
      .patch(`/api/queue/token/${testToken1Id}/completed`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ notes: 'Patient vitals stable, prescribed follow-up medication.' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.notes).toContain('prescribed follow-up');
    expect(res.body.data.completedAt).toBeDefined();
  });

  it('Step 7: Staff marks subsequent non-attending token as no-show', async () => {
    // Register second patient & book
    const p2Email = `staff_test_p2_${Date.now()}@test.com`;
    const p2Res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'NoShow Patient', email: p2Email, password: 'Password123!' });

    const bookRes = await request(app)
      .post('/api/queue/token')
      .set('Authorization', `Bearer ${p2Res.body.data.token}`)
      .send({
        hospitalId: hospital._id.toString(),
        departmentId: department._id.toString(),
      });
    testToken2Id = bookRes.body.data.token._id;

    // Call and then mark no-show
    await request(app)
      .post('/api/queue/call-next')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ hospitalId: hospital._id.toString(), departmentId: department._id.toString() });

    const noShowRes = await request(app)
      .patch(`/api/queue/token/${testToken2Id}/no-show`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(noShowRes.statusCode).toBe(200);
    expect(noShowRes.body.data.status).toBe('no-show');
  });

  it('Step 8: Staff patient directory shows accurate consultation statuses', async () => {
    const res = await request(app)
      .get(`/api/staff/patients?hospitalId=${hospital._id}&departmentId=${department._id}`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    const token1 = res.body.data.find((t) => t._id.toString() === testToken1Id.toString());
    const token2 = res.body.data.find((t) => t._id.toString() === testToken2Id.toString());

    expect(token1.status).toBe('completed');
    expect(token2.status).toBe('no-show');
  });
});
