const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { stub, load, hex, fakeRes } = require('./helpers');

let found = [];
let lastFilter = null;
let lastSelect = '';

stub('models/User', {
  find: (filter) => {
    lastFilter = filter;
    const query = {
      select: (fields) => {
        lastSelect = fields;
        return query;
      },
      sort: () => query,
      skip: () => query,
      limit: () => query,
      lean: async () => found,
    };
    return query;
  },
  countDocuments: async () => found.length,
});
stub('models/Enrollment', {
  aggregate: async () => [{ _id: hex('1'), count: 3 }],
});
stub('models/Course', {});

const admin = load('controllers/adminController');

describe('admin users list', () => {
  test('returns safe fields with an enrollment count per user', async () => {
    found = [
      { _id: hex('1'), name: 'Ada', email: 'ada@example.com', role: 'user', createdAt: new Date(), passwordHash: 'secret', tokenVersion: 4 },
      { _id: hex('2'), name: 'Grace', email: 'grace@example.com', role: 'admin', createdAt: new Date() },
    ];

    const res = fakeRes();
    await admin.listUsers({ query: {} }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.users.map((user) => user.enrollments), [3, 0]);
    assert.ok(res.body.users.every((user) => user.passwordHash === undefined && user.tokenVersion === undefined));
    assert.match(lastSelect, /name email role createdAt/);
    assert.equal(res.body.pagination.total, 2);
  });

  test('search matches name or email, with special characters treated as plain text', async () => {
    const res = fakeRes();
    await admin.listUsers({ query: { search: 'a.b+' } }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(lastFilter.$or.length, 2);
    assert.equal(lastFilter.$or[0].name.test('a.b+'), true);
    assert.equal(lastFilter.$or[0].name.test('axb'), false);
  });

  test('rejects non-text query values', async () => {
    const res = fakeRes();
    await admin.listUsers({ query: { search: { $ne: 'x' } } }, res);

    assert.equal(res.statusCode, 400);
  });
});
