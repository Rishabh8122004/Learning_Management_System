import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { apiRequest } from "../../services/apiRequest";
import { useAuth } from "../../context/useAuth";

const REFRESH_AFTER_MS = 60 * 1000;

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
    </svg>
  );
}

const relativeTime = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

function timeAgo(value) {
  const days = Math.round((new Date(value) - Date.now()) / 86400000);

  return relativeTime.format(Math.min(days, 0), "day");
}

function NotificationBell() {
  const { token } = useAuth();

  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ringing, setRinging] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const lastLoad = useRef(0);
  const knownUnread = useRef(null);

  // Load when signed in and when the window regains focus (no constant polling).
  useEffect(() => {
    if (!token) return undefined;

    let isCurrent = true;

    async function load() {
      try {
        const data = await apiRequest("/notifications");

        if (isCurrent) {
          const count = data.unreadCount || 0;

          setItems(data.notifications || []);
          setUnread(count);
          setFailed(false);
          lastLoad.current = Date.now();

          // The bell gives a little wiggle when something new arrives after the first load.
          if (knownUnread.current !== null && count > knownUnread.current) {
            setRinging(true);
            setTimeout(() => setRinging(false), 1400);
          }

          knownUnread.current = count;
        }
      } catch {
        if (isCurrent) setFailed(true);
      }
    }

    function handleFocus() {
      if (Date.now() - lastLoad.current > REFRESH_AFTER_MS) load();
    }

    load();
    window.addEventListener("focus", handleFocus);

    return () => {
      isCurrent = false;
      window.removeEventListener("focus", handleFocus);
    };
  }, [token, reloadKey]);

  // While open: Escape and outside clicks close it; focus moves into the panel.
  useEffect(() => {
    if (!open) return undefined;

    panelRef.current?.focus();

    function handleKey(event) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    function handlePointer(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handlePointer);

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handlePointer);
    };
  }, [open]);

  function toggle() {
    const willOpen = !open;
    setOpen(willOpen);

    // Opening the bell marks everything as seen. The items keep their
    // highlight until the next refresh so you can still tell what was new.
    if (willOpen && unread > 0) {
      apiRequest("/notifications/seen", { method: "POST" })
        .then(() => {
          setUnread(0);
          knownUnread.current = 0;
        })
        .catch(() => {});
    }
  }

  const actionable = items.filter((item) => item.type !== "motivation");
  const motivation = items.find((item) => item.type === "motivation");

  return (
    <div className="bell-wrap" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="icon-button bell-button"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        aria-controls="notification-panel"
        onClick={toggle}
      >
        <span className={`bell-icon${ringing ? " is-ringing" : ""}`}>
          <BellIcon />
        </span>

        {unread > 0 && (
          <span key={unread} className="bell-badge" aria-hidden="true">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notification-panel"
          className="bell-panel"
          role="region"
          aria-label="Notifications"
          tabIndex={-1}
          ref={panelRef}
        >
          <h2 className="bell-title">Notifications</h2>

          {failed && items.length === 0 ? (
            <div className="bell-empty">
              <p>Unable to load notifications. Please try again.</p>

              <button type="button" className="link-button" onClick={() => setReloadKey((key) => key + 1)}>
                Try again
              </button>
            </div>
          ) : (
            <>
              {actionable.length === 0 ? (
                <p className="bell-empty">You’re all caught up.</p>
              ) : (
                <ul className="bell-list">
                  {actionable.map((item, index) => (
                    <li key={`${item.type}-${item.link}-${index}`} style={{ "--i": index }}>
                      <Link
                        to={item.link}
                        className={`bell-item${item.unread ? " is-unread" : ""}`}
                        onClick={() => setOpen(false)}
                      >
                        <span className={`bell-dot is-${item.type}`} aria-hidden="true" />

                        <span className="bell-item-text">
                          <strong>{item.title}</strong>
                          <span>{item.message}</span>
                          {(item.type === "course" || item.type === "user") && (
                            <small>{timeAgo(item.createdAt)}</small>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {motivation && (
                <p className="bell-motivation">
                  <strong>{motivation.title}</strong>
                  {motivation.message}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
