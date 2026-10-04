import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import FieldError from "../../components/FieldError";
import PasswordField from "../../components/auth/PasswordField";
import ErrorState from "../../components/ErrorState";
import { apiRequest } from "../../services/apiRequest";
import { getActivityGrid, summarizeGoals } from "../../lib/goalProgress";
import { initialsOf } from "../../lib/initials";
import { useCountUp } from "../../hooks/useCountUp";
import { useAuth } from "../../context/useAuth";
import { useToast } from "../../context/useToast";
import {
  firstErrorKey,
  hasErrors,
  validateMatch,
  validateName,
  validateNewPassword,
  validateRequired,
} from "../../lib/validators";
import "../css_files/Profile.css";

// Shows "Saved ✓" on a button for a moment after something was saved.
function useSavedFlash() {
  const [saved, setSaved] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  function flash() {
    setSaved(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 2200);
  }

  return [saved, flash];
}

// A rough guide only: the server's one rule is 8 or more characters.
function strengthOf(password) {
  if (!password) return null;

  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;

  if (password.length < 8) return { level: 0, label: "Too short" };
  if (password.length >= 12 && kinds >= 3) return { level: 3, label: "Strong" };
  if (password.length >= 10 || kinds >= 3) return { level: 2, label: "Good" };

  return { level: 1, label: "Okay" };
}

function AccountCard({ user, saved, onSaved }) {
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();
  const changed = trimmed !== user.name;
  const nameError = changed ? validateName(name) : "";

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);

    try {
      const data = await apiRequest("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ name: trimmed }),
      });

      onSaved(data.user);
      toast.success("Name updated");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="profile-card" aria-labelledby="account-heading">
      <div className="profile-identity">
        <span className="profile-avatar" aria-hidden="true">
          {initialsOf(user.name)}
        </span>

        <div>
          <h2 id="account-heading">
            {user.name}
            {user.role === "admin" && <span className="profile-badge">Admin</span>}
          </h2>

          <p className="profile-muted">{user.email}</p>

          {user.createdAt && (
            <p className="profile-muted">
              Member since{" "}
              {new Date(user.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </div>
      </div>

      <form className="profile-form" onSubmit={handleSubmit}>
        <label htmlFor="profile-name">Display name</label>

        <div className="profile-inline">
          <input
            id="profile-name"
            value={name}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={nameError ? "true" : undefined}
            aria-describedby={nameError ? "profile-name-error" : undefined}
          />

          <button
            type="submit"
            className={saved ? "is-saved" : ""}
            disabled={saving || (!changed && !saved) || Boolean(nameError)}
          >
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
          </button>
        </div>

        <FieldError id="profile-name-error" message={nameError} />
      </form>
    </section>
  );
}

function SnapshotStat({ label, value }) {
  const shown = useCountUp(value ?? 0);

  return (
    <div>
      {value === undefined ? (
        <span className="skeleton profile-stat-skeleton" aria-hidden="true" />
      ) : (
        <>
          <strong aria-hidden="true">{shown}</strong>
          <span className="visually-hidden">{value} </span>
        </>
      )}

      <span>{label}</span>
    </div>
  );
}

function SnapshotCard() {
  const [stats, setStats] = useState(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    async function load() {
      setFailed(false);

      try {
        const [enrollmentData, goalData] = await Promise.all([
          apiRequest("/enrollments/me"),
          apiRequest("/goals"),
        ]);

        const enrollments = enrollmentData.enrollments || [];
        const goals = goalData.goals || [];

        if (isCurrent) {
          setStats({
            enrolled: enrollments.length,
            completed: enrollments.filter((item) => item.status === "completed").length,
            goals: summarizeGoals(goals).active,
            activeDays: getActivityGrid(goals, 12).activeDays,
          });
        }
      } catch {
        if (isCurrent) setFailed(true);
      }
    }

    load();

    return () => {
      isCurrent = false;
    };
  }, [reloadKey]);

  return (
    <section className="profile-card" aria-labelledby="snapshot-heading">
      <h2 id="snapshot-heading">Learning snapshot</h2>

      <div className="profile-stats">
        <SnapshotStat label="Enrolled courses" value={stats?.enrolled} />
        <SnapshotStat label="Completed courses" value={stats?.completed} />
        <SnapshotStat label="Active goals" value={stats?.goals} />
        <SnapshotStat label="Days with progress, last 12 weeks" value={stats?.activeDays} />
      </div>

      {failed && (
        <ErrorState
          title="Unable to load your snapshot"
          message="Your numbers could not be loaded right now."
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      )}
    </section>
  );
}

function PasswordCard({ onChanged }) {
  const toast = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [saved, flashSaved] = useSavedFlash();
  const [errors, setErrors] = useState({});

  const strength = strengthOf(form.next);
  const matches = form.confirm.length > 0 && form.next === form.confirm;

  function update(field) {
    return (event) => {
      setForm((old) => ({ ...old, [field]: event.target.value }));
      setErrors((old) => (old[field] ? { ...old, [field]: "" } : old));
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const found = {
      current: validateRequired(form.current, "Enter your current password."),
      next: validateNewPassword(form.next),
      confirm: validateMatch(form.next, form.confirm),
    };

    setErrors(found);

    if (hasErrors(found)) {
      document.getElementById({ current: "current-password", next: "new-password", confirm: "confirm-password" }[firstErrorKey(found)])?.focus();
      return;
    }

    setSaving(true);

    try {
      const data = await apiRequest("/users/me/password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: form.current,
          newPassword: form.next,
        }),
      });

      onChanged(data.token, data.user);
      setForm({ current: "", next: "", confirm: "" });
      flashSaved();
      toast.success("Password updated. Your other devices were signed out.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="profile-card" aria-labelledby="security-heading">
      <h2 id="security-heading">Change password</h2>

      <form className="profile-form" onSubmit={handleSubmit} noValidate>
        <PasswordField
          id="current-password"
          label="Current password"
          autoComplete="current-password"
          value={form.current}
          onChange={update("current")}
          error={errors.current}
        />

        <PasswordField
          id="new-password"
          label="New password"
          autoComplete="new-password"
          value={form.next}
          onChange={update("next")}
          error={errors.next}
          aria-describedby="password-strength"
        />

        <div className="strength" id="password-strength" aria-live="polite">
          <div className={`strength-bars level-${strength?.level ?? -1}`} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <span>
            {strength ? `Strength: ${strength.label}` : "Use at least 8 characters. Longer is stronger."}
          </span>
        </div>

        <PasswordField
          id="confirm-password"
          label="Confirm new password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={update("confirm")}
          error={errors.confirm}
        />

        {matches && (
          <p className="profile-match is-met" aria-live="polite">
            Passwords match ✓
          </p>
        )}

        <div>
          <button type="submit" className={saved ? "is-saved" : ""} disabled={saving}>
            {saving ? "Updating…" : saved ? "Updated ✓" : "Update password"}
          </button>
        </div>
      </form>
    </section>
  );
}

function DangerCard({ onDeleted }) {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setDeleting(true);

    try {
      await apiRequest("/users/me", {
        method: "DELETE",
        body: JSON.stringify({ password }),
      });

      onDeleted();
    } catch (error) {
      toast.error(error.message);
      setDeleting(false);
    }
  }

  return (
    <section className="profile-card profile-danger" aria-labelledby="danger-heading">
      <h2 id="danger-heading">Delete account</h2>

      <p className="profile-muted">
        This permanently removes your account, your course enrollments and progress, and all your goals. It
        cannot be undone.
      </p>

      <form className="profile-form" onSubmit={handleSubmit}>
        <PasswordField
          id="delete-password"
          label="Your password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <div className="auth-field">
          <label htmlFor="delete-confirm">
            Type <strong>DELETE</strong> to confirm
          </label>

          <input
            id="delete-confirm"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            autoComplete="off"
            required
          />
        </div>

        <div>
          <button
            type="submit"
            className="profile-danger-button"
            disabled={deleting || confirmText !== "DELETE" || !password}
          >
            {deleting ? "Deleting…" : "Delete my account"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Profile() {
  const { user, logout, updateUser, replaceToken } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  // Lives here because the account card is rebuilt when the name changes.
  const [nameSaved, flashNameSaved] = useSavedFlash();

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate("/");
  }

  function handleDeleted() {
    logout();
    navigate("/");
    toast.success("Your account was deleted.");
  }

  return (
    <main className="profile-page">
      <header className="profile-header">
        <h1>Profile</h1>

        <button type="button" className="profile-quiet" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <AccountCard
        key={user.name}
        user={user}
        saved={nameSaved}
        onSaved={(updated) => {
          updateUser(updated);
          flashNameSaved();
        }}
      />
      <SnapshotCard />
      <PasswordCard onChanged={replaceToken} />
      <DangerCard onDeleted={handleDeleted} />
    </main>
  );
}

export default Profile;
