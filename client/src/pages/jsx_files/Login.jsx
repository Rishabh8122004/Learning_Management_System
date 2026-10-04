import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import FieldError from "../../components/FieldError";
import PasswordField from "../../components/auth/PasswordField";
import { useAuth } from "../../context/useAuth";
import { useToast } from "../../context/useToast";
import { useAutoFocus } from "../../hooks/useAutoFocus";
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
      toast.error(loginError.message);
    } finally {
      setIsSubmitting(false);
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
