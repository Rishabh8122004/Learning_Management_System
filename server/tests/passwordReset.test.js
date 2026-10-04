const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { stub, load, fakeRes } = require('./helpers');

let knownUser = { _id: 'u1', name: 'Asha', email: 'asha@example.com' };
let findFilter = null;
let tokenOwner = null;
const updates = [];
const sent = [];

stub('models/User', {
  findOne: (filter) => {
    findFilter = filter;
    const result = filter.email ? (filter.email === knownUser.email ? knownUser : null) : tokenOwner;
    return { select: async () => result };
  },
  updateOne: async (filter, update) => {
    updates.push({ filter, update });
  },
});
stub('utils/mailer', {
  sendMail: async (message) => {
    sent.push(message);
    return true;
  },
});

const { forgotPassword, resetPassword } = load('controllers/authController');

const call = async (handler, body) => {
  const res = fakeRes();
  await handler({ body }, res);
  return res;
};

const reset = () => {
  updates.length = 0;
  sent.length = 0;
  tokenOwner = null;
  findFilter = null;
};

describe('forgot password', () => {
  test('rejects a missing or malformed email', async () => {
    reset();
    assert.equal((await call(forgotPassword, {})).statusCode, 400);
    assert.equal((await call(forgotPassword, { email: 'nope' })).statusCode, 400);
    assert.equal(updates.length, 0);
  });

  test('an unknown email gets the same answer and nothing is stored or sent', async () => {
    reset();
    const unknown = await call(forgotPassword, { email: 'ghost@example.com' });
    const known = await call(forgotPassword, { email: 'Asha@Example.com ' });

    assert.equal(unknown.statusCode, 200);
    assert.equal(known.statusCode, 200);
    assert.deepEqual(unknown.body, known.body);
    assert.equal(sent.length, 1, 'only the registered email receives a message');
  });

  test('stores only a hash that expires in about an hour, and emails the real token', async () => {
    reset();
    await call(forgotPassword, { email: 'asha@example.com' });

    const { update } = updates[0];
    const link = sent[0].text.match(/reset-password\?token=([a-f0-9]{64})/);

    assert.ok(link, 'the email contains a reset link with a 64-character token');
    assert.equal(update.$set.resetPasswordHash, crypto.createHash('sha256').update(link[1]).digest('hex'));
    assert.notEqual(update.$set.resetPasswordHash, link[1], 'the token itself is never stored');

    const minutes = (update.$set.resetPasswordExpires - Date.now()) / 60000;
    assert.ok(minutes > 55 && minutes <= 60);
    assert.ok(sent[0].text.startsWith('Hi Asha'));
    assert.ok(sent[0].text.includes('http://localhost:5173/reset-password'));
    assert.equal(sent[0].to, 'asha@example.com');
  });
});

describe('reset password', () => {
  const token = 'a'.repeat(64);

  test('rejects a malformed token or a weak password', async () => {
    reset();
    assert.equal((await call(resetPassword, { token: 'short', password: 'long-enough-1' })).statusCode, 400);
    assert.equal((await call(resetPassword, { token, password: 'short' })).statusCode, 400);
    assert.equal((await call(resetPassword, { token, password: 'x'.repeat(80) })).statusCode, 400);
    assert.equal(updates.length, 0);
  });

  test('an unknown or expired token is refused', async () => {
    reset();
    const res = await call(resetPassword, { token, password: 'long-enough-1' });

    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /invalid or has expired/);
    assert.equal(findFilter.resetPasswordHash, crypto.createHash('sha256').update(token).digest('hex'));
    assert.ok(findFilter.resetPasswordExpires.$gt instanceof Date);
    assert.equal(updates.length, 0);
  });

  test('a valid token sets the new password, uses the link up and signs out every device', async () => {
    reset();
    tokenOwner = { _id: 'u1' };
    const res = await call(resetPassword, { token, password: 'brand-new-pass-1' });

    assert.equal(res.statusCode, 200);

    const { update } = updates[0];
    assert.ok(await bcrypt.compare('brand-new-pass-1', update.$set.passwordHash));
    assert.ok('resetPasswordHash' in update.$unset && 'resetPasswordExpires' in update.$unset);
    assert.equal(update.$set.emailVerified, true, 'a completed reset also confirms the email');
    assert.deepEqual(update.$inc, { tokenVersion: 1 });
    assert.equal(JSON.stringify(res.body).includes('token'), false);
  });
});
