const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { stub, load, fakeRes } = require('./helpers');

// Real model documents (not plain objects), exactly what the database layer hands the controller.
const RealGoal = require('../models/Goal');
const USER = '1'.repeat(24);

const habitGoal = () =>
  new RealGoal({
    user: USER,
    title: 'Run',
    trackingType: 'habit',
    habit: { period: 'week', targetValue: 3, unit: 'times', daysOfWeek: [1, 3] },
  });
const targetGoal = () =>
  new RealGoal({ user: USER, title: 'Read', trackingType: 'target', target: { targetValue: 10, unit: 'books', period: 'total' } });

let current;
let lastUpdate = null;

stub('models/Goal', {
  findOne: async () => current,
  exists: async () => null,
  find: () => ({ select: () => ({ lean: async () => [] }) }),
  findOneAndUpdate: async (filter, update) => {
    lastUpdate = update;
    return { ...update.$set };
  },
});
stub('models/GoalEntry', {});

const controller = load('controllers/goalController');

const patch = async (body) => {
  const res = fakeRes();
  await controller.updateGoal({ params: { id: '2'.repeat(24) }, body, user: { id: USER } }, res);
  return res;
};

describe('editing a habit or target goal without resending its details', () => {
  test('pausing a habit goal keeps its habit settings', async () => {
    current = habitGoal();
    const res = await patch({ status: 'paused' });

    assert.equal(res.statusCode, 200, res.body && res.body.message);
    assert.deepEqual(lastUpdate.$set.habit, { period: 'week', targetValue: 3, unit: 'times', daysOfWeek: [1, 3] });
    assert.equal(lastUpdate.$set.status, 'paused');
  });

  test('renaming a target goal keeps its target', async () => {
    current = targetGoal();
    const res = await patch({ title: 'Read more' });

    assert.equal(res.statusCode, 200, res.body && res.body.message);
    assert.deepEqual(lastUpdate.$set.target, { targetValue: 10, unit: 'books', period: 'total' });
  });
});
