import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import ConfirmInline from "../../components/ConfirmInline";
import FieldError from "../../components/FieldError";
import ErrorState from "../../components/ErrorState";
import { apiRequest } from "../../services/apiRequest";
import { linkTypeOf } from "../../lib/linkType";
import { useFlip } from "../../hooks/useFlip";
import { hasErrors, validateHttpLink, validateLength } from "../../lib/validators";
import { useToast } from "../../context/useToast";
import "../css_files/Admin.css";

let keyCounter = 0;
const nextKey = () => `k${(keyCounter += 1)}`;

const blankLesson = () => ({
  key: nextKey(),
  title: "",
  description: "",
  content: "",
  duration: "",
});

const blankModule = () => ({
  key: nextKey(),
  title: "",
  description: "",
  lessons: [blankLesson()],
});

const blankForm = () => ({
  title: "",
  description: "",
  category: "",
  level: "beginner",
  thumbnail: "",
  tags: "",
  published: false,
  modules: [],
});

const byOrder = (a, b) => (a.order || 0) - (b.order || 0);

function fromServer(course) {
  return {
    title: course.title,
    description: course.description,
    category: course.category,
    level: course.level,
    thumbnail: course.thumbnail || "",
    tags: (course.tags || []).join(", "),
    published: Boolean(course.published),
    modules: [...(course.modules || [])].sort(byOrder).map((module) => ({
      key: nextKey(),
      _id: module._id,
      title: module.title,
      description: module.description || "",
      lessons: [...(module.lessons || [])].sort(byOrder).map((lesson) => ({
        key: nextKey(),
        _id: lesson._id,
        title: lesson.title,
        description: lesson.description || "",
        content: lesson.content,
        duration: lesson.duration ? String(lesson.duration) : "",
      })),
    })),
  };
}

function toPayload(form) {
  const tags = [
    ...new Set(
      form.tags
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  return {
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    level: form.level,
    thumbnail: form.thumbnail.trim() || null,
    tags,
    published: form.published,
    // Existing _ids are sent back so students' progress stays attached to their lessons.
    modules: form.modules.map((module, moduleIndex) => ({
      ...(module._id ? { _id: module._id } : {}),
      title: module.title.trim(),
      description: module.description.trim(),
      order: moduleIndex + 1,
      lessons: module.lessons.map((lesson, lessonIndex) => ({
        ...(lesson._id ? { _id: lesson._id } : {}),
        title: lesson.title.trim(),
        description: lesson.description.trim(),
        content: lesson.content.trim(),
        duration: Math.max(0, parseInt(lesson.duration, 10) || 0),
        order: lessonIndex + 1,
      })),
    })),
  };
}

// Returns the first problem found, or "" when the form can be saved.
function validate(form) {
  if (form.title.trim().length < 3) return "The title needs at least 3 characters.";
  if (form.description.trim().length < 10) return "The description needs at least 10 characters.";
  if (form.category.trim().length < 2) return "Please add a category.";
  if (form.thumbnail.trim() && !linkTypeOf(form.thumbnail.trim())) {
    return "The thumbnail must be a link starting with http:// or https://.";
  }

  for (const [moduleIndex, module] of form.modules.entries()) {
    if (!module.title.trim()) return `Module ${moduleIndex + 1} needs a title.`;

    for (const [lessonIndex, lesson] of module.lessons.entries()) {
      const where = `Module ${moduleIndex + 1}, lesson ${lessonIndex + 1}`;
      if (!lesson.title.trim()) return `${where} needs a title.`;
      if (!linkTypeOf(lesson.content.trim())) {
        return `${where} needs a link starting with http:// or https://.`;
      }
    }
  }

  return "";
}

const statusOf = (course) => {
  if (course.deletedAt) return "archived";
  return course.published ? "published" : "draft";
};

function moveItem(list, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;

  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

function LessonRow({ lesson, index, count, disabled, onChange, onMove, onRemove }) {
  const type = lesson.content.trim() ? linkTypeOf(lesson.content.trim()) : null;

  return (
    <li className="editor-lesson" data-flip={lesson.key} data-flip-level="lesson">
      <div className="editor-lesson-head">
        <span className="editor-number">{index + 1}</span>

        <input
          aria-label={`Lesson ${index + 1} title`}
          placeholder="Lesson title"
          value={lesson.title}
          maxLength={150}
          onChange={(event) => onChange({ title: event.target.value })}
        />

        <div className="editor-order">
          <button type="button" aria-label="Move lesson up" disabled={disabled || index === 0} onClick={() => onMove(-1)}>
            ↑
          </button>
          <button type="button" aria-label="Move lesson down" disabled={disabled || index === count - 1} onClick={() => onMove(1)}>
            ↓
          </button>
          <button type="button" aria-label="Remove lesson" disabled={disabled} onClick={onRemove}>
            ✕
          </button>
        </div>
      </div>

      <div className="editor-lesson-link">
        <input
          aria-label={`Lesson ${index + 1} link`}
          placeholder="https:// link to the video, doc or article"
          value={lesson.content}
          maxLength={2000}
          onChange={(event) => onChange({ content: event.target.value })}
        />

        {lesson.content.trim() && (
          <span className={`admin-badge ${type ? "is-draft" : "is-archived"}`}>
            {type || "Invalid link"}
          </span>
        )}

        <input
          type="number"
          min="0"
          className="editor-duration"
          aria-label={`Lesson ${index + 1} duration in minutes`}
          placeholder="min"
          value={lesson.duration}
          onChange={(event) => onChange({ duration: event.target.value })}
        />
      </div>

      <input
        aria-label={`Lesson ${index + 1} short description`}
        placeholder="Short description (optional)"
        value={lesson.description}
        maxLength={500}
        onChange={(event) => onChange({ description: event.target.value })}
      />
    </li>
  );
}

function CourseEditor({ id }) {
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(blankForm);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(blankForm()));
  const [meta, setMeta] = useState({ status: "draft", enrollments: 0, title: "" });
  const [isLoading, setIsLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState("");
  const [loadKey, setLoadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [purgeTitle, setPurgeTitle] = useState("");
  const [confirm, setConfirm] = useState(""); // "discard" | "unpublish" | "archive" | ""
  const [fieldErrors, setFieldErrors] = useState({});
  const [collapsed, setCollapsed] = useState([]); // keys of modules that are folded away
  const formRef = useRef(form);
  const editorRef = useRef(null);
  const captureOrder = useFlip(editorRef);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const isArchived = meta.status === "archived";
  const isDirty = JSON.stringify(form) !== savedSnapshot;

  useEffect(() => {
    if (!id) return undefined;

    let isCurrent = true;

    async function load() {
      setIsLoading(true);
      setLoadError("");

      try {
        const data = await apiRequest(`/admin/courses/${id}`);
        if (!isCurrent) return;

        const loaded = fromServer(data.course);
        setForm(loaded);
        setSavedSnapshot(JSON.stringify(loaded));
        setMeta({
          status: data.course.status,
          enrollments: data.course.enrollments,
          title: data.course.title,
        });
      } catch (error) {
        if (isCurrent) setLoadError(error.message || "Could not load this course.");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    load();

    return () => {
      isCurrent = false;
    };
  }, [id, loadKey]);

  // Browser warning when closing or reloading with unsaved changes.
  useEffect(() => {
    if (!isDirty) return undefined;

    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const setField = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
    setFieldErrors((current) => {
      const next = { ...current };

      Object.keys(patch).forEach((key) => delete next[key]);

      return next;
    });
  };

  const setModules = (update) =>
    setForm((current) => ({ ...current, modules: update(current.modules) }));

  const updateModule = (index, patch) =>
    setModules((modules) => modules.map((module, i) => (i === index ? { ...module, ...patch } : module)));

  const updateLessons = (moduleIndex, update) =>
    setModules((modules) =>
      modules.map((module, i) => (i === moduleIndex ? { ...module, lessons: update(module.lessons) } : module)),
    );

  const toggleCollapsed = (key) =>
    setCollapsed((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));

  const allCollapsed = form.modules.length > 0 && form.modules.every((module) => collapsed.includes(module.key));

  async function saveNow() {
    setConfirm("");
    setSaving(true);

    try {
      const data = await apiRequest(isNew ? "/courses" : `/courses/${id}`, {
        method: isNew ? "POST" : "PUT",
        body: JSON.stringify(toPayload(form)),
      });

      const saved = fromServer(data.course);
      setForm(saved);
      setSavedSnapshot(JSON.stringify(saved));
      setCollapsed([]);
      setMeta((current) => ({
        ...current,
        status: statusOf(data.course),
        title: data.course.title,
      }));
      toast.success(isNew ? "Course created" : "Changes saved");

      if (isNew) navigate(`/admin/courses/${data.course._id}/edit`, { replace: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  function handleSave(event) {
    event.preventDefault();

    // Problems with the main details show under their field; modules and lessons are described in a message.
    const found = {
      title: validateLength(form.title, "The title", 3, 150),
      description: validateLength(form.description, "The description", 10, 2000),
      category: validateLength(form.category, "The category", 2, 100),
      thumbnail: validateHttpLink(form.thumbnail, { label: "The thumbnail link" }),
    };

    setFieldErrors(found);

    if (hasErrors(found)) {
      toast.error("Please fix the highlighted fields.");
      setTimeout(() => editorRef.current?.querySelector('[aria-invalid="true"]')?.focus(), 0);
      return;
    }

    const problem = validate(form);
    if (problem) {
      toast.error(problem);
      return;
    }

    if (meta.status === "published" && !form.published && meta.enrollments > 0) {
      setConfirm("unpublish");
      return;
    }

    saveNow();
  }

  function handleCancel() {
    if (isDirty) {
      setConfirm("discard");
      return;
    }

    navigate("/admin/courses");
  }

  async function handleArchive() {
    try {
      await apiRequest(`/courses/${id}`, { method: "DELETE" });
      toast.success("Course archived");
      navigate("/admin/courses");
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function handleRestore() {
    try {
      await apiRequest(`/admin/courses/${id}/restore`, { method: "PATCH" });
      setMeta((current) => ({ ...current, status: "draft" }));
      setField({ published: false });
      setSavedSnapshot(JSON.stringify({ ...formRef.current, published: false }));
      toast.success("Course restored as a draft");
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function handlePurge() {
    try {
      await apiRequest(`/admin/courses/${id}/purge`, {
        method: "DELETE",
        body: JSON.stringify({ confirmTitle: purgeTitle }),
      });
      toast.success("Course deleted permanently");
      navigate("/admin/courses");
    } catch (error) {
      toast.error(error.message);
    }
  }

  if (isLoading) {
    return (
      <main className="admin-page" aria-busy="true">
        <div aria-hidden="true">
          <span className="skeleton admin-skeleton-title" />
          <span className="skeleton admin-skeleton-block" />
          <span className="skeleton admin-skeleton-block" />
        </div>

        <p className="visually-hidden" role="status">
          Loading course…
        </p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="admin-page">
        <ErrorState title="Unable to load this course" message={loadError} onRetry={() => setLoadKey((key) => key + 1)} />
        <Link to="/admin/courses" className="admin-quiet">
          ← Back to courses
        </Link>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">ADMIN</p>
          <h1>{isNew ? "New course" : "Edit course"}</h1>
        </div>

        {!isNew && (
          <span className={`admin-badge is-${meta.status}`}>
            <i aria-hidden="true" />
            {meta.status}
          </span>
        )}
      </header>

      {isArchived && (
        <p className="admin-note">
          This course is archived. Restore it as a draft to edit it again.
        </p>
      )}

      <form onSubmit={handleSave} className="editor-form" noValidate ref={editorRef}>
        <fieldset disabled={isArchived || saving} className="editor-fieldset">
          <section className="admin-card editor-section">
            <h2>Details</h2>

            <label>
              Title
              <input
                value={form.title}
                maxLength={150}
                aria-invalid={fieldErrors.title ? "true" : undefined}
                onChange={(event) => setField({ title: event.target.value })}
              />
              <FieldError message={fieldErrors.title} />
            </label>

            <label>
              Description
              <textarea
                rows={4}
                value={form.description}
                maxLength={2000}
                aria-invalid={fieldErrors.description ? "true" : undefined}
                onChange={(event) => setField({ description: event.target.value })}
              />
              <FieldError message={fieldErrors.description} />
            </label>

            <div className="editor-grid">
              <label>
                Category
                <input
                  value={form.category}
                  maxLength={100}
                  aria-invalid={fieldErrors.category ? "true" : undefined}
                  onChange={(event) => setField({ category: event.target.value })}
                />
                <FieldError message={fieldErrors.category} />
              </label>

              <label>
                Level
                <select value={form.level} onChange={(event) => setField({ level: event.target.value })}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
            </div>

            <label>
              <span>
                Tags <span className="admin-muted">(comma separated, up to 20)</span>
              </span>
              <input value={form.tags} onChange={(event) => setField({ tags: event.target.value })} />
            </label>

            <label>
              <span>
                Thumbnail link <span className="admin-muted">(optional)</span>
              </span>
              <input
                placeholder="https://"
                value={form.thumbnail}
                aria-invalid={fieldErrors.thumbnail ? "true" : undefined}
                onChange={(event) => setField({ thumbnail: event.target.value })}
              />
              <FieldError message={fieldErrors.thumbnail} />
            </label>

            <label className="editor-check">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(event) => setField({ published: event.target.checked })}
              />
              <span>
                Published <span className="admin-muted">(visible in the catalog)</span>
              </span>
            </label>
          </section>

          <section className="admin-card editor-section">
            <div className="editor-section-head">
              <div className="editor-section-title">
                <h2>Modules and lessons</h2>

                {form.modules.length > 1 && (
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => setCollapsed(allCollapsed ? [] : form.modules.map((module) => module.key))}
                  >
                    {allCollapsed ? "Expand all" : "Collapse all"}
                  </button>
                )}
              </div>

              <p className="admin-muted">
                Lessons are links only. Removing a lesson updates learners’ progress automatically.
              </p>
            </div>

            {form.modules.length === 0 && (
              <p className="admin-muted">No modules yet. Add the first one below.</p>
            )}

            <ol className="editor-modules">
              {form.modules.map((module, moduleIndex) => {
                const isFolded = collapsed.includes(module.key);

                return (
                  <li
                    key={module.key}
                    className={`editor-module${isFolded ? " is-folded" : ""}`}
                    data-flip={module.key}
                    data-flip-level="module"
                  >
                    <div className="editor-module-head">
                      <button
                        type="button"
                        className="editor-fold"
                        aria-expanded={!isFolded}
                        aria-label={`${isFolded ? "Expand" : "Collapse"} module ${moduleIndex + 1}`}
                        onClick={() => toggleCollapsed(module.key)}
                      >
                        <span aria-hidden="true" />
                      </button>

                      <span className="editor-number">{moduleIndex + 1}</span>

                      <input
                        aria-label={`Module ${moduleIndex + 1} title`}
                        placeholder="Module title"
                        value={module.title}
                        maxLength={150}
                        onChange={(event) => updateModule(moduleIndex, { title: event.target.value })}
                      />

                      {isFolded && (
                        <span className="editor-fold-count">
                          {module.lessons.length} lesson{module.lessons.length === 1 ? "" : "s"}
                        </span>
                      )}

                      <div className="editor-order">
                        <button
                          type="button"
                          aria-label="Move module up"
                          disabled={moduleIndex === 0}
                          onClick={() => {
                            captureOrder("module");
                            setModules((modules) => moveItem(modules, moduleIndex, -1));
                          }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label="Move module down"
                          disabled={moduleIndex === form.modules.length - 1}
                          onClick={() => {
                            captureOrder("module");
                            setModules((modules) => moveItem(modules, moduleIndex, 1));
                          }}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          aria-label="Remove module"
                          onClick={() => setModules((modules) => modules.filter((_, i) => i !== moduleIndex))}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div className="editor-module-body" inert={isFolded}>
                      <div className="editor-module-inner">
                        <input
                          aria-label={`Module ${moduleIndex + 1} description`}
                          placeholder="Short description (optional)"
                          value={module.description}
                          maxLength={500}
                          onChange={(event) => updateModule(moduleIndex, { description: event.target.value })}
                        />

                        <ol className="editor-lessons">
                          {module.lessons.map((lesson, lessonIndex) => (
                            <LessonRow
                              key={lesson.key}
                              lesson={lesson}
                              index={lessonIndex}
                              count={module.lessons.length}
                              disabled={false}
                              onChange={(patch) =>
                                updateLessons(moduleIndex, (lessons) =>
                                  lessons.map((item, i) => (i === lessonIndex ? { ...item, ...patch } : item)),
                                )
                              }
                              onMove={(direction) => {
                                captureOrder("lesson");
                                updateLessons(moduleIndex, (lessons) => moveItem(lessons, lessonIndex, direction));
                              }}
                              onRemove={() =>
                                updateLessons(moduleIndex, (lessons) => lessons.filter((_, i) => i !== lessonIndex))
                              }
                            />
                          ))}
                        </ol>

                        <button
                          type="button"
                          className="admin-quiet"
                          onClick={() => updateLessons(moduleIndex, (lessons) => [...lessons, blankLesson()])}
                        >
                          + Add lesson
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <button type="button" className="admin-quiet" onClick={() => setModules((modules) => [...modules, blankModule()])}>
              + Add module
            </button>
          </section>
        </fieldset>

        {!isArchived && (
          <div className={`editor-savebar${isDirty || isNew ? " is-dirty" : ""}`}>
            {confirm === "discard" && (
              <ConfirmInline
                message="Discard your unsaved changes?"
                confirmLabel="Discard changes"
                keepLabel="Keep editing"
                onCancel={() => setConfirm("")}
                onConfirm={() => navigate("/admin/courses")}
              />
            )}

            {confirm === "unpublish" && (
              <ConfirmInline
                message={`${meta.enrollments} learner(s) are enrolled. Unpublishing hides the course from the catalog, but they keep their progress. Continue?`}
                confirmLabel="Unpublish and save"
                keepLabel="Cancel"
                onCancel={() => setConfirm("")}
                onConfirm={saveNow}
              />
            )}

            <div className="editor-savebar-row">
              <span className="editor-status" role="status">
                <i aria-hidden="true" />
                {isDirty ? "Unsaved changes" : isNew ? "Not saved yet" : "All changes saved"}
              </span>

              <button type="button" className="admin-quiet" onClick={handleCancel}>
                {isDirty ? "Discard" : "Back to courses"}
              </button>

              <button type="submit" className="admin-primary" disabled={saving || (!isNew && !isDirty)}>
                {saving ? "Saving…" : isNew ? "Create course" : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </form>

      {!isNew && (
        <section className="admin-card editor-section editor-danger" aria-label="Archive and delete">
          <h2>Archive and delete</h2>

          {!isArchived ? (
            <>
              <p className="admin-muted">
                Archiving removes the course from the catalog. Enrolled learners keep their progress.
              </p>

              {confirm === "archive" ? (
                <ConfirmInline
                  message={
                    meta.enrollments > 0
                      ? `${meta.enrollments} learner(s) are enrolled. They keep their progress, but the course leaves the catalog. Archive it?`
                      : "Archive this course? It will leave the catalog."
                  }
                  confirmLabel="Archive course"
                  keepLabel="Cancel"
                  onCancel={() => setConfirm("")}
                  onConfirm={handleArchive}
                />
              ) : (
                <div>
                  <button type="button" className="admin-danger" onClick={() => setConfirm("archive")}>
                    Archive course
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <button type="button" className="admin-quiet" onClick={handleRestore}>
                  Restore as draft
                </button>
              </div>

              <p className="admin-muted">
                Deleting permanently cannot be undone and is only possible when nobody is enrolled. Type the
                course title to confirm.
              </p>

              <div className="editor-purge">
                <input
                  aria-label="Type the course title to confirm"
                  placeholder={meta.title}
                  value={purgeTitle}
                  onChange={(event) => setPurgeTitle(event.target.value)}
                />
                <button
                  type="button"
                  className="admin-danger"
                  disabled={purgeTitle.trim() !== meta.title}
                  onClick={handlePurge}
                >
                  Delete permanently
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}

// Keyed by course so moving between "new" and an existing course never reuses old form state.
function AdminCourseEditor() {
  const { id } = useParams();

  return <CourseEditor key={id || "new"} id={id} />;
}

export default AdminCourseEditor;
