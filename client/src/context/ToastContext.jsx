import { useCallback, useMemo, useRef, useState } from "react";

import { ToastContext } from "./toastContextValue";
import "./Toast.css";

const MAX_VISIBLE = 3;
const DURATIONS = { success: 4000, info: 4000, error: 6500, celebrate: 6000 };
const ICONS = { success: "✓", info: "i", error: "!", celebrate: "★" };
const LEAVE_MS = 220;
const SWIPE_DISTANCE = 90;

function Toast({ toast, onDismiss }) {
  const timer = useRef(null);
  const nodeRef = useRef(null);
  const remaining = useRef(toast.duration);
  const startedAt = useRef(0);
  const drag = useRef(null);

  // The countdown can be paused (hovering, focusing or dragging) and carries on with the time that was left.
  const start = useCallback(() => {
    clearTimeout(timer.current);
    startedAt.current = Date.now();
    timer.current = setTimeout(() => onDismiss(toast.id), remaining.current);
  }, [onDismiss, toast.id]);

  const pause = useCallback(() => {
    if (!timer.current) return;

    clearTimeout(timer.current);
    timer.current = null;
    remaining.current = Math.max(600, remaining.current - (Date.now() - startedAt.current));
  }, []);

  // Starts the timer on mount; the cleanup stops it if the toast goes away early.
  const ref = useCallback(
    (node) => {
      nodeRef.current = node;

      if (node) {
        start();
      } else {
        clearTimeout(timer.current);
        timer.current = null;
      }
    },
    [start],
  );

  // On touch screens a toast can be swiped away sideways.
  function handlePointerDown(event) {
    if (event.pointerType === "mouse" || event.target.closest("button")) return;

    drag.current = { x: event.clientX, dx: 0 };
    nodeRef.current.setPointerCapture(event.pointerId);
    nodeRef.current.classList.add("is-dragging");
    pause();
  }

  function handlePointerMove(event) {
    if (!drag.current) return;

    drag.current.dx = event.clientX - drag.current.x;
    nodeRef.current.style.transform = `translateX(${drag.current.dx}px)`;
    nodeRef.current.style.opacity = String(1 - Math.min(0.7, Math.abs(drag.current.dx) / 260));
  }

  function handlePointerEnd() {
    if (!drag.current) return;

    const { dx } = drag.current;
    const node = nodeRef.current;

    drag.current = null;
    node.classList.remove("is-dragging");

    if (Math.abs(dx) > SWIPE_DISTANCE) {
      node.style.transform = `translateX(${dx > 0 ? 120 : -120}%)`;
      onDismiss(toast.id);
    } else {
      node.style.transform = "";
      node.style.opacity = "";
      start();
    }
  }

  return (
    <div
      ref={ref}
      className={`toast toast-${toast.type}${toast.leaving ? " is-leaving" : ""}`}
      onMouseEnter={pause}
      onMouseLeave={start}
      onFocus={pause}
      onBlur={start}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <span className="toast-icon" aria-hidden="true">
        {ICONS[toast.type]}
      </span>

      <p className="toast-message">{toast.message}</p>

      {toast.actionLabel && (
        <button
          type="button"
          className="toast-action"
          onClick={() => {
            onDismiss(toast.id);
            toast.onAction?.();
          }}
        >
          {toast.actionLabel}
        </button>
      )}

      <button
        type="button"
        className="toast-close"
        aria-label="Dismiss message"
        onClick={() => onDismiss(toast.id)}
      >
        ×
      </button>

      <span className="toast-timer" style={{ animationDuration: `${toast.duration}ms` }} aria-hidden="true" />
    </div>
  );
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  // A toast fades and slides out first, then is removed.
  const dismiss = useCallback((id) => {
    setToasts((current) =>
      current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)),
    );

    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, LEAVE_MS);
  }, []);

  const show = useCallback(
    ({ message, type = "info", actionLabel, onAction, duration }) => {
      if (!message) return;

      const toast = {
        id: nextId.current++,
        message,
        type,
        actionLabel,
        onAction,
        duration: duration || DURATIONS[type] || DURATIONS.info,
      };

      setToasts((current) => [...current, toast].slice(-MAX_VISIBLE));
    },
    [],
  );

  const api = useMemo(
    () => ({
      show,
      success: (message) => show({ message, type: "success" }),
      info: (message) => show({ message, type: "info" }),
      error: (message) => show({ message, type: "error" }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div className="toast-viewport" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
