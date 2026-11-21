const request = require('supertest');
const { app } = require('../src/server');
const Hospital = require('../src/models/Hospital');
const Department = require('../src/models/Department');
const User = require('../src/models/User');

describe('Platform administration API', () => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const adminEmail = `platform_admin_${suffix}@queueless.test`;
  const staffEmail = `ward_staff_${suffix}@queueless.test`;
  const hospitalAdminEmail = `hospital_admin_${suffix}@queueless.test`;
  const patientEmail = `platform_patient_${suffix}@queueless.test`;

  let adminToken = null;
  let staffToken = null;
  let patientToken = null;
  let patientId = null;
  let hospital = null;
  let pendingHospital = null;
  let department = null;
  let completedTokenId = null;

  beforeAll(async () => {
    await User.create({
      name: 'Platform Owner',
      email: adminEmail,
      password: 'Password123!',
      role: 'admin',
      isVerified: true,
    });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'Password123!' });
    expect(adminLogin.statusCode).toBe(200);
    adminToken = adminLogin.body.data.token;

    hospital = await Hospital.create({
      name: 'Admin Audit Hospital',
      code: `AA${Math.floor(Math.random() * 100000)}`.slice(0, 10),
      address: { city: 'Audit City', state: 'Audit State' },
      phone: '1234567890',
      email: `audit_hospital_${suffix}@test.com`,
      isVerified: true,
      status: 'active',
    });

    pendingHospital = await Hospital.create({
      name: 'Pending Approval Hospital',
      code: `PA${Math.floor(Math.random() * 100000)}`.slice(0, 10),
      address: { city: 'Pending City', state: 'Pending State' },
      phone: '1234567891',
      email: `pending_hospital_${suffix}@test.com`,
      isVerified: false,
      status: 'pending',
    });

    department = await Department.create({
      hospitalId: hospital._id,
      name: 'Audit Medicine',
      code: 'AUD',
      avgWaitMinutes: 10,
      maxTokensPerDay: 50,
      isActive: true,
    });

    await User.create({
      name: 'Ward Staff',
      email: staffEmail,
      password: 'Password123!',
      role: 'staff',
      staffRole: 'doctor',
      hospitalId: hospital._id,
      departmentId: department._id,
      isVerified: true,
    });

    await User.create({
      name: 'Hospital Administrator',
      email: hospitalAdminEmail,
      password: 'Password123!',
      role: 'staff',
      staffRole: 'admin',
      hospitalId: hospital._id,
      departmentId: department._id,
      isVerified: true,
    });

    const staffLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: staffEmail, password: 'Password123!' });
    staffToken = staffLogin.body.data.token;

    const registration = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Platform Patient', email: patientEmail, password: 'Password123!' });
    expect(registration.statusCode).toBe(201);
    patientToken = registration.body.data.token;
    patientId = registration.body.data.user._id;

    const booking = await request(app)
      .post('/api/queue/token')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        hospitalId: hospital._id.toString(),
        departmentId: department._id.toString(),
      });
    expect(booking.statusCode).toBe(201);
    completedTokenId = booking.body.data.token._id;

    await request(app)
      .post('/api/queue/call-next')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ hospitalId: hospital._id.toString(), departmentId: department._id.toString() });

    const completion = await request(app)
      .patch(`/api/queue/token/${completedTokenId}/completed`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(completion.statusCode).toBe(200);
  });

  describe('authorization', () => {
    it('rejects anonymous access with 401', async () => {
      const res = await request(app).get('/api/admin/overview');
      expect(res.statusCode).toBe(401);
    });

    it('rejects patients with 403', async () => {
      const res = await request(app)
        .get('/api/admin/overview')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('rejects hospital staff with 403', async () => {
      const res = await request(app)
        .get('/api/admin/hospitals')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('allows platform administrators', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.user.role).toBe('admin');
    });
  });

  describe('platform overview', () => {
    it('returns real platform statistics and series', async () => {
      const res = await request(app)
        .get('/api/admin/overview?days=14')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      const { stats, series, hospitalActivity, departmentActivity } = res.body.data;

      expect(stats.totalHospitals).toBeGreaterThanOrEqual(2);
      expect(stats.pendingHospitals).toBeGreaterThanOrEqual(1);
      expect(stats.totalPatients).toBeGreaterThanOrEqual(1);
      expect(stats.totalStaff).toBeGreaterThanOrEqual(1);
      expect(stats.totalHospitalAdmins).toBeGreaterThanOrEqual(1);
      expect(stats.completedTokens).toBeGreaterThanOrEqual(1);

      expect(series.labels).toHaveLength(14);
      expect(series.tokensGenerated).toHaveLength(14);
      expect(series.completedTokens.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(1);
      expect(series.hospitalGrowth[13]).toBeGreaterThanOrEqual(2);

      expect(Array.isArray(hospitalActivity)).toBe(true);
      expect(Array.isArray(departmentActivity)).toBe(true);
      expect(stats.totalTokens).toBe(
        stats.completedTokens +
          stats.cancelledTokens +
          stats.noShowTokens +
          stats.waitingTokens +
          stats.servingTokens
      );
    });
  });

  describe('hospital management', () => {
    it('lists hospitals with search, filters and pagination', async () => {
      const res = await request(app)
        .get('/api/admin/hospitals?search=Pending Approval&status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.pagination.total).toBe(1);
      expect(res.body.data.items[0]._id).toBe(pendingHospital._id.toString());
      expect(res.body.data.items[0].counts.admins).toBe(0);
    });

    it('creates a hospital through the admin route', async () => {
      const res = await request(app)
        .post('/api/admin/hospitals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Created By Admin Hospital',
          code: `CB${Math.floor(Math.random() * 100000)}`.slice(0, 10),
          address: { city: 'Created City', state: 'Created State' },
          phone: '1234567892',
          email: `created_${suffix}@test.com`,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.isVerified).toBe(true);
    });

    it('validates hospital creation payloads', async () => {
      const res = await request(app)
        .post('/api/admin/hospitals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'X' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('updates hospital information through the existing hospital route', async () => {
      const res = await request(app)
        .patch(`/api/hospitals/${hospital._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated by platform administrator' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.description).toBe('Updated by platform administrator');
    });

    it('approves a pending hospital', async () => {
      const res = await request(app)
        .patch(`/api/admin/hospitals/${pendingHospital._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.isVerified).toBe(true);
    });

    it('requires a reason when rejecting a hospital', async () => {
      const res = await request(app)
        .patch(`/api/admin/hospitals/${pendingHospital._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
    });

    it('rejects a hospital with a reason', async () => {
      const res = await request(app)
        .patch(`/api/admin/hospitals/${pendingHospital._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Incomplete registration documents' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('suspended');
      expect(res.body.data.isVerified).toBe(false);
    });

    it('reactivates a suspended hospital', async () => {
      const res = await request(app)
        .patch(`/api/admin/hospitals/${pendingHospital._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'active' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.isVerified).toBe(true);
    });

    it('returns a complete hospital detail payload', async () => {
      const res = await request(app)
        .get(`/api/admin/hospitals/${hospital._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      const data = res.body.data;

      expect(data.hospital._id).toBe(hospital._id.toString());
      expect(data.departments).toHaveLength(1);
      expect(data.departments[0].stats.completed).toBe(1);
      expect(data.admins).toHaveLength(1);
      expect(data.staff).toHaveLength(1);
      expect(data.stats.completed).toBe(1);
      expect(data.recentTokens.length).toBeGreaterThanOrEqual(1);
      expect(data.recentTokens[0]).not.toHaveProperty('notes');
      expect(data.patients[0].email).toBe(patientEmail);
    });

    it('returns 404 for an unknown hospital', async () => {
      const res = await request(app)
        .get('/api/admin/hospitals/64b7f0c2f1a2b3c4d5e6f7a8')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('patient management', () => {
    it('lists patients with aggregate token statistics', async () => {
      const res = await request(app)
        .get(`/api/admin/patients?search=${encodeURIComponent(patientEmail)}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.pagination.total).toBe(1);

      const patient = res.body.data.items[0];
      expect(patient.email).toBe(patientEmail);
      expect(patient.stats.totalTokens).toBe(1);
      expect(patient.stats.completedTokens).toBe(1);
      expect(patient).not.toHaveProperty('password');
    });

    it('returns a patient profile with visit history', async () => {
      const res = await request(app)
        .get(`/api/admin/patients/${patientId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.patient.email).toBe(patientEmail);
      expect(res.body.data.stats.completed).toBe(1);
      expect(res.body.data.hospitalsVisited).toHaveLength(1);
      expect(res.body.data.departmentVisits).toHaveLength(1);
      expect(res.body.data.tokens[0]).not.toHaveProperty('notes');
    });

    it('rejects an invalid patient id', async () => {
      const res = await request(app)
        .get('/api/admin/patients/not-an-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('staff management', () => {
    it('lists hospital administrators separately from other staff', async () => {
      const admins = await request(app)
        .get('/api/admin/staff?role=admin')
        .set('Authorization', `Bearer ${adminToken}`);
      const staff = await request(app)
        .get('/api/admin/staff?role=staff')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(admins.statusCode).toBe(200);
      expect(admins.body.data.items.every((item) => item.staffRole === 'admin')).toBe(true);
      expect(staff.body.data.items.every((item) => item.staffRole !== 'admin')).toBe(true);
    });

    it('returns staff details with hospital context', async () => {
      const list = await request(app)
        .get(`/api/admin/staff?search=${encodeURIComponent(staffEmail)}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const staffId = list.body.data.items[0]._id;
      const res = await request(app)
        .get(`/api/admin/staff/${staffId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.staff.email).toBe(staffEmail);
      expect(res.body.data.staff.hospitalId.name).toBe(hospital.name);
    });
  });

  describe('account lifecycle', () => {
    it('suspends a patient and blocks login until reactivated', async () => {
      const suspend = await request(app)
        .patch(`/api/admin/users/${patientId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'suspended', reason: 'Test suspension' });

      expect(suspend.statusCode).toBe(200);
      expect(suspend.body.data.status).toBe('suspended');

      const blockedLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: patientEmail, password: 'Password123!' });
      expect(blockedLogin.statusCode).toBe(403);
      expect(blockedLogin.body.code).toBe('ACCOUNT_SUSPENDED');

      const blockedApi = await request(app)
        .get('/api/queue/token/active')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(blockedApi.statusCode).toBe(403);

      const reactivate = await request(app)
        .patch(`/api/admin/users/${patientId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'active' });

      expect(reactivate.statusCode).toBe(200);
      expect(reactivate.body.data.status).toBe('active');

      const allowedLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: patientEmail, password: 'Password123!' });
      expect(allowedLogin.statusCode).toBe(200);
    });

    it('refuses to suspend the signed-in administrator', async () => {
      const admin = await User.findOne({ email: adminEmail });
      const res = await request(app)
        .patch(`/api/admin/users/${admin._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'suspended' });

      expect(res.statusCode).toBe(400);
    });

    it('refuses to suspend another platform administrator', async () => {
      const secondAdmin = await User.create({
        name: 'Second Platform Owner',
        email: `platform_admin_two_${suffix}@queueless.test`,
        password: 'Password123!',
        role: 'admin',
        isVerified: true,
      });

      const res = await request(app)
        .patch(`/api/admin/users/${secondAdmin._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'suspended' });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('activity log', () => {
    it('records hospital and account actions without sensitive data', async () => {
      const res = await request(app)
        .get('/api/admin/activity?limit=100')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      const actions = res.body.data.items.map((item) => item.action);

      expect(actions).toEqual(
        expect.arrayContaining([
          'hospital.created',
          'hospital.approved',
          'hospital.rejected',
          'hospital.activated',
          'user.suspended',
          'user.reactivated',
        ])
      );

      const serialized = JSON.stringify(res.body.data.items).toLowerCase();
      expect(serialized).not.toContain('password');
      expect(serialized).not.toContain('refreshtoken');
      expect(serialized).not.toContain('bearer ');
    });
  });

  describe('existing workflows', () => {
    it('keeps the staff console and queue actions working', async () => {
      const stats = await request(app)
        .get('/api/staff/dashboard/stats')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(stats.statusCode).toBe(200);
      expect(stats.body.data.completedToday).toBeGreaterThanOrEqual(1);

      const queue = await request(app)
        .get(`/api/queue/department/${hospital._id}/${department._id}`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(queue.statusCode).toBe(200);
      expect(queue.body.data.grouped.completed).toHaveLength(1);
    });

    it('keeps patient token history working', async () => {
      const res = await request(app)
        .get('/api/queue/history')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });
});
