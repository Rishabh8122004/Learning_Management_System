import FieldError from "../FieldError";

// The title, description, category, level, tags, thumbnail and published switch of a course.
function CourseDetailsSection({ form, fieldErrors, setField }) {
  return (
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
  );
}

export default CourseDetailsSection;
