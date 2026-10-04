import ConfirmInline from "../ConfirmInline";

// Archive, restore and permanently delete a course.
function CourseDangerZone({ isArchived, meta, confirm, setConfirm, purgeTitle, setPurgeTitle, onArchive, onRestore, onPurge }) {
  return (
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
                    onConfirm={onArchive}
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
                  <button type="button" className="admin-quiet" onClick={onRestore}>
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
                    onClick={onPurge}
                  >
                    Delete permanently
                  </button>
                </div>
              </>
            )}
          </section>
  );
}

export default CourseDangerZone;
