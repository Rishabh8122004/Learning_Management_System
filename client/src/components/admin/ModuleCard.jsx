import LessonRow from "./LessonRow";
import { blankLesson, moveItem } from "../../lib/courseForm";

// One module of the course: its title, fold button, order buttons and its list of lessons.
function ModuleCard({ module, index, count, isFolded, captureOrder, onToggleFold, onChange, onMove, onRemove, onLessonsChange }) {
  return (
    <li
      className={`editor-module${isFolded ? " is-folded" : ""}`}
      data-flip={module.key}
      data-flip-level="module"
    >
      <div className="editor-module-head">
        <button
          type="button"
          className="editor-fold"
          aria-expanded={!isFolded}
          aria-label={`${isFolded ? "Expand" : "Collapse"} module ${index + 1}`}
          onClick={onToggleFold}
        >
          <span aria-hidden="true" />
        </button>

        <span className="editor-number">{index + 1}</span>

        <input
          aria-label={`Module ${index + 1} title`}
          placeholder="Module title"
          value={module.title}
          maxLength={150}
          onChange={(event) => onChange({ title: event.target.value })}
        />

        {isFolded && (
          <span className="editor-fold-count">
            {module.lessons.length} lesson{module.lessons.length === 1 ? "" : "s"}
          </span>
        )}

        <div className="editor-order">
          <button type="button" aria-label="Move module up" disabled={index === 0} onClick={() => onMove(-1)}>
            ↑
          </button>
          <button type="button" aria-label="Move module down" disabled={index === count - 1} onClick={() => onMove(1)}>
            ↓
          </button>
          <button type="button" aria-label="Remove module" onClick={onRemove}>
            ✕
          </button>
        </div>
      </div>

      <div className="editor-module-body" inert={isFolded}>
        <div className="editor-module-inner">
          <input
            aria-label={`Module ${index + 1} description`}
            placeholder="Short description (optional)"
            value={module.description}
            maxLength={500}
            onChange={(event) => onChange({ description: event.target.value })}
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
                  onLessonsChange((lessons) => lessons.map((item, i) => (i === lessonIndex ? { ...item, ...patch } : item)))
                }
                onMove={(direction) => {
                  captureOrder("lesson");
                  onLessonsChange((lessons) => moveItem(lessons, lessonIndex, direction));
                }}
                onRemove={() => onLessonsChange((lessons) => lessons.filter((_, i) => i !== lessonIndex))}
              />
            ))}
          </ol>

          <button type="button" className="admin-quiet" onClick={() => onLessonsChange((lessons) => [...lessons, blankLesson()])}>
            + Add lesson
          </button>
        </div>
      </div>
    </li>
  );
}

export default ModuleCard;
