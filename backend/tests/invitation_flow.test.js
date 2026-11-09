const request = require('supertest');
const { app } = require('../src/server');
const Hospital = require('../src/models/Hospital');
const Department = require('../src/models/Department');
const Invitation = require('../src/models/Invitation');
const User = require('../src/models/User');

describe('E2E Audit: staff invitation acceptance flow', () => {
  let hospital;
  let department;
  let inviterToken;

  const invite = async (email, overrides = {}) => {
    const res = await request(app)
      .post(`/api/staff/hospital/${hospital._id}/invite`)
      .set('Authorization', `Bearer ${inviterToken}`)
      .send({ email, departmentId: department._id.toString(), staffRole: 'doctor', ...overrides });
    expect(res.statusCode).toBe(201);
    return res.body.data;
  };

  beforeAll(async () => {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

    hospital = await Hospital.create({
      name: 'Invitation General Hospital',
      code: `INV${suffix.slice(-6)}`,
      address: { city: 'Invite City', state: 'Invite State' },
      phone: '1234567890',
      email: 'invites@hospital.test',
      isVerified: true,
      status: 'active',
    });

    department = await Department.create({
      hospitalId: hospital._id,
      name: 'Invitation Cardiology',
      code: 'INVC',
      isActive: true,
    });

    await User.create({
      name: 'Inviting Administrator',
      email: `inviter_${suffix}@hospital.test`,
      password: 'Password123!',
      role: 'staff',
      staffRole: 'admin',
      hospitalId: hospital._id,
      departmentId: department._id,
    });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: `inviter_${suffix}@hospital.test`, password: 'Password123!' });
    expect(login.statusCode).toBe(200);
    inviterToken = login.body.data.token;
  }, 60000);

  it('returns a safe invitation preview without authentication', async () => {
    const email = `new_doctor_${Date.now()}@hospital.test`;
    const invitation = await invite(email);

    const res = await request(app).get(`/api/staff/invitations/${invitation.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.email).toBe(email);
    expect(res.body.data.hospitalName).toBe(hospital.name);
    expect(res.body.data.departmentName).toBe(department.name);
    expect(res.body.data.staffRole).toBe('doctor');
    expect(res.body.data.password).toBeUndefined();
    expect(res.body.data.token).toBeUndefined();
  });

  it('creates a staff account, attaches the hospital and lets them sign in', async () => {
    const email = `accepted_doctor_${Date.now()}@hospital.test`;
    const password = 'NewStaffPass123!';
    const invitation = await invite(email);

    const accept = await request(app)
      .post(`/api/staff/invitations/${invitation.token}/accept`)
      .send({ name: 'Dr. Accepted', password });

    expect(accept.statusCode).toBe(201);
    expect(accept.body.data.token).toBeDefined();
    expect(accept.body.data.user.role).toBe('staff');
    expect(accept.body.data.user.staffRole).toBe('doctor');
    expect(accept.body.data.user.hospitalId.toString()).toBe(hospital._id.toString());
    expect(accept.body.data.user.password).toBeUndefined();

    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.statusCode).toBe(200);
    expect(login.body.data.user.role).toBe('staff');

    const staffProfile = await request(app)
      .get('/api/staff/profile')
      .set('Authorization', `Bearer ${login.body.data.token}`);
    expect(staffProfile.statusCode).toBe(200);
    expect(staffProfile.body.data.hospitalId._id.toString()).toBe(hospital._id.toString());
  });

  it('rejects a second acceptance of the same invitation', async () => {
    const email = `double_accept_${Date.now()}@hospital.test`;
    const invitation = await invite(email);

    const first = await request(app)
      .post(`/api/staff/invitations/${invitation.token}/accept`)
      .send({ name: 'First Accept', password: 'Password123!' });
    expect(first.statusCode).toBe(201);

    const second = await request(app)
      .post(`/api/staff/invitations/${invitation.token}/accept`)
      .send({ name: 'Second Accept', password: 'Password123!' });

    expect(second.statusCode).toBe(410);
    expect(second.body.error).toContain('accepted');
  });

  it('rejects and marks an expired invitation', async () => {
    const invitation = await Invitation.create({
      hospitalId: hospital._id,
      departmentId: department._id,
      email: `expired_${Date.now()}@hospital.test`,
      role: 'staff',
      staffRole: 'nurse',
      token: `expired-token-${Date.now()}`,
      expiresAt: new Date(Date.now() - 60 * 1000),
    });

    const preview = await request(app).get(`/api/staff/invitations/${invitation.token}`);
    expect(preview.statusCode).toBe(410);
    expect(preview.body.error).toContain('expired');

    const stored = await Invitation.findById(invitation._id);
    expect(stored.status).toBe('expired');
  });

  it('rejects a revoked invitation', async () => {
    const invitation = await invite(`revoked_${Date.now()}@hospital.test`);

    const revoke = await request(app)
      .delete(`/api/staff/hospital/${hospital._id}/invite/${invitation._id}`)
      .set('Authorization', `Bearer ${inviterToken}`);
    expect(revoke.statusCode).toBe(200);

    const accept = await request(app)
      .post(`/api/staff/invitations/${invitation.token}/accept`)
      .send({ name: 'Revoked User', password: 'Password123!' });

    expect(accept.statusCode).toBe(410);
    expect(accept.body.error).toContain('revoked');
  });

  it('links an existing patient account after verifying their password', async () => {
    const suffix = Date.now();
    const email = `patient_invite_${suffix}@hospital.test`;

    const register = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Existing Patient', email, password: 'Password123!' });
    expect(register.statusCode).toBe(201);

    const invitation = await invite(email);

    const wrongPassword = await request(app)
      .post(`/api/staff/invitations/${invitation.token}/accept`)
      .send({ password: 'WrongPassword123!' });
    expect(wrongPassword.statusCode).toBe(401);
    expect(wrongPassword.body.error).toContain('existing password');

    const accept = await request(app)
      .post(`/api/staff/invitations/${invitation.token}/accept`)
      .send({ password: 'Password123!' });
    expect(accept.statusCode).toBe(200);
    expect(accept.body.data.user.role).toBe('staff');
    expect(accept.body.data.user.hospitalId.toString()).toBe(hospital._id.toString());
  });

  it('requires a name when creating a brand new account', async () => {
    const invitation = await invite(`no_name_${Date.now()}@hospital.test`);

    const accept = await request(app)
      .post(`/api/staff/invitations/${invitation.token}/accept`)
      .send({ password: 'Password123!' });

    expect(accept.statusCode).toBe(400);
    expect(accept.body.error).toContain('Name is required');
  });

  it('returns 404 for an unknown invitation token', async () => {
    const res = await request(app).get('/api/staff/invitations/does-not-exist');
    expect(res.statusCode).toBe(404);
  });
});
