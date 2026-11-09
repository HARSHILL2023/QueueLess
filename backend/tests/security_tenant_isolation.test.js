const request = require('supertest');
const { app } = require('../src/server');
const Hospital = require('../src/models/Hospital');
const Department = require('../src/models/Department');
const User = require('../src/models/User');

const baseHospital = (overrides) => ({
  address: { city: 'Audit City', state: 'Audit State' },
  phone: '1234567890',
  email: 'audit@hospital.test',
  isVerified: true,
  status: 'active',
  ...overrides,
});

describe('Security Audit: hospital tenant isolation (IDOR)', () => {
  let hospitalA;
  let hospitalB;
  let deptA;
  let deptB;
  let staffA;
  let staffB;
  let staffAToken;
  let adminToken;
  let patientToken;
  let tokenInB;

  beforeAll(async () => {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

    hospitalA = await Hospital.create(
      baseHospital({ name: 'Tenant A Hospital', code: `TA${suffix.slice(-6)}` })
    );
    hospitalB = await Hospital.create(
      baseHospital({ name: 'Tenant B Hospital', code: `TB${suffix.slice(-6)}` })
    );

    deptA = await Department.create({
      hospitalId: hospitalA._id,
      name: 'Tenant A Clinic',
      code: 'TENA',
      isActive: true,
    });
    deptB = await Department.create({
      hospitalId: hospitalB._id,
      name: 'Tenant B Clinic',
      code: 'TENB',
      isActive: true,
    });

    staffA = await User.create({
      name: 'Staff A',
      email: `staff_a_${suffix}@tenant.test`,
      password: 'Password123!',
      role: 'staff',
      staffRole: 'doctor',
      hospitalId: hospitalA._id,
      departmentId: deptA._id,
    });
    staffB = await User.create({
      name: 'Staff B',
      email: `staff_b_${suffix}@tenant.test`,
      password: 'Password123!',
      role: 'staff',
      staffRole: 'doctor',
      hospitalId: hospitalB._id,
      departmentId: deptB._id,
    });
    await User.create({
      name: 'Audit Platform Admin',
      email: `admin_${suffix}@tenant.test`,
      password: 'Password123!',
      role: 'admin',
    });

    const login = async (email) => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Password123!' });
      expect(res.statusCode).toBe(200);
      return res.body.data.token;
    };

    staffAToken = await login(staffA.email);
    await login(staffB.email);
    adminToken = await login(`admin_${suffix}@tenant.test`);

    const patientReg = await request(app).post('/api/auth/register').send({
      name: 'Tenant Patient',
      email: `patient_${suffix}@tenant.test`,
      password: 'Password123!',
    });
    expect(patientReg.statusCode).toBe(201);
    patientToken = patientReg.body.data.token;

    const booking = await request(app)
      .post('/api/queue/token')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ hospitalId: hospitalB._id.toString(), departmentId: deptB._id.toString() });
    expect(booking.statusCode).toBe(201);
    tokenInB = booking.body.data.token;
  }, 60000);

  it('staff A cannot read a patient token belonging to hospital B', async () => {
    const res = await request(app)
      .get(`/api/queue/token/${tokenInB._id}`)
      .set('Authorization', `Bearer ${staffAToken}`);

    expect(res.statusCode).toBe(403);
  });

  it('staff A cannot start consultation on a hospital B token', async () => {
    const res = await request(app)
      .patch(`/api/queue/token/${tokenInB._id}/serving`)
      .set('Authorization', `Bearer ${staffAToken}`);

    expect(res.statusCode).toBe(403);
  });

  it('staff A cannot mark a hospital B token as no-show', async () => {
    const res = await request(app)
      .patch(`/api/queue/token/${tokenInB._id}/no-show`)
      .set('Authorization', `Bearer ${staffAToken}`);

    expect(res.statusCode).toBe(403);
  });

  it('staff A cannot list hospital B patients by passing hospitalId in the query', async () => {
    const res = await request(app)
      .get(`/api/staff/patients?hospitalId=${hospitalB._id}`)
      .set('Authorization', `Bearer ${staffAToken}`);

    expect(res.statusCode).toBe(403);
  });

  it('staff A cannot read hospital B queue status', async () => {
    const res = await request(app)
      .get(`/api/queue/status/${hospitalB._id}`)
      .set('Authorization', `Bearer ${staffAToken}`);

    expect(res.statusCode).toBe(403);
  });

  it('staff A cannot update hospital B settings through the :id route', async () => {
    const res = await request(app)
      .patch(`/api/hospitals/${hospitalB._id}/settings`)
      .set('Authorization', `Bearer ${staffAToken}`)
      .send({ openTime: '00:00', closeTime: '23:59' });

    expect(res.statusCode).toBe(403);
  });

  it('staff A cannot update a department that belongs to hospital B', async () => {
    const res = await request(app)
      .patch(`/api/hospitals/${hospitalA._id}/departments/${deptB._id}`)
      .set('Authorization', `Bearer ${staffAToken}`)
      .send({ name: 'Hijacked Department' });

    expect([403, 404]).toContain(res.statusCode);
  });

  it('staff A cannot remove a staff member who belongs to hospital B', async () => {
    const res = await request(app)
      .delete(`/api/staff/hospital/${hospitalA._id}/${staffB._id}`)
      .set('Authorization', `Bearer ${staffAToken}`);

    expect([403, 404]).toContain(res.statusCode);
  });

  it('staff A cannot self-verify or change their hospital status', async () => {
    const res = await request(app)
      .patch(`/api/hospitals/${hospitalA._id}`)
      .set('Authorization', `Bearer ${staffAToken}`)
      .send({ status: 'suspended', isVerified: false });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.isVerified).toBe(true);
  });

  it('staff A can still update their own hospital profile fields', async () => {
    const res = await request(app)
      .patch(`/api/hospitals/${hospitalA._id}`)
      .set('Authorization', `Bearer ${staffAToken}`)
      .send({ description: 'Updated by tenant A staff' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.description).toBe('Updated by tenant A staff');
  });

  it('a platform admin retains cross-tenant read access', async () => {
    const res = await request(app)
      .get(`/api/queue/token/${tokenInB._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.token._id.toString()).toBe(tokenInB._id.toString());
  });

  it('the owning patient can still read their own token', async () => {
    const res = await request(app)
      .get(`/api/queue/token/${tokenInB._id}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.token._id.toString()).toBe(tokenInB._id.toString());
  });
});
