import { flattenGoals, unitOf } from "./goalProgress.js";

// A short timeline of what the user really did, built only from saved data:
// courses enrolled in or completed, progress logged on goals, goals created. Nothing is invented.
export function buildRecentActivity(enrollments, goals, limit = 6) {
  const events = [];

  for (const enrollment of enrollments) {
    const title = enrollment.course?.title;
    const link = enrollment.course?._id ? `/courses/${enrollment.course._id}` : "/my-courses";

    if (!title) continue;

    if (enrollment.enrolledAt) {
      events.push({ id: `enroll-${enrollment._id}`, type: "course", at: enrollment.enrolledAt, text: `Enrolled in ${title}`, link });
    }

    if (enrollment.completedAt) {
      events.push({ id: `done-${enrollment._id}`, type: "done", at: enrollment.completedAt, text: `Completed ${title}`, link });
    }
  }

  for (const goal of flattenGoals(goals)) {
    if (goal.createdAt) {
      events.push({ id: `goal-${goal._id}`, type: "goal", at: goal.createdAt, text: `Created the goal "${goal.title}"`, link: "/goals" });
    }

    for (const entry of goal.entries || []) {
      if (!entry.occurredAt) continue;

      const unit = unitOf(goal);

      events.push({
        id: `entry-${entry._id}`,
        type: "progress",
        at: entry.occurredAt,
        text: `Logged ${entry.value}${unit ? ` ${unit}` : ""} on "${goal.title}"`,
        link: "/goals",
      });
    }
  }

  return events
    .filter((event) => !Number.isNaN(new Date(event.at).getTime()))
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, limit);
}

// "just now", "5 minutes ago", "3 hours ago", "yesterday", "4 days ago", or a short date for older items.
export function timeAgo(value, now = Date.now()) {
  const minutes = Math.round((now - new Date(value).getTime()) / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.round(minutes / 60);

  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(hours / 24);

  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;

  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
