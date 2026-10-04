const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { stub, load, hex, signToken } = require('./helpers');

let dbUser = { _id: hex('u'), role: 'user', tokenVersion: 0 };
let dbDown = false;

stub('models/User', {
  findById: () => ({
    select: () => ({
      lean: async () => {
        if (dbDown) throw new Error('database unavailable');
        return dbUser;
      },
    }),
  }),
  findOne: async () => null,
  countDocuments: async () => 1,
});
stub('models/Course', { countDocuments: async () => 0 });
stub('models/Enrollment', { countDocuments: async () => 0 });

const app = load('server.js');
const tokenFor = (payload = {}) => signToken({ id: hex('u'), role: 'user', tokenVersion: 0, ...payload });
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

describe('authentication', () => {
  test('no token -> 401', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
  });

  test('garbage token -> 401', async () => {
    const res = await request(app).get('/api/auth/me').set(bearer('not-a-real-token'));
    assert.equal(res.status, 401);
  });

  test('a token whose version is stale is rejected', async () => {
    dbUser = { _id: hex('u'), role: 'user', tokenVersion: 2 };
    const res = await request(app).get('/api/enrollments/me').set(bearer(tokenFor({ tokenVersion: 1 })));
    assert.equal(res.status, 401);
  });

  test('a token for a deleted user is rejected', async () => {
    dbUser = null;
    const res = await request(app).get('/api/enrollments/me').set(bearer(tokenFor()));
    assert.equal(res.status, 401);
  });

  test('legacy token without a version still works for a legacy user', async () => {
    dbUser = { _id: hex('u'), role: 'user' };
    const res = await request(app).get('/api/admin/stats').set(bearer(tokenFor({ tokenVersion: undefined })));
    assert.equal(res.status, 403, 'authenticated, but not an admin');
  });

  test('a database error is a safe 500, never a 401 or a leak', async () => {
    dbDown = true;
    const originalError = console.error;
    console.error = () => {}; // the server logs this on purpose
    const res = await request(app).get('/api/enrollments/me').set(bearer(tokenFor()));
    console.error = originalError;
    dbDown = false;
    assert.equal(res.status, 500);
    assert.equal(res.body.message, 'Something went wrong');
    assert.ok(!JSON.stringify(res.body).includes('database unavailable'));
  });
});

describe('roles', () => {
  test('the role comes from the database, not from the token', async () => {
    dbUser = { _id: hex('u'), role: 'user', tokenVersion: 0 };
    const res = await request(app).get('/api/admin/stats').set(bearer(tokenFor({ role: 'admin' })));
    assert.equal(res.status, 403);
  });

  test('admin routes: 401 without a login, 403 for users, 200 for admins', async () => {
    assert.equal((await request(app).get('/api/admin/courses')).status, 401);

    dbUser = { _id: hex('u'), role: 'user', tokenVersion: 0 };
    assert.equal((await request(app).get('/api/admin/courses').set(bearer(tokenFor()))).status, 403);

    dbUser = { _id: hex('u'), role: 'admin', tokenVersion: 0 };
    assert.equal((await request(app).get('/api/admin/stats').set(bearer(tokenFor()))).status, 200);
  });

  test('course write endpoints are admin only', async () => {
    dbUser = { _id: hex('u'), role: 'user', tokenVersion: 0 };
    const res = await request(app).post('/api/courses').set(bearer(tokenFor())).send({ title: 'x' });
    assert.equal(res.status, 403);
  });
});
