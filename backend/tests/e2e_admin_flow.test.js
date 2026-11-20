const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../src/server');

describe('E2E Audit: Platform Administration, Hospital Verification & Staff Invitations', () => {
  let adminToken = null;
  let newHospitalId = null;
  let newDeptId = null;
  let invitationId = null;

  beforeAll(async () => {
    const User = require('../src/models/User');
    let adminUser = await User.findOne({ email: 'admin@queueless.com' });
    if (!adminUser) {
      await User.create({
        name: 'System Administrator',
        email: 'admin@queueless.com',
        password: 'Password123!',
        role: 'admin',
      });
    }

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@queueless.com', password: 'Password123!' });

    expect(adminLogin.statusCode).toBe(200);
    adminToken = adminLogin.body.data.token;
  });

  it('Step 1: Admin can create a new hospital entity', async () => {
    const code = `ADM${Math.floor(Math.random() * 900 + 100)}`;
    const res = await request(app)
      .post('/api/hospitals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Apex Super Speciality Hub',
        code,
        address: { city: 'Pune', state: 'Maharashtra' },
        phone: '+91 20 2500 0000',
        email: 'info@apexhealthhub.org',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data._id).toBeDefined();
    newHospitalId = res.body.data._id;
  });

  it('Step 2: Admin can verify/approve hospital', async () => {
    const res = await request(app)
      .patch(`/api/admin/hospitals/${newHospitalId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.isVerified).toBe(true);
    expect(res.body.data.status).toBe('active');
  });

  it('Step 3: Admin can create a clinical department in the verified hospital', async () => {
    const res = await request(app)
      .post(`/api/hospitals/${newHospitalId}/departments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Neurology & Brain Spine',
        code: 'NEURO',
        floor: '4th Floor',
        roomNumber: '401',
        avgWaitMinutes: 20,
        maxTokensPerDay: 40,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.name).toBe('Neurology & Brain Spine');
    expect(res.body.data.code).toBe('NEURO');
    newDeptId = res.body.data._id;
  });

  it('Step 4: Admin can generate an invitation for new medical staff', async () => {
    const inviteEmail = `doctor_invite_${Date.now()}@hospital.org`;
    const res = await request(app)
      .post(`/api/staff/hospital/${newHospitalId}/invite`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: inviteEmail,
        departmentId: newDeptId,
        staffRole: 'doctor',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.email).toBe(inviteEmail);
    invitationId = res.body.data._id;
  });

  it('Step 5: Admin can revoke a pending staff invitation', async () => {
    const res = await request(app)
      .delete(`/api/staff/hospital/${newHospitalId}/invite/${invitationId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain('revoked');
  });

  it('Step 6: Admin can access platform-wide analytics', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.totalHospitals).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalUsers).toBeGreaterThanOrEqual(1);
  });
});
