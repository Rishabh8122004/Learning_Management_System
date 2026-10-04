import { useRef, useState } from "react";

import FieldError from "../FieldError";
import { hasErrors, validateLength, validatePositiveNumber } from "../../lib/validators";

const WEEKDAYS = [
  ["Sun", 0],
  ["Mon", 1],
  ["Tue", 2],
  ["Wed", 3],
  ["Thu", 4],
  ["Fri", 5],
  ["Sat", 6],
];

const TRACKING_DESCRIPTIONS = {
  milestones:
    "Break this goal into sub-goals, topics, and tasks. Progress comes from completing them.",
  habit: "Track something you repeat. Set a daily or weekly target and log each check-in.",
  target: "Track a number toward a target, such as distance, time, or pages.",
};

const STATUS_DESCRIPTIONS = {
  active: "You’re currently working on this goal.",
  paused: "Keep this goal and its progress for when you’re ready to return.",
  completed: "You’ve finished this goal.",
};

// Date limits are a convenience only (the server enforces them). A date saved
// before the rules existed stays valid so the goal can still be edited.
function targetDateLimit(limit, initialDate, kind) {
  if (!initialDate) return limit;
  if (kind === "min") return initialDate < limit ? initialDate : limit;
  return initialDate > limit ? initialDate : limit;
}

function GoalForm({ initialGoal, initialType, busy, minDate, maxDate, onCancel, onSave }) {
  const [title, setTitle] = useState(initialGoal?.title || "");
  const [description, setDescription] = useState(initialGoal?.description || "");
  const [trackingType, setTrackingType] = useState(
    initialGoal?.trackingType || initialType || "milestones",
  );

  const initialDate = initialGoal?.targetDate?.slice(0, 10) || "";
  const [status, setStatus] = useState(initialGoal?.status || "active");
  const [targetDate, setTargetDate] = useState(initialDate);

  const [habitPeriod, setHabitPeriod] = useState(initialGoal?.habit?.period || "day");
  const [habitTarget, setHabitTarget] = useState(initialGoal?.habit?.targetValue || 1);
  const [habitUnit, setHabitUnit] = useState(initialGoal?.habit?.unit || "times");
  const [daysOfWeek, setDaysOfWeek] = useState(initialGoal?.habit?.daysOfWeek || []);

  const [targetValue, setTargetValue] = useState(initialGoal?.target?.targetValue || "");
  const [targetUnit, setTargetUnit] = useState(initialGoal?.target?.unit || "");
  const [targetPeriod, setTargetPeriod] = useState(initialGoal?.target?.period || "total");

  const formRef = useRef(null);
  const [errors, setErrors] = useState({});

  const clear = (key) => setErrors((current) => (current[key] ? { ...current, [key]: "" } : current));

  // The same rules the server enforces, so problems show up under the field that caused them.
  function validateAll() {
    const found = { title: validateLength(title, "The name", 1, 150) };

    if (trackingType === "habit") {
      found.habitTarget = validatePositiveNumber(habitTarget, "the target");
      found.habitUnit = validateLength(habitUnit || "times", "The unit", 1, 30);
    }

    if (trackingType === "target") {
      found.targetValue = validatePositiveNumber(targetValue, "an amount");
      found.targetUnit = validateLength(targetUnit, "The unit", 1, 30);
    }

    if (targetDate) {
      const lowest = minDate && targetDateLimit(minDate, initialDate, "min");
      const highest = maxDate && targetDateLimit(maxDate, initialDate, "max");

      if (lowest && targetDate < lowest) {
        found.targetDate = "Choose a date on or after " + lowest + " (not in the past, and not before its sub-goals).";
      } else if (highest && targetDate > highest) {
        found.targetDate = "Choose a date on or before " + highest + " (the date of the goal above it).";
      }
    }

    return found;
  }

  function toggleWeekday(day) {
    setDaysOfWeek((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day],
    );
  }

  function handleSubmit(event) {
    event.preventDefault();

    const found = validateAll();

    setErrors(found);

    if (hasErrors(found)) {
      setTimeout(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus(), 0);
      return;
    }

    const values = {
      title: title.trim(),
      description: description.trim(),
      trackingType,
      status,
      targetDate: targetDate || null,
    };

    if (trackingType === "habit") {
      values.habit = {
        period: habitPeriod,
        targetValue: Number(habitTarget),
        unit: habitUnit.trim() || "times",
        daysOfWeek: habitPeriod === "day" ? daysOfWeek : [],
      };
    }

    if (trackingType === "target") {
      values.target = {
        targetValue: Number(targetValue),
        unit: targetUnit.trim(),
        period: targetPeriod,
      };
    }

    onSave(values);
  }

  return (
    <form className="goal-form" onSubmit={handleSubmit} noValidate ref={formRef}>
      <label>
        Name
        <input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            clear("title");
          }}
          maxLength={150}
          aria-invalid={errors.title ? "true" : undefined}
          autoFocus
        />
        <FieldError message={errors.title} />
      </label>

      <label>
        <span className="field-label">
          Description <small>(optional)</small>
        </span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={1000}
          rows={2}
        />
      </label>

      <div className="goal-form-grid">
        <label>
          Track as
          <select value={trackingType} onChange={(event) => setTrackingType(event.target.value)}>
            <option value="milestones">Milestones</option>
            <option value="habit">Habit</option>
            <option value="target">Number toward a target</option>
          </select>

          <small className="goal-field-help" aria-live="polite">
            {TRACKING_DESCRIPTIONS[trackingType]}
          </small>
        </label>

        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>

          <small className="goal-field-help" aria-live="polite">
            {STATUS_DESCRIPTIONS[status]}
          </small>
        </label>
      </div>

      {trackingType === "habit" && (
        <fieldset className="goal-form-extra">
          <legend>Habit target</legend>

          <div className="goal-form-grid">
            <label>
              Repeat
              <select value={habitPeriod} onChange={(event) => setHabitPeriod(event.target.value)}>
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
              </select>
            </label>

            <label>
              Target per {habitPeriod === "week" ? "week" : "day"}
              <input
                type="number"
                min="0.01"
                step="any"
                value={habitTarget}
                onChange={(event) => {
                  setHabitTarget(event.target.value);
                  clear("habitTarget");
                }}
                aria-invalid={errors.habitTarget ? "true" : undefined}
              />
              <FieldError message={errors.habitTarget} />
            </label>

            <label>
              Unit
              <input
                value={habitUnit}
                onChange={(event) => {
                  setHabitUnit(event.target.value);
                  clear("habitUnit");
                }}
                placeholder="times, minutes, km…"
                maxLength={30}
                aria-invalid={errors.habitUnit ? "true" : undefined}
              />
              <FieldError message={errors.habitUnit} />
            </label>
          </div>

          {habitPeriod === "day" && (
            <div className="goal-weekdays">
              <span>Scheduled days (optional)</span>

              <div>
                {WEEKDAYS.map(([label, day]) => (
                  <label key={day}>
                    <input
                      type="checkbox"
                      checked={daysOfWeek.includes(day)}
                      onChange={() => toggleWeekday(day)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </fieldset>
      )}

      {trackingType === "target" && (
        <fieldset className="goal-form-extra">
          <legend>Target</legend>

          <div className="goal-form-grid">
            <label>
              Amount
              <input
                type="number"
                min="0.01"
                step="any"
                value={targetValue}
                onChange={(event) => {
                  setTargetValue(event.target.value);
                  clear("targetValue");
                }}
                aria-invalid={errors.targetValue ? "true" : undefined}
              />
              <FieldError message={errors.targetValue} />
            </label>

            <label>
              Unit
              <input
                value={targetUnit}
                onChange={(event) => {
                  setTargetUnit(event.target.value);
                  clear("targetUnit");
                }}
                placeholder="km, pages, hours…"
                maxLength={30}
                aria-invalid={errors.targetUnit ? "true" : undefined}
              />
              <FieldError message={errors.targetUnit} />
            </label>

            <label>
              Period
              <select value={targetPeriod} onChange={(event) => setTargetPeriod(event.target.value)}>
                <option value="total">Overall</option>
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
            </label>
          </div>
        </fieldset>
      )}

      <label>
        <span className="field-label">
          Target date <small>(optional)</small>
        </span>
        <input
          type="date"
          value={targetDate}
          min={minDate && targetDateLimit(minDate, initialDate, "min")}
          max={maxDate && targetDateLimit(maxDate, initialDate, "max")}
          onChange={(event) => {
            setTargetDate(event.target.value);
            clear("targetDate");
          }}
          aria-invalid={errors.targetDate ? "true" : undefined}
        />
        <FieldError message={errors.targetDate} />
      </label>

      <div className="goal-form-actions">
        <button type="submit" className="goal-submit" disabled={busy}>
          {busy ? "Saving…" : initialGoal ? "Save changes" : "Create goal"}
        </button>

        <button type="button" className="goal-quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default GoalForm;
