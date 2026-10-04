import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { apiRequest } from "../../services/apiRequest";
import "../css_files/Login.css";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get("token") || "");
  const [status, setStatus] = useState(token ? "working" : "failed");
  const [message, setMessage] = useState(token ? "" : "The confirmation link is missing or incomplete.");
  const started = useRef(false);

  useEffect(() => {
    // Take the token out of the address bar so it is not left in the history.
    if (window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    // The link works once, so make sure it is only sent one time (React may run effects twice in development).
    if (!token || started.current) return;
    started.current = true;

    apiRequest("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) })
      .then(() => setStatus("done"))
      .catch((error) => {
        setMessage(error.message || "Could not confirm your email.");
        setStatus("failed");
      });
  }, [token]);

  return (
    <main className="auth-page">
      <section className="auth-card">
        {status === "working" && (
          <header className="auth-header" role="status">
            <p className="auth-eyebrow">ONE MOMENT</p>
            <h1>Confirming your email...</h1>
          </header>
        )}

        {status === "done" && (
          <>
            <header className="auth-header">
              <p className="auth-eyebrow">ALL SET</p>
              <h1>Email confirmed</h1>
              <p>Your account is ready. You can log in now.</p>
            </header>
            <p className="auth-footer">
              <Link to="/login">Go to log in</Link>
            </p>
          </>
        )}

        {status === "failed" && (
          <>
            <header className="auth-header">
              <p className="auth-eyebrow">LINK PROBLEM</p>
              <h1>This link cannot be used</h1>
              <p>
                {message} Log in with your password and choose &ldquo;Resend confirmation email&rdquo; to get a new link.
              </p>
            </header>
            <p className="auth-footer">
              <Link to="/login">Go to log in</Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}

export default VerifyEmail;
