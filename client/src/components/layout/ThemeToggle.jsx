import { useRef } from "react";

// A tiny sky: day (sun, clouds) turns into night (moon, stars). The look lives in App.css (.tt-*).
function ThemeToggle({ theme, onToggle }) {
  const buttonRef = useRef(null);
  const isDark = theme === "dark";

  function handleClick() {
    // The page change grows as a circle from the middle of this switch (see toggleTheme in App.jsx).
    const box = buttonRef.current.getBoundingClientRect();

    onToggle({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      role="switch"
      aria-checked={isDark}
      className="theme-toggle"
      onClick={handleClick}
      aria-label="Dark mode"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="tt-track" aria-hidden="true">
        <span className="tt-sky" />

        <span className="tt-cloud tt-cloud-a" />
        <span className="tt-cloud tt-cloud-b" />

        <span className="tt-stars">
          <span className="tt-star tt-star-a" />
          <span className="tt-star tt-star-b" />
          <span className="tt-star tt-star-c" />
        </span>

        <span className="tt-knob">
          <svg className="tt-sun" viewBox="0 0 24 24">
            <g
              className="tt-rays"
              stroke="#ffb02e"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 1.6v2.6M12 19.8v2.6M1.6 12h2.6M19.8 12h2.6M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
            </g>
            <circle cx="12" cy="12" r="5.3" fill="#ffc23d" />
          </svg>

          <svg className="tt-moon" viewBox="0 0 24 24">
            <path
              d="M20.6 13.4A8.7 8.7 0 1 1 10.6 3.4a6.9 6.9 0 0 0 10 10z"
              fill="#f4f1ff"
            />
            <circle cx="9.2" cy="13.8" r="1.3" fill="#cfc9ec" />
            <circle cx="13.6" cy="17" r="0.9" fill="#cfc9ec" />
            <circle cx="8.4" cy="9.2" r="0.8" fill="#cfc9ec" />
          </svg>
        </span>
      </span>
    </button>
  );
}

export default ThemeToggle;
