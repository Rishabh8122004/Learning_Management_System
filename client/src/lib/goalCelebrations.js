import {
  countMilestones,
  flattenGoals,
  getHabitSummary,
  getTargetSummary,
  getTodaySummary,
} from "./goalProgress.js";

// Streak lengths worth a special moment.
const STREAK_MILESTONES = {
  day: [3, 7, 14, 30, 50, 100, 200, 365],
  week: [2, 4, 8, 12, 26, 52],
};

const PRIORITY = [
  "goal-done",
  "branch-done",
  "streak-milestone",
  "target-reached",
  "habit-done",
  "day-complete",
  "milestone-done",
];

function streakMilestoneMessage(streak, unit) {
  if (unit === "day" && streak === 3) return "3 days in a row. A habit is taking shape.";
  if (unit === "day" && streak === 7) return "7 days in a row. A full week!";
  if (unit === "day" && streak === 14) return "Two weeks straight. That is real consistency.";
  if (unit === "day" && streak === 30) return "30 days in a row. This is who you are now.";

  return `${streak} ${unit}s in a row. Milestone reached!`;
}

// What matters about each goal for noticing achievements, taken from the real data.
function snapshotOf(goal) {
  const snapshot = {
    type: goal.trackingType,
    title: goal.title,
    status: goal.status,
    completed: Boolean(goal.completed),
    hasChildren: (goal.children || []).length > 0,
  };

  if (goal.trackingType === "habit") {
    const summary = getHabitSummary(goal);

    snapshot.met = summary.met;
    snapshot.streak = summary.streak;
    snapshot.unit = summary.streakUnit;
  }

  if (goal.trackingType === "target") {
    const summary = getTargetSummary(goal);

    snapshot.reached = summary.reached;
    snapshot.current = summary.current;
    snapshot.targetUnit = summary.unit;
  }

  if (snapshot.hasChildren) {
    const milestones = countMilestones(goal);

    snapshot.branchDone = milestones.all > 0 && milestones.done === milestones.all;
  }

  return snapshot;
}

function snapshotAll(goals) {
  return new Map(flattenGoals(goals).map((goal) => [goal._id, snapshotOf(goal)]));
}

// Compares the goals before and after a change and lists what the user just achieved.
// Only improvements count: undoing something never celebrates.
export function findAchievements(beforeGoals, afterGoals) {
  const before = snapshotAll(beforeGoals);
  const after = snapshotAll(afterGoals);
  const topLevel = new Set(afterGoals.map((goal) => goal._id));
  const events = [];

  for (const [id, next] of after) {
    const prev = before.get(id);

    if (!prev) continue;

    if (next.branchDone && !prev.branchDone) {
      events.push(
        topLevel.has(id)
          ? { goalId: id, kind: "goal-done", level: "big", message: `Goal complete: ${next.title}. Every milestone is done.` }
          : { goalId: id, kind: "branch-done", level: "big", message: `All of "${next.title}" is done.` },
      );
    } else if (next.status === "completed" && prev.status !== "completed") {
      events.push({ goalId: id, kind: "goal-done", level: "big", message: `Goal complete: ${next.title}.` });
    }

    if (next.type === "habit" && next.met && !prev.met) {
      if (STREAK_MILESTONES[next.unit]?.includes(next.streak)) {
        events.push({ goalId: id, kind: "streak-milestone", level: "big", message: streakMilestoneMessage(next.streak, next.unit) });
      } else {
        events.push({
          goalId: id,
          kind: "habit-done",
          level: "small",
          message:
            next.streak >= 2
              ? `Target met. ${next.streak}-${next.unit} streak, keep it going!`
              : "Target met. Nice work!",
        });
      }
    }

    if (next.type === "target" && next.reached && !prev.reached) {
      events.push({
        goalId: id,
        kind: "target-reached",
        level: "big",
        message: `Target reached: ${next.current} ${next.targetUnit}. You did it!`,
      });
    }

    if (next.type === "milestones" && !next.hasChildren && next.completed && !prev.completed) {
      events.push({ goalId: id, kind: "milestone-done", level: "small", message: `Milestone complete: ${next.title}.` });
    }
  }

  const dayBefore = getTodaySummary(beforeGoals);
  const dayAfter = getTodaySummary(afterGoals);

  if (
    dayAfter.habitsScheduled > 0 &&
    dayBefore.habitsMet < dayBefore.habitsScheduled &&
    dayAfter.habitsMet === dayAfter.habitsScheduled
  ) {
    events.push({ goalId: null, kind: "day-complete", level: "big", message: "Everything scheduled for today is done." });
  }

  return events;
}

// The one message worth showing as a pop-up when several things happened at once.
export function headlineOf(events) {
  for (const kind of PRIORITY) {
    const found = events.find((event) => event.kind === kind);

    if (!found) continue;

    // Finishing a habit that also completes the whole day is two wins: say both.
    if (
      (kind === "streak-milestone" || kind === "habit-done") &&
      events.some((event) => event.kind === "day-complete")
    ) {
      return { ...found, message: `${found.message} Everything for today is done.` };
    }

    return found;
  }

  return null;
}
