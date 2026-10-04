import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ErrorState from "../../components/ErrorState";
import { apiRequest } from "../../services/apiRequest";
import { useCountUp } from "../../hooks/useCountUp";
import "../css_files/Admin.css";

function StatCard({ label, value, tone }) {
  const shown = useCountUp(value ?? 0);

  return (
    <article className={`admin-card admin-stat${tone ? ` is-${tone}` : ""}`}>
      {value === undefined ? (
        <span className="skeleton admin-stat-skeleton" aria-hidden="true" />
      ) : (
        <>
          <strong aria-hidden="true">{shown}</strong>
          <span className="visually-hidden">{value} </span>
        </>
      )}

      <span>{label}</span>
    </article>
  );
}

const STATUS_PARTS = [
  ["published", "Published"],
  ["draft", "Drafts"],
  ["archived", "Archived"],
];

function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    apiRequest("/admin/stats")
      .then((data) => {
        if (isCurrent) setStats(data.stats);
      })
      .catch((loadError) => {
        if (isCurrent) setError(loadError.message || "Could not load the overview.");
      });

    return () => {
      isCurrent = false;
    };
  }, [reloadKey]);

  const total = stats ? stats.courses.published + stats.courses.draft + stats.courses.archived : 0;

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">ADMIN</p>
          <h1>Overview</h1>
        </div>

        <Link to="/admin/courses/new" className="admin-primary">
          + New course
        </Link>
      </header>

      {error && (
        <ErrorState
          message={error}
          onRetry={() => {
            setError("");
            setReloadKey((key) => key + 1);
          }}
        />
      )}

      <section className="admin-stats" aria-label="Totals">
        <StatCard label="Published courses" value={stats?.courses.published} tone="published" />
        <StatCard label="Drafts" value={stats?.courses.draft} tone="draft" />
        <StatCard label="Archived" value={stats?.courses.archived} tone="archived" />
        <StatCard label="Learners" value={stats?.users} />
        <StatCard label="Enrollments" value={stats?.enrollments} />
      </section>

      {total > 0 && (
        <section className="admin-card admin-split" aria-label="Courses by status">
          <h2>Catalog at a glance</h2>

          <div className="admin-split-bar" role="img" aria-label={`${total} courses in total`}>
            {STATUS_PARTS.map(([key]) =>
              stats.courses[key] > 0 ? (
                <span key={key} className={`is-${key}`} style={{ flexGrow: stats.courses[key] }} />
              ) : null,
            )}
          </div>

          <ul className="admin-split-legend">
            {STATUS_PARTS.map(([key, label]) => (
              <li key={key} className={`is-${key}`}>
                <i aria-hidden="true" />
                {label} <b>{stats.courses[key]}</b>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link to="/admin/courses" className="admin-card admin-link-card">
        <div>
          <h2>Manage courses</h2>
          <p>Create, edit, publish and archive the course catalog.</p>
        </div>
        <span className="admin-link-arrow" aria-hidden="true">
          →
        </span>
      </Link>

      <Link to="/admin/users" className="admin-card admin-link-card">
        <div>
          <h2>Users</h2>
          <p>See who has joined Trackly and how many courses each person is taking.</p>
        </div>
        <span className="admin-link-arrow" aria-hidden="true">
          →
        </span>
      </Link>
    </main>
  );
}

export default AdminOverview;
