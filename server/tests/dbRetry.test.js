const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
require('./helpers');
const { connectWithRetry } = require('../config/db');

const quietLog = () => {
  const lines = [];
  return { lines, log: (m) => lines.push(m), error: (m) => lines.push(m) };
};

describe('database connection retry', () => {
  test('keeps trying, with longer waits, and connects as soon as the database allows it', async () => {
    let calls = 0;
    const waits = [];
    const log = quietLog();

    const connected = await connectWithRetry({
      connect: async () => {
        calls += 1;
        if (calls < 4) throw new Error('IP not allowed');
      },
      wait: async (ms) => waits.push(ms),
      log,
    });

    assert.equal(connected, true);
    assert.equal(calls, 4);
    assert.deepEqual(waits, [2000, 4000, 8000]);
    assert.ok(log.lines.some((line) => /Network Access/.test(line)), 'prints a helpful hint');
  });

  test('waits never grow beyond 30 seconds and it gives up after the limit', async () => {
    const waits = [];

    const connected = await connectWithRetry({
      connect: async () => {
        throw new Error('still blocked');
      },
      wait: async (ms) => waits.push(ms),
      log: quietLog(),
      giveUpAfterMs: 100000,
    });

    assert.equal(connected, false);
    assert.ok(Math.max(...waits) <= 30000);
    assert.equal(waits.slice(0, 5).join(','), '2000,4000,8000,16000,30000');
  });

  test('the connection string is never printed', async () => {
    const log = quietLog();

    await connectWithRetry({
      connect: async () => {
        throw new Error('bad auth');
      },
      wait: async () => {},
      log,
      giveUpAfterMs: 5000,
    });

    assert.ok(log.lines.every((line) => !/mongodb(\+srv)?:\/\//i.test(line)));
  });
});
