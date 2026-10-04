const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { stub, load, hex, fakeRes } = require('./helpers');

const ADMIN = hex('a');
const PERSON = hex('b');
const OTHER_ADMIN = hex('c');
let people = {};
const calls = [];

stub('models/User', {
  findById: (id) => ({ select: async () => people[id] || null }),
  deleteOne: async (filter) => calls.push(['user deleted', String(filter._id)]),
});
const owned = (name) => ({ deleteMany: async (filter) => calls.push([name, String(filter.user)]) });
stub('models/Enrollment', owned('enrollments'));
stub('models/Goal', owned('goals'));
stub('models/GoalEntry', owned('goalEntries'));
stub('models/Course', {});

const { removeUser } = load('controllers/adminController');

const call = async (id, body) => {
  calls.length = 0;
  const res = fakeRes();
  await removeUser({ user: { id: ADMIN }, params: { id }, body }, res);
  return res;
};

const reset = () => {
  people = {
    [PERSON]: { _id: PERSON, email: 'ada@example.com', role: 'user' },
    [OTHER_ADMIN]: { _id: OTHER_ADMIN, email: 'boss@example.com', role: 'admin' },
    [ADMIN]: { _id: ADMIN, email: 'me@example.com', role: 'admin' },
  };
};

describe('admin removes a user', () => {
  test('deletes the person and everything they own once the email is typed correctly', async () => {
    reset();
    const res = await call(PERSON, { email: ' Ada@Example.com ' });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(
      calls.map(([what]) => what).sort(),
      ['enrollments', 'goalEntries', 'goals', 'user deleted']
    );
    assert.ok(calls.every(([, id]) => id === PERSON), 'only that person\'s data is touched');
  });

  test('refuses without the right email, so nothing is deleted by accident', async () => {
    reset();
    assert.equal((await call(PERSON, {})).statusCode, 400);
    assert.equal((await call(PERSON, { email: '' })).statusCode, 400);
    assert.equal((await call(PERSON, { email: 'someone-else@example.com' })).statusCode, 400);
    assert.equal(calls.length, 0);
  });

  test('never removes an admin or yourself', async () => {
    reset();
    assert.equal((await call(OTHER_ADMIN, { email: 'boss@example.com' })).statusCode, 403);
    assert.equal((await call(ADMIN, { email: 'me@example.com' })).statusCode, 400);
    assert.equal(calls.length, 0);
  });

  test('bad or unknown ids are rejected', async () => {
    reset();
    assert.equal((await call('not-an-id', { email: 'x@example.com' })).statusCode, 400);
    assert.equal((await call(hex('f'), { email: 'x@example.com' })).statusCode, 404);
    assert.equal(calls.length, 0);
  });
});
