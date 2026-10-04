import { useRef, useState } from "react";

import FieldError from "../FieldError";
import { hasErrors, validatePositiveNumber } from "../../lib/validators";

import { localDateString, unitOf } from "../../lib/goalProgress";

function EntryForm({ goal, initialEntry, busy, onCancel, onSave }) {
  const [value, setValue] = useState(initialEntry?.value ?? 1);
  const [note, setNote] = useState(initialEntry?.note || "");
  const [localDate, setLocalDate] = useState(initialEntry?.localDate || localDateString());

  const formRef = useRef(null);
  const [errors, setErrors] = useState({});

  function handleSubmit(event) {
    event.preventDefault();

    const found = {
      value: validatePositiveNumber(value, "an amount"),
      localDate: !localDate
        ? "Choose a date."
        : localDate > localDateString()
          ? "The date can't be in the future."
          : "",
    };

    setErrors(found);

    if (hasErrors(found)) {
      setTimeout(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus(), 0);
      return;
    }

    onSave({
      value: Number(value),
      note: note.trim(),
      localDate,
      occurredAt: initialEntry?.occurredAt || new Date().toISOString(),
    });
  }

  const unit = unitOf(goal);

  return (
    <form className="entry-form" onSubmit={handleSubmit} noValidate ref={formRef}>
      <label>
        Amount {unit && `(${unit})`}
        <input
          type="number"
          min="0.01"
          step="any"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setErrors((current) => ({ ...current, value: "" }));
          }}
          aria-invalid={errors.value ? "true" : undefined}
          autoFocus
        />
        <FieldError message={errors.value} />
      </label>

      <label>
        Date
        <input
          type="date"
          max={localDateString()}
          value={localDate}
          onChange={(event) => {
            setLocalDate(event.target.value);
            setErrors((current) => ({ ...current, localDate: "" }));
          }}
          aria-invalid={errors.localDate ? "true" : undefined}
        />
        <FieldError message={errors.localDate} />
      </label>

      <label>
        <span className="field-label">
          Note <small>(optional)</small>
        </span>
        <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} />
      </label>

      <div className="goal-form-actions">
        <button type="submit" className="goal-submit" disabled={busy}>
          {busy ? "Saving…" : initialEntry ? "Save entry" : "Log progress"}
        </button>

        <button type="button" className="goal-quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default EntryForm;
