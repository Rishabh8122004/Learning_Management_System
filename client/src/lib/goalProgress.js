export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function addDays(dateString, amount) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + amount);

  return localDateString(date);
}

function weekKey(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  const day = date.getDay();

  date.setDate(date.getDate() - ((day + 6) % 7));

  return localDateString(date);
}

export function getHabitSummary(goal) {
  const habit = goal.habit || {};
  const period = habit.period || "day";
  const target = Number(habit.targetValue || 1);
  const totals = new Map();

  for (const entry of goal.entries || []) {
    const key =
      period === "week" ? weekKey(entry.localDate) : entry.localDate;

    totals.set(key, (totals.get(key) || 0) + Number(entry.value || 0));
  }

  const today = localDateString();
  const currentKey = period === "week" ? weekKey(today) : today;
  const currentTotal = totals.get(currentKey) || 0;

  let streak = 0;
  let cursor = currentKey;

  // A still-in-progress period does not break a streak before it ends.
  if (currentTotal < target) {
    cursor = period === "week" ? addDays(cursor, -7) : addDays(cursor, -1);

    if (period === "week") {
      cursor = weekKey(cursor);
    }
  }

  for (let index = 0; index < 3650; index += 1) {
    if (
      period === "day" &&
      habit.daysOfWeek?.length > 0 &&
      !habit.daysOfWeek.includes(
        new Date(`${cursor}T12:00:00`).getDay(),
      )
    ) {
      cursor = addDays(cursor, -1);
      continue;
    }

    if ((totals.get(cursor) || 0) < target) {
      break;
    }

    streak += 1;

    cursor = period === "week" ? addDays(cursor, -7) : addDays(cursor, -1);

    if (period === "week") {
      cursor = weekKey(cursor);
    }
  }

  const scheduledToday =
    period === "week" ||
    !habit.daysOfWeek?.length ||
    habit.daysOfWeek.includes(new Date().getDay());

  return {
    currentTotal,
    target,
    unit: habit.unit || "times",
    streak,
    bestStreak: Math.max(streak, bestStreakOf(totals, habit, period, target, today)),
    streakUnit: period === "week" ? "week" : "day",
    periodLabel: period === "week" ? "This week" : "Today",
    met: currentTotal >= target,
    percent: Math.min(100, Math.round((currentTotal / target) * 100)),
    remaining: Math.max(0, Math.round((target - currentTotal) * 100) / 100),
    scheduledToday,
  };
}

// The longest run of met periods in the whole history (same rules as the current streak).
function bestStreakOf(totals, habit, period, target, today) {
  const keys = [...totals.keys()].sort();

  if (keys.length === 0) return 0;

  const days = habit.daysOfWeek || [];
  const currentKey = period === "week" ? weekKey(today) : today;
  let cursor = keys[0];
  let run = 0;
  let best = 0;

  for (let index = 0; index < 4000 && cursor <= currentKey; index += 1) {
    const unscheduled =
      period === "day" &&
      days.length > 0 &&
      !days.includes(new Date(`${cursor}T12:00:00`).getDay());

    if (!unscheduled) {
      if ((totals.get(cursor) || 0) >= target) {
        run += 1;
        best = Math.max(best, run);
      } else if (cursor !== currentKey) {
        run = 0;
      }
    }

    cursor = period === "week" ? addDays(cursor, 7) : addDays(cursor, 1);
  }

  return best;
}

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

// The last few days (or weeks) of a habit, oldest first:
// met, missed, pending (the current period), off (not scheduled) or before (the goal did not exist yet).
export function getHabitHistory(goal, count = 7) {
  const habit = goal.habit || {};
  const period = habit.period || "day";
  const target = Number(habit.targetValue || 1);
  const days = habit.daysOfWeek || [];
  const totals = new Map();

  for (const entry of goal.entries || []) {
    const key = period === "week" ? weekKey(entry.localDate) : entry.localDate;

    totals.set(key, (totals.get(key) || 0) + Number(entry.value || 0));
  }

  const today = localDateString();
  const currentKey = period === "week" ? weekKey(today) : today;
  const firstDates = [(goal.createdAt || "").slice(0, 10), ...totals.keys()].filter(Boolean).sort();
  const first = firstDates[0]
    ? period === "week"
      ? weekKey(firstDates[0])
      : firstDates[0]
    : currentKey;

  const result = [];

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = period === "week" ? weekKey(addDays(today, -7 * index)) : addDays(today, -index);
    const total = totals.get(date) || 0;
    const weekday = new Date(`${date}T12:00:00`).getDay();
    const scheduled = period === "week" || days.length === 0 || days.includes(weekday);

    let state;

    if (total >= target) state = "met";
    else if (!scheduled) state = "off";
    else if (date < first) state = "before";
    else if (date === currentKey) state = "pending";
    else state = "missed";

    result.push({
      date,
      label: period === "week" ? date.slice(5).replace("-", "/") : DAY_LETTERS[weekday],
      state,
      total,
    });
  }

  return result;
}

export function getTargetSummary(goal) {
  const target = goal.target || {};
  const period = target.period || "total";
  const today = localDateString();

  const relevantEntries = (goal.entries || []).filter((entry) => {
    if (period === "total") {
      return true;
    }

    if (period === "day") {
      return entry.localDate === today;
    }

    if (period === "week") {
      return weekKey(entry.localDate) === weekKey(today);
    }

    return entry.localDate?.slice(0, 7) === today.slice(0, 7);
  });

  const current = relevantEntries.reduce(
    (sum, entry) => sum + Number(entry.value || 0),
    0,
  );

  const goalValue = Number(target.targetValue || 0);

  return {
    current,
    target: goalValue,
    unit: target.unit || "",
    period,
    percent: goalValue > 0 ? Math.min(100, Math.round((current / goalValue) * 100)) : 0,
    remaining: Math.max(0, Math.round((goalValue - current) * 100) / 100),
    reached: goalValue > 0 && current >= goalValue,
  };
}

export function flattenGoals(goals) {
  return goals.flatMap((goal) => [goal, ...flattenGoals(goal.children || [])]);
}

// Dashboard summary, computed only from the user's real goals and entries.
export function summarizeGoals(goals) {
  const all = flattenGoals(goals).filter((goal) => effectiveStatus(goal) === "active");
  const today = localDateString();
  const soonLimit = addDays(today, 7);

  const dueSoon = all.filter((goal) => {
    if (!goal.targetDate || goal.completed) return false;
    const due = goal.targetDate.slice(0, 10);
    return due >= today && due <= soonLimit;
  });

  const habitsToday = all.filter((goal) => {
    if (goal.trackingType !== "habit" || goal.habit?.period === "week") {
      return false;
    }
    const days = goal.habit?.daysOfWeek || [];
    if (days.length > 0 && !days.includes(new Date().getDay())) return false;
    const summary = getHabitSummary(goal);
    return summary.currentTotal < summary.target;
  });

  return { active: all.length, dueSoon, habitsToday };
}

// A goal is finished when it was marked completed, or its own progress says so:
// a milestone that is ticked, a goal whose milestones are all ticked, or a one-off number target that was reached.
// (The saved status stays "active" until the user changes it, so the page works this out from the real progress.)
export function isGoalFinished(goal) {
  if (goal.status === "completed") return true;

  if (goal.trackingType === "milestones") {
    if (!(goal.children || []).length) return Boolean(goal.completed);

    const milestones = countMilestones(goal);

    return milestones.all > 0 && milestones.done === milestones.all;
  }

  if (goal.trackingType === "target" && (goal.target?.period || "total") === "total") {
    return getTargetSummary(goal).reached;
  }

  return false;
}

// The status to show and filter by: "completed" when finished, otherwise the saved one.
export function effectiveStatus(goal) {
  return isGoalFinished(goal) ? "completed" : goal.status;
}

// Completed and total milestones in a goal and everything below it.
export function countMilestones(goal) {
  const children = goal.children || [];

  if (children.length) {
    return children.reduce(
      (total, child) => {
        const count = countMilestones(child);

        return { done: total.done + count.done, all: total.all + count.all };
      },
      { done: 0, all: 0 },
    );
  }

  if (goal.trackingType !== "milestones") return { done: 0, all: 0 };

  return { done: goal.completed ? 1 : 0, all: 1 };
}

// Latest due date (YYYY-MM-DD) among these goals and everything below them.
export function latestDueDate(goals) {
  return goals.reduce((latest, goal) => {
    const own = goal.targetDate?.slice(0, 10) || "";
    const below = latestDueDate(goal.children || []);

    return [latest, own, below].sort().pop();
  }, "");
}

// Today at a glance, computed only from the user's real goals and entries.
export function getTodaySummary(goals) {
  const all = flattenGoals(goals);
  const active = all.filter((goal) => effectiveStatus(goal) === "active");
  const today = localDateString();

  let habitsScheduled = 0;
  let habitsMet = 0;
  let bestStreak = null;

  for (const goal of active) {
    if (goal.trackingType !== "habit") continue;

    const summary = getHabitSummary(goal);

    if (goal.habit?.period !== "week" && summary.scheduledToday) {
      habitsScheduled += 1;
      if (summary.met) habitsMet += 1;
    }

    const days = summary.streak * (summary.streakUnit === "week" ? 7 : 1);

    if (summary.streak > 0 && (!bestStreak || days > bestStreak.days)) {
      bestStreak = { days, streak: summary.streak, unit: summary.streakUnit, title: goal.title };
    }
  }

  const upcoming = active
    .filter((goal) => goal.targetDate && !goal.completed && goal.targetDate.slice(0, 10) >= today)
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0];

  return {
    active: active.length,
    completed: all.filter((goal) => effectiveStatus(goal) === "completed").length,
    milestones: goals.reduce((sum, goal) => { const c = countMilestones(goal); return { done: sum.done + c.done, all: sum.all + c.all }; }, { done: 0, all: 0 }),
    habitsScheduled,
    habitsMet,
    bestStreak,
    nextDeadline: upcoming || null,
  };
}

// A calendar of recent weeks (Monday to Sunday columns). A day's count is how many goals had progress logged on it.
export function getActivityGrid(goals, weeks = 12) {
  const counts = new Map();

  for (const goal of flattenGoals(goals)) {
    const seen = new Set((goal.entries || []).map((entry) => entry.localDate));

    for (const date of seen) counts.set(date, (counts.get(date) || 0) + 1);
  }

  const today = localDateString();
  const start = addDays(weekKey(today), -7 * (weeks - 1));
  const columns = [];
  let activeDays = 0;

  for (let week = 0; week < weeks; week += 1) {
    const column = [];

    for (let day = 0; day < 7; day += 1) {
      const date = addDays(start, week * 7 + day);
      const count = date > today ? 0 : counts.get(date) || 0;

      if (count > 0) activeDays += 1;

      column.push({ date, count, future: date > today });
    }

    columns.push(column);
  }

  return { columns, activeDays };
}

// The unit a goal is measured in ("minutes", "pages"...), or an empty string for milestones.
export function unitOf(goal) {
  return goal.trackingType === "habit" ? goal.habit?.unit || "times" : goal.target?.unit || "";
}
