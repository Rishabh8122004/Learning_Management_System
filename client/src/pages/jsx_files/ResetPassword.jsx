import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import PasswordField from "../../components/auth/PasswordField";
import { useToast } from "../../context/useToast";
import { apiRequest } from "../../services/apiRequest";
import { firstErrorKey, hasErrors, validateMatch, validateNewPassword } from "../../lib/validators";
import "../css_files/Login.css";

const CHECKS = {
  password: (data) => validateNewPassword(data.password),
  confirmPassword: (data) => validateMatch(data.password, data.confirmPassword),
};

function ResetPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  // Keep the token in memory and take it out of the address bar, so it is not left in the history or shared by accident.
  const [token] = useState(() => searchParams.get("token") || "");

  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const [formData, setFormData] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [linkProblem, setLinkProblem] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({ ...current, [name]: value }));
    setErrors((current) => (current[name] ? { ...current, [name]: "" } : current));
  }

  function handleBlur(event) {
    const { name } = event.target;

    setErrors((current) => ({ ...current, [name]: CHECKS[name](formData) }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const found = { password: CHECKS.password(formData), confirmPassword: CHECKS.confirmPassword(formData) };

    setErrors(found);

    if (hasErrors(found)) {
      document.getElementById(firstErrorKey(found))?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password: formData.password }),
      });
      toast.success("Password changed. Log in with your new password.");
      navigate("/login", { replace: true });
    } catch (resetError) {
      if (/invalid or has expired/i.test(resetError.message || "")) {
        setLinkProblem(resetError.message);
      } else {
        toast.error(resetError.message || "Could not change the password. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token || linkProblem) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <header className="auth-header">
            <p className="auth-eyebrow">LINK PROBLEM</p>
            <h1>This link cannot be used</h1>
            <p>{linkProblem || "The reset link is missing or incomplete."} Request a new one and try again.</p>
          </header>

          <p className="auth-footer">
            <Link to="/forgot-password">Send me a new link</Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <header className="auth-header">
          <p className="auth-eyebrow">ALMOST DONE</p>
          <h1>Choose a new password</h1>
          <p>Use at least 8 characters. You will be signed out on all devices.</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <PasswordField
            id="password"
            label="New password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            error={errors.password}
            disabled={isSubmitting}
          />

          <PasswordField
            id="confirmPassword"
            label="Confirm new password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Type it again"
            autoComplete="new-password"
            error={errors.confirmPassword}
            disabled={isSubmitting}
          />

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting && <span className="spinner" aria-hidden="true" />}
            {isSubmitting ? "Saving..." : "Change password"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default ResetPassword;
