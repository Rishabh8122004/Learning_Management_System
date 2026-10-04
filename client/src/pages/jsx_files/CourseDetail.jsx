import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ErrorState from "../../components/ErrorState";
import { apiRequest } from "../../services/apiRequest";
import { linkTypeOf } from "../../lib/linkType";
import { useCountUp } from "../../hooks/useCountUp";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { AuthContext } from "../../context/authContextValue";
import { useToast } from "../../context/useToast";
import "../css_files/CourseDetail.css";

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);

// Modules and lessons in the order the admin arranged them, each with a stable key.
function prepareModules(course) {
  return [...(course?.modules || [])].sort(byOrder).map((module, moduleIndex) => ({
    ...module,
    key: module._id || `module-${moduleIndex}`,
    lessons: [...(module.lessons || [])].sort(byOrder).map((lesson, lessonIndex) => ({
      ...lesson,
      key: lesson._id || `lesson-${moduleIndex}-${lessonIndex}`,
    })),
  }));
}

function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// With a plan, the module holding the next unfinished lesson starts open; otherwise the first one.
function modulesToOpenFirst(modules, completed, enrolled) {
  if (!modules.length) return [];

  if (enrolled) {
    const next = modules.find((module) =>
      module.lessons.some((lesson) => !completed.has(String(lesson._id))),
    );

    if (next) return [next.key];
  }

  return [modules[0].key];
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="m3.5 8.5 3 3 6-6.5" />
    </svg>
  );
}

function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const compact = useMediaQuery("(max-width: 800px)");

  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [openModules, setOpenModules] = useState([]);
  const [confirmingUnenroll, setConfirmingUnenroll] = useState(false);
  const [justDone, setJustDone] = useState(null);

  const unenrollRef = useRef(null);
  const keepRef = useRef(null);

  const modules = useMemo(() => prepareModules(course), [course]);

  const progressPercentage = enrollment?.progress?.percentage || 0;
  const shownPercentage = useCountUp(progressPercentage);

  useEffect(() => {
    // Leaving or changing course while loading must not let the old answer land on the new page.
    let cancelled = false;

    const loadCourse = async () => {
      setLoading(true);
      setError("");

      try {
        const courseData = await apiRequest(`/courses/${id}`);

        if (cancelled) return;

        let currentEnrollment = null;

        if (user) {
          try {
            const enrollmentData = await apiRequest("/enrollments/me");

            currentEnrollment =
              enrollmentData.enrollments?.find(
                (item) => item.course?._id === id,
              ) || null;
          } catch {
            currentEnrollment = null;
          }
        }

        if (cancelled) return;

        const completed = new Set(
          (currentEnrollment?.progress?.completedLessons || []).map(String),
        );

        setCourse(courseData.course);
        setEnrollment(currentEnrollment);
        setOpenModules(
          modulesToOpenFirst(
            prepareModules(courseData.course),
            completed,
            Boolean(currentEnrollment),
          ),
        );
      } catch (err) {
        if (cancelled) return;

        setError(err.message || "Unable to load this course.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCourse();

    return () => {
      cancelled = true;
    };
  }, [id, user, reloadKey]);

  // Move keyboard focus to the safe choice when the confirmation appears.
  useEffect(() => {
    if (confirmingUnenroll) keepRef.current?.focus();
  }, [confirmingUnenroll]);

  const handleEnroll = async () => {
    if (!user) {
      navigate("/login", {
        state: {
          from: `/courses/${id}`,
        },
      });
      return;
    }

    setActionLoading(true);

    try {
      const data = await apiRequest(`/enrollments/${id}`, {
        method: "POST",
      });

      setEnrollment(data.enrollment);
    } catch (err) {
      toast.error(err.message || "Unable to enroll in this course.");
    } finally {
      setActionLoading(false);
    }
  };

  const cancelUnenroll = () => {
    setConfirmingUnenroll(false);

    // The confirmation disappears, so hand focus back to the button that opened it.
    requestAnimationFrame(() => unenrollRef.current?.focus());
  };

  const handleUnenroll = async () => {
    if (!enrollment) {
      return;
    }

    setActionLoading(true);

    try {
      await apiRequest(`/enrollments/${enrollment._id}`, {
        method: "DELETE",
      });

      setEnrollment(null);
      setConfirmingUnenroll(false);
    } catch (err) {
      toast.error(err.message || "Unable to unenroll from this course.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteLesson = async (lessonId, isUndo = false) => {
    if (!enrollment) {
      return;
    }

    const wasCompleted = (enrollment.progress?.completedLessons || []).some(
      (completedLesson) => String(completedLesson) === String(lessonId),
    );

    setActionLoading(true);

    try {
      const data = await apiRequest(
        `/enrollments/${enrollment._id}/lessons/${lessonId}/complete`,
        {
          method: "POST",
        },
      );

      setEnrollment(data.enrollment);

      if (!wasCompleted) setJustDone(String(lessonId));

      // The endpoint toggles, so undoing is just toggling the same lesson again.
      if (!isUndo) {
        toast.show({
          message: wasCompleted
            ? "Lesson marked as not done."
            : "Lesson marked complete.",
          type: "success",
          actionLabel: "Undo",
          onAction: () => handleCompleteLesson(lessonId, true),
          duration: 6000,
        });
      }
    } catch (err) {
      toast.error(err.message || "Unable to update lesson progress.");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleModule = (key) => {
    setOpenModules((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  if (loading) {
    return (
      <main className="course-detail-page" aria-busy="true">
        <p className="visually-hidden" role="status">
          Loading course...
        </p>

        <div aria-hidden="true">
          <span className="skeleton course-skeleton-back" />

          <div className="course-detail-header">
            <div>
              <div className="course-detail-meta">
                <span className="skeleton skeleton-chip" />
                <span className="skeleton skeleton-chip" />
              </div>

              <span className="skeleton course-skeleton-title" />
              <span className="skeleton skeleton-line" />
              <span className="skeleton skeleton-line skeleton-short" />
            </div>

            <span className="skeleton course-skeleton-card" />
          </div>

          <span className="skeleton course-skeleton-module" />
          <span className="skeleton course-skeleton-module" />
        </div>
      </main>
    );
  }

  if (error || !course) {
    return (
      <main className="course-detail-page">
        <ErrorState
          title="Unable to load this course"
          message={error || "This course could not be found."}
          onRetry={() => setReloadKey((key) => key + 1)}
        />

        <p className="course-error-back">
          <Link to="/courses" className="link-button">
            ← Back to courses
          </Link>
        </p>
      </main>
    );
  }

  const completedIds = new Set(
    (enrollment?.progress?.completedLessons || []).map(String),
  );

  const allLessons = modules.flatMap((module) =>
    module.lessons.map((lesson) => ({ ...lesson, moduleKey: module.key })),
  );
  const totalLessons = allLessons.length;
  const totalMinutes = allLessons.reduce(
    (sum, lesson) => sum + (lesson.duration || 0),
    0,
  );
  const doneLessons = allLessons.filter((lesson) =>
    completedIds.has(String(lesson._id)),
  ).length;
  const nextLesson = enrollment
    ? allLessons.find((lesson) => !completedIds.has(String(lesson._id)))
    : null;

  const allOpen = modules.length > 0 && openModules.length >= modules.length;

  const goToLesson = (lesson) => {
    const wasOpen = openModules.includes(lesson.moduleKey);

    if (!wasOpen) {
      setOpenModules((current) => [...current, lesson.moduleKey]);
    }

    // Wait for the module to finish opening before scrolling to its lesson.
    window.setTimeout(
      () => {
        const row = document.getElementById(`lesson-${lesson._id}`);

        if (!row) return;

        row.scrollIntoView({ block: "center" });
        row.classList.add("is-target");
        window.setTimeout(() => row.classList.remove("is-target"), 2000);
      },
      wasOpen ? 0 : 320,
    );
  };

  const isComplete = totalLessons > 0 && progressPercentage === 100;

  return (
    <main className="course-detail-page">
      <Link className="course-detail-back" to="/courses">
        <span aria-hidden="true">←</span> Back to courses
      </Link>

      <section className="course-detail-header">
        <div className="course-detail-intro">
          <div className="course-detail-meta">
            <span>{course.category}</span>
            <span className="course-detail-level">{course.level}</span>
          </div>

          <h1>{course.title}</h1>

          <p>{course.description}</p>

          {totalLessons > 0 && (
            <ul className="course-facts" aria-label="Course size">
              <li>{plural(modules.length, "module")}</li>
              <li>{plural(totalLessons, "lesson")}</li>
              {totalMinutes > 0 && <li>About {formatMinutes(totalMinutes)}</li>}
            </ul>
          )}

          <p className="course-detail-resource-note">
            Learn from the external resources provided in each lesson, then
            return to Trackly to mark your progress.
          </p>
        </div>

        {(enrollment || !compact) && (
          <aside className="course-detail-action">
            {enrollment ? (
              <div className="course-progress-card">
                <div
                  className={`course-ring${isComplete ? " is-complete" : ""}`}
                  style={{ "--p": shownPercentage }}
                  role="progressbar"
                  aria-label="Course progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressPercentage}
                >
                  <strong>{shownPercentage}%</strong>
                </div>

                <div className="course-progress-text">
                  <span className="course-progress-label">Your progress</span>
                  <span className="course-progress-count">
                    {doneLessons} of {plural(totalLessons, "lesson")} done
                  </span>
                </div>

                {isComplete && (
                  <p className="course-progress-next">
                    Course complete. Well done.
                  </p>
                )}

                {!isComplete && nextLesson && (
                  <p className="course-progress-next">
                    <span>Up next</span>
                    {nextLesson.title}
                  </p>
                )}

                {!isComplete && nextLesson && !compact && (
                  <button
                    type="button"
                    className="primary-button course-continue-button"
                    onClick={() => goToLesson(nextLesson)}
                  >
                    Continue learning
                  </button>
                )}

                {confirmingUnenroll ? (
                  <div
                    className="course-unenroll-confirm"
                    role="group"
                    aria-label="Confirm unenroll"
                  >
                    <p>Unenroll? Your progress in this course will be removed.</p>

                    <div className="course-unenroll-choices">
                      <button
                        type="button"
                        ref={keepRef}
                        className="course-unenroll-keep"
                        onClick={cancelUnenroll}
                        disabled={actionLoading}
                      >
                        Keep course
                      </button>

                      <button
                        type="button"
                        className="course-unenroll-confirm-button"
                        onClick={handleUnenroll}
                        disabled={actionLoading}
                      >
                        {actionLoading ? "Removing..." : "Unenroll"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    ref={unenrollRef}
                    className="course-unenroll-button"
                    onClick={() => setConfirmingUnenroll(true)}
                    disabled={actionLoading}
                  >
                    Unenroll
                  </button>
                )}
              </div>
            ) : (
              <div className="course-enroll-card">
                <button
                  type="button"
                  className="course-enroll-button"
                  onClick={handleEnroll}
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? "Enrolling..."
                    : user
                      ? "Start learning"
                      : "Sign in to start learning"}
                </button>

                <p>Enroll to mark lessons done and see your progress.</p>
              </div>
            )}
          </aside>
        )}
      </section>

      <section className="course-modules">
        <div className="course-section-heading">
          <div>
            <span className="course-section-label">Learning roadmap</span>
            <h2>Course content</h2>
          </div>

          {modules.length > 1 && (
            <button
              type="button"
              className="link-button"
              onClick={() =>
                setOpenModules(allOpen ? [] : modules.map((module) => module.key))
              }
            >
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          )}
        </div>

        {modules.length ? (
          modules.map((module, moduleIndex) => {
            const isOpen = openModules.includes(module.key);
            const moduleDone = module.lessons.filter((lesson) =>
              completedIds.has(String(lesson._id)),
            ).length;
            const moduleComplete =
              module.lessons.length > 0 && moduleDone === module.lessons.length;
            const panelId = `module-panel-${moduleIndex}`;

            return (
              <article
                className={`course-module${isOpen ? " is-open" : ""}${
                  enrollment && moduleComplete ? " is-done" : ""
                }`}
                key={module.key}
              >
                <h3 className="course-module-heading">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggleModule(module.key)}
                  >
                    <span className="course-module-text">
                      <span className="course-module-index">
                        Module {moduleIndex + 1}
                      </span>
                      <span className="course-module-title">{module.title}</span>
                    </span>

                    <span className="course-module-meta">
                      {enrollment && module.lessons.length > 0 && (
                        <span className="course-module-progress">
                          {moduleComplete ? <CheckIcon /> : null}
                          {moduleDone}/{module.lessons.length} done
                        </span>
                      )}
                      <span>{plural(module.lessons.length, "lesson")}</span>
                    </span>

                    <span className="course-module-chevron" aria-hidden="true" />
                  </button>
                </h3>

                <div className="course-module-panel" id={panelId} inert={!isOpen}>
                  <div className="course-module-panel-inner">
                    {module.description && (
                      <p className="course-module-description">
                        {module.description}
                      </p>
                    )}

                    <ol className="course-lessons">
                      {module.lessons.map((lesson, lessonIndex) => {
                        const lessonId = lesson._id;
                        const completed = completedIds.has(String(lessonId));
                        const type = linkTypeOf(lesson.content);

                        return (
                          <li
                            id={`lesson-${lessonId}`}
                            className={`course-lesson${
                              completed ? " is-completed" : ""
                            }${
                              justDone === String(lessonId) ? " just-done" : ""
                            }`}
                            key={lesson.key}
                          >
                            <div className="course-lesson-info">
                              <span
                                className="course-lesson-number"
                                aria-hidden="true"
                              >
                                {completed ? <CheckIcon /> : lessonIndex + 1}
                              </span>

                              <div className="course-lesson-content">
                                <h4>
                                  <span className="course-lesson-title">
                                    {lesson.title}
                                  </span>
                                  {completed && (
                                    <span className="visually-hidden">
                                      {" "}
                                      (completed)
                                    </span>
                                  )}
                                </h4>

                                {lesson.description && <p>{lesson.description}</p>}

                                {(type || lesson.duration > 0) && (
                                  <div className="course-lesson-tags">
                                    {type && <span>{type}</span>}
                                    {lesson.duration > 0 && (
                                      <span className="course-lesson-duration">
                                        {formatMinutes(lesson.duration)}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="course-lesson-actions">
                              {type && (
                                <a
                                  className="course-resource-button"
                                  href={lesson.content}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open resource{" "}
                                  <span
                                    className="course-resource-arrow"
                                    aria-hidden="true"
                                  >
                                    ↗
                                  </span>
                                  <span className="visually-hidden">
                                    {" "}
                                    (opens in a new tab)
                                  </span>
                                </a>
                              )}

                              {enrollment && (
                                <button
                                  type="button"
                                  className="course-lesson-button"
                                  disabled={actionLoading}
                                  onClick={() => handleCompleteLesson(lessonId)}
                                >
                                  {completed ? "Mark incomplete" : "Mark complete"}
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="course-detail-state">
            <h3>Learning content coming soon</h3>
            <p>This course does not have any learning resources yet.</p>
          </div>
        )}
      </section>

      {compact && (
        <div className="course-mobile-bar">
          {enrollment ? (
            <>
              <div className="course-mobile-progress">
                <strong>{shownPercentage}%</strong>
                <span>
                  {doneLessons} of {plural(totalLessons, "lesson")}
                </span>
              </div>

              {!isComplete && nextLesson ? (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => goToLesson(nextLesson)}
                >
                  Continue
                </button>
              ) : (
                <span className="course-mobile-complete">Complete</span>
              )}
            </>
          ) : (
            <button
              type="button"
              className="primary-button course-mobile-enroll"
              onClick={handleEnroll}
              disabled={actionLoading}
            >
              {actionLoading
                ? "Enrolling..."
                : user
                  ? "Start learning"
                  : "Sign in to start learning"}
            </button>
          )}
        </div>
      )}
    </main>
  );
}

export default CourseDetail;
