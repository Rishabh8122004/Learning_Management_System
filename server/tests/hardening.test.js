const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { stub, load } = require('./helpers');

stub('models/User', {
  findOne: async () => null, // login for an email that does not exist
  findById: () => ({ select: () => ({ lean: async () => null }) }),
});

const app = load('server.js');

describe('server hardening', () => {
  test('health check works and sends security headers', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.ok(res.headers['content-security-policy']);
  });

  test('trusts one proxy hop so rate limits see the real visitor', () => {
    assert.equal(app.get('trust proxy'), 1);
  });

  test('unknown API route -> JSON 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { success: false, message: 'API endpoint not found' });
  });

  test('malformed JSON -> 400 JSON', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');
    assert.equal(res.status, 400);
    assert.equal(res.body.message, 'Invalid JSON in request body');
  });

  test('body over 100kb -> 413 JSON', async () => {
    const res = await request(app).post('/api/auth/login').send({ x: 'a'.repeat(120000) });
    assert.equal(res.status, 413);
    assert.equal(res.body.message, 'Request body is too large');
  });

  test('CORS allows the configured origin and nobody else', async () => {
    const allowed = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    assert.equal(allowed.headers['access-control-allow-origin'], 'http://localhost:5173');

    const blocked = await request(app).get('/api/health').set('Origin', 'http://evil.test');
    assert.equal(blocked.headers['access-control-allow-origin'], undefined);
  });
});

describe('rate limiting', () => {
  test('login is limited to 15 tries, /me is never limited', async () => {
    const attempt = () =>
      request(app).post('/api/auth/login').send({ email: 'nobody@example.invalid', password: 'wrong-password-1' });

    for (let i = 1; i <= 15; i += 1) {
      assert.equal((await attempt()).status, 401, `attempt ${i}`);
    }

    const limited = await attempt();
    assert.equal(limited.status, 429);
    assert.equal(limited.body.message, 'Too many attempts, please try again later.');

    for (let i = 0; i < 25; i += 1) {
      assert.notEqual((await request(app).get('/api/auth/me')).status, 429);
    }
  });
});
