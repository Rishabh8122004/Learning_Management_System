import { useState } from "react";
import { Link } from "react-router-dom";

import FieldError from "../../components/FieldError";
import { useToast } from "../../context/useToast";
import { useAutoFocus } from "../../hooks/useAutoFocus";
import { apiRequest } from "../../services/apiRequest";
import { validateEmail } from "../../lib/validators";
import "../css_files/Login.css";

function ForgotPassword() {
  const toast = useToast();
  const emailRef = useAutoFocus();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    const problem = validateEmail(email);
    setError(problem);

    if (problem) {
      document.getElementById("email")?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setSentTo(email.trim());
    } catch (requestError) {
      toast.error(requestError.message || "Could not send the reset link. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        {sentTo ? (
          <>
            <header className="auth-header">
              <p className="auth-eyebrow">CHECK YOUR EMAIL</p>
              <h1>Reset link sent</h1>
              <p>
                If <strong>{sentTo}</strong> is registered, a link to choose a new password is on its way. It works
                for 60 minutes and only once. Check your spam folder if you cannot find it.
              </p>
            </header>

            <p className="auth-footer">
              <Link to="/login">Back to log in</Link>
            </p>
          </>
        ) : (
          <>
            <header className="auth-header">
              <p className="auth-eyebrow">FORGOT YOUR PASSWORD?</p>
              <h1>Reset your password</h1>
              <p>Enter the email you registered with and we will send you a link to choose a new password.</p>
            </header>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  ref={emailRef}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError("");
                  }}
                  onBlur={() => setError(validateEmail(email))}
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-invalid={error ? "true" : undefined}
                  aria-describedby={error ? "email-error" : undefined}
                  disabled={isSubmitting}
                />
                <FieldError id="email-error" message={error} />
              </div>

              <button type="submit" className="auth-submit" disabled={isSubmitting}>
                {isSubmitting && <span className="spinner" aria-hidden="true" />}
                {isSubmitting ? "Sending..." : "Send reset link"}
              </button>
            </form>

            <p className="auth-footer">
              Remembered it? <Link to="/login">Log in</Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}

export default ForgotPassword;
