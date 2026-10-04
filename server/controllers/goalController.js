const Goal = require("../models/Goal");
const GoalEntry = require("../models/GoalEntry");
const { isValidId } = require("../utils/validate");

const TRACKING_TYPES = ["milestones", "habit", "target"];
const STATUSES = ["active", "paused", "completed"];

class InputError extends Error {}
class NotFoundError extends Error {}

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const rejectUnknownKeys = (body, allowed) => {
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));

  if (unknown.length) {
    throw new InputError(`Unknown field(s): ${unknown.join(", ")}`);
  }
};

const handleError = (res, error, label) => {
  if (error instanceof InputError) {
    return fail(res, 400, error.message);
  }

  // A goal or entry that does not exist (or belongs to someone else) is the same "not found".
  if (error instanceof NotFoundError) {
    return fail(res, 404, error.message);
  }

  if (
    error &&
    ["ValidationError", "CastError"].includes(error.name)
  ) {
    return fail(res, 400, "Invalid goal data");
  }

  // One entry per goal per day (unique index): editing an entry onto a day
  // that already has one would collide.
  if (error && error.code === 11000) {
    return fail(res, 409, "You already have an entry for that day");
  }

  console.error(`${label} error:`, error);
  return fail(res, 500, "Server error");
};

const GOAL_FIELDS = [
  "title",
  "description",
  "trackingType",
  "status",
  "completed",
  "targetDate",
  "habit",
  "target",
];

function normalizeHabit(value) {
  if (value !== undefined && !isPlainObject(value)) {
    throw new InputError("habit must be an object");
  }

  const habit = value || {};
  rejectUnknownKeys(habit, ["period", "targetValue", "unit", "daysOfWeek"]);

  const period = habit.period || "day";
  if (!["day", "week"].includes(period)) {
    throw new InputError("Habit period must be day or week");
  }

  const targetValue = habit.targetValue === undefined ? 1 : habit.targetValue;
  if (
    typeof targetValue !== "number" ||
    !Number.isFinite(targetValue) ||
    targetValue <= 0
  ) {
    throw new InputError("Habit targetValue must be greater than zero");
  }

  const unit = habit.unit === undefined ? "times" : habit.unit;
  if (typeof unit !== "string" || !unit.trim() || unit.trim().length > 30) {
    throw new InputError("Habit unit must be between 1 and 30 characters");
  }

  const daysOfWeek = habit.daysOfWeek === undefined ? [] : habit.daysOfWeek;
  if (
    !Array.isArray(daysOfWeek) ||
    daysOfWeek.some(
      (day) => !Number.isInteger(day) || day < 0 || day > 6,
    )
  ) {
    throw new InputError("daysOfWeek must contain days from 0 to 6");
  }

  return {
    period,
    targetValue,
    unit: unit.trim(),
    daysOfWeek: [...new Set(daysOfWeek)],
  };
}

function normalizeTarget(value) {
  if (!isPlainObject(value)) {
    throw new InputError("A target goal needs target details");
  }

  rejectUnknownKeys(value, ["targetValue", "unit", "period"]);

  if (
    typeof value.targetValue !== "number" ||
    !Number.isFinite(value.targetValue) ||
    value.targetValue <= 0
  ) {
    throw new InputError("Target targetValue must be greater than zero");
  }

  if (
    typeof value.unit !== "string" ||
    !value.unit.trim() ||
    value.unit.trim().length > 30
  ) {
    throw new InputError("Target unit must be between 1 and 30 characters");
  }

  const period = value.period || "total";
  if (!["total", "day", "week", "month"].includes(period)) {
    throw new InputError("Invalid target period");
  }

  return {
    targetValue: value.targetValue,
    unit: value.unit.trim(),
    period,
  };
}

// The saved habit/target of a goal arrives as a Mongoose sub-document; its own keys are internal ones, so it is
// turned into a plain object before it is checked like a request would be.
const plain = (value) => (value && typeof value.toObject === "function" ? value.toObject() : value);

function normalizeGoalFields(body, existing = null) {
  if (!isPlainObject(body)) {
    throw new InputError("Request body must be a JSON object");
  }

  rejectUnknownKeys(body, GOAL_FIELDS);

  if (!existing && (typeof body.title !== "string" || !body.title.trim())) {
    throw new InputError("title is required");
  }

  const trackingType =
    body.trackingType || existing?.trackingType || "milestones";

  if (!TRACKING_TYPES.includes(trackingType)) {
    throw new InputError("Invalid trackingType");
  }

  const fields = { trackingType };
  const unset = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      throw new InputError("title cannot be empty");
    }
    fields.title = body.title.trim();
  }

  if (body.description !== undefined) {
    if (typeof body.description !== "string") {
      throw new InputError("description must be a string");
    }
    fields.description = body.description.trim();
  }

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      throw new InputError("Invalid status");
    }
    fields.status = body.status;
  }

  if (body.completed !== undefined) {
    if (typeof body.completed !== "boolean") {
      throw new InputError("completed must be true or false");
    }
    if (trackingType !== "milestones") {
      throw new InputError("Only milestone goals can be marked complete");
    }
    fields.completed = body.completed;
  } else if (existing && existing.trackingType !== trackingType) {
    fields.completed = false;
  }

  if (body.targetDate !== undefined) {
    if (body.targetDate === null || body.targetDate === "") {
      fields.targetDate = null;
    } else {
      const date = new Date(body.targetDate);
      if (Number.isNaN(date.getTime())) {
        throw new InputError("targetDate must be a valid date");
      }
      fields.targetDate = date;
    }
  }

  if (trackingType === "habit") {
    const habitValue =
      body.habit !== undefined ? body.habit : plain(existing?.habit);
    fields.habit = normalizeHabit(habitValue);
    unset.target = 1;
  } else if (trackingType === "target") {
    const targetValue =
      body.target !== undefined ? body.target : plain(existing?.target);
    fields.target = normalizeTarget(targetValue);
    unset.habit = 1;
  } else {
    unset.habit = 1;
    unset.target = 1;
  }

  if (!existing && body.completed !== undefined) {
    fields.completed = body.completed;
  }

  return { fields, unset };
}

const dayString = (date) => date.toISOString().slice(0, 10);

// Due-date rules, checked only when the date is being set or changed (so goals
// saved before these rules existed can still be edited):
//  1. not in the past (judged by the earliest time zone, UTC-12, so nobody is
//     told their own "today" is in the past);
//  2. on or before the due date of every ancestor goal that has one;
//  3. on or after the due date of every sub-goal below it.
async function checkDueDate(userId, fields, { existing = null, parent = null } = {}) {
  if (!fields.targetDate) return;

  const day = dayString(fields.targetDate);
  if (existing?.targetDate && dayString(existing.targetDate) === day) return;

  const earliestToday = dayString(new Date(Date.now() - 12 * 60 * 60 * 1000));
  if (day < earliestToday) {
    throw new InputError("The due date cannot be in the past");
  }

  const rootId = existing ? existing.rootGoal : parent?.rootGoal || parent?._id;
  if (!rootId) return;

  const family = await Goal.find({ user: userId, rootGoal: rootId })
    .select("parentGoal targetDate title")
    .lean();
  const byId = new Map(family.map((goal) => [String(goal._id), goal]));

  let cursor = existing ? existing.parentGoal : parent._id;
  while (cursor) {
    const ancestor = byId.get(String(cursor));
    if (!ancestor) break;

    if (ancestor.targetDate && day > dayString(ancestor.targetDate)) {
      throw new InputError(
        `The due date must be on or before ${dayString(ancestor.targetDate)}, the due date of "${ancestor.title}"`,
      );
    }
    cursor = ancestor.parentGoal;
  }

  if (!existing) return;

  const childrenOf = new Map();
  for (const goal of family) {
    const key = String(goal.parentGoal);
    childrenOf.set(key, [...(childrenOf.get(key) || []), goal]);
  }

  const stack = [...(childrenOf.get(String(existing._id)) || [])];
  while (stack.length) {
    const descendant = stack.pop();

    if (descendant.targetDate && day < dayString(descendant.targetDate)) {
      throw new InputError(
        `The due date must be on or after ${dayString(descendant.targetDate)}, the due date of its sub-goal "${descendant.title}"`,
      );
    }
    stack.push(...(childrenOf.get(String(descendant._id)) || []));
  }
}

async function findOwnedGoal(goalId, userId) {
  if (!isValidId(goalId)) {
    throw new InputError("Invalid goal ID");
  }

  const goal = await Goal.findOne({ _id: goalId, user: userId });
  if (!goal) {
    throw new NotFoundError("Goal not found");
  }

  return goal;
}

function buildGoalTree(goalDocuments, entryDocuments) {
  const nodes = new Map();

  for (const goal of goalDocuments) {
    const node = { ...goal, children: [], entries: [] };
    delete node.user;
    nodes.set(String(goal._id), node);
  }

  const roots = [];

  for (const goal of goalDocuments) {
    const node = nodes.get(String(goal._id));
    const parentId = goal.parentGoal ? String(goal.parentGoal) : null;
    const parent = parentId ? nodes.get(parentId) : null;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  for (const entry of entryDocuments) {
    const node = nodes.get(String(entry.goal));
    if (!node) continue;

    const safeEntry = { ...entry };
    delete safeEntry.user;
    node.entries.push(safeEntry);
  }

  return { roots, nodes };
}

async function loadUserGoalTree(userId) {
  const [goals, entries] = await Promise.all([
    Goal.find({ user: userId }).sort({ createdAt: 1, _id: 1 }).lean(),
    GoalEntry.find({ user: userId }).sort({ occurredAt: 1, _id: 1 }).lean(),
  ]);

  return buildGoalTree(goals, entries);
}

async function getGoals(req, res) {
  try {
    const { roots } = await loadUserGoalTree(req.user.id);
    return res.status(200).json({ success: true, goals: roots });
  } catch (error) {
    return handleError(res, error, "Get goals");
  }
}

async function getGoal(req, res) {
  try {
    const goal = await findOwnedGoal(req.params.id, req.user.id);
    const { nodes } = await loadUserGoalTree(req.user.id);
    const result = nodes.get(String(goal._id));

    return res.status(200).json({ success: true, goal: result });
  } catch (error) {
    return handleError(res, error, "Get goal");
  }
}

async function createGoal(req, res) {
  try {
    const { fields } = normalizeGoalFields(req.body);
    await checkDueDate(req.user.id, fields);

    const goal = await Goal.create({
      ...fields,
      user: req.user.id,
      parentGoal: null,
      rootGoal: null,
    });

    return res.status(201).json({ success: true, goal });
  } catch (error) {
    return handleError(res, error, "Create goal");
  }
}

async function createSubgoal(req, res) {
  try {
    const parent = await findOwnedGoal(req.params.id, req.user.id);
    const { fields } = normalizeGoalFields(req.body);
    await checkDueDate(req.user.id, fields, { parent });

    const goal = await Goal.create({
      ...fields,
      user: req.user.id,
      parentGoal: parent._id,
      rootGoal: parent.rootGoal || parent._id,
    });

    return res.status(201).json({ success: true, goal });
  } catch (error) {
    return handleError(res, error, "Create sub-goal");
  }
}

async function updateGoal(req, res) {
  try {
    const existing = await findOwnedGoal(req.params.id, req.user.id);
    const { fields, unset } = normalizeGoalFields(req.body, existing);
    await checkDueDate(req.user.id, fields, { existing });

    if (fields.completed === true) {
      const hasChildren = await Goal.exists({
        user: req.user.id,
        parentGoal: existing._id,
      });
      if (hasChildren) {
        throw new InputError(
          "A goal with sub-goals is completed through its sub-goals",
        );
      }
    }

    const update = { $set: fields };
    if (Object.keys(unset).length) {
      update.$unset = unset;
    }

    const goal = await Goal.findOneAndUpdate(
      { _id: existing._id, user: req.user.id },
      update,
      { new: true, runValidators: true },
    );

    return res.status(200).json({ success: true, goal });
  } catch (error) {
    return handleError(res, error, "Update goal");
  }
}

async function collectSubtreeIds(rootId, userId) {
  const goals = await Goal.find({ user: userId })
    .select("_id parentGoal")
    .lean();

  const childrenByParent = new Map();

  for (const goal of goals) {
    if (!goal.parentGoal) continue;
    const parentId = String(goal.parentGoal);
    const children = childrenByParent.get(parentId) || [];
    children.push(String(goal._id));
    childrenByParent.set(parentId, children);
  }

  const result = [];
  const stack = [String(rootId)];
  const visited = new Set();

  while (stack.length) {
    const currentId = stack.pop();
    if (visited.has(currentId)) continue;

    visited.add(currentId);
    result.push(currentId);

    for (const childId of childrenByParent.get(currentId) || []) {
      stack.push(childId);
    }
  }

  return result;
}

async function deleteGoal(req, res) {
  try {
    const goal = await findOwnedGoal(req.params.id, req.user.id);
    const subtreeIds = await collectSubtreeIds(goal._id, req.user.id);

    await Promise.all([
      Goal.deleteMany({
        user: req.user.id,
        _id: { $in: subtreeIds },
      }),
      GoalEntry.deleteMany({
        user: req.user.id,
        goal: { $in: subtreeIds },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Goal and its sub-goals deleted",
    });
  } catch (error) {
    return handleError(res, error, "Delete goal");
  }
}

function validateEntryBody(body, isUpdate = false) {
  if (!isPlainObject(body)) {
    throw new InputError("Request body must be a JSON object");
  }

  rejectUnknownKeys(body, ["value", "note", "occurredAt", "localDate"]);

  if (!isUpdate && body.value === undefined) {
    throw new InputError("value is required");
  }

  const fields = {};

  if (body.value !== undefined) {
    if (
      typeof body.value !== "number" ||
      !Number.isFinite(body.value) ||
      body.value <= 0
    ) {
      throw new InputError("value must be greater than zero");
    }
    fields.value = body.value;
  }

  if (body.note !== undefined) {
    if (typeof body.note !== "string") {
      throw new InputError("note must be a string");
    }
    fields.note = body.note.trim();
  }

  if (body.occurredAt !== undefined) {
    const date = new Date(body.occurredAt);
    if (Number.isNaN(date.getTime())) {
      throw new InputError("occurredAt must be a valid date");
    }
    fields.occurredAt = date;
  }

  if (body.localDate !== undefined) {
    const validFormat = /^\d{4}-\d{2}-\d{2}$/.test(body.localDate);
    const parsed = new Date(`${body.localDate}T00:00:00.000Z`);
    const isRealDate =
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === body.localDate;

    if (!validFormat || !isRealDate) {
      throw new InputError("localDate must be a real date in YYYY-MM-DD format");
    }

    // Allow up to UTC+14 so a user ahead of UTC can still log their own "today".
    const latestAllowed = new Date(Date.now() + 14 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    if (body.localDate > latestAllowed) {
      throw new InputError("localDate cannot be in the future");
    }

    fields.localDate = body.localDate;
  } else if (!isUpdate) {
    throw new InputError("localDate is required");
  }

  return fields;
}

async function createEntry(req, res) {
  try {
    const goal = await findOwnedGoal(req.params.id, req.user.id);

    if (!["habit", "target"].includes(goal.trackingType)) {
      throw new InputError(
        "Progress entries can only be added to habit or target goals",
      );
    }

    const fields = validateEntryBody(req.body);
    // Logs for the same day are summed into one entry (atomic upsert), which
    // keeps storage small: at most one entry per goal per day.
    const update = {
      $inc: { value: fields.value },
      $set: { occurredAt: fields.occurredAt || new Date() },
    };
    if (fields.note) {
      update.$set.note = fields.note;
    }

    const entry = await GoalEntry.findOneAndUpdate(
      { goal: goal._id, user: req.user.id, localDate: fields.localDate },
      update,
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    return res.status(201).json({ success: true, entry });
  } catch (error) {
    return handleError(res, error, "Create goal entry");
  }
}

async function updateEntry(req, res) {
  try {
    await findOwnedGoal(req.params.id, req.user.id);

    if (!isValidId(req.params.entryId)) {
      throw new InputError("Invalid entry ID");
    }

    const fields = validateEntryBody(req.body, true);
    if (!Object.keys(fields).length) {
      throw new InputError("Provide at least one entry field to update");
    }

    const entry = await GoalEntry.findOneAndUpdate(
      {
        _id: req.params.entryId,
        goal: req.params.id,
        user: req.user.id,
      },
      { $set: fields },
      { new: true, runValidators: true },
    );

    if (!entry) {
      throw new NotFoundError("Progress entry not found");
    }

    return res.status(200).json({ success: true, entry });
  } catch (error) {
    return handleError(res, error, "Update goal entry");
  }
}

async function deleteEntry(req, res) {
  try {
    await findOwnedGoal(req.params.id, req.user.id);

    if (!isValidId(req.params.entryId)) {
      throw new InputError("Invalid entry ID");
    }

    const result = await GoalEntry.deleteOne({
      _id: req.params.entryId,
      goal: req.params.id,
      user: req.user.id,
    });

    if (result.deletedCount === 0) {
      throw new NotFoundError("Progress entry not found");
    }

    return res.status(200).json({
      success: true,
      message: "Progress entry deleted",
    });
  } catch (error) {
    return handleError(res, error, "Delete goal entry");
  }
}

module.exports = {
  getGoals,
  getGoal,
  createGoal,
  createSubgoal,
  updateGoal,
  deleteGoal,
  createEntry,
  updateEntry,
  deleteEntry,
};