const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/User');

describe('user indexes', () => {
  test('unconfirmed accounts expire with their confirmation link, and only those', () => {
    const entry = User.schema.indexes().find(([fields]) => 'verifyEmailExpires' in fields);

    assert.ok(entry, 'there is an index on verifyEmailExpires');
    assert.equal(entry[1].expireAfterSeconds, 0);
    assert.deepEqual(entry[1].partialFilterExpression, { emailVerified: false });
  });

  test('a confirmed account never carries an expiry that could delete it', () => {
    // verifyEmailExpires is only set while the account is unconfirmed; the model default is "none".
    const field = User.schema.path('verifyEmailExpires');
    assert.equal(field.options.default, null);
    assert.equal(User.schema.path('emailVerified').options.default, true);
  });
});
