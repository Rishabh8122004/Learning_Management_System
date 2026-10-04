import { Link } from "react-router-dom";

import { useAuth } from "../../context/useAuth";

function Footer() {
  const { user } = useAuth();

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-name">
            <span className="brand-mark" aria-hidden="true" />
            Trackly
          </span>

          <p>Learn what matters. Track where you’re going.</p>
        </div>

        <nav className="footer-links" aria-label="Footer">
          <Link to="/courses">Courses</Link>

          {user ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/goals">Track Your Goals</Link>
              <Link to="/profile">Profile</Link>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </div>

      <p className="footer-note">© {new Date().getFullYear()} Trackly</p>
    </footer>
  );
}

export default Footer;
