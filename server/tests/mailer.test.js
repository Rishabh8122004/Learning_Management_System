const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { sendMail, describeMailSettings } = require('../utils/mailer');

const message = { to: 'a@example.com', subject: 'Hi', text: 'Hello', html: '<p>Hello</p>' };

describe('mail settings report', () => {
  test('says only whether a setting is present and how long it is, never its value', () => {
    const report = describeMailSettings({ BREVO_API_KEY: 'super-secret-key', MAIL_FROM: '   ', 'MAIL_FROM ': 'typo@example.com' });

    assert.deepEqual(report.BREVO_API_KEY, { present: true, length: 16 });
    assert.deepEqual(report.MAIL_FROM, { present: false, length: 3 });
    assert.deepEqual([...report.similarNames].sort(), ['"BREVO_API_KEY"', '"MAIL_FROM"', '"MAIL_FROM "']);
    assert.equal(JSON.stringify(report).includes('super-secret-key'), false);
    assert.equal(JSON.stringify(report).includes('typo@example.com'), false);
  });

  test('a setting pasted with spaces around it still counts as configured', async () => {
    process.env.BREVO_API_KEY = '  key-with-spaces \n';
    process.env.MAIL_FROM = ' sender@example.com ';
    let request;

    await sendMail(message, async (url, options) => {
      request = options;
      return { ok: true, status: 201 };
    });

    assert.equal(request.headers['api-key'], 'key-with-spaces');
    assert.equal(JSON.parse(request.body).sender.email, 'sender@example.com');
  });
});

describe('mailer', () => {
  test('does nothing and reports false when email is not configured', async () => {
    delete process.env.BREVO_API_KEY;
    delete process.env.MAIL_FROM;
    let called = false;

    assert.equal(await sendMail(message, async () => { called = true; }), false);
    assert.equal(called, false);
  });

  test('sends one request to Brevo with the key in a header, not in the body', async () => {
    process.env.BREVO_API_KEY = 'test-key-not-real';
    process.env.MAIL_FROM = 'sender@example.com';
    let request;

    const ok = await sendMail(message, async (url, options) => {
      request = { url, options };
      return { ok: true, status: 201 };
    });

    assert.equal(ok, true);
    assert.equal(request.url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(request.options.headers['api-key'], 'test-key-not-real');
    assert.equal(request.options.body.includes('test-key-not-real'), false);
    assert.deepEqual(JSON.parse(request.options.body).to, [{ email: 'a@example.com' }]);
  });

  test('a refused or failed send returns false instead of throwing', async () => {
    process.env.BREVO_API_KEY = 'test-key-not-real';
    process.env.MAIL_FROM = 'sender@example.com';

    assert.equal(await sendMail(message, async () => ({ ok: false, status: 401 })), false);
    assert.equal(await sendMail(message, async () => { throw new Error('network down'); }), false);
  });
});
