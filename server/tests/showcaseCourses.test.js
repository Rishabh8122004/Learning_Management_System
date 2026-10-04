const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Course = require('../models/Course');
const { showcaseCourses } = require('../scripts/showcaseCourses');

describe('showcase courses', () => {
  test('every course passes the real Course model validation', () => {
    for (const course of showcaseCourses) {
      const doc = new Course({ ...course, instructor: new mongoose.Types.ObjectId() });
      const error = doc.validateSync();
      assert.equal(error, undefined, `${course.title}: ${error && error.message}`);
    }
  });

  test('titles are unique and every lesson is an https link', () => {
    assert.equal(new Set(showcaseCourses.map((c) => c.title)).size, showcaseCourses.length);
    for (const course of showcaseCourses) {
      for (const mod of course.modules) {
        for (const item of mod.lessons) {
          assert.match(item.content, /^https:\/\//, item.title);
        }
      }
    }
  });
});
