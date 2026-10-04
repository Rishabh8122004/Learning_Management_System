import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { initialsOf } from "../src/lib/initials.js";
import { linkTypeOf } from "../src/lib/linkType.js";
import { daysUntil, dueLabel, greetingFor, relativeDay } from "../src/lib/timeText.js";
import { findAchievements, headlineOf } from "../src/lib/goalCelebrations.js";
import {
  addDays,
  countMilestones,
  getActivityGrid,
  getHabitHistory,
  getHabitSummary,
  getTodaySummary,
  effectiveStatus,
  isGoalFinished,
  localDateString,
  summarizeGoals,
} from "../src/lib/goalProgress.js";

describe("initialsOf", () => {
  test("uses the first letters of the first two words", () => {
    assert.equal(initialsOf("Rishabh Pareek"), "RP");
    assert.equal(initialsOf("  ada   lovelace  byron "), "AL");
  });

  test("a single name, an empty name and names containing the letter s", () => {
    assert.equal(initialsOf("Madonna"), "M");
    assert.equal(initialsOf(""), "?");
    assert.equal(initialsOf("Sasha Stevens"), "SS");
  });
});

describe("linkTypeOf", () => {
  test("labels links by where they point", () => {
    assert.equal(linkTypeOf("https://www.youtube.com/watch?v=abc"), "Video");
    assert.equal(linkTypeOf("https://youtu.be/abc"), "Video");
    assert.equal(linkTypeOf("https://github.com/user/repo"), "Code");
    assert.equal(linkTypeOf("https://developer.mozilla.org/en-US/docs"), "Docs");
    assert.equal(linkTypeOf("https://dev.to/some-post"), "Article");
    assert.equal(linkTypeOf("https://example.com/page"), "Link");
  });

  test("anything that is not an http(s) link is rejected", () => {
    assert.equal(linkTypeOf("javascript:alert(1)"), null);
    assert.equal(linkTypeOf("data:text/html,hi"), null);
    assert.equal(linkTypeOf("ftp://example.com"), null);
    assert.equal(linkTypeOf("plain text"), null);
    assert.equal(linkTypeOf(""), null);
  });
});

describe("habit streaks", () => {
  const today = localDateString();
  const yesterday = addDays(today, -1);

  const habit = (entries) => ({
    status: "active",
    trackingType: "habit",
    habit: { period: "day", targetValue: 2, unit: "times", daysOfWeek: [] },
    entries,
    children: [],
  });

  test("an unfinished today does not break yesterday's streak", () => {
    assert.equal(getHabitSummary(habit([{ localDate: yesterday, value: 2 }])).streak, 1);
  });

  test("consecutive finished days add up, and values are summed per day", () => {
    const summary = getHabitSummary(
      habit([
        { localDate: yesterday, value: 1 },
        { localDate: yesterday, value: 1 },
        { localDate: today, value: 2 },
      ]),
    );

    assert.equal(summary.streak, 2);
    assert.equal(summary.currentTotal, 2);
  });

  test("a missed day ends the streak", () => {
    const twoDaysAgo = addDays(today, -2);
    assert.equal(getHabitSummary(habit([{ localDate: twoDaysAgo, value: 2 }])).streak, 0);
  });
});

describe("dashboard goals summary", () => {
  const today = localDateString();
  const habit = (id, entries) => ({
    _id: id,
    status: "active",
    trackingType: "habit",
    habit: { period: "day", targetValue: 2, unit: "times", daysOfWeek: [] },
    entries,
    children: [],
  });

  const goals = [
    {
      status: "active",
      trackingType: "milestones",
      completed: false,
      targetDate: `${addDays(today, 3)}T00:00:00.000Z`,
      entries: [],
      children: [habit("done-today", [{ localDate: today, value: 2 }]), habit("pending", [])],
    },
    { status: "paused", trackingType: "habit", habit: { period: "day", targetValue: 1 }, entries: [], children: [] },
    {
      status: "active",
      trackingType: "milestones",
      completed: false,
      targetDate: `${addDays(today, 20)}T00:00:00.000Z`,
      entries: [],
      children: [],
    },
  ];

  test("counts active goals (including sub-goals), what is due within 7 days, and habits left today", () => {
    const summary = summarizeGoals(goals);

    assert.equal(summary.active, 4);
    assert.equal(summary.dueSoon.length, 1);
    assert.deepEqual(summary.habitsToday.map((goal) => goal._id), ["pending"]);
  });
});

describe("time text", () => {
  test("days until a date, and how it is worded", () => {
    assert.equal(daysUntil("2026-10-09", "2026-10-04"), 5);
    assert.equal(daysUntil("2026-10-04T00:00:00.000Z", "2026-10-04"), 0);
    assert.equal(daysUntil("2026-10-03", "2026-10-04"), -1);
    assert.equal(daysUntil("2026-11-02", "2026-10-31"), 2);
    assert.equal(dueLabel(-1), "overdue");
    assert.equal(dueLabel(0), "due today");
    assert.equal(dueLabel(1), "due tomorrow");
    assert.equal(dueLabel(4), "due in 4 days");
  });

  test("greeting follows the hour", () => {
    assert.equal(greetingFor(5), "Good morning");
    assert.equal(greetingFor(12), "Good afternoon");
    assert.equal(greetingFor(17), "Good evening");
    assert.equal(greetingFor(22), "Welcome back");
    assert.equal(greetingFor(3), "Welcome back");
  });
});

describe("habit history and best streak", () => {
  const entry = (n, value) => ({ _id: `e${n}`, value, localDate: addDays(localDateString(), -n) });
  const habit = (entries, extra = {}) => ({
    _id: "h",
    trackingType: "habit",
    status: "active",
    title: "Study",
    createdAt: addDays(localDateString(), -20) + "T10:00:00.000Z",
    habit: { period: "day", targetValue: 30, unit: "minutes", daysOfWeek: [], ...extra },
    entries,
  });

  test("best streak is the longest run, and never less than the current one", () => {
    const goal = habit([entry(0, 30), entry(1, 30), entry(5, 30), entry(6, 30), entry(7, 30), entry(8, 30)]);
    const summary = getHabitSummary(goal);

    assert.equal(summary.streak, 2);
    assert.equal(summary.bestStreak, 4);
    assert.equal(summary.met, true);
    assert.equal(summary.percent, 100);
  });

  test("history shows met, missed, pending and days before the goal existed", () => {
    const goal = habit([entry(1, 30), entry(2, 10)]);
    goal.createdAt = addDays(localDateString(), -3) + "T10:00:00.000Z";
    const history = getHabitHistory(goal, 7);

    assert.equal(history.length, 7);
    assert.equal(history[6].state, "pending");
    assert.equal(history[5].state, "met");
    assert.equal(history[4].state, "missed");
    assert.equal(history[3].state, "missed");
    assert.equal(history[0].state, "before");
  });

  test("days that are not scheduled are neither missed nor counted", () => {
    const today = new Date().getDay();
    const goal = habit([entry(1, 30)], { daysOfWeek: [today, (today + 6) % 7] });
    const history = getHabitHistory(goal, 3);

    assert.equal(history[2].state, "pending");
    assert.equal(history[1].state, "met");
    assert.equal(history[0].state, "off");
  });
});

describe("today summary and activity grid", () => {
  const today = localDateString();
  const goals = [
    {
      _id: "a", trackingType: "habit", status: "active", title: "Read", targetDate: null,
      habit: { period: "day", targetValue: 10, unit: "pages", daysOfWeek: [] },
      entries: [{ _id: "1", value: 10, localDate: today }, { _id: "2", value: 10, localDate: addDays(today, -1) }],
      children: [],
    },
    {
      _id: "b", trackingType: "habit", status: "active", title: "Run", targetDate: addDays(today, 3) + "T00:00:00.000Z",
      habit: { period: "day", targetValue: 5, unit: "km", daysOfWeek: [] },
      entries: [{ _id: "3", value: 1, localDate: today }],
      children: [],
    },
  ];

  test("counts habits done today, the best streak and the next deadline", () => {
    const summary = getTodaySummary(goals);

    assert.equal(summary.habitsScheduled, 2);
    assert.equal(summary.habitsMet, 1);
    assert.equal(summary.bestStreak.title, "Read");
    assert.equal(summary.bestStreak.streak, 2);
    assert.equal(summary.nextDeadline._id, "b");
  });

  test("activity grid counts goals with progress per day and never marks the future", () => {
    const grid = getActivityGrid(goals, 4);
    const days = grid.columns.flat();
    const todayCell = days.find((day) => day.date === today);

    assert.equal(grid.columns.length, 4);
    assert.equal(todayCell.count, 2);
    assert.equal(grid.activeDays, 2);
    assert.ok(days.filter((day) => day.future).every((day) => day.count === 0));
  });
});

describe("achievements", () => {
  const today = localDateString();
  const habitGoal = (value, extraEntries = []) => ({
    _id: "h", trackingType: "habit", status: "active", title: "Study", children: [],
    habit: { period: "day", targetValue: 30, unit: "minutes", daysOfWeek: [] },
    entries: [{ _id: "t", value, localDate: today }, ...extraEntries],
  });
  const yesterday = (n) => ({ _id: `y${n}`, value: 30, localDate: addDays(today, -n) });

  test("meeting today's habit target is noticed once, with the streak", () => {
    const events = findAchievements([habitGoal(10, [yesterday(1)])], [habitGoal(30, [yesterday(1)])]);
    const kinds = events.map((event) => event.kind);

    assert.ok(kinds.includes("habit-done"));
    assert.ok(kinds.includes("day-complete"));
    assert.equal(findAchievements([habitGoal(30)], [habitGoal(30)]).length, 0);
  });

  test("a streak milestone is noticed, and undoing never celebrates", () => {
    const run = [yesterday(1), yesterday(2)];
    const events = findAchievements([habitGoal(0, run)], [habitGoal(30, run)]);

    assert.equal(headlineOf(events).kind, "streak-milestone");
    assert.match(headlineOf(events).message, /3 days in a row.*Everything for today is done/);
    assert.ok(events.some((event) => event.kind === "day-complete"));
    assert.equal(findAchievements([habitGoal(30, run)], [habitGoal(0, run)]).length, 0);
  });

  test("finishing the last milestone completes the goal", () => {
    const tree = (a, b) => [{
      _id: "root", trackingType: "milestones", status: "active", title: "Learn React", completed: false, entries: [],
      children: [
        { _id: "c1", trackingType: "milestones", status: "active", title: "Hooks", completed: a, entries: [], children: [] },
        { _id: "c2", trackingType: "milestones", status: "active", title: "Router", completed: b, entries: [], children: [] },
      ],
    }];
    const events = findAchievements(tree(true, false), tree(true, true));

    assert.equal(countMilestones(tree(true, true)[0]).done, 2);
    assert.equal(headlineOf(events).kind, "goal-done");
    assert.ok(events.some((event) => event.kind === "milestone-done"));
  });

  test("reaching a number target is noticed", () => {
    const target = (current) => [{
      _id: "t", trackingType: "target", status: "active", title: "Problems", children: [],
      target: { period: "total", targetValue: 20, unit: "problems" },
      entries: [{ _id: "1", value: current, localDate: today }],
    }];

    assert.equal(headlineOf(findAchievements(target(15), target(20))).kind, "target-reached");
    assert.equal(findAchievements(target(5), target(15)).length, 0);
  });

  test("days are worded relative to today", () => {
    assert.equal(relativeDay(0), "today");
    assert.equal(relativeDay(1), "tomorrow");
    assert.equal(relativeDay(5), "in 5 days");
    assert.equal(relativeDay(-3), "3 days overdue");
  });
});

describe("finished goals", () => {
  const leaf = (id, completed) => ({ _id: id, trackingType: "milestones", status: "active", completed, children: [], entries: [] });

  test("a goal counts as completed from its real progress, not only its saved status", () => {
    const parent = (a, b) => ({ _id: "p", trackingType: "milestones", status: "active", completed: false, entries: [], children: [leaf("a", a), leaf("b", b)] });

    assert.equal(isGoalFinished(parent(true, false)), false);
    assert.equal(effectiveStatus(parent(true, true)), "completed");
    assert.equal(effectiveStatus(leaf("x", true)), "completed");
    assert.equal(effectiveStatus({ ...leaf("y", false), status: "paused" }), "paused");
    assert.equal(effectiveStatus({ ...leaf("z", false), status: "completed" }), "completed");
  });

  test("a one-off number target is finished when reached; repeating targets and habits are not", () => {
    const target = (period, current) => ({
      _id: "t", trackingType: "target", status: "active", children: [],
      target: { period, targetValue: 10, unit: "pages" },
      entries: [{ _id: "e", value: current, localDate: localDateString() }],
    });

    assert.equal(isGoalFinished(target("total", 10)), true);
    assert.equal(isGoalFinished(target("total", 4)), false);
    assert.equal(isGoalFinished(target("week", 10)), false);
    assert.equal(isGoalFinished({ _id: "h", trackingType: "habit", status: "active", children: [], entries: [], habit: { period: "day", targetValue: 1 } }), false);
  });
});

import { buildRecentActivity, timeAgo } from "../src/lib/recentActivity.js";

describe("recent activity", () => {
  const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();

  test("merges enrollments, completions, goals and progress, newest first, and never invents events", () => {
    const enrollments = [
      { _id: "e1", enrolledAt: hoursAgo(50), completedAt: hoursAgo(5), course: { _id: "c1", title: "React" } },
      { _id: "e2", enrolledAt: hoursAgo(80), completedAt: null, course: null },
    ];
    const goals = [
      {
        _id: "g1", title: "Study", trackingType: "habit", createdAt: hoursAgo(100),
        habit: { period: "day", targetValue: 30, unit: "minutes" },
        entries: [{ _id: "x1", value: 30, occurredAt: hoursAgo(1) }, { _id: "x2", value: 20, occurredAt: null }],
        children: [],
      },
    ];

    const events = buildRecentActivity(enrollments, goals);

    assert.deepEqual(events.map((event) => event.type), ["progress", "done", "course", "goal"]);
    assert.equal(events[0].text, 'Logged 30 minutes on "Study"');
    assert.equal(events[1].link, "/courses/c1");
    assert.equal(buildRecentActivity([], []).length, 0);
    assert.equal(buildRecentActivity(enrollments, goals, 2).length, 2);
  });

  test("times are worded simply", () => {
    const now = Date.now();

    assert.equal(timeAgo(new Date(now - 20000).toISOString(), now), "just now");
    assert.equal(timeAgo(new Date(now - 5 * 60000).toISOString(), now), "5 minutes ago");
    assert.equal(timeAgo(new Date(now - 3 * 3600000).toISOString(), now), "3 hours ago");
    assert.equal(timeAgo(new Date(now - 30 * 3600000).toISOString(), now), "yesterday");
    assert.equal(timeAgo(new Date(now - 4 * 86400000).toISOString(), now), "4 days ago");
  });
});

import {
  firstErrorKey,
  validateEmail,
  validateHttpLink,
  validateLength,
  validateMatch,
  validateName,
  validateNewPassword,
  validatePositiveNumber,
} from "../src/lib/validators.js";

describe("form validators", () => {
  test("email, name and passwords follow the server rules", () => {
    assert.match(validateEmail(""), /Enter your email/);
    assert.match(validateEmail("nope"), /valid email/);
    assert.equal(validateEmail(" a@b.co "), "");
    assert.match(validateName("A"), /at least 2/);
    assert.match(validateName("x".repeat(101)), /at most 100/);
    assert.equal(validateName("Ada"), "");
    assert.match(validateNewPassword("short"), /at least 8/);
    assert.match(validateNewPassword("é".repeat(40)), /72 bytes/);
    assert.equal(validateNewPassword("long enough password"), "");
    assert.match(validateMatch("abc12345", "abc1234"), /do not match/);
    assert.equal(validateMatch("abc12345", "abc12345"), "");
  });

  test("numbers, lengths and links", () => {
    assert.match(validatePositiveNumber("", "an amount"), /Enter an amount/);
    assert.match(validatePositiveNumber("0", "an amount"), /Amount must be greater|An amount must be greater/);
    assert.equal(validatePositiveNumber("2.5", "an amount"), "");
    assert.match(validateLength("ab", "The title", 3, 150), /at least 3/);
    assert.match(validateLength("", "The unit", 1, 30), /required/);
    assert.equal(validateLength("Hello", "The title", 3, 150), "");
    assert.equal(validateHttpLink("", { required: false }), "");
    assert.match(validateHttpLink("", { required: true, label: "The link" }), /required/);
    assert.match(validateHttpLink("javascript:alert(1)"), /http/);
    assert.equal(validateHttpLink("https://example.com/x"), "");
    assert.equal(firstErrorKey({ a: "", b: "oops", c: "x" }), "b");
  });
});

import { titleFor } from "../src/lib/pageTitle.js";

describe("recent activity links", () => {
  test("an enrollment in a course that is gone points to My Courses, not to a missing page", () => {
    const base = { enrolledAt: "2026-10-01T10:00:00.000Z", course: { _id: "c1", title: "React" } };
    const events = buildRecentActivity(
      [
        { ...base, _id: "e1", courseAvailable: true },
        { ...base, _id: "e2", courseAvailable: false },
      ],
      [],
    );

    assert.equal(events.find((event) => event.id === "enroll-e1").link, "/courses/c1");
    assert.equal(events.find((event) => event.id === "enroll-e2").link, "/my-courses");
  });
});

describe("page titles", () => {
  test("every page has a clear title and unknown addresses say so", () => {
    assert.equal(titleFor("/goals"), "Track Your Goals · Trackly");
    assert.equal(titleFor("/courses/abc123"), "Course · Trackly");
    assert.equal(titleFor("/admin/courses/abc123/edit"), "Edit course · Trackly");
    assert.equal(titleFor("/"), "Learn what matters · Trackly");
    assert.equal(titleFor("/nope"), "Page not found · Trackly");
  });
});

describe("password recovery pages", () => {
  test("have their own titles", () => {
    assert.equal(titleFor("/forgot-password"), "Forgot password · Trackly");
    assert.equal(titleFor("/reset-password"), "Reset password · Trackly");
    assert.equal(titleFor("/verify-email"), "Confirm email · Trackly");
    assert.equal(titleFor("/confirm-email-change"), "Confirm new email · Trackly");
  });
});
