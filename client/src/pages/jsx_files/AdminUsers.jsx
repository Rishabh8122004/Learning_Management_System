import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ErrorState from "../../components/ErrorState";
import { apiRequest } from "../../services/apiRequest";
import { initialsOf } from "../../lib/initials";
import "../css_files/Admin.css";

function formatJoined(value) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function AdminUsers() {
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ users: [], pagination: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
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
        const params = new URLSearchParams({ page: String(page) });
        if (search) params.set("search", search);

        const result = await apiRequest(`/admin/users?${params}`);
        if (isCurrent) setData({ users: result.users || [], pagination: result.pagination || null });
      } catch (loadError) {
        if (isCurrent) setError(loadError.message || "Could not load users.");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    load();

    return () => {
      isCurrent = false;
    };
  }, [search, page, reloadKey]);

  const { users, pagination } = data;

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">ADMIN</p>
          <h1>Users</h1>
        </div>

        <Link to="/admin" className="admin-quiet">
          ← Overview
        </Link>
      </header>

      <div className="admin-toolbar">
        <p className="admin-muted" role="status">
          {pagination
            ? `${pagination.total} ${pagination.total === 1 ? "person" : "people"}${search ? " match your search" : ""}`
            : " "}
        </p>

        <input
          type="search"
          className="admin-search"
          placeholder="Search by name or email…"
          aria-label="Search users by name or email"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
      ) : isLoading && users.length === 0 ? (
        <div aria-hidden="true" className="admin-list">
          <span className="skeleton admin-skeleton-row" />
          <span className="skeleton admin-skeleton-row" />
          <span className="skeleton admin-skeleton-row" />
          <p className="visually-hidden" role="status">
            Loading users…
          </p>
        </div>
      ) : users.length === 0 ? (
        <div className="admin-card admin-empty">
          <h2>No users found</h2>
          <p>{search ? "Try a different name or email." : "Nobody has registered yet."}</p>
        </div>
      ) : (
        <ul className="admin-list" aria-busy={isLoading}>
          {users.map((person) => (
            <li key={person._id} className="admin-card admin-row">
              <span className="admin-user-avatar" aria-hidden="true">
                {initialsOf(person.name)}
              </span>

              <div className="admin-row-main">
                <strong className="admin-user-name">{person.name}</strong>
                <p className="admin-muted">
                  {person.email} · joined {formatJoined(person.createdAt)}
                </p>
              </div>

              <span className="admin-muted">
                {person.enrollments} course{person.enrollments === 1 ? "" : "s"}
              </span>

              <span className={`admin-badge ${person.role === "admin" ? "is-published" : ""}`}>
                <i aria-hidden="true" />
                {person.role}
              </span>
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

export default AdminUsers;
