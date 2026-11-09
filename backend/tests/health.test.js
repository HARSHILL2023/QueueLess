const request = require('supertest');
const { app } = require('../src/server');

describe('Health and System Status API', () => {
  it('GET /health should return 200 with service status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('QueueLess API');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /api/nonexistent should return 404', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
