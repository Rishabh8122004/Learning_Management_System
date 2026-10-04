import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { apiRequest } from "../../services/apiRequest";
import "../css_files/Login.css";

function ConfirmEmailChange() {
  const [searchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get("token") || "");
  const [status, setStatus] = useState(token ? "working" : "failed");
  const [message, setMessage] = useState(token ? "" : "The confirmation link is missing or incomplete.");
  const [email, setEmail] = useState("");
  const started = useRef(false);

  useEffect(() => {
    // Take the token out of the address bar so it is not left in the history.
    if (window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    // The link works once, so send it only one time (React may run effects twice in development).
    if (!token || started.current) return;
    started.current = true;

    apiRequest("/auth/confirm-email-change", {
      method: "POST",
      body: JSON.stringify({ token }),
      skipAuthExpired: true,
    })
      .then((data) => {
        setEmail(data.email || "");
        setStatus("done");
      })
      .catch((error) => {
        setMessage(error.message || "Could not confirm your new email.");
        setStatus("failed");
      });
  }, [token]);

  return (
    <main className="auth-page">
      <section className="auth-card">
        {status === "working" && (
          <header className="auth-header" role="status">
            <p className="auth-eyebrow">ONE MOMENT</p>
            <h1>Confirming your new email...</h1>
          </header>
        )}

        {status === "done" && (
          <>
            <header className="auth-header">
              <p className="auth-eyebrow">ALL SET</p>
              <h1>Email changed</h1>
              <p>
                Your Trackly account now uses <strong>{email}</strong>. Use it the next time you log in.
              </p>
            </header>
            <p className="auth-footer">
              <Link to="/profile">Go to your profile</Link>
            </p>
          </>
        )}

        {status === "failed" && (
          <>
            <header className="auth-header">
              <p className="auth-eyebrow">LINK PROBLEM</p>
              <h1>This link cannot be used</h1>
              <p>{message} Start the email change again from your profile to get a new link.</p>
            </header>
            <p className="auth-footer">
              <Link to="/profile">Go to your profile</Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}

export default ConfirmEmailChange;
