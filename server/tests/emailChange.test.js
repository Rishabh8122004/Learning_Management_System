const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { stub, load, fakeRes } = require('./helpers');

const PASSWORD = 'long-enough-1';
let me;
let tokenOwner = null;
let existingByEmail = {};
let findFilter = null;
const updates = [];
const sent = [];

stub('models/User', {
  findById: async () => me,
  findOne: (filter) => {
    findFilter = filter;
    const found = filter.pendingEmailHash ? tokenOwner : existingByEmail[filter.email] || null;
    return { select: async () => found };
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

const { requestEmailChange, confirmEmailChange } = load('controllers/authController');

const reset = () => {
  me = { _id: 'u1', name: 'Asha', email: 'asha@example.com', passwordHash: bcrypt.hashSync(PASSWORD, 4) };
  tokenOwner = null;
  existingByEmail = {};
  findFilter = null;
  updates.length = 0;
  sent.length = 0;
};

const request = async (body) => {
  const res = fakeRes();
  await requestEmailChange({ user: { id: 'u1' }, body }, res);
  return res;
};
const confirm = async (body) => {
  const res = fakeRes();
  await confirmEmailChange({ body }, res);
  return res;
};

describe('request an email change', () => {
  test('keeps the old email, stores the new one as pending and mails a link to the NEW address', async () => {
    reset();
    const res = await request({ newEmail: ' New@Example.com ', password: PASSWORD });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.email, 'new@example.com');

    const { update } = updates[0];
    assert.equal(update.$set.email, undefined, 'the email itself does not change yet');
    assert.equal(update.$set.pendingEmail, 'new@example.com');
    assert.equal(sent[0].to, 'new@example.com');

    const link = sent[0].text.match(/confirm-email-change\?token=([a-f0-9]{64})/);
    assert.equal(update.$set.pendingEmailHash, crypto.createHash('sha256').update(link[1]).digest('hex'));
  });

  test('needs the right password, a valid different email that nobody else uses', async () => {
    reset();
    assert.equal((await request({ newEmail: 'new@example.com', password: 'wrong-pass-123' })).statusCode, 400);
    assert.equal((await request({ newEmail: 'new@example.com' })).statusCode, 400);
    assert.equal((await request({ newEmail: 'nope', password: PASSWORD })).statusCode, 400);
    assert.equal((await request({ newEmail: 'asha@example.com', password: PASSWORD })).statusCode, 400);
    assert.equal((await request({ newEmail: 'x@example.com', password: PASSWORD, role: 'admin' })).statusCode, 400);

    existingByEmail['taken@example.com'] = { _id: 'u9' };
    assert.equal((await request({ newEmail: 'taken@example.com', password: PASSWORD })).statusCode, 409);
    assert.equal(updates.length, 0);
    assert.equal(sent.length, 0);
  });
});

describe('confirm an email change', () => {
  const token = 'c'.repeat(64);

  test('rejects a malformed, unknown or expired link', async () => {
    reset();
    assert.equal((await confirm({ token: 'bad' })).statusCode, 400);
    assert.equal((await confirm({ token })).statusCode, 400);
    assert.equal(findFilter.pendingEmailHash, crypto.createHash('sha256').update(token).digest('hex'));
    assert.ok(findFilter.pendingEmailExpires.$gt instanceof Date);
    assert.equal(updates.length, 0);
  });

  test('switches the email, uses the link up, and tells the old address', async () => {
    reset();
    tokenOwner = { _id: 'u1', name: 'Asha', email: 'asha@example.com', pendingEmail: 'new@example.com' };
    const res = await confirm({ token });

    assert.equal(res.statusCode, 200);
    assert.equal(updates[0].update.$set.email, 'new@example.com');
    assert.ok('pendingEmailHash' in updates[0].update.$unset);
    assert.equal(sent[0].to, 'asha@example.com');
    assert.match(sent[0].text, /changed to new@example.com/);
  });

  test('refuses when the address was taken by someone else in the meantime', async () => {
    reset();
    tokenOwner = { _id: 'u1', name: 'Asha', email: 'asha@example.com', pendingEmail: 'new@example.com' };
    existingByEmail['new@example.com'] = { _id: 'u9' };

    assert.equal((await confirm({ token })).statusCode, 409);
    assert.equal(updates.length, 0);
  });
});
