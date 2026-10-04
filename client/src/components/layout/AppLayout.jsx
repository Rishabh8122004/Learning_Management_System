import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { titleFor } from "../../lib/pageTitle";
import ErrorBoundary from "./ErrorBoundary";
import Footer from "./Footer";
import Navbar from "./Navbar";

function AppLayout({ theme, onToggleTheme }) {
  const { pathname } = useLocation();
  const contentRef = useRef(null);
  const isFirstPage = useRef(true);

  useEffect(() => {
    // A new page opens at its top (the browser would otherwise keep the old scroll position).
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    document.title = titleFor(pathname);

    // After moving to another page, keyboard and screen-reader focus starts at its main heading.
    if (isFirstPage.current) {
      isFirstPage.current = false;
      return;
    }

    const heading = contentRef.current?.querySelector("h1");
    const target = heading || contentRef.current;

    if (target) {
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  }, [pathname]);

  return (
    <div className="app-layout">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <Navbar
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      <div className="app-content" id="main-content" tabIndex={-1} ref={contentRef}>
        {/* Keyed by page so moving to another page clears a crashed one */}
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </div>

      <Footer />
    </div>
  );
}

export default AppLayout;