import { Link } from "react-router-dom";

import "../css_files/NotFound.css";

function NotFound() {
  return (
    <main className="not-found">
      <div className="not-found-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <p className="not-found-code" aria-hidden="true">
        404
      </p>

      <h1>Page not found</h1>
      <p className="not-found-text">
        The page you are looking for does not exist, or it may have moved.
      </p>

      <div className="not-found-actions">
        <Link to="/" className="primary-button">
          Return home
        </Link>

        <Link to="/courses" className="secondary-button">
          Browse courses
        </Link>
      </div>
    </main>
  );
}

export default NotFound;
