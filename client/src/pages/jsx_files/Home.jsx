import { Link } from "react-router-dom";

import { useAuth } from "../../context/useAuth";
import { useReveal } from "../../hooks/useReveal";
import "../css_files/Home.css";

const STEPS = [
  ["01", "Goal", "What I want to learn"],
  ["02", "Path", "How I organize the learning"],
  ["03", "Progress", "Where I am and what comes next"],
];

const SOURCES = ["YouTube", "Docs", "Books", "College", "Projects"];

function Home() {
  const { user, token, isLoading } = useAuth();
  const pageRef = useReveal();

  // While the session is being restored, a stored token means the visitor is most likely signed in.
  const signedIn = Boolean(user) || (isLoading && Boolean(token));

  return (
    <main className="home-page" ref={pageRef}>
      <section className="home-hero" aria-labelledby="home-heading">
        <div className="home-hero-copy">
          <p className="home-eyebrow">LEARNING, WITH DIRECTION</p>

          <h1 id="home-heading">
            Learn what matters.
            <br />
            <span>Track where you're going.</span>
          </h1>

          <p className="home-hero-text">
            Trackly helps you turn the things you want to learn into an
            organized path, so you can see what you're working on, where you
            are, and what comes next.
          </p>

          <div className="home-cta">
            {signedIn ? (
              <>
                <Link to="/goals" className="primary-button">
                  Open Track Your Goals
                </Link>

                <Link to="/dashboard" className="secondary-button">
                  Go to dashboard
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" className="primary-button">
                  Create your account
                </Link>

                <Link to="/courses" className="secondary-button">
                  Browse courses
                </Link>
              </>
            )}
          </div>

          <ul className="home-sources" aria-label="Learn from anywhere">
            {SOURCES.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        </div>

        {/* A decorative sketch of the idea: a list that fills in. Shapes only, no real or made-up data. */}
        <div className="hero-sketch" aria-hidden="true">
          <div className="sketch-card sketch-main">
            <div className="sketch-row">
              <span className="sketch-dot is-done" />
              <span className="sketch-line" style={{ width: "62%" }} />
            </div>

            <div className="sketch-row">
              <span className="sketch-dot is-done" />
              <span className="sketch-line" style={{ width: "48%" }} />
            </div>

            <div className="sketch-row">
              <span className="sketch-dot is-active" />
              <span className="sketch-line is-active" style={{ width: "70%" }} />
            </div>

            <div className="sketch-row">
              <span className="sketch-dot" />
              <span className="sketch-line" style={{ width: "40%" }} />
            </div>

            <div className="sketch-bar">
              <span className="sketch-bar-fill" />
            </div>
          </div>

          <div className="sketch-card sketch-chip sketch-ring-card">
            <span className="sketch-ring" />
          </div>

          <div className="sketch-card sketch-chip sketch-streak">
            <span className="is-on" />
            <span className="is-on" />
            <span className="is-on" />
            <span />
            <span />
          </div>
        </div>
      </section>

      <section
        className="home-learning-flow"
        aria-labelledby="learning-flow-heading"
      >
        <div className="flow-intro" data-reveal-item>
          <p className="home-eyebrow">THE TRACKLY IDEA</p>

          <h2 id="learning-flow-heading">
            Turn learning into something you can follow.
          </h2>
        </div>

        <div className="hero-track">
          <div className="hero-track-line" aria-hidden="true">
            <span className="hero-track-progress" />
          </div>

          {STEPS.map(([number, title, text], index) => (
            <article
              className="learning-step"
              key={number}
              data-reveal-item
              style={{ "--i": index }}
            >
              <span className="learning-step-marker" aria-hidden="true">
                {number}
              </span>

              <div className="learning-step-content">
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-closing" aria-labelledby="closing-heading">
        <div data-reveal-item>
          <p className="home-eyebrow">LEARN YOUR WAY</p>

          <h2 id="closing-heading">Your learning can come from anywhere.</h2>
        </div>

        <div className="home-closing-copy" data-reveal-item style={{ "--i": 1 }}>
          <p>
            Learn from YouTube, books, college, courses, documentation,
            projects, or anywhere else. Trackly simply gives that learning
            structure.
          </p>

          <Link
            to={signedIn ? "/dashboard" : "/register"}
            className="primary-button"
          >
            {signedIn ? "Continue to your dashboard" : "Get started"}
          </Link>
        </div>
      </section>
    </main>
  );
}

export default Home;
