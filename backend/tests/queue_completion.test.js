const request = require('supertest');
const { app } = require('../src/server');
const Hospital = require('../src/models/Hospital');
const Department = require('../src/models/Department');
const User = require('../src/models/User');

describe('PATCH /api/queue/token/:id/completed', () => {
  let staffToken = null;
  let hospital = null;
  let department = null;

  beforeAll(async () => {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

    hospital = await Hospital.create({
      name: 'Completion Care Center',
      code: `CCC${Math.floor(Math.random() * 1000000)}`.slice(0, 10),
      address: { city: 'CompleteCity', state: 'CompleteState' },
      phone: '1234567890',
      email: `completion_${suffix}@hospital.com`,
      isVerified: true,
      status: 'active',
    });

    department = await Department.create({
      hospitalId: hospital._id,
      name: 'Completion Medicine',
      code: `CM${Math.floor(Math.random() * 800)}`,
      avgWaitMinutes: 15,
      maxTokensPerDay: 100,
      isActive: true,
    });

    await User.create({
      name: 'Dr. Completion Staff',
      email: `completion_staff_${suffix}@hospital.com`,
      password: 'Password123!',
      role: 'staff',
      staffRole: 'doctor',
      hospitalId: hospital._id,
      departmentId: department._id,
    });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: `completion_staff_${suffix}@hospital.com`, password: 'Password123!' });

    expect(login.statusCode).toBe(200);
    staffToken = login.body.data.token;
  });

  // Books a fresh token for a new patient and moves it to "serving" so the
  // completion endpoint has a realistic token to work with.
  const bookAndServeToken = async () => {
    const email = `completion_patient_${Date.now()}_${Math.floor(Math.random() * 10000)}@test.com`;

    const registration = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Completion Patient', email, password: 'Password123!' });

    expect(registration.statusCode).toBe(201);

    const booking = await request(app)
      .post('/api/queue/token')
      .set('Authorization', `Bearer ${registration.body.data.token}`)
      .send({
        hospitalId: hospital._id.toString(),
        departmentId: department._id.toString(),
      });

    expect(booking.statusCode).toBe(201);
    const tokenId = booking.body.data.token._id;

    await request(app)
      .post('/api/queue/call-next')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        hospitalId: hospital._id.toString(),
        departmentId: department._id.toString(),
      });

    const serving = await request(app)
      .patch(`/api/queue/token/${tokenId}/serving`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(serving.statusCode).toBe(200);
    return tokenId;
  };

  it('completes a token when the request has no body at all', async () => {
    const tokenId = await bookAndServeToken();

    const res = await request(app)
      .patch(`/api/queue/token/${tokenId}/completed`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.completedAt).toBeDefined();
  });

  it('completes a token when the body is an empty JSON object', async () => {
    const tokenId = await bookAndServeToken();

    const res = await request(app)
      .patch(`/api/queue/token/${tokenId}/completed`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({});

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });

  it('stores the notes when the body includes them', async () => {
    const tokenId = await bookAndServeToken();

    const res = await request(app)
      .patch(`/api/queue/token/${tokenId}/completed`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ notes: 'Consultation finished, follow-up in two weeks.' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.notes).toContain('follow-up in two weeks');
  });
});
