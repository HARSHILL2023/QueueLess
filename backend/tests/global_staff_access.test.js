const request = require('supertest');
const { app } = require('../src/server');
const Hospital = require('../src/models/Hospital');
const Department = require('../src/models/Department');
const Doctor = require('../src/models/Doctor');
const User = require('../src/models/User');
const Token = require('../src/models/Token');

const baseHospital = (overrides) => ({
  address: { city: 'Global City', state: 'Global State' },
  phone: '1234567890',
  email: 'global@hospital.test',
  isVerified: true,
  status: 'active',
  ...overrides,
});

describe('Global staff access (demo@hospital.com)', () => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const password = 'Password123!';

  let hospitalA;
  let hospitalB;
  let hospitalC;
  let deptA;
  let deptB;
  let globalStaff;
  let normalStaff;
  let adminUser;
  let globalToken;
  let staffToken;
  let adminToken;
  let tokenInB1;
  let tokenInB2;
  let tokenInB3;
  let tokenInA;

  const login = async (email) => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.statusCode).toBe(200);
    return res.body.data.token;
  };

  const registerPatient = async (label) => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: `Patient ${label}`, email: `patient_${label}_${suffix}@test.local`, password });
    expect(res.statusCode).toBe(201);
    return res.body.data.token;
  };

  const bookToken = async (patientToken, hospitalId, departmentId) => {
    const res = await request(app)
      .post('/api/queue/token')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ hospitalId: hospitalId.toString(), departmentId: departmentId.toString() });
    expect(res.statusCode).toBe(201);
    return res.body.data.token;
  };

  beforeAll(async () => {
    hospitalA = await Hospital.create(baseHospital({ name: 'Global A Hospital', code: `GA${suffix.slice(-6)}` }));
    hospitalB = await Hospital.create(baseHospital({ name: 'Global B Hospital', code: `GB${suffix.slice(-6)}` }));

    deptA = await Department.create({
      hospitalId: hospitalA._id,
      name: 'Global A Clinic',
      code: 'GA1',
      isActive: true,
    });
    deptB = await Department.create({
      hospitalId: hospitalB._id,
      name: 'Global B Clinic',
      code: 'GB1',
      isActive: true,
    });

    globalStaff = await User.create({
      name: 'Demo Global Staff',
      email: 'demo@hospital.com',
      password,
      role: 'staff',
      staffRole: 'admin',
      hospitalId: hospitalA._id,
      departmentId: deptA._id,
      isGlobalStaff: true,
    });

    normalStaff = await User.create({
      name: 'Normal A Staff',
      email: `normal_${suffix}@test.local`,
      password,
      role: 'staff',
      staffRole: 'doctor',
      hospitalId: hospitalA._id,
      departmentId: deptA._id,
    });

    adminUser = await User.create({
      name: 'Platform Admin',
      email: `admin_${suffix}@test.local`,
      password,
      role: 'admin',
    });

    globalToken = await login('demo@hospital.com');
    staffToken = await login(normalStaff.email);
    adminToken = await login(adminUser.email);

    const patientB1 = await registerPatient('b1');
    const patientB2 = await registerPatient('b2');
    const patientB3 = await registerPatient('b3');
    const patientA = await registerPatient('a1');

    tokenInB1 = await bookToken(patientB1, hospitalB._id, deptB._id);
    tokenInB2 = await bookToken(patientB2, hospitalB._id, deptB._id);
    tokenInB3 = await bookToken(patientB3, hospitalB._id, deptB._id);
    tokenInA = await bookToken(patientA, hospitalA._id, deptA._id);
  }, 60000);

  describe('global staff access', () => {
    it('1. lists all existing hospitals', async () => {
      const res = await request(app)
        .get('/api/staff/hospitals')
        .set('Authorization', `Bearer ${globalToken}`);

      expect(res.statusCode).toBe(200);
      const ids = res.body.data.map((h) => h._id.toString());
      expect(ids).toContain(hospitalA._id.toString());
      expect(ids).toContain(hospitalB._id.toString());
    });

    it('2. accesses every existing hospital context', async () => {
      const [hospitalAView, hospitalBView] = await Promise.all([
        request(app).get(`/api/staff/hospital/${hospitalA._id}`).set('Authorization', `Bearer ${globalToken}`),
        request(app).get(`/api/staff/hospital/${hospitalB._id}`).set('Authorization', `Bearer ${globalToken}`),
      ]);

      expect(hospitalAView.statusCode).toBe(200);
      expect(hospitalBView.statusCode).toBe(200);
    });

    it('3. automatically reaches a hospital created after the account existed', async () => {
      const create = await request(app)
        .post('/api/admin/hospitals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          baseHospital({
            name: 'Global C Hospital',
            code: `GC${suffix.slice(-6)}`,
            address: { city: 'Global City', state: 'Global State' },
          })
        );

      expect(create.statusCode).toBe(201);
      hospitalC = create.body.data;

      const view = await request(app)
        .get(`/api/staff/hospital/${hospitalC._id}`)
        .set('Authorization', `Bearer ${globalToken}`);
      expect(view.statusCode).toBe(200);
      expect(view.body.data.staff).toEqual([]);

      const list = await request(app)
        .get('/api/staff/hospitals')
        .set('Authorization', `Bearer ${globalToken}`);
      expect(list.body.data.map((h) => h._id.toString())).toContain(hospitalC._id.toString());
    });

    it('4. switches between hospitals without logging out', async () => {
      const a = await request(app)
        .get(`/api/queue/status/${hospitalA._id}`)
        .set('Authorization', `Bearer ${globalToken}`)
        .set('X-Hospital-Id', hospitalA._id.toString());
      const b = await request(app)
        .get(`/api/queue/status/${hospitalB._id}`)
        .set('Authorization', `Bearer ${globalToken}`)
        .set('X-Hospital-Id', hospitalB._id.toString());

      expect(a.statusCode).toBe(200);
      expect(b.statusCode).toBe(200);
      expect(a.body.data.some((row) => row.department.code === 'GA1')).toBe(true);
      expect(b.body.data.some((row) => row.department.code === 'GB1')).toBe(true);
    });

    it('5. manages departments in different hospitals', async () => {
      const created = await request(app)
        .post(`/api/hospitals/${hospitalB._id}/departments`)
        .set('Authorization', `Bearer ${globalToken}`)
        .set('X-Hospital-Id', hospitalB._id.toString())
        .send({ name: 'Global B Cardiology', code: 'GBC', floor: '2nd Floor', roomNumber: '204' });

      expect(created.statusCode).toBe(201);
      const deptId = created.body.data._id;

      const updated = await request(app)
        .patch(`/api/hospitals/${hospitalB._id}/departments/${deptId}`)
        .set('Authorization', `Bearer ${globalToken}`)
        .send({ avgWaitMinutes: 25 });
      expect(updated.statusCode).toBe(200);
      expect(updated.body.data.avgWaitMinutes).toBe(25);

      const impact = await request(app)
        .get(`/api/hospitals/${hospitalA._id}/departments/${deptA._id}/impact`)
        .set('Authorization', `Bearer ${globalToken}`);
      expect(impact.statusCode).toBe(200);

      const removed = await request(app)
        .delete(`/api/hospitals/${hospitalB._id}/departments/${deptId}`)
        .set('Authorization', `Bearer ${globalToken}`);
      expect(removed.statusCode).toBe(200);
      expect(removed.body.data.action).toBe('deleted');
    });

    it('6. manages queues in a second hospital', async () => {
      const queue = await request(app)
        .get(`/api/queue/department/${hospitalB._id}/${deptB._id}`)
        .set('Authorization', `Bearer ${globalToken}`)
        .set('X-Hospital-Id', hospitalB._id.toString());
      expect(queue.statusCode).toBe(200);
      expect(queue.body.data.grouped.waiting.length).toBeGreaterThan(0);

      const called = await request(app)
        .post('/api/queue/call-next')
        .set('Authorization', `Bearer ${globalToken}`)
        .set('X-Hospital-Id', hospitalB._id.toString())
        .send({ hospitalId: hospitalB._id.toString(), departmentId: deptB._id.toString() });
      expect(called.statusCode).toBe(200);
    });

    it('7. performs token operations in a second hospital', async () => {
      const serving = await request(app)
        .patch(`/api/queue/token/${tokenInB2._id}/serving`)
        .set('Authorization', `Bearer ${globalToken}`)
        .set('X-Hospital-Id', hospitalB._id.toString());
      expect(serving.statusCode).toBe(200);
      expect(serving.body.data.status).toBe('serving');

      const completed = await request(app)
        .patch(`/api/queue/token/${tokenInB2._id}/completed`)
        .set('Authorization', `Bearer ${globalToken}`)
        .set('X-Hospital-Id', hospitalB._id.toString())
        .send({ notes: 'Handled by global staff' });
      expect(completed.statusCode).toBe(200);
      expect(completed.body.data.status).toBe('completed');

      const noShow = await request(app)
        .patch(`/api/queue/token/${tokenInB3._id}/no-show`)
        .set('Authorization', `Bearer ${globalToken}`)
        .set('X-Hospital-Id', hospitalB._id.toString());
      expect(noShow.statusCode).toBe(200);
      expect(noShow.body.data.status).toBe('no-show');
    });

    it('8. keeps hospital data isolated when switching', async () => {
      const inA = await request(app)
        .get(`/api/staff/patients?hospitalId=${hospitalA._id}`)
        .set('Authorization', `Bearer ${globalToken}`)
        .set('X-Hospital-Id', hospitalA._id.toString());
      expect(inA.statusCode).toBe(200);
      inA.body.data.forEach((token) => {
        expect(token.hospitalId.toString()).toBe(hospitalA._id.toString());
      });
      expect(inA.body.data.map((t) => t._id)).toContain(tokenInA._id.toString());

      const inB = await request(app)
        .get(`/api/staff/patients?hospitalId=${hospitalB._id}`)
        .set('Authorization', `Bearer ${globalToken}`)
        .set('X-Hospital-Id', hospitalB._id.toString());
      expect(inB.statusCode).toBe(200);
      expect(inB.body.data.length).toBeGreaterThan(0);
      inB.body.data.forEach((token) => {
        expect(token.hospitalId.toString()).toBe(hospitalB._id.toString());
      });
      expect(inB.body.data.map((t) => t._id)).not.toContain(tokenInA._id.toString());

      // A token from hospital B cannot be touched while hospital A is selected.
      const crossContext = await request(app)
        .patch(`/api/queue/token/${tokenInB1._id}/serving`)
        .set('Authorization', `Bearer ${globalToken}`)
        .set('X-Hospital-Id', hospitalA._id.toString());
      expect(crossContext.statusCode).toBe(403);
    });

    it('rejects unknown or malformed selected hospitals instead of casting them', async () => {
      const malformed = await request(app)
        .get('/api/staff/patients')
        .set('Authorization', `Bearer ${globalToken}`)
        .set('X-Hospital-Id', 'not-an-object-id');
      expect(malformed.statusCode).toBe(400);

      const unknown = await request(app)
        .get('/api/staff/patients')
        .set('Authorization', `Bearer ${globalToken}`)
        .set('X-Hospital-Id', '64b7f0c2f1a2b3c4d5e6f7a8');
      expect(unknown.statusCode).toBe(404);
    });

    it('never receives platform admin privileges', async () => {
      const res = await request(app)
        .get('/api/admin/hospitals')
        .set('Authorization', `Bearer ${globalToken}`);
      expect(res.statusCode).toBe(403);

      const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${globalToken}`);
      expect(me.body.data.user.role).toBe('staff');
      expect(me.body.data.user.isGlobalStaff).toBe(true);
    });
  });

  describe('normal staff cannot escalate', () => {
    it('9. only sees their assigned hospital', async () => {
      const res = await request(app)
        .get('/api/staff/hospitals')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.statusCode).toBe(403);

      const a = await request(app)
        .get(`/api/staff/hospital/${hospitalA._id}`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(a.statusCode).toBe(200);

      const b = await request(app)
        .get(`/api/staff/hospital/${hospitalB._id}`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(b.statusCode).toBe(403);
    });

    it('10. cannot reach another hospital by changing request parameters', async () => {
      const patients = await request(app)
        .get(`/api/staff/patients?hospitalId=${hospitalB._id}`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(patients.statusCode).toBe(403);

      const queue = await request(app)
        .get(`/api/queue/status/${hospitalB._id}`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(queue.statusCode).toBe(403);
    });

    it('11. cannot reach another hospital through the hospital header', async () => {
      const res = await request(app)
        .patch(`/api/queue/token/${tokenInB1._id}/serving`)
        .set('Authorization', `Bearer ${staffToken}`)
        .set('X-Hospital-Id', hospitalB._id.toString());
      expect(res.statusCode).toBe(403);
    });

    it("12. cannot operate another hospital's departments, queues or tokens", async () => {
      const dept = await request(app)
        .post(`/api/hospitals/${hospitalB._id}/departments`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'Hijack Clinic', code: 'HIJ' });
      expect(dept.statusCode).toBe(403);

      const queue = await request(app)
        .get(`/api/queue/department/${hospitalB._id}/${deptB._id}`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(queue.statusCode).toBe(403);

      const token = await request(app)
        .patch(`/api/queue/token/${tokenInB1._id}/no-show`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(token.statusCode).toBe(403);
    });

    it('13. cannot grant themselves the global permission', async () => {
      const patchStaff = await request(app)
        .patch('/api/staff/profile')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'Normal A Staff', isGlobalStaff: true });
      expect(patchStaff.statusCode).toBe(200);

      const patchUser = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ isGlobalStaff: true, role: 'admin' });
      expect(patchUser.statusCode).toBe(200);

      const stored = await User.findById(normalStaff._id);
      expect(stored.isGlobalStaff).toBe(false);
      expect(stored.role).toBe('staff');

      const list = await request(app)
        .get('/api/staff/hospitals')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(list.statusCode).toBe(403);
    });
  });

  describe('existing behaviour is preserved', () => {
    it('14. platform admins keep full access', async () => {
      const hospitals = await request(app)
        .get('/api/admin/hospitals')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(hospitals.statusCode).toBe(200);
      expect(hospitals.body.data.items.length).toBeGreaterThan(0);

      const details = await request(app)
        .get(`/api/admin/hospitals/${hospitalB._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(details.statusCode).toBe(200);
    });

    it('15. hospital creation and approval still work', async () => {
      const created = await request(app)
        .post('/api/admin/hospitals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          baseHospital({
            name: 'Global D Hospital',
            code: `GD${suffix.slice(-6)}`,
            address: { city: 'Global City', state: 'Global State' },
          })
        );
      expect(created.statusCode).toBe(201);

      const approved = await request(app)
        .patch(`/api/admin/hospitals/${created.body.data._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(approved.statusCode).toBe(200);
      expect(approved.body.data.isVerified).toBe(true);
    });

    it('16. authentication and profile endpoints still work for normal staff', async () => {
      const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${staffToken}`);
      expect(me.statusCode).toBe(200);
      expect(me.body.data.user.hospitalId._id.toString()).toBe(hospitalA._id.toString());
      expect(me.body.data.user.isGlobalStaff).toBe(false);

      const profile = await request(app).get('/api/staff/profile').set('Authorization', `Bearer ${staffToken}`);
      expect(profile.statusCode).toBe(200);

      const unauth = await request(app).get('/api/staff/hospitals');
      expect(unauth.statusCode).toBe(401);
    });

    it('17. department removal logic still archives referenced departments', async () => {
      const dept = await Department.create({
        hospitalId: hospitalA._id,
        name: 'Historic Clinic',
        code: 'HIST',
        isActive: true,
      });
      await Doctor.create({
        hospitalId: hospitalA._id,
        departmentId: dept._id,
        name: 'Dr Historic',
        specialization: 'General',
      });

      const res = await request(app)
        .delete(`/api/hospitals/${hospitalA._id}/departments/${dept._id}`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.action).toBe('archived');

      const stored = await Department.findById(dept._id);
      expect(stored.isActive).toBe(false);
    });

    it('18. queue and token workflows still work for normal staff', async () => {
      const serving = await request(app)
        .patch(`/api/queue/token/${tokenInA._id}/serving`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(serving.statusCode).toBe(200);

      const completed = await request(app)
        .patch(`/api/queue/token/${tokenInA._id}/completed`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(completed.statusCode).toBe(200);
      expect(completed.body.data.status).toBe('completed');

      const stored = await Token.findById(tokenInA._id);
      expect(stored.status).toBe('completed');
    });
  });
});
