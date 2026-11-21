const request = require('supertest');
const { app } = require('../src/server');
const Hospital = require('../src/models/Hospital');
const Department = require('../src/models/Department');
const Doctor = require('../src/models/Doctor');
const Token = require('../src/models/Token');
const User = require('../src/models/User');
const ActivityLog = require('../src/models/ActivityLog');

const unique = () => Math.floor(Math.random() * 100000);

const makeHospital = (label) =>
  Hospital.create({
    name: `Removal ${label} Hospital`,
    code: `RM${unique()}`.slice(0, 10),
    address: { city: 'RemovalCity', state: 'RemovalState' },
    phone: '9999999999',
    email: `removal-${label}-${unique()}@test.com`,
    isVerified: true,
    status: 'active',
  });

describe('Department removal (archive vs delete)', () => {
  let hospitalA;
  let hospitalB;
  let staffAToken;
  let staffBToken;
  let patientToken;
  let deptB;

  const makeDept = (hospital, code, extra = {}) =>
    Department.create({
      hospitalId: hospital._id,
      name: `Clinic ${code}`,
      code,
      avgWaitMinutes: 15,
      maxTokensPerDay: 100,
      ...extra,
    });

  const bookToken = (dept) =>
    request(app)
      .post('/api/queue/token')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ hospitalId: dept.hospitalId.toString(), departmentId: dept._id.toString() });

  beforeAll(async () => {
    hospitalA = await makeHospital('A');
    hospitalB = await makeHospital('B');

    const staffAEmail = `removal-staff-a-${unique()}@test.com`;
    const staffBEmail = `removal-staff-b-${unique()}@test.com`;

    await User.create({
      name: 'Removal Staff A',
      email: staffAEmail,
      password: 'Password123!',
      role: 'staff',
      staffRole: 'admin',
      hospitalId: hospitalA._id,
    });
    await User.create({
      name: 'Removal Staff B',
      email: staffBEmail,
      password: 'Password123!',
      role: 'staff',
      staffRole: 'admin',
      hospitalId: hospitalB._id,
    });

    const loginA = await request(app)
      .post('/api/auth/login')
      .send({ email: staffAEmail, password: 'Password123!' });
    expect(loginA.statusCode).toBe(200);
    staffAToken = loginA.body.data.token;

    const loginB = await request(app)
      .post('/api/auth/login')
      .send({ email: staffBEmail, password: 'Password123!' });
    staffBToken = loginB.body.data.token;

    const patientReg = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Removal Patient',
        email: `removal-patient-${unique()}@test.com`,
        password: 'Password123!',
      });
    expect(patientReg.statusCode).toBe(201);
    patientToken = patientReg.body.data.token;

    deptB = await makeDept(hospitalB, 'BREM');
  });

  it('rejects unauthenticated removal attempts', async () => {
    const dept = await makeDept(hospitalA, 'NOAUTH');
    const res = await request(app).delete(`/api/hospitals/${hospitalA._id}/departments/${dept._id}`);
    expect(res.statusCode).toBe(401);
    const unchanged = await Department.findById(dept._id);
    expect(unchanged.isActive).toBe(true);
  });

  it('rejects patients removing departments', async () => {
    const dept = await makeDept(hospitalA, 'NOPAT');
    const res = await request(app)
      .delete(`/api/hospitals/${hospitalA._id}/departments/${dept._id}`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(403);
    expect(await Department.findById(dept._id)).not.toBeNull();
  });

  it('rejects staff from another hospital', async () => {
    const res = await request(app)
      .delete(`/api/hospitals/${hospitalB._id}/departments/${deptB._id}`)
      .set('Authorization', `Bearer ${staffAToken}`);
    expect(res.statusCode).toBe(403);

    const resB = await request(app)
      .delete(`/api/hospitals/${hospitalA._id}/departments/${deptB._id}`)
      .set('Authorization', `Bearer ${staffBToken}`);
    expect(resB.statusCode).toBe(403);

    expect(await Department.findById(deptB._id)).not.toBeNull();
  });

  it('reports no dependencies for an empty department', async () => {
    const dept = await makeDept(hospitalA, 'EMPTY');
    const res = await request(app)
      .get(`/api/hospitals/${hospitalA._id}/departments/${dept._id}/impact`)
      .set('Authorization', `Bearer ${staffAToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.impact.references).toBe(0);
    expect(res.body.data.recommendedAction).toBe('delete');
  });

  it('permanently deletes a department with no records', async () => {
    const dept = await makeDept(hospitalA, 'GONE');
    const res = await request(app)
      .delete(`/api/hospitals/${hospitalA._id}/departments/${dept._id}`)
      .set('Authorization', `Bearer ${staffAToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.action).toBe('deleted');
    expect(await Department.findById(dept._id)).toBeNull();
  });

  it('archives instead of deleting when doctors reference the department', async () => {
    const dept = await makeDept(hospitalA, 'DOCS');
    await Doctor.create({
      hospitalId: hospitalA._id,
      departmentId: dept._id,
      name: 'Dr. Retained',
      specialization: 'General Medicine',
    });

    const res = await request(app)
      .delete(`/api/hospitals/${hospitalA._id}/departments/${dept._id}`)
      .set('Authorization', `Bearer ${staffAToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.action).toBe('archived');

    const archived = await Department.findById(dept._id);
    expect(archived).not.toBeNull();
    expect(archived.isActive).toBe(false);
    expect(archived.archivedAt).toBeInstanceOf(Date);
    expect(await Doctor.countDocuments({ departmentId: dept._id })).toBe(1);

    const auditEntry = await ActivityLog.findOne({ targetId: dept._id, action: 'department.archived' });
    expect(auditEntry).not.toBeNull();
    expect(auditEntry.metadata.outcome).toBe('archived');

    const list = await request(app).get(`/api/hospitals/${hospitalA._id}/departments`);
    expect(list.body.data.some((item) => item._id.toString() === dept._id.toString())).toBe(false);
  });

  it('refuses removal while tokens are still active today', async () => {
    const dept = await makeDept(hospitalA, 'BUSY');
    const booking = await bookToken(dept);
    expect(booking.statusCode).toBe(201);

    const res = await request(app)
      .delete(`/api/hospitals/${hospitalA._id}/departments/${dept._id}`)
      .set('Authorization', `Bearer ${staffAToken}`);

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/still active today/i);

    const current = await Department.findById(dept._id);
    expect(current.isActive).toBe(true);
  });

  it('archives a department with completed visit history and keeps the tokens', async () => {
    const dept = await makeDept(hospitalA, 'HIST');

    const booking = await bookToken(dept);
    expect(booking.statusCode).toBe(201);
    const tokenId = booking.body.data.token._id;

    const callNext = await request(app)
      .post('/api/queue/call-next')
      .set('Authorization', `Bearer ${staffAToken}`)
      .send({ hospitalId: hospitalA._id.toString(), departmentId: dept._id.toString() });
    expect(callNext.statusCode).toBe(200);

    const serving = await request(app)
      .patch(`/api/queue/token/${tokenId}/serving`)
      .set('Authorization', `Bearer ${staffAToken}`);
    expect(serving.statusCode).toBe(200);

    const completed = await request(app)
      .patch(`/api/queue/token/${tokenId}/completed`)
      .set('Authorization', `Bearer ${staffAToken}`)
      .send({ notes: 'Visit finished' });
    expect(completed.statusCode).toBe(200);

    const res = await request(app)
      .delete(`/api/hospitals/${hospitalA._id}/departments/${dept._id}`)
      .set('Authorization', `Bearer ${staffAToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.action).toBe('archived');

    const token = await Token.findById(tokenId);
    expect(token).not.toBeNull();
    expect(token.status).toBe('completed');
    expect(token.departmentId.toString()).toBe(dept._id.toString());
  });

  it('blocks new bookings for an archived department', async () => {
    const dept = await makeDept(hospitalA, 'CLOSED');
    await Doctor.create({
      hospitalId: hospitalA._id,
      departmentId: dept._id,
      name: 'Dr. Archive',
      specialization: 'General Medicine',
    });

    const remove = await request(app)
      .delete(`/api/hospitals/${hospitalA._id}/departments/${dept._id}`)
      .set('Authorization', `Bearer ${staffAToken}`);
    expect(remove.body.data.action).toBe('archived');

    const booking = await bookToken(dept);
    expect(booking.statusCode).toBe(404);
    expect(booking.body.error).toMatch(/inactive/i);
  });

  it('reports an already archived department and refuses to remove it twice', async () => {
    const dept = await makeDept(hospitalA, 'TWICE');
    await Doctor.create({
      hospitalId: hospitalA._id,
      departmentId: dept._id,
      name: 'Dr. Twice',
      specialization: 'General Medicine',
    });

    await request(app)
      .delete(`/api/hospitals/${hospitalA._id}/departments/${dept._id}`)
      .set('Authorization', `Bearer ${staffAToken}`);

    const res = await request(app)
      .delete(`/api/hospitals/${hospitalA._id}/departments/${dept._id}`)
      .set('Authorization', `Bearer ${staffAToken}`);
    expect(res.statusCode).toBe(409);

    const impact = await request(app)
      .get(`/api/hospitals/${hospitalA._id}/departments/${dept._id}/impact`)
      .set('Authorization', `Bearer ${staffAToken}`);
    expect(impact.body.data.recommendedAction).toBe('none');
    expect(impact.body.data.department.isActive).toBe(false);
  });

  it('still allows adding a new department', async () => {
    const res = await request(app)
      .post(`/api/hospitals/${hospitalA._id}/departments`)
      .set('Authorization', `Bearer ${staffAToken}`)
      .send({
        name: 'Newly Added Clinic',
        code: `NEW${unique() % 1000}`.slice(0, 10),
        floor: '1st Floor',
        roomNumber: '110',
        avgWaitMinutes: 12,
        maxTokensPerDay: 80,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.isActive).toBe(true);
  });
});
