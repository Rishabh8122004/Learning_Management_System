import { useState } from "react";
import { Link } from "react-router-dom";

import FieldError from "../../components/FieldError";
import PasswordField from "../../components/auth/PasswordField";
import { useAuth } from "../../context/useAuth";
import { useToast } from "../../context/useToast";
import { useAutoFocus } from "../../hooks/useAutoFocus";
import {
  firstErrorKey,
  hasErrors,
  validateEmail,
  validateMatch,
  validateName,
  validateNewPassword,
} from "../../lib/validators";
import "../css_files/Login.css";

const CHECKS = {
  name: (data) => validateName(data.name),
  email: (data) => validateEmail(data.email),
  password: (data) => validateNewPassword(data.password),
  confirmPassword: (data) => validateMatch(data.password, data.confirmPassword),
};

function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const nameRef = useAutoFocus();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // The same rules the server enforces, shown as a calm checklist while typing.
  const longEnough = formData.password.length >= 8;
  const matches =
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword;

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

    const found = Object.fromEntries(Object.keys(CHECKS).map((key) => [key, CHECKS[key](formData)]));

    setErrors(found);

    if (hasErrors(found)) {
      document.getElementById(firstErrorKey(found))?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await register(
        formData.name.trim(),
        formData.email.trim(),
        formData.password
      );

      setResult({ email: formData.email.trim(), emailSent: data.emailSent !== false });
    } catch (registerError) {
      toast.error(registerError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <header className="auth-header" role="status">
            <p className="auth-eyebrow">ALMOST THERE</p>
            <h1>Check your email</h1>
            {result.emailSent ? (
              <p>
                We sent a confirmation link to <strong>{result.email}</strong>. Click it to activate your account, then
                log in. The link works for 24 hours. Check your spam folder if you cannot find it.
              </p>
            ) : (
              <p>
                Your account was created, but we could not send the confirmation email to{" "}
                <strong>{result.email}</strong> right now. Try &ldquo;Resend confirmation email&rdquo; on the log in page
                in a few minutes.
              </p>
            )}
          </header>

          <p className="auth-footer">
            <Link to="/login">Go to log in</Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <header className="auth-header">
          <p className="auth-eyebrow">GET STARTED</p>
          <h1>Create your Trackly account</h1>
          <p>
            Start organizing your learning and keeping track of your progress. Use a real email: you will confirm it,
            and it is how you reset a forgotten password.
          </p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              ref={nameRef}
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Your name"
              autoComplete="name"
              aria-invalid={errors.name ? "true" : undefined}
              aria-describedby={errors.name ? "name-error" : undefined}
              disabled={isSubmitting}
            />
            <FieldError id="name-error" message={errors.name} />
          </div>

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
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
            placeholder="At least 8 characters"
            autoComplete="new-password"
            error={errors.password}
            aria-describedby="password-rules"
            disabled={isSubmitting}
          />

          <PasswordField
            id="confirmPassword"
            label="Confirm password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter your password again"
            autoComplete="new-password"
            error={errors.confirmPassword}
            aria-describedby="password-rules"
            disabled={isSubmitting}
          />

          <ul className="password-rules" id="password-rules">
            <li className={longEnough ? "is-met" : ""}>
              <span className="rule-mark" aria-hidden="true" />
              At least 8 characters
              <span className="visually-hidden">
                {longEnough ? " (done)" : " (not yet)"}
              </span>
            </li>

            <li className={matches ? "is-met" : ""}>
              <span className="rule-mark" aria-hidden="true" />
              Both passwords match
              <span className="visually-hidden">
                {matches ? " (done)" : " (not yet)"}
              </span>
            </li>
          </ul>

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting && <span className="spinner" aria-hidden="true" />}
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}

export default Register;
