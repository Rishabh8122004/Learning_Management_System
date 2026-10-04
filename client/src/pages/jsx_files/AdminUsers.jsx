import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ErrorState from "../../components/ErrorState";
import { useToast } from "../../context/useToast";
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
  const toast = useToast();
  const [status, setStatus] = useState("all");
  const [removing, setRemoving] = useState(null);
  const [typedEmail, setTypedEmail] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);
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
        if (status !== "all") params.set("status", status);

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
  }, [search, status, page, reloadKey]);

  const { users, pagination } = data;

  function startRemoving(person) {
    setRemoving(person._id);
    setTypedEmail("");
  }

  async function removePerson(person) {
    setIsRemoving(true);

    try {
      await apiRequest(`/admin/users/${person._id}`, {
        method: "DELETE",
        body: JSON.stringify({ email: typedEmail.trim() }),
      });
      toast.success(`${person.name} was removed.`);
      setRemoving(null);

      // If that was the last person on this page, go back one page.
      if (users.length === 1 && page > 1) setPage(page - 1);
      else setReloadKey((key) => key + 1);
    } catch (removeError) {
      toast.error(removeError.message || "Could not remove this user.");
    } finally {
      setIsRemoving(false);
    }
  }

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

        <select
          className="admin-select"
          aria-label="Filter users"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">All users</option>
          <option value="unconfirmed">Email not confirmed</option>
        </select>

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
          <p>
            {search || status !== "all" ? "Try a different search or filter." : "Nobody has registered yet."}
          </p>
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

              {!person.emailVerified && (
                <span className="admin-badge is-draft">
                  <i aria-hidden="true" />
                  unconfirmed
                </span>
              )}

              <span className={`admin-badge ${person.role === "admin" ? "is-published" : ""}`}>
                <i aria-hidden="true" />
                {person.role}
              </span>

              {person.role !== "admin" && removing !== person._id && (
                <button type="button" className="admin-remove" onClick={() => startRemoving(person)}>
                  Remove
                </button>
              )}

              {removing === person._id && (
                <div className="admin-remove-panel" role="group" aria-label={`Remove ${person.name}`}>
                  <p>
                    This permanently deletes <strong>{person.name}</strong>, their {person.enrollments} enrolled course
                    {person.enrollments === 1 ? "" : "s"}, goals and progress. It cannot be undone. Type{" "}
                    <strong>{person.email}</strong> to confirm.
                  </p>

                  <input
                    type="email"
                    aria-label={`Type ${person.email} to confirm`}
                    value={typedEmail}
                    onChange={(event) => setTypedEmail(event.target.value)}
                    placeholder={person.email}
                    autoComplete="off"
                    autoFocus
                    disabled={isRemoving}
                  />

                  <div>
                    <button type="button" className="admin-quiet" onClick={() => setRemoving(null)} disabled={isRemoving}>
                      Keep user
                    </button>
                    <button
                      type="button"
                      className="admin-remove is-confirm"
                      onClick={() => removePerson(person)}
                      disabled={isRemoving || typedEmail.trim().toLowerCase() !== person.email}
                    >
                      {isRemoving ? "Removing…" : "Remove permanently"}
                    </button>
                  </div>
                </div>
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

export default AdminUsers;
