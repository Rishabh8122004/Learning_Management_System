const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { stub, load, fakeRes } = require('./helpers');

let filterUsed = null;
let distinctCall = null;

stub('models/Course', {
  find: (filter) => {
    filterUsed = filter;
    const query = { select: () => query, populate: () => query, sort: () => query, skip: () => query, limit: () => query, lean: async () => [] };
    return query;
  },
  countDocuments: async () => 0,
  distinct: async (field, filter) => {
    distinctCall = { field, filter };
    return ['Web Development', 'databases', 'Databases', ' Tools ', ''];
  },
});

const { listCourses, listCategories } = load('controllers/courseController');

const search = async (query) => {
  const res = fakeRes();
  await listCourses({ query }, res);
  return res;
};

// Which fields a text must match for one search word.
const matches = (clause, text) => clause.$or.some((condition) => Object.values(condition)[0].test(text));

describe('public course search', () => {
  test('a part of a word finds the course, in any of title, description, category or tags', async () => {
    await search({ search: 'reac' });
    const [clause] = filterUsed.$and;

    assert.ok(matches(clause, 'React Fundamentals'));
    assert.ok(!matches(clause, 'Python for Beginners'));
    assert.ok(clause.$or.some((condition) => 'tags' in condition), 'tags are searched too');
  });

  test('every word must match, in any order', async () => {
    await search({ search: '  script   type ' });

    assert.equal(filterUsed.$and.length, 2);
    assert.ok(filterUsed.$and.every((clause) => matches(clause, 'TypeScript Essentials')));
    assert.ok(!filterUsed.$and.every((clause) => matches(clause, 'JavaScript Essentials')));
  });

  test('special characters are matched literally and never break the query', async () => {
    const res = await search({ search: 'c++ (beta) [x]' });

    assert.equal(res.statusCode, 200);
    assert.ok(matches(filterUsed.$and[0], 'C++ basics'));
  });

  test('no search text means no text filter, and the list stays published only', async () => {
    await search({});

    assert.equal(filterUsed.$and, undefined);
    assert.equal(filterUsed.published, true);
    assert.equal(filterUsed.deletedAt, null);
  });
});

describe('course categories for the filter', () => {
  test('lists each category of published courses once, sorted, ignoring capital letters', async () => {
    const res = fakeRes();
    await listCategories({}, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(distinctCall, { field: 'category', filter: { published: true, deletedAt: null } });
    assert.deepEqual(res.body.categories, ['databases', 'Tools', 'Web Development']);
  });
});
