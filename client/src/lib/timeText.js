import { localDateString } from "./goalProgress.js";

// Whole days from today (or `from`) until a date like "2026-10-09" or an ISO timestamp.
export function daysUntil(dateString, from = localDateString()) {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${dateString.slice(0, 10)}T12:00:00`);

  return Math.round((end - start) / 86400000);
}

export function dueLabel(days) {
  if (days < 0) return "overdue";
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";

  return `due in ${days} days`;
}

// A greeting for the hour of the day (0-23). Late at night it stays with the plain welcome.
export function greetingFor(hour) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";

  return "Welcome back";
}

// "today", "tomorrow", "in 5 days", "3 days overdue" (for a count from daysUntil).
export function relativeDay(days) {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "1 day overdue";
  if (days < 0) return `${-days} days overdue`;

  return `in ${days} days`;
}
