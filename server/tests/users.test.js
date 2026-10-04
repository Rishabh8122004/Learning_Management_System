const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { stub, load, hex, fakeRes } = require('./helpers');

const ME = hex('u');
let user;
let admins = 1;
let raceLoss = false;
const calls = [];

const freshUser = () => ({
  _id: ME,
  name: 'Old Name',
  email: 'me@example.com',
  role: 'user',
  tokenVersion: 3,
  createdAt: new Date(),
  passwordHash: bcrypt.hashSync('old-password-1', 4),
});

stub('models/User', {
  findById: async () => user,
  findByIdAndUpdate: async (id, update) => ({ ...user, ...update.$set }),
  findOneAndUpdate: async (filter, update) => {
    calls.push(['password update conditional on version', filter.tokenVersion]);
    return raceLoss ? null : { ...user, ...update.$set, tokenVersion: user.tokenVersion + 1 };
  },
  countDocuments: async () => admins,
  deleteOne: async (filter) => calls.push(['user deleted', String(filter._id)]),
});

const owned = (name) => ({ deleteMany: async (filter) => calls.push([name, String(filter.user)]) });
stub('models/Enrollment', owned('enrollments'));
stub('models/Goal', owned('goals'));
stub('models/GoalEntry', owned('goalEntries'));

const mongoose = require('mongoose');
mongoose.connection.collection = (name) => owned(name);

const controller = load('controllers/userController');

const call = async (handler, body) => {
  user = user || freshUser();
  const res = fakeRes();
  await handler({ user: { id: ME }, body }, res);
  return res;
};

describe('edit name', () => {
  test('trims and saves the name, never returns the password hash', async () => {
    user = freshUser();
    const res = await call(controller.updateMe, { name: '  New Name ' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.name, 'New Name');
    assert.ok(!('passwordHash' in res.body.user));
  });

  test('too short names and extra fields (like role) are rejected', async () => {
    user = freshUser();
    assert.equal((await call(controller.updateMe, { name: 'A' })).statusCode, 400);
    assert.equal((await call(controller.updateMe, { name: 'Valid Name', role: 'admin' })).statusCode, 400);
  });
});

describe('change password', () => {
  test('a wrong current password is 400, never 401 (401 would log the user out)', async () => {
    user = freshUser();
    const res = await call(controller.changePassword, { currentPassword: 'wrong', newPassword: 'new-password-1' });
    assert.equal(res.statusCode, 400);
  });

  test('new password must differ, be 8+ characters and at most 72 bytes', async () => {
    user = freshUser();
    assert.equal((await call(controller.changePassword, { currentPassword: 'old-password-1', newPassword: 'old-password-1' })).statusCode, 400);
    assert.equal((await call(controller.changePassword, { currentPassword: 'old-password-1', newPassword: 'short' })).statusCode, 400);
    assert.equal((await call(controller.changePassword, { currentPassword: 'old-password-1', newPassword: 'x'.repeat(73) })).statusCode, 400);
  });

  test('success bumps the token version and returns a fresh token', async () => {
    user = freshUser();
    const res = await call(controller.changePassword, { currentPassword: 'old-password-1', newPassword: 'new-password-1' });
    assert.equal(res.statusCode, 200);

    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    assert.equal(decoded.tokenVersion, 4);
    assert.equal(decoded.id, ME);
  });

  test('two simultaneous changes: the loser gets 409', async () => {
    user = freshUser();
    raceLoss = true;
    const res = await call(controller.changePassword, { currentPassword: 'old-password-1', newPassword: 'new-password-1' });
    raceLoss = false;
    assert.equal(res.statusCode, 409);
  });
});

describe('delete account', () => {
  test('needs the right password', async () => {
    user = freshUser();
    assert.equal((await call(controller.deleteMe, { password: 'nope' })).statusCode, 400);
  });

  test("removes everything the user owns, and only the user's own data", async () => {
    user = freshUser();
    calls.length = 0;

    const res = await call(controller.deleteMe, { password: 'old-password-1' });
    assert.equal(res.statusCode, 200);

    const names = calls.map(([name]) => name);
    for (const expected of ['enrollments', 'goalEntries', 'goals', 'user deleted']) {
      assert.ok(names.includes(expected), `missing cleanup: ${expected}`);
    }
    assert.ok(calls.every(([, id]) => id === ME), 'every deletion is scoped to this user');
  });

  test('the only admin cannot delete their account, but one of several can', async () => {
    user = { ...freshUser(), role: 'admin' };
    admins = 1;
    assert.equal((await call(controller.deleteMe, { password: 'old-password-1' })).statusCode, 400);

    admins = 2;
    assert.equal((await call(controller.deleteMe, { password: 'old-password-1' })).statusCode, 200);
  });
});
