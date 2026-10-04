const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { isEmail, isValidId, escapeRegex } = require('../utils/validate');

describe('shared checks', () => {
  test('an email must look right and stay within 254 characters', () => {
    assert.equal(isEmail('asha@example.com'), true);
    assert.equal(isEmail('  asha@example.com  '), true);
    assert.equal(isEmail('no-at-sign.com'), false);
    assert.equal(isEmail('a@b'), false);
    assert.equal(isEmail('two words@example.com'), false);
    assert.equal(isEmail(`${'a'.repeat(250)}@example.com`), false);
    assert.equal(isEmail(undefined), false);
    assert.equal(isEmail({ $ne: '' }), false);
  });

  test('ids are 24 hex characters', () => {
    assert.equal(isValidId('a'.repeat(24)), true);
    assert.equal(isValidId('a'.repeat(23)), false);
    assert.equal(isValidId('g'.repeat(24)), false);
    assert.equal(isValidId({ $gt: '' }), false);
  });

  test('typed text is matched literally inside a regular expression', () => {
    assert.ok(new RegExp(escapeRegex('c++ (x)'), 'i').test('Learn C++ (X) today'));
    assert.equal(new RegExp(escapeRegex('a.b')).test('axb'), false);
  });
});
