import { linkTypeOf } from "../../lib/linkType";

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

export default LessonRow;
