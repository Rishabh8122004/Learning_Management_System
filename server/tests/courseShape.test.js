const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { stub, load, fakeRes } = require('./helpers');

let saved = false;
const RealCourse = require('../models/Course');
const makeCourse = () => {
  const doc = new RealCourse({ title: 'Title', description: 'A valid description', category: 'Cat', level: 'beginner', instructor: '1'.repeat(24) });
  doc.save = async () => {
    saved = true;
  };
  return doc;
};

stub('models/Course', {
  findById: async () => makeCourse(),
  create: async () => {
    saved = true;
    return { toObject: () => ({}) };
  },
});
stub('models/Enrollment', { find: () => ({ select: () => ({ lean: async () => [] }) }), bulkWrite: async () => {} });

const { createCourse, updateCourse } = load('controllers/courseController');

const send = async (handler, body) => {
  saved = false;
  const res = fakeRes();
  await handler({ params: { id: '2'.repeat(24) }, body, user: { id: '1'.repeat(24) } }, res);
  return res;
};

describe('course lists must be lists', () => {
  test('a null or text "modules" or "tags" is refused with 400, never saved, never a 500', async () => {
    for (const body of [{ modules: null }, { modules: 'x' }, { modules: {} }, { tags: null }, { tags: 'a,b' }]) {
      const update = await send(updateCourse, body);
      assert.equal(update.statusCode, 400, JSON.stringify(body));
      assert.equal(saved, false);

      const create = await send(createCourse, { title: 'Title', description: 'A valid description', category: 'Cat', level: 'beginner', ...body });
      assert.equal(create.statusCode, 400, JSON.stringify(body));
      assert.equal(saved, false);
    }
  });

  test('real lists still work', async () => {
    const res = await send(updateCourse, { modules: [], tags: ['a'] });

    assert.equal(res.statusCode, 200);
    assert.equal(saved, true);
  });
});
