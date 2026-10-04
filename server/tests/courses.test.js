const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { stub, load, hex, fakeRes } = require('./helpers');

const LESSON_1 = hex('1');
const LESSON_2 = hex('2');
const LESSON_3 = hex('3');
const REMOVED = hex('9');

let enrollmentRows = [];
let bulk = null;
let enrollmentExists = false;
let archived = { _id: hex('a'), title: 'React Basics', deletedAt: new Date() };
let deletedId = null;
let created = null;
let listRows = [];
let listSelect = '';

stub('models/Enrollment', {
  find: () => ({ select: () => ({ lean: async () => enrollmentRows }) }),
  bulkWrite: async (operations) => {
    bulk = operations;
  },
  exists: async () => (enrollmentExists ? { _id: 1 } : null),
  countDocuments: async () => 0,
  aggregate: async () => [],
});
stub('models/Course', {
  findById: () => ({ select: () => ({ lean: async () => archived }) }),
  deleteOne: async (filter) => {
    deletedId = String(filter._id);
  },
  create: async (doc) => {
    created = doc;
    return { toObject: () => ({ ...doc, _id: 'new' }) };
  },
  find: () => {
    const query = {
      select: (fields) => {
        listSelect = fields;
        return query;
      },
      populate: () => query,
      sort: () => query,
      skip: () => query,
      limit: () => query,
      lean: async () => listRows,
    };
    return query;
  },
  countDocuments: async () => listRows.length,
});

const { recomputeEnrollmentProgress, computeProgress } = load('utils/progress');
const admin = load('controllers/adminController');
const courses = load('controllers/courseController');

describe('progress after a course changes', () => {
  const course = { _id: hex('c'), modules: [{ lessons: [{ _id: LESSON_1 }, { _id: LESSON_2 }, { _id: LESSON_3 }] }] };

  test('stale lessons are dropped, new lessons reopen a "completed" course, correct rows are left alone', async () => {
    enrollmentRows = [
      { _id: 'removed-lesson', status: 'completed', completedAt: new Date(), progress: { percentage: 100, completedLessons: [LESSON_1, LESSON_2, REMOVED] } },
      { _id: 'lesson-added', status: 'completed', completedAt: new Date(), progress: { percentage: 100, completedLessons: [LESSON_1, LESSON_2] } },
      { _id: 'already-right', status: 'active', completedAt: null, progress: { percentage: 67, completedLessons: [LESSON_1, LESSON_2] } },
      { _id: 'now-done', status: 'active', completedAt: null, progress: { percentage: 66, completedLessons: [LESSON_1, LESSON_2, LESSON_3] } },
    ];

    const updated = await recomputeEnrollmentProgress(course);
    const changes = Object.fromEntries(bulk.map((op) => [op.updateOne.filter._id, op.updateOne.update.$set]));

    assert.equal(updated, 3);
    assert.equal(changes['removed-lesson']['progress.percentage'], 67);
    assert.equal(changes['removed-lesson'].status, 'active');
    assert.deepEqual(changes['removed-lesson']['progress.completedLessons'], [LESSON_1, LESSON_2]);
    assert.equal(changes['lesson-added'].status, 'active');
    assert.equal(changes['lesson-added'].completedAt, null);
    assert.equal(changes['already-right'], undefined);
    assert.equal(changes['now-done']['progress.percentage'], 100);
    assert.equal(changes['now-done'].status, 'completed');
  });

  test('percentage is 100 only when every lesson is done', () => {
    const lessons = new Set(['a', 'b', 'c']);
    assert.equal(computeProgress(['a', 'b'], lessons).percentage, 67);
    assert.equal(computeProgress(['a', 'b', 'c'], lessons).percentage, 100);
    assert.equal(computeProgress([], new Set()).percentage, 0);
    assert.equal(computeProgress(['a'], new Set(Array.from({ length: 1000 }, (_, i) => `l${i}`).concat('a'))).percentage, 0);
  });
});

describe('permanent delete', () => {
  const purge = async (body) => {
    const res = fakeRes();
    await admin.purgeCourse({ params: { id: hex('a') }, body }, res);
    return res;
  };

  test('refused unless archived, title typed exactly, and nobody is enrolled', async () => {
    archived = { _id: hex('a'), title: 'React Basics', deletedAt: null };
    assert.equal((await purge({ confirmTitle: 'React Basics' })).statusCode, 400);

    archived.deletedAt = new Date();
    assert.equal((await purge({ confirmTitle: 'wrong' })).statusCode, 400);

    enrollmentExists = true;
    assert.equal((await purge({ confirmTitle: 'React Basics' })).statusCode, 409);
    enrollmentExists = false;
    assert.equal(deletedId, null, 'nothing was deleted so far');
  });

  test('succeeds for an archived course with no learners and the right title', async () => {
    const res = await purge({ confirmTitle: 'React Basics' });
    assert.equal(res.statusCode, 200);
    assert.equal(deletedId, hex('a'));
  });
});

describe('course list', () => {
  test('each course reports its module count and never carries lesson content', async () => {
    listRows = [
      { _id: hex('1'), title: 'With modules', modules: [{ _id: hex('a') }, { _id: hex('b') }, { _id: hex('c') }] },
      { _id: hex('2'), title: 'Empty', modules: [] },
      { _id: hex('3'), title: 'Old record without the field' },
    ];

    const res = fakeRes();
    await courses.listCourses({ query: {} }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(
      res.body.courses.map((course) => course.moduleCount),
      [3, 0, 0],
    );
    assert.ok(res.body.courses.every((course) => course.modules === undefined));
    assert.match(listSelect, /-modules.lessons/, 'lesson content is excluded from the listing query');
  });
});

describe('creating a course', () => {
  test('the instructor is always the signed-in admin, whatever the request says', async () => {
    const res = fakeRes();
    await courses.createCourse(
      {
        user: { id: hex('u') },
        body: {
          title: 'New course',
          description: 'A long enough description',
          category: 'Web',
          level: 'beginner',
          instructor: hex('f'),
          published: true,
        },
      },
      res,
    );

    assert.equal(res.statusCode, 201);
    assert.equal(created.instructor, hex('u'));
    assert.ok(created.publishedAt instanceof Date, 'publishing sets publishedAt');
  });
});
