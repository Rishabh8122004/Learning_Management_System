import { Component } from "react";

import ErrorState from "../ErrorState";

// A safety net: if a page ever crashes while drawing itself, show a calm message with a way out
// instead of a blank screen. The navbar and footer stay usable.
class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("A page crashed:", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="page">
        <ErrorState
          title="Something went wrong"
          message="This page ran into a problem. Reloading usually fixes it."
          onRetry={() => window.location.reload()}
        />
      </main>
    );
  }
}

export default ErrorBoundary;
