const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { stub, load, fakeRes } = require('./helpers');

let accounts = {};
const updates = [];
const deleted = [];
const sent = [];
const removedData = [];

stub('models/User', {
  findOne: (filter) => {
    const found = accounts[filter.email] || null;
    return { select: async () => found, then: (resolve) => resolve(found) };
  },
  updateOne: async (filter, update) => {
    updates.push({ filter, update });
  },
  deleteOne: async (filter) => {
    deleted.push(filter);
  },
});
stub('utils/mailer', {
  sendMail: async (message) => {
    sent.push(message);
    return true;
  },
});
stub('utils/removeUser', {
  removeUserAndData: async (id) => {
    removedData.push(id);
  },
});

const { changeUnconfirmedEmail, deleteUnconfirmedAccount } = load('controllers/authController');

const PASSWORD = 'long-enough-1';
const reset = () => {
  accounts = {
    'fake@email.com': {
      _id: 'u1',
      name: 'Asha',
      email: 'fake@email.com',
      emailVerified: false,
      createdAt: new Date(),
      passwordHash: bcrypt.hashSync(PASSWORD, 4),
    },
    'done@example.com': {
      _id: 'u2',
      name: 'Ravi',
      email: 'done@example.com',
      emailVerified: true,
      createdAt: new Date(),
      passwordHash: bcrypt.hashSync(PASSWORD, 4),
    },
    'taken@example.com': { _id: 'u3', email: 'taken@example.com', emailVerified: true, createdAt: new Date() },
  };
  updates.length = 0;
  deleted.length = 0;
  sent.length = 0;
  removedData.length = 0;
};

const call = async (handler, body) => {
  const res = fakeRes();
  await handler({ body }, res);
  return res;
};

describe('change the email of an unconfirmed account', () => {
  test('with the password, moves the account to the new address and emails a fresh link there', async () => {
    reset();
    const res = await call(changeUnconfirmedEmail, { email: 'fake@email.com', password: PASSWORD, newEmail: ' Real@Example.com ' });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.email, 'real@example.com');
    assert.equal(updates[0].update.$set.email, 'real@example.com');
    assert.equal(sent[0].to, 'real@example.com');

    const link = sent[0].text.match(/verify-email\?token=([a-f0-9]{64})/);
    assert.equal(updates[0].update.$set.verifyEmailHash, crypto.createHash('sha256').update(link[1]).digest('hex'));
  });

  test('refuses a wrong password, a confirmed account, a bad or taken new email', async () => {
    reset();
    assert.equal((await call(changeUnconfirmedEmail, { email: 'fake@email.com', password: 'wrong-pass-123', newEmail: 'a@b.co' })).statusCode, 401);
    assert.equal((await call(changeUnconfirmedEmail, { email: 'nobody@example.com', password: PASSWORD, newEmail: 'a@b.co' })).statusCode, 401);
    assert.equal((await call(changeUnconfirmedEmail, { email: 'done@example.com', password: PASSWORD, newEmail: 'a@b.co' })).statusCode, 400);
    assert.equal((await call(changeUnconfirmedEmail, { email: 'fake@email.com', password: PASSWORD, newEmail: 'nope' })).statusCode, 400);
    assert.equal((await call(changeUnconfirmedEmail, { email: 'fake@email.com', password: PASSWORD, newEmail: 'fake@email.com' })).statusCode, 400);
    assert.equal((await call(changeUnconfirmedEmail, { email: 'fake@email.com', password: PASSWORD, newEmail: 'taken@example.com' })).statusCode, 409);
    assert.equal(updates.length, 0);
    assert.equal(sent.length, 0);
  });
});

describe('delete an unconfirmed account yourself', () => {
  test('with the password, removes the account', async () => {
    reset();
    const res = await call(deleteUnconfirmedAccount, { email: 'fake@email.com', password: PASSWORD });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(removedData, ['u1']);
  });

  test('never works without the password, or on a confirmed account', async () => {
    reset();
    assert.equal((await call(deleteUnconfirmedAccount, { email: 'fake@email.com', password: 'wrong-pass-123' })).statusCode, 401);
    assert.equal((await call(deleteUnconfirmedAccount, { email: 'fake@email.com' })).statusCode, 400);
    assert.equal((await call(deleteUnconfirmedAccount, { email: 'done@example.com', password: PASSWORD })).statusCode, 400);
    assert.equal(removedData.length, 0);
  });
});
