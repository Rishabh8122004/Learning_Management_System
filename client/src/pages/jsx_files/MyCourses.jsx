import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ConfirmInline from "../../components/ConfirmInline";
import ErrorState from "../../components/ErrorState";
import { apiRequest } from "../../services/apiRequest";
import { useAuth } from "../../context/useAuth";
import { useToast } from "../../context/useToast";
import "../css_files/MyCourses.css";

const FILTERS = [
  ["all", "All"],
  ["active", "In progress"],
  ["completed", "Completed"],
];

function formatDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function MyCourses() {
  const { token } = useAuth();
  const toast = useToast();
  const [enrollments, setEnrollments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadAttempt, setReloadAttempt] = useState(0);
  const [filter, setFilter] = useState("all");
  const [confirmingId, setConfirmingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadEnrollments() {
      setIsLoading(true);
      setError("");

      try {
        const data = await apiRequest("/enrollments/me");

        if (isCurrent) {
          setEnrollments(data.enrollments || []);
        }
      } catch (loadError) {
        if (isCurrent) {
          setError(loadError.message || "Could not load your courses.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    if (token) {
      loadEnrollments();
    }

    return () => {
      isCurrent = false;
    };
  }, [token, reloadAttempt]);

  // A course that was archived or deleted by an admin can no longer be opened, so the learner needs a way
  // to take it off their list (otherwise the admin could never delete the course for good).
  async function removeEnrollment(enrollment) {
    setRemovingId(enrollment._id);

    try {
      await apiRequest(`/enrollments/${enrollment._id}`, { method: "DELETE" });
      setEnrollments((current) => current.filter((item) => item._id !== enrollment._id));
      setConfirmingId(null);
      toast.success("Removed from your courses.");
    } catch (removeError) {
      toast.error(removeError.message || "Unable to remove this course.");
    } finally {
      setRemovingId(null);
    }
  }

  function retryLoading() {
    setReloadAttempt((attempt) => attempt + 1);
  }

  const counts = {
    all: enrollments.length,
    active: enrollments.filter((item) => item.status === "active").length,
    completed: enrollments.filter((item) => item.status === "completed").length,
  };

  const visible =
    filter === "all"
      ? enrollments
      : enrollments.filter((item) => item.status === filter);

  const showList = !isLoading && !error && enrollments.length > 0;

  return (
    <main className="my-courses-page" aria-busy={isLoading}>
      <header className="my-courses-header">
        <p className="my-courses-eyebrow">YOUR LEARNING</p>
        <h1>My Courses</h1>
        <p>Track your progress across the courses you’ve joined.</p>
      </header>

      {isLoading && (
        <>
          <p className="visually-hidden" role="status">
            Loading your courses…
          </p>

          <div className="my-courses-grid" aria-hidden="true">
            <span className="skeleton my-course-skeleton" />
            <span className="skeleton my-course-skeleton" />
          </div>
        </>
      )}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={retryLoading} />
      )}

      {!isLoading && !error && enrollments.length === 0 && (
        <section className="my-courses-empty">
          <h2>Your learning starts here</h2>

          <p>You haven’t enrolled in any courses yet.</p>

          <Link to="/courses" className="primary-button">
            Browse courses
          </Link>
        </section>
      )}

      {showList && (
        <div className="my-courses-filters" role="group" aria-label="Filter courses">
          {FILTERS.map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={filter === value ? "is-active" : ""}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
              <span>{counts[value]}</span>
            </button>
          ))}
        </div>
      )}

      {showList && visible.length === 0 && (
        <section className="my-courses-empty">
          <h2>
            {filter === "completed"
              ? "Nothing completed yet"
              : "Nothing in progress"}
          </h2>

          <p>
            {filter === "completed"
              ? "Courses you finish will show up here."
              : "Courses you are working on will show up here."}
          </p>

          <button
            type="button"
            className="secondary-button"
            onClick={() => setFilter("all")}
          >
            Show all courses
          </button>
        </section>
      )}

      {showList && visible.length > 0 && (
        <section
          className="my-courses-grid"
          aria-label="Enrolled courses"
        >
          {visible.map((enrollment) => {
            const course = enrollment.course;

            const title =
              course && typeof course === "object"
                ? course.title || "Untitled course"
                : "Course unavailable";

            const rawProgress = Number(
              enrollment.progress?.percentage || 0
            );

            const progress = Number.isFinite(rawProgress)
              ? Math.max(0, Math.min(100, rawProgress))
              : 0;

            const isCompleted = enrollment.status === "completed";
            const isAvailable = enrollment.courseAvailable;
            const enrolledDate = formatDate(enrollment.enrolledAt);

            return (
              <article
                className={`my-course-card${
                  !isAvailable ? " is-unavailable" : ""
                }`}
                key={enrollment._id}
              >
                <div className="my-course-card-header">
                  <div>
                    {course?.category && (
                      <p className="my-course-category">
                        {course.category}
                      </p>
                    )}

                    <h2>{title}</h2>
                  </div>

                  <span
                    className={`my-course-status${
                      isCompleted ? " is-completed" : ""
                    }${!isAvailable ? " is-unavailable" : ""}`}
                  >
                    {!isAvailable
                      ? "Unavailable"
                      : isCompleted
                        ? "Completed"
                        : "In progress"}
                  </span>
                </div>

                {course?.description && (
                  <p className="my-course-description">
                    {course.description}
                  </p>
                )}

                <div className="my-course-details">
                  {course?.level && (
                    <span className="my-course-level">{course.level}</span>
                  )}

                  {enrolledDate && (
                    <span>Joined {enrolledDate}</span>
                  )}
                </div>

                <div className="my-course-progress">
                  <div className="my-course-progress-label">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>

                  <div
                    className="my-course-progress-track"
                    role="progressbar"
                    aria-label={`Progress for ${title}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                  >
                    <span style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {isAvailable && course?._id ? (
                  <Link
                    className={`my-course-continue${
                      isCompleted ? " is-review" : ""
                    }`}
                    to={`/courses/${course._id}`}
                  >
                    {isCompleted ? "Review course" : "Continue learning"}{" "}
                    <span aria-hidden="true">→</span>
                  </Link>
                ) : (
                  <>
                    <p className="my-course-note">
                      This course is no longer available.
                    </p>

                    {confirmingId === enrollment._id ? (
                      <ConfirmInline
                        message="Remove this course and your progress from your list?"
                        confirmLabel="Remove"
                        keepLabel="Keep it"
                        busyLabel="Removing…"
                        busy={removingId === enrollment._id}
                        onConfirm={() => removeEnrollment(enrollment)}
                        onCancel={() => setConfirmingId(null)}
                      />
                    ) : (
                      <button
                        type="button"
                        className="my-course-remove"
                        onClick={() => setConfirmingId(enrollment._id)}
                      >
                        Remove from my list
                      </button>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

export default MyCourses;
