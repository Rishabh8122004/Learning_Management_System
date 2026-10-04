import { useState } from "react";

import FieldError from "../FieldError";

// A password input with a show/hide button. All other props go straight to the input.
function PasswordField({ id, label, error, "aria-describedby": describedBy, ...inputProps }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>

      <div className="password-field">
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={[error ? `${id}-error` : "", describedBy].filter(Boolean).join(" ") || undefined}
          {...inputProps}
        />

        <button
          type="button"
          className="password-toggle"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
            <circle cx="12" cy="12" r="2.8" />
            {visible && <path d="M4 20 20 4" />}
          </svg>
        </button>
      </div>

      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export default PasswordField;
