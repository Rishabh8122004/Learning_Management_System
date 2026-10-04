// The browser-tab title for each page, so tabs, history and screen readers say where you are.
const TITLES = [
  [/^\/$/, "Learn what matters"],
  [/^\/courses$/, "Courses"],
  [/^\/courses\/[^/]+$/, "Course"],
  [/^\/login$/, "Log in"],
  [/^\/register$/, "Create your account"],
  [/^\/dashboard$/, "Dashboard"],
  [/^\/my-courses$/, "My Courses"],
  [/^\/goals$/, "Track Your Goals"],
  [/^\/profile$/, "Profile"],
  [/^\/admin$/, "Admin overview"],
  [/^\/admin\/courses$/, "Admin courses"],
  [/^\/admin\/users$/, "Admin users"],
  [/^\/admin\/courses\/new$/, "New course"],
  [/^\/admin\/courses\/[^/]+\/edit$/, "Edit course"],
];

export function titleFor(pathname) {
  const found = TITLES.find(([pattern]) => pattern.test(pathname));

  return found ? `${found[1]} · Trackly` : "Page not found · Trackly";
}
