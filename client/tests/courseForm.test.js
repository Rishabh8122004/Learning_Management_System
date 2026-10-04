import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { blankForm, blankModule, fromServer, moveItem, statusOf, toPayload, validate } from "../src/lib/courseForm.js";

const serverCourse = {
  title: "React Basics",
  description: "Learn the basics of React step by step.",
  category: "Web Development",
  level: "beginner",
  thumbnail: null,
  tags: ["react", "js"],
  published: true,
  modules: [
    {
      _id: "m2",
      title: "Second",
      order: 2,
      lessons: [{ _id: "l1", title: "Only", content: "https://react.dev/learn", duration: 20, order: 1 }],
    },
    {
      _id: "m1",
      title: "First",
      order: 1,
      lessons: [
        { _id: "l3", title: "B", content: "https://a.example/b", duration: 0, order: 2 },
        { _id: "l2", title: "A", content: "https://a.example/a", duration: 5, order: 1 },
      ],
    },
  ],
};

describe("course form helpers", () => {
  test("the server's course becomes a form with modules and lessons in order", () => {
    const form = fromServer(serverCourse);

    assert.equal(form.tags, "react, js");
    assert.deepEqual(form.modules.map((m) => m.title), ["First", "Second"]);
    assert.deepEqual(form.modules[0].lessons.map((l) => l.title), ["A", "B"]);
    assert.equal(form.modules[0].lessons[1].duration, "", "a zero duration shows as an empty box");
  });

  test("saving keeps existing ids, renumbers the order and cleans tags and spaces", () => {
    const form = fromServer(serverCourse);
    form.tags = " React, js , REACT ";
    form.title = "  React Basics  ";
    form.modules[0].lessons.reverse();

    const payload = toPayload(form);

    assert.deepEqual(payload.tags, ["react", "js"]);
    assert.equal(payload.title, "React Basics");
    assert.equal(payload.thumbnail, null);
    assert.deepEqual(payload.modules.map((m) => [m._id, m.order]), [["m1", 1], ["m2", 2]]);
    assert.deepEqual(payload.modules[0].lessons.map((l) => [l._id, l.order]), [["l3", 1], ["l2", 2]]);
  });

  test("new modules and lessons have no id yet, so the server creates them", () => {
    const form = blankForm();
    form.modules.push(blankModule());

    const payload = toPayload({ ...form, title: "T", description: "d", category: "c" });

    assert.equal("_id" in payload.modules[0], false);
    assert.equal("_id" in payload.modules[0].lessons[0], false);
  });

  test("validate names the first problem with a module or lesson", () => {
    const form = fromServer(serverCourse);
    assert.equal(validate(form), "");

    form.modules[0].lessons[1].content = "not a link";
    assert.match(validate(form), /Module 1, lesson 2 needs a link/);

    form.modules[0].title = "  ";
    assert.match(validate(form), /Module 1 needs a title/);

    assert.match(validate({ ...form, title: "ab" }), /title needs at least 3/);
  });

  test("status and moving an item", () => {
    assert.equal(statusOf({ deletedAt: "2026-01-01", published: true }), "archived");
    assert.equal(statusOf({ deletedAt: null, published: true }), "published");
    assert.equal(statusOf({ deletedAt: null, published: false }), "draft");

    assert.deepEqual(moveItem([1, 2, 3], 1, -1), [2, 1, 3]);
    assert.deepEqual(moveItem([1, 2, 3], 0, -1), [1, 2, 3], "cannot move past the start");
    assert.deepEqual(moveItem([1, 2, 3], 2, 1), [1, 2, 3], "cannot move past the end");
  });
});
