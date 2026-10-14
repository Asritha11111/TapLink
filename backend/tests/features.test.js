// backend/tests/features.test.js
// Tests for contacts, tapcode messaging, and emergency location validation

require('dotenv').config();
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_change_this_later';
const { app } = require('../src/server');

// Helper to generate a valid auth header for a dummy user ID
function makeAuthHeader(userId = '00000000-0000-0000-0000-000000000001', email = 'test@example.com') {
  const token = jwt.sign({ id: userId, email, name: 'Test' }, JWT_SECRET, { expiresIn: '1h' });
  return `Bearer ${token}`;
}

describe('Contacts API enhancements', () => {
  it('requires authentication for adding a contact', async () => {
    const res = await request(app).post('/api/contacts').send({ email: 'friend@example.com' });
    expect(res.status).toBe(401);
  });

  it('rejects adding yourself as contact by matching targetId', async () => {
    const userId = '00000000-0000-0000-0000-000000000002';
    const auth = makeAuthHeader(userId);
    const res = await request(app)
      .post('/api/contacts')
      .set('Authorization', auth)
      .send({ targetId: userId });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot add yourself/i);
  });

  it('rejects adding contact without targetId or email', async () => {
    const auth = makeAuthHeader();
    const res = await request(app)
      .post('/api/contacts')
      .set('Authorization', auth)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('TapCode Send Message API', () => {
  it('requires authentication to send a TapCode message', async () => {
    const res = await request(app)
      .post('/api/tapcodes/00000000-0000-0000-0000-000000000010/send')
      .send({ recipientIds: ['00000000-0000-0000-0000-000000000020'] });
    expect(res.status).toBe(401);
  });

  it('rejects sending without recipients', async () => {
    const auth = makeAuthHeader();
    const res = await request(app)
      .post('/api/tapcodes/00000000-0000-0000-0000-000000000010/send')
      .set('Authorization', auth)
      .send({ recipientIds: [] });
    expect(res.status).toBe(400);
  });
});

describe('Emergency Location Validation', () => {
  it('rejects invalid latitude values (> 90)', async () => {
    const auth = makeAuthHeader();
    const res = await request(app)
      .post('/api/emergency')
      .set('Authorization', auth)
      .send({
        recipientIds: ['00000000-0000-0000-0000-000000000020'],
        latitude: 120.5,
        longitude: 78.4,
      });
    expect([400, 403]).toContain(res.status);
    if (res.status === 400) {
      expect(res.body.error).toMatch(/latitude/i);
    }
  });

  it('rejects invalid longitude values (< -180)', async () => {
    const auth = makeAuthHeader();
    const res = await request(app)
      .post('/api/emergency')
      .set('Authorization', auth)
      .send({
        recipientIds: ['00000000-0000-0000-0000-000000000020'],
        latitude: 17.5,
        longitude: -200,
      });
    expect([400, 403]).toContain(res.status);
    if (res.status === 400) {
      expect(res.body.error).toMatch(/longitude/i);
    }
  });
});
