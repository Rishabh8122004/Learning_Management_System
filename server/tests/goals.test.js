const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { stub, load, hex, fakeRes, daysFromNow, dayString } = require('./helpers');

const ROOT = hex('a');
const MID = hex('b'); // no due date of its own
const LEAF = hex('c');
const CHILD = hex('d');

// ROOT (due +10) -> MID (undated) -> LEAF (due +5);  ROOT -> CHILD (due +7)
const goals = [
  { _id: ROOT, parentGoal: null, rootGoal: ROOT, targetDate: daysFromNow(10), title: 'Root' },
  { _id: MID, parentGoal: ROOT, rootGoal: ROOT, targetDate: null, title: 'Mid' },
  { _id: LEAF, parentGoal: MID, rootGoal: ROOT, targetDate: daysFromNow(5), title: 'Leaf' },
  { _id: CHILD, parentGoal: ROOT, rootGoal: ROOT, targetDate: daysFromNow(7), title: 'Child' },
];

let lastGoalFilter = null;
let entryCall = null;
let entryDuplicate = false;

stub('models/Goal', {
  find: () => ({ select: () => ({ lean: async () => goals }) }),
  create: async (doc) => ({ ...doc, _id: 'new' }),
  findOne: async (filter) => {
    lastGoalFilter = filter;
    return goals.find((goal) => goal._id === filter._id && filter.user === 'owner') || null;
  },
  exists: async () => null,
  findOneAndUpdate: async (filter, update) => ({ _id: filter._id, ...update.$set }),
});
stub('models/GoalEntry', {
  findOneAndUpdate: async (...args) => {
    entryCall = args;
    if (entryDuplicate) throw Object.assign(new Error('duplicate'), { code: 11000 });
    return { value: 5 };
  },
});

const controller = load('controllers/goalController');

const call = async (handler, { params = {}, body = {} } = {}) => {
  const res = fakeRes();
  await handler({ params, body, user: { id: 'owner' } }, res);
  return res;
};
const goal = (extra) => ({ title: 'A goal', trackingType: 'milestones', ...extra });

describe('goal due dates', () => {
  test('a new goal cannot be due in the past, but today is fine', async () => {
    // Two days back: "today" is judged in UTC-12, so yesterday (UTC) can still count as today there.
    const past = await call(controller.createGoal, { body: goal({ targetDate: dayString(-2) }) });
    assert.equal(past.statusCode, 400);
    assert.match(past.body.message, /past/);

    assert.equal((await call(controller.createGoal, { body: goal({ targetDate: dayString(0) }) })).statusCode, 201);
  });

  test('a sub-goal cannot be due after its parent, but can be equal or earlier', async () => {
    const late = await call(controller.createSubgoal, { params: { id: ROOT }, body: goal({ targetDate: dayString(11) }) });
    assert.equal(late.statusCode, 400);
    assert.match(late.body.message, /on or before/);

    assert.equal((await call(controller.createSubgoal, { params: { id: ROOT }, body: goal({ targetDate: dayString(10) }) })).statusCode, 201);
    assert.equal((await call(controller.createSubgoal, { params: { id: ROOT }, body: goal({ targetDate: dayString(2) }) })).statusCode, 201);
  });

  test('the nearest dated ancestor still applies when a middle goal has no date', async () => {
    const res = await call(controller.createSubgoal, { params: { id: MID }, body: goal({ targetDate: dayString(11) }) });
    assert.equal(res.statusCode, 400);
  });

  test('a parent cannot be moved before one of its sub-goals', async () => {
    const res = await call(controller.updateGoal, { params: { id: ROOT }, body: goal({ targetDate: dayString(6) }) });
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /Child/);
  });

  test('a parent can move after all sub-goals, keep its date, or clear it', async () => {
    assert.equal((await call(controller.updateGoal, { params: { id: ROOT }, body: goal({ targetDate: dayString(8) }) })).statusCode, 200);
    assert.equal((await call(controller.updateGoal, { params: { id: ROOT }, body: goal({ targetDate: dayString(10) }) })).statusCode, 200);
    assert.equal((await call(controller.updateGoal, { params: { id: ROOT }, body: goal({ targetDate: null }) })).statusCode, 200);
  });
});

describe('ownership', () => {
  test('goals are always looked up together with the signed-in user', async () => {
    const res = await call(controller.updateGoal, { params: { id: ROOT }, body: goal({}) });
    assert.equal(res.statusCode, 200);
    assert.equal(lastGoalFilter.user, 'owner');
  });

  test("someone else's goal is not found", async () => {
    const res = fakeRes();
    await controller.updateGoal({ params: { id: ROOT }, body: goal({}), user: { id: 'intruder' } }, res);
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'Goal not found');
  });
});

describe('progress entries', () => {
  test('same-day logs are summed into one entry (atomic upsert)', async () => {
    goals[0].trackingType = 'habit';
    const res = await call(controller.createEntry, { params: { id: ROOT }, body: { value: 30, localDate: dayString(0), note: 'x' } });
    goals[0].trackingType = undefined;

    assert.equal(res.statusCode, 201);
    const [filter, update, options] = entryCall;
    assert.equal(filter.localDate, dayString(0));
    assert.equal(filter.user, 'owner');
    assert.deepEqual(update.$inc, { value: 30 });
    assert.equal(options.upsert, true);
  });

  test('future dates, bad amounts and fake dates are rejected', async () => {
    goals[0].trackingType = 'target';
    const send = (body) => call(controller.createEntry, { params: { id: ROOT }, body });

    assert.equal((await send({ value: 1, localDate: '2999-01-01' })).statusCode, 400);
    assert.equal((await send({ value: -1, localDate: dayString(0) })).statusCode, 400);
    assert.equal((await send({ value: 1, localDate: '2026-13-45' })).statusCode, 400);

    entryDuplicate = true;
    const clash = await send({ value: 1, localDate: dayString(0) });
    entryDuplicate = false;
    goals[0].trackingType = undefined;

    assert.equal(clash.statusCode, 409);
  });
});
