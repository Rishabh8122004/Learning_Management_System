import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ConfirmInline from "../../components/ConfirmInline";
import ErrorState from "../../components/ErrorState";
import { apiRequest } from "../../services/apiRequest";
import { useToast } from "../../context/useToast";
import "../css_files/Admin.css";

const FILTERS = [
  ["all", "All"],
  ["published", "Published"],
  ["draft", "Drafts"],
  ["archived", "Archived"],
];

function AdminCourses() {
  const toast = useToast();

  const [status, setStatus] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ courses: [], pagination: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [confirmingId, setConfirmingId] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Wait a moment after typing before asking the server.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    let isCurrent = true;

    async function load() {
      setIsLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({ status, page: String(page) });
        if (search) params.set("search", search);

        const result = await apiRequest(`/admin/courses?${params}`);
        if (isCurrent) setData({ courses: result.courses || [], pagination: result.pagination || null });
      } catch (loadError) {
        if (isCurrent) setError(loadError.message || "Could not load courses.");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    load();

    return () => {
      isCurrent = false;
    };
  }, [status, search, page, reloadKey]);

  const reload = () => setReloadKey((key) => key + 1);

  const archiveWarning = (course) =>
    course.enrollments > 0
      ? `"${course.title}" has ${course.enrollments} enrolled learner(s). They keep their progress, but the course disappears from the catalog. Archive it?`
      : `Archive "${course.title}"? It will disappear from the catalog.`;

  async function archive(course) {
    setBusyId(course._id);
    try {
      await apiRequest(`/courses/${course._id}`, { method: "DELETE" });
      toast.success("Course archived");
      setConfirmingId("");
      reload();
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusyId("");
    }
  }

  async function restore(course) {
    setBusyId(course._id);
    try {
      await apiRequest(`/admin/courses/${course._id}/restore`, { method: "PATCH" });
      toast.success("Course restored as a draft");
      reload();
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusyId("");
    }
  }

  const { courses, pagination } = data;

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">ADMIN</p>
          <h1>Courses</h1>
        </div>

        <Link to="/admin/courses/new" className="admin-primary">
          + New course
        </Link>
      </header>

      <div className="admin-toolbar">
        <div className="admin-tabs" role="tablist" aria-label="Filter by status">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={status === value}
              className={status === value ? "is-active" : ""}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          type="search"
          className="admin-search"
          placeholder="Search by title…"
          aria-label="Search courses by title"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}

      {isLoading && courses.length === 0 ? (
        <div aria-hidden="true" className="admin-list">
          <span className="skeleton admin-skeleton-row" />
          <span className="skeleton admin-skeleton-row" />
          <span className="skeleton admin-skeleton-row" />
          <p className="visually-hidden" role="status">
            Loading courses…
          </p>
        </div>
      ) : courses.length === 0 && !error ? (
        <div className="admin-card admin-empty">
          <h2>No courses here</h2>
          <p>
            {search || status !== "all"
              ? "Try a different filter or search."
              : "Create your first course to get started."}
          </p>
        </div>
      ) : (
        <ul className="admin-list" aria-busy={isLoading}>
          {courses.map((course) => (
            <li key={course._id} className="admin-card admin-row">
              <div className="admin-row-main">
                <Link to={`/admin/courses/${course._id}/edit`} className="admin-row-title">
                  {course.title}
                </Link>

                <p className="admin-muted">
                  {course.category} · {course.level} · {course.lessons} lesson
                  {course.lessons === 1 ? "" : "s"} · {course.enrollments} learner
                  {course.enrollments === 1 ? "" : "s"}
                </p>
              </div>

              <span className={`admin-badge is-${course.status}`}>
                <i aria-hidden="true" />
                {course.status}
              </span>

              <div className="admin-row-actions">
                <Link to={`/admin/courses/${course._id}/edit`}>Edit</Link>

                {course.status === "archived" ? (
                  <button type="button" disabled={busyId === course._id} onClick={() => restore(course)}>
                    Restore
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === course._id}
                    onClick={() => setConfirmingId(course._id)}
                  >
                    Archive
                  </button>
                )}
              </div>

              {confirmingId === course._id && (
                <ConfirmInline
                  message={archiveWarning(course)}
                  confirmLabel="Archive course"
                  keepLabel="Cancel"
                  busyLabel="Archiving…"
                  busy={busyId === course._id}
                  onCancel={() => setConfirmingId("")}
                  onConfirm={() => archive(course)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {pagination && pagination.pages > 1 && (
        <nav className="admin-pager" aria-label="Pages">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ← Previous
          </button>

          <span>
            Page {pagination.page} of {pagination.pages}
          </span>

          <button type="button" disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}>
            Next →
          </button>
        </nav>
      )}
    </main>
  );
}

export default AdminCourses;
