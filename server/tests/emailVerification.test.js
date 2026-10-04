const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { stub, load, fakeRes } = require('./helpers');

let existing = null; // what findOne returns for the email lookup in register / resend
let tokenOwner = null; // what findOne returns for the token lookup
let loginUser = null;
let created = null;
let findFilter = null;
const updates = [];
const deleted = [];
const sent = [];
let mailWorks = true;

const chain = (value) => ({ select: async () => value, then: (resolve) => resolve(value) });

stub('models/User', {
  findOne: (filter) => {
    findFilter = filter;
    if (filter.verifyEmailHash) return chain(tokenOwner);
    return chain(loginUser || existing);
  },
  create: async (doc) => {
    created = doc;
    return { _id: 'new1', ...doc };
  },
  deleteOne: async (filter) => {
    deleted.push(filter);
  },
  updateOne: async (filter, update) => {
    updates.push({ filter, update });
  },
});
stub('utils/mailer', {
  sendMail: async (message) => {
    sent.push(message);
    return mailWorks;
  },
});

const { register, login, verifyEmail, resendVerification } = load('controllers/authController');

const call = async (handler, body) => {
  const res = fakeRes();
  await handler({ body }, res);
  return res;
};

const clear = () => {
  existing = null;
  tokenOwner = null;
  loginUser = null;
  created = null;
  findFilter = null;
  mailWorks = true;
  updates.length = 0;
  deleted.length = 0;
  sent.length = 0;
};

const signUp = { name: 'Asha', email: 'Asha@Example.com', password: 'long-enough-1' };

describe('register with email confirmation', () => {
  test('creates an unconfirmed account, emails a link and gives no login token', async () => {
    clear();
    const res = await call(register, signUp);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.verificationRequired, true);
    assert.equal(res.body.emailSent, true);
    assert.equal(res.body.token, undefined, 'no login before the email is confirmed');
    assert.equal(created.emailVerified, false);
    assert.equal(created.email, 'asha@example.com');

    const link = sent[0].text.match(/verify-email\?token=([a-f0-9]{64})/);
    assert.ok(link);
    assert.equal(created.verifyEmailHash, crypto.createHash('sha256').update(link[1]).digest('hex'));
    assert.notEqual(created.verifyEmailHash, link[1], 'the token itself is not stored');
    const hours = (created.verifyEmailExpires - Date.now()) / 3600000;
    assert.ok(hours > 23 && hours <= 24);
  });

  test('says so when the email could not be sent', async () => {
    clear();
    mailWorks = false;
    const res = await call(register, signUp);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.emailSent, false);
    assert.match(res.body.message, /could not be sent/);
  });

  test('a confirmed account blocks the email; a fresh unconfirmed one asks to check the inbox', async () => {
    clear();
    existing = { _id: 'u1', emailVerified: true, createdAt: new Date() };
    assert.equal((await call(register, signUp)).statusCode, 409);

    existing = { _id: 'u2', emailVerified: false, createdAt: new Date() };
    const res = await call(register, signUp);
    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /waiting to be confirmed/);
    assert.equal(deleted.length, 0);
  });

  test('an unconfirmed account older than a day is replaced so the real owner can register', async () => {
    clear();
    existing = { _id: 'old1', emailVerified: false, createdAt: new Date(Date.now() - 25 * 3600 * 1000) };
    const res = await call(register, signUp);

    assert.equal(res.statusCode, 201);
    assert.deepEqual(deleted[0], { _id: 'old1', emailVerified: false });
  });
});

describe('login before confirmation', () => {
  test('the right password is refused with a clear code until the email is confirmed', async () => {
    clear();
    loginUser = {
      _id: 'u1',
      role: 'user',
      emailVerified: false,
      passwordHash: bcrypt.hashSync('long-enough-1', 4),
    };
    const res = await call(login, { email: 'asha@example.com', password: 'long-enough-1' });

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'EMAIL_NOT_VERIFIED');
    assert.equal(res.body.token, undefined);
  });

  test('a wrong password still gets the normal 401, and older accounts (no value stored) log in', async () => {
    clear();
    loginUser = { _id: 'u1', role: 'user', emailVerified: false, passwordHash: bcrypt.hashSync('other-pass-123', 4) };
    assert.equal((await call(login, { email: 'asha@example.com', password: 'long-enough-1' })).statusCode, 401);

    loginUser = { _id: 'u2', role: 'user', name: 'Old', email: 'o@example.com', passwordHash: bcrypt.hashSync('long-enough-1', 4) };
    const ok = await call(login, { email: 'o@example.com', password: 'long-enough-1' });
    assert.equal(ok.statusCode, 200);
    assert.ok(ok.body.token);
  });
});

describe('confirm the email', () => {
  const token = 'b'.repeat(64);

  test('rejects a malformed, unknown or expired token', async () => {
    clear();
    assert.equal((await call(verifyEmail, { token: 'bad' })).statusCode, 400);
    assert.equal((await call(verifyEmail, { token })).statusCode, 400);
    assert.equal(findFilter.verifyEmailHash, crypto.createHash('sha256').update(token).digest('hex'));
    assert.ok(findFilter.verifyEmailExpires.$gt instanceof Date);
    assert.equal(updates.length, 0);
  });

  test('a valid token confirms the account once and uses the link up', async () => {
    clear();
    tokenOwner = { _id: 'u1' };
    const res = await call(verifyEmail, { token });

    assert.equal(res.statusCode, 200);
    assert.equal(updates[0].update.$set.emailVerified, true);
    assert.ok('verifyEmailHash' in updates[0].update.$unset && 'verifyEmailExpires' in updates[0].update.$unset);
  });
});

describe('resend the confirmation email', () => {
  test('only an unconfirmed account gets a new link, but everyone gets the same answer', async () => {
    clear();
    existing = { _id: 'u1', name: 'Asha', email: 'asha@example.com', emailVerified: false };
    const waiting = await call(resendVerification, { email: 'asha@example.com' });

    existing = { _id: 'u2', name: 'Ravi', email: 'ravi@example.com', emailVerified: true };
    const done = await call(resendVerification, { email: 'ravi@example.com' });

    existing = null;
    const unknown = await call(resendVerification, { email: 'ghost@example.com' });

    assert.deepEqual(waiting.body, done.body);
    assert.deepEqual(waiting.body, unknown.body);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 'asha@example.com');
    assert.equal((await call(resendVerification, { email: 'nope' })).statusCode, 400);
  });
});
