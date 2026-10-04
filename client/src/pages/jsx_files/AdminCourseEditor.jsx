import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import ConfirmInline from "../../components/ConfirmInline";
import CourseDangerZone from "../../components/admin/CourseDangerZone";
import CourseDetailsSection from "../../components/admin/CourseDetailsSection";
import ModuleCard from "../../components/admin/ModuleCard";
import ErrorState from "../../components/ErrorState";
import { apiRequest } from "../../services/apiRequest";
import { blankForm, blankModule, fromServer, moveItem, statusOf, toPayload, validate } from "../../lib/courseForm";
import { useFlip } from "../../hooks/useFlip";
import { hasErrors, validateHttpLink, validateLength } from "../../lib/validators";
import { useToast } from "../../context/useToast";
import "../css_files/Admin.css";

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
          <CourseDetailsSection form={form} fieldErrors={fieldErrors} setField={setField} />

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
              {form.modules.map((module, moduleIndex) => (
                <ModuleCard
                  key={module.key}
                  module={module}
                  index={moduleIndex}
                  count={form.modules.length}
                  isFolded={collapsed.includes(module.key)}
                  captureOrder={captureOrder}
                  onToggleFold={() => toggleCollapsed(module.key)}
                  onChange={(patch) => updateModule(moduleIndex, patch)}
                  onMove={(direction) => {
                    captureOrder("module");
                    setModules((modules) => moveItem(modules, moduleIndex, direction));
                  }}
                  onRemove={() => setModules((modules) => modules.filter((_, i) => i !== moduleIndex))}
                  onLessonsChange={(update) => updateLessons(moduleIndex, update)}
                />
              ))}
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
        <CourseDangerZone
          isArchived={isArchived}
          meta={meta}
          confirm={confirm}
          setConfirm={setConfirm}
          purgeTitle={purgeTitle}
          setPurgeTitle={setPurgeTitle}
          onArchive={handleArchive}
          onRestore={handleRestore}
          onPurge={handlePurge}
        />
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