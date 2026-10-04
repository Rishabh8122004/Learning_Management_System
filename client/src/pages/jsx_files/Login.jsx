import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import ConfirmInline from "../../components/ConfirmInline";
import FieldError from "../../components/FieldError";
import PasswordField from "../../components/auth/PasswordField";
import { useAuth } from "../../context/useAuth";
import { useToast } from "../../context/useToast";
import { useAutoFocus } from "../../hooks/useAutoFocus";
import { apiRequest } from "../../services/apiRequest";
import { firstErrorKey, hasErrors, validateEmail, validateRequired } from "../../lib/validators";
import "../css_files/Login.css";

// After signing in, go back to the page that asked for it (only pages inside Trackly).
function destinationAfterLogin(location) {
  const from = location.state?.from;

  return typeof from === "string" && from.startsWith("/") && !from.startsWith("//")
    ? from
    : "/dashboard";
}

const CHECKS = {
  email: (data) => validateEmail(data.email),
  password: (data) => validateRequired(data.password, "Enter your password."),
};

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const toast = useToast();
  const emailRef = useAutoFocus();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resendState, setResendState] = useState("idle");
  const [stuckMode, setStuckMode] = useState(null); // null | "change" | "delete"
  const [newEmail, setNewEmail] = useState("");
  const [newEmailError, setNewEmailError] = useState("");
  const [stuckBusy, setStuckBusy] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    // A problem disappears as soon as the person starts fixing it.
    setErrors((current) => (current[name] ? { ...current, [name]: "" } : current));
  }

  function handleBlur(event) {
    const { name } = event.target;

    setErrors((current) => ({ ...current, [name]: CHECKS[name](formData) }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const found = { email: CHECKS.email(formData), password: CHECKS.password(formData) };

    setErrors(found);

    if (hasErrors(found)) {
      document.getElementById(firstErrorKey(found))?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      await login(formData.email.trim(), formData.password);
      navigate(destinationAfterLogin(location), { replace: true });
    } catch (loginError) {
      if (loginError.code === "EMAIL_NOT_VERIFIED") {
        setNeedsConfirmation(true);
        setResendState("idle");
      } else {
        setNeedsConfirmation(false);
        toast.error(loginError.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendConfirmation() {
    setResendState("sending");

    try {
      await apiRequest("/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email: formData.email.trim() }),
      });
      setResendState("sent");
    } catch (resendError) {
      setResendState("idle");
      toast.error(resendError.message || "Could not send the email. Please try again.");
    }
  }

  function closeNotice() {
    setNeedsConfirmation(false);
    setStuckMode(null);
    setNewEmail("");
    setNewEmailError("");
  }

  // For someone who registered with a wrong or fake address: the password proves the account is theirs.
  async function changeEmail(event) {
    event.preventDefault();

    const problem = validateEmail(newEmail);
    setNewEmailError(problem);
    if (problem) return;

    setStuckBusy(true);

    try {
      const data = await apiRequest("/auth/unconfirmed/change-email", {
        method: "POST",
        body: JSON.stringify({ email: formData.email.trim(), password: formData.password, newEmail: newEmail.trim() }),
      });
      toast.success(data.message || "Email changed.");
      setFormData((current) => ({ ...current, email: data.email || newEmail.trim() }));
      closeNotice();
    } catch (changeError) {
      toast.error(changeError.message || "Could not change the email.");
    } finally {
      setStuckBusy(false);
    }
  }

  async function deleteStuckAccount() {
    setStuckBusy(true);

    try {
      const data = await apiRequest("/auth/unconfirmed/delete", {
        method: "POST",
        body: JSON.stringify({ email: formData.email.trim(), password: formData.password }),
      });
      toast.success(data.message || "Account deleted.");
      setFormData({ email: "", password: "" });
      closeNotice();
    } catch (deleteError) {
      toast.error(deleteError.message || "Could not delete the account.");
    } finally {
      setStuckBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <header className="auth-header">
          <p className="auth-eyebrow">WELCOME BACK</p>
          <h1>Log in to Trackly</h1>
          <p>Continue organizing your learning and tracking your progress.</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              ref={emailRef}
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={errors.email ? "true" : undefined}
              aria-describedby={errors.email ? "email-error" : undefined}
              disabled={isSubmitting}
            />
            <FieldError id="email-error" message={errors.email} />
          </div>

          <PasswordField
            id="password"
            label="Password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter your password"
            autoComplete="current-password"
            error={errors.password}
            disabled={isSubmitting}
          />

          {needsConfirmation && (
            <div className="auth-notice" role="alert">
              <p>
                <strong>Confirm your email first.</strong> We sent a link when you registered.
              </p>
              {resendState === "sent" ? (
                <p>A new link is on its way. Check your inbox (and spam).</p>
              ) : (
                <button
                  type="button"
                  className="link-button"
                  onClick={resendConfirmation}
                  disabled={resendState === "sending"}
                >
                  {resendState === "sending" ? "Sending..." : "Resend confirmation email"}
                </button>
              )}

              <p className="auth-notice-hint">
                Used a wrong or fake email? Then the link can never arrive and the account cannot be recovered by email.
                Change the email, or delete this account and register again.
              </p>

              {stuckMode === null && (
                <div className="auth-notice-actions">
                  <button type="button" className="link-button" onClick={() => setStuckMode("change")}>
                    Change my email
                  </button>
                  <button type="button" className="link-button" onClick={() => setStuckMode("delete")}>
                    Delete this account
                  </button>
                </div>
              )}

              {stuckMode === "change" && (
                <div className="auth-notice-form">
                  <label htmlFor="new-email">New email</label>
                  <input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(event) => {
                      setNewEmail(event.target.value);
                      if (newEmailError) setNewEmailError("");
                    }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    aria-invalid={newEmailError ? "true" : undefined}
                    aria-describedby={newEmailError ? "new-email-error" : undefined}
                    disabled={stuckBusy}
                  />
                  <FieldError id="new-email-error" message={newEmailError} />
                  <div>
                    <button type="button" className="link-button" onClick={() => setStuckMode(null)} disabled={stuckBusy}>
                      Cancel
                    </button>
                    <button type="button" className="auth-notice-go" onClick={changeEmail} disabled={stuckBusy}>
                      {stuckBusy ? "Saving..." : "Change email and send link"}
                    </button>
                  </div>
                </div>
              )}

              {stuckMode === "delete" && (
                <ConfirmInline
                  message="Delete this account? It has no data yet. You can register again with a real email."
                  confirmLabel="Delete account"
                  keepLabel="Keep it"
                  busyLabel="Deleting…"
                  busy={stuckBusy}
                  onConfirm={deleteStuckAccount}
                  onCancel={() => setStuckMode(null)}
                />
              )}
            </div>
          )}

          <p className="auth-forgot">
            <Link to="/forgot-password">Forgot your password?</Link>
          </p>

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting && <span className="spinner" aria-hidden="true" />}
            {isSubmitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;
