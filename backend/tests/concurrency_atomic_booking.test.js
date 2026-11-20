const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../src/server');
const Hospital = require('../src/models/Hospital');
const Department = require('../src/models/Department');
const Queue = require('../src/models/Queue');

describe('Concurrency & Race-Condition Audit: Atomic Token Counters', () => {
  let hospital = null;
  let department = null;
  const patientTokens = [];

  beforeAll(async () => {
    // Create a dedicated department to test concurrency from scratch
    hospital = await Hospital.findOne({ isVerified: true, status: 'active' });
    if (!hospital) {
      hospital = await Hospital.create({
        name: 'Concurrency General',
        code: `CGH${Math.floor(Math.random() * 800)}`,
        address: { city: 'City', state: 'State' },
        phone: '1234567890',
        email: 'cgh@test.com',
        isVerified: true,
        status: 'active',
      });
    }
    const codeSuffix = Math.floor(Math.random() * 900 + 100);
    department = await Department.create({
      hospitalId: hospital._id,
      name: `Concurrency Clinic ${codeSuffix}`,
      code: `CC${codeSuffix}`,
      avgWaitMinutes: 10,
      maxTokensPerDay: 500,
      isActive: true,
    });

    // Register 10 distinct patients
    for (let i = 1; i <= 10; i++) {
      const email = `concurrent_patient_${codeSuffix}_${i}_${Date.now()}@test.com`;
      const reg = await request(app)
        .post('/api/auth/register')
        .send({ name: `Concurrent User ${i}`, email, password: 'Password123!' });
      patientTokens.push(reg.body.data.token);
    }
  }, 30000);

  it('Concurrent token bookings must allocate strictly unique sequential token numbers with 0 duplicates', async () => {
    // Fire all 10 booking requests concurrently via Promise.all
    const bookingPromises = patientTokens.map((pToken) =>
      request(app)
        .post('/api/queue/token')
        .set('Authorization', `Bearer ${pToken}`)
        .send({
          hospitalId: hospital._id.toString(),
          departmentId: department._id.toString(),
        })
    );

    const responses = await Promise.all(bookingPromises);

    // 1. Verify every single request succeeded with HTTP 201
    responses.forEach((res, index) => {
      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.token).toBeDefined();
    });

    // 2. Extract token numbers and displays
    const tokenNumbers = responses.map((res) => res.body.data.token.tokenNumber);
    const tokenDisplays = responses.map((res) => res.body.data.token.tokenDisplay);

    // 3. STRICT CHECK: Set size must equal array length (NO DUPLICATES)
    const uniqueTokenNumbers = new Set(tokenNumbers);
    expect(uniqueTokenNumbers.size).toBe(10);

    const uniqueTokenDisplays = new Set(tokenDisplays);
    expect(uniqueTokenDisplays.size).toBe(10);

    // 4. Verify token numbers form a contiguous sequence 1..10
    const sorted = [...tokenNumbers].sort((a, b) => a - b);
    expect(sorted).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // 5. Verify database Queue document has totalIssued === 10
    const today = new Date().toISOString().split('T')[0];
    const queueDoc = await Queue.findOne({
      hospitalId: hospital._id,
      departmentId: department._id,
      date: today,
    });

    expect(queueDoc).toBeDefined();
    expect(queueDoc.totalIssued).toBe(10);
  });
});
