import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ErrorState from "../../components/ErrorState";
import { apiRequest } from "../../services/apiRequest";
import { summarizeGoals } from "../../lib/goalProgress";
import { buildRecentActivity, timeAgo } from "../../lib/recentActivity";
import { daysUntil, dueLabel, greetingFor } from "../../lib/timeText";
import { useCountUp } from "../../hooks/useCountUp";
import { useAuth } from "../../context/useAuth";
import "../css_files/Dashboard.css";

const ICONS = {
  courses: "M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5v-15ZM20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5v-15Z",
  progress: "M12 7v5l3 2M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z",
  done: "m5 12.5 4.5 4.5L19 7.5",
  average: "M5 19V11M12 19V5M19 19v-5",
};

// One number card. The number counts up when it arrives; screen readers get the final value at once.
function StatCard({ label, value, suffix = "", icon, highlight, loading }) {
  const shown = useCountUp(loading ? 0 : value);

  return (
    <article
      className={`dashboard-stat${highlight ? " dashboard-stat-highlight" : ""}`}
    >
      <div className="dashboard-stat-top">
        <span className="dashboard-stat-label">{label}</span>

        <span className="dashboard-stat-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d={ICONS[icon]} />
          </svg>
        </span>
      </div>

      {loading ? (
        <span className="skeleton skeleton-stat" aria-hidden="true" />
      ) : (
        <>
          <strong aria-hidden="true">
            {shown}
            {suffix}
          </strong>
          <span className="visually-hidden">
            {value}
            {suffix}
          </span>
        </>
      )}
    </article>
  );
}

function Dashboard() {
  const { user, token } = useAuth();

  const [data, setData] = useState({
    enrollments: [],
    goals: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const [enrollmentsData, goalsData] = await Promise.all([
          apiRequest("/enrollments/me"),
          apiRequest("/goals"),
        ]);

        if (isCurrent) {
          setData({
            enrollments: enrollmentsData.enrollments || [],
            goals: goalsData.goals || [],
          });
        }
      } catch (loadError) {
        if (isCurrent) {
          setError(
            loadError.message || "Could not load your dashboard.",
          );
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    if (token) {
      loadDashboard();
    }

    return () => {
      isCurrent = false;
    };
  }, [token, reloadKey]);

  const goalSummary = summarizeGoals(data.goals);

  const completedCourses = data.enrollments.filter(
    (enrollment) => enrollment.status === "completed",
  ).length;

  const activeCourses = data.enrollments.filter(
    (enrollment) => enrollment.status === "active",
  );

  const averageProgress = data.enrollments.length
    ? Math.round(
        data.enrollments.reduce(
          (total, enrollment) =>
            total + Number(enrollment.progress?.percentage || 0),
          0,
        ) / data.enrollments.length,
      )
    : 0;

  const continueLearningCourses = [...activeCourses]
    .sort(
      (a, b) =>
        Number(b.progress?.percentage || 0) -
        Number(a.progress?.percentage || 0),
    )
    .slice(0, 3);

  const firstName = user?.name ? user.name.trim().split(/\s+/)[0] : "";
  const greeting = greetingFor(new Date().getHours());

  const nextDeadline = [...goalSummary.dueSoon].sort((a, b) =>
    a.targetDate.localeCompare(b.targetDate),
  )[0];

  const recentActivity = buildRecentActivity(data.enrollments, data.goals);

  const habitNames = goalSummary.habitsToday.slice(0, 3);
  const moreHabits = goalSummary.habitsToday.length - habitNames.length;

  return (
    <main className="dashboard-page" aria-busy={isLoading}>
      <header className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">YOUR LEARNING SPACE</p>

          <h1>
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h1>

          <p>
            Keep track of what you’re learning and continue where
            you left off.
          </p>
        </div>

        <Link to="/courses" className="secondary-button">
          Browse courses
        </Link>
      </header>

      {error && (
        <div className="dashboard-error-wrap">
          <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
        </div>
      )}

      <section
        className="dashboard-section"
        aria-labelledby="overview-heading"
      >
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-section-eyebrow">OVERVIEW</p>
            <h2 id="overview-heading">Your progress</h2>
          </div>
        </div>

        <div className="dashboard-stats">
          <StatCard
            label="Enrolled courses"
            icon="courses"
            value={data.enrollments.length}
            loading={isLoading}
          />

          <StatCard
            label="In progress"
            icon="progress"
            value={activeCourses.length}
            loading={isLoading}
          />

          <StatCard
            label="Completed"
            icon="done"
            value={completedCourses}
            loading={isLoading}
          />

          <StatCard
            label="Average progress"
            icon="average"
            value={averageProgress}
            suffix="%"
            highlight
            loading={isLoading}
          />
        </div>
      </section>

      <section
        className="dashboard-section"
        aria-labelledby="continue-heading"
      >
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-section-eyebrow">
              PICK UP WHERE YOU LEFT OFF
            </p>

            <h2 id="continue-heading">Continue learning</h2>
          </div>

          {data.enrollments.length > 0 && (
            <Link to="/my-courses" className="dashboard-section-link">
              View all
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="dashboard-course-list" aria-hidden="true">
            <span className="skeleton skeleton-card" />
            <span className="skeleton skeleton-card" />
          </div>
        ) : continueLearningCourses.length > 0 ? (
          <div className="dashboard-course-list">
            {continueLearningCourses.map((enrollment) => {
              const course = enrollment.course;
              const progress = Math.max(
                0,
                Math.min(
                  100,
                  Number(enrollment.progress?.percentage || 0),
                ),
              );

              return (
                <article
                  className="dashboard-course"
                  key={enrollment._id}
                >
                  <div className="dashboard-course-main">
                    <div>
                      {course?.category && (
                        <p className="dashboard-course-category">
                          {course.category}
                        </p>
                      )}

                      <h3>
                        {course?.title || "Course unavailable"}
                      </h3>

                      <p className="dashboard-course-progress-text">
                        {progress}% complete
                      </p>
                    </div>

                    {course?._id && (
                      <Link
                        to={`/courses/${course._id}`}
                        className="dashboard-course-link"
                      >
                        Continue <span aria-hidden="true">→</span>
                      </Link>
                    )}
                  </div>

                  <div
                    className="dashboard-progress-track"
                    role="progressbar"
                    aria-label={`Progress for ${
                      course?.title || "course"
                    }`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                  >
                    <span style={{ width: `${progress}%` }} />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="dashboard-empty">
            <h3>No courses in progress</h3>

            <p>
              Start learning by choosing a course that interests you.
            </p>

            <Link to="/courses" className="primary-button">
              Explore courses
            </Link>
          </div>
        )}
      </section>

      <section
        className="dashboard-section"
        aria-labelledby="goals-heading"
      >
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-section-eyebrow">YOUR GOALS</p>

            <h2 id="goals-heading">Track Your Goals</h2>
          </div>

          <Link
            to="/goals"
            className="dashboard-section-link"
          >
            View goals
          </Link>
        </div>

        {isLoading ? (
          <div aria-hidden="true">
            <span className="skeleton skeleton-card" />
          </div>
        ) : goalSummary.active > 0 ? (
          <div className="dashboard-goal-summary">
            <div className="dashboard-goal-count">
              <strong>{goalSummary.active}</strong>

              <span>
                {goalSummary.active === 1 ? "active goal" : "active goals"}
              </span>
            </div>

            <ul className="dashboard-today">
              <li>
                <span className="dashboard-today-label">
                  Habits left today
                </span>

                {habitNames.length > 0 ? (
                  <span>
                    {habitNames.map((goal) => goal.title).join(", ")}
                    {moreHabits > 0 ? ` and ${moreHabits} more` : ""}
                  </span>
                ) : (
                  <span>No habits left today.</span>
                )}
              </li>

              <li>
                <span className="dashboard-today-label">
                  Next deadline
                </span>

                {nextDeadline ? (
                  <span>
                    {nextDeadline.title} ·{" "}
                    {dueLabel(daysUntil(nextDeadline.targetDate))}
                  </span>
                ) : (
                  <span>Nothing due in the next 7 days.</span>
                )}
              </li>
            </ul>

            <Link to="/goals" className="secondary-button">
              Manage goals
            </Link>
          </div>
        ) : (
          <div className="dashboard-empty">
            <h3>Set your first goal</h3>

            <p>
              Create a milestone, habit or target to track what you
              want to achieve.
            </p>

            <Link to="/goals" className="primary-button">
              Open Track Your Goals
            </Link>
          </div>
        )}
      </section>

      <section className="dashboard-section" aria-labelledby="activity-heading">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-section-eyebrow">WHAT YOU DID LATELY</p>

            <h2 id="activity-heading">Recent activity</h2>
          </div>
        </div>

        {isLoading ? (
          <div aria-hidden="true">
            <span className="skeleton skeleton-card" />
          </div>
        ) : recentActivity.length > 0 ? (
          <ul className="dashboard-activity">
            {recentActivity.map((event) => (
              <li key={event.id} style={{ "--i": recentActivity.indexOf(event) }}>
                <Link to={event.link} className="dashboard-activity-item">
                  <span className={`dashboard-activity-dot is-${event.type}`} aria-hidden="true" />

                  <span className="dashboard-activity-text">{event.text}</span>

                  <time dateTime={event.at}>{timeAgo(event.at)}</time>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="dashboard-empty">
            <h3>No activity yet</h3>

            <p>Enroll in a course or log progress on a goal and it will show up here.</p>
          </div>
        )}
      </section>
    </main>
  );
}

export default Dashboard;
