import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/useAuth";
import { initialsOf } from "../../lib/initials";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";

function Navbar({ theme, onToggleTheme }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const linksRef = useRef(null);
  const indicatorRef = useRef(null);
  const hasPlaced = useRef(false);

  // Slide the highlight to the active link. It is moved with direct style changes
  // (not React state) so it stays smooth and never causes extra renders.
  useEffect(() => {
    const container = linksRef.current;
    const indicator = indicatorRef.current;

    if (!container || !indicator) return undefined;

    function place() {
      const active = container.querySelector("a.is-active");

      if (!active || container.offsetWidth === 0) {
        container.classList.remove("has-indicator");
        return;
      }

      // The very first placement jumps into position instead of sliding in from the left.
      if (!hasPlaced.current) {
        indicator.style.transition = "none";
      }

      indicator.style.width = `${active.offsetWidth}px`;
      indicator.style.transform = `translateX(${active.offsetLeft}px)`;
      container.classList.add("has-indicator");

      if (!hasPlaced.current) {
        indicator.getBoundingClientRect(); // apply the jump before turning animation back on
        indicator.style.transition = "";
        hasPlaced.current = true;
      }
    }

    place();

    const observer = new ResizeObserver(place);
    observer.observe(container);
    document.fonts?.ready.then(place);

    return () => observer.disconnect();
  }, [location.pathname, user]);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  function handleLogout() {
    logout();
    closeMenu();
    navigate("/login", { replace: true });
  }

  function navClassName({ isActive }) {
    return `nav-link${isActive ? " is-active" : ""}`;
  }

  return (
    <header className="site-header">
      <nav className="navbar" aria-label="Main navigation">
        <Link to="/" className="brand" onClick={closeMenu}>
          <span className="brand-mark" aria-hidden="true" />
          Trackly
        </Link>

        <div className="nav-links" ref={linksRef}>
          <span className="nav-indicator" ref={indicatorRef} aria-hidden="true" />

          <NavLink to="/" end className={navClassName} onClick={closeMenu}>
            Home
          </NavLink>

          <NavLink to="/courses" className={navClassName} onClick={closeMenu}>
            Courses
          </NavLink>

          {user && (
            <>
              <NavLink
                to="/dashboard"
                className={navClassName}
                onClick={closeMenu}
              >
                Dashboard
              </NavLink>

              <NavLink
                to="/my-courses"
                className={navClassName}
                onClick={closeMenu}
              >
                My Courses
              </NavLink>

              <NavLink
                to="/goals"
                className={navClassName}
                onClick={closeMenu}
              >
                Track Your Goals
              </NavLink>

              {user.role === "admin" && (
                <NavLink
                  to="/admin"
                  className={navClassName}
                  onClick={closeMenu}
                >
                  Admin
                </NavLink>
              )}
            </>
          )}
        </div>

        <div className="nav-actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />

          {user && <NotificationBell />}

          {user ? (
            <>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `avatar-link${isActive ? " is-active" : ""}`
                }
                aria-label="Profile"
                title="Profile"
                onClick={closeMenu}
              >
                {initialsOf(user.name)}
              </NavLink>

              <button
                type="button"
                className="nav-button desktop-only"
                onClick={handleLogout}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="nav-quiet desktop-only" onClick={closeMenu}>
                Log in
              </NavLink>

              <NavLink
                to="/register"
                className="nav-cta desktop-only"
                onClick={closeMenu}
              >
                Register
              </NavLink>
            </>
          )}

          <button
            type="button"
            className="menu-button"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {isMenuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>

        {isMenuOpen && (
          <div className="mobile-menu">
            <NavLink to="/" end className={navClassName} onClick={closeMenu}>
              Home
            </NavLink>

            <NavLink to="/courses" className={navClassName} onClick={closeMenu}>
              Courses
            </NavLink>

            {user ? (
              <>
                <NavLink
                  to="/dashboard"
                  className={navClassName}
                  onClick={closeMenu}
                >
                  Dashboard
                </NavLink>

                <NavLink
                  to="/my-courses"
                  className={navClassName}
                  onClick={closeMenu}
                >
                  My Courses
                </NavLink>

                <NavLink
                  to="/goals"
                  className={navClassName}
                  onClick={closeMenu}
                >
                  Track Your Goals
                </NavLink>

                {user.role === "admin" && (
                  <NavLink
                    to="/admin"
                    className={navClassName}
                    onClick={closeMenu}
                  >
                    Admin
                  </NavLink>
                )}

                <NavLink
                  to="/profile"
                  className={navClassName}
                  onClick={closeMenu}
                >
                  Profile
                </NavLink>

                <button type="button" onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={navClassName}
                  onClick={closeMenu}
                >
                  Login
                </NavLink>

                <NavLink
                  to="/register"
                  className={navClassName}
                  onClick={closeMenu}
                >
                  Register
                </NavLink>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}

export default Navbar;