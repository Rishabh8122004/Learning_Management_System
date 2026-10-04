import { useEffect, useRef } from "react";

// A calm in-page "are you sure?" that replaces the browser's confirm box.
// Focus starts on the safe choice.
function ConfirmInline({
  message,
  confirmLabel,
  keepLabel = "Keep it",
  busyLabel = "Working…",
  busy,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div className="confirm-inline" role="group" aria-label="Please confirm">
      <p>{message}</p>

      <div>
        <button type="button" ref={cancelRef} className="confirm-keep" onClick={onCancel} disabled={busy}>
          {keepLabel}
        </button>

        <button type="button" className="confirm-delete" onClick={onConfirm} disabled={busy}>
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </div>
  );
}

export default ConfirmInline;
