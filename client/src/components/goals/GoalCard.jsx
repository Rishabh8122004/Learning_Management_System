import { useState } from "react";

import {
  countMilestones,
  getHabitHistory,
  getHabitSummary,
  getTargetSummary,
  isGoalFinished,
  latestDueDate,
  localDateString,
} from "../../lib/goalProgress";
import { daysUntil, relativeDay } from "../../lib/timeText";
import Burst from "./Burst";
import ConfirmInline from "../ConfirmInline";
import EntryForm from "./EntryForm";
import EntryHistory from "./EntryHistory";
import GoalForm from "./GoalForm";
import HabitDots from "./HabitDots";
import { CheckIcon, ChevronIcon, FlameIcon, PlusIcon, TYPE_ICONS } from "./icons";
import ProgressRing from "./ProgressRing";

const TYPE_LABELS = {
  milestones: "Milestones",
  habit: "Habit",
  target: "Target",
};

function shortDate(value) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// A due date as a small chip: calm while it is far, warm when it is close, red once it has passed.
function dueChip(goal, finished) {
  if (!goal.targetDate) return null;

  if (finished) {
    return { tone: "done", text: `Was due ${shortDate(goal.targetDate)}` };
  }

  const days = daysUntil(goal.targetDate);

  return {
    tone: days < 0 ? "overdue" : days <= 2 ? "soon" : "calm",
    text: `Due ${shortDate(goal.targetDate)} · ${relativeDay(days)}`,
  };
}

// One honest line about where a habit stands, built only from its real streak and totals.
function habitHint(summary) {
  const unit = summary.streakUnit;
  const period = summary.periodLabel.toLowerCase();

  if (!summary.scheduledToday) return "Rest day. Nothing is scheduled today.";

  if (summary.met) {
    return summary.streak >= 2
      ? `Done for ${period}. Your ${summary.streak}-${unit} streak continues.`
      : `Done for ${period}. Nicely done.`;
  }

  if (summary.streak > 0) {
    return `${summary.remaining} ${summary.unit} more keeps your ${summary.streak}-${unit} streak going.`;
  }

  if (summary.bestStreak > 0) {
    return `Your best run is ${summary.bestStreak} ${unit}${summary.bestStreak === 1 ? "" : "s"}. Start a new one ${period === "today" ? "today" : "this week"}.`;
  }

  return `Log something ${period === "today" ? "today" : "this week"} to start your first streak.`;
}

function GoalCard({ goal, depth, dueLimit, ctx }) {
  const { busyAction, celebrating, actions } = ctx;

  const [isExpanded, setIsExpanded] = useState(depth === 0);
  const [panel, setPanel] = useState(null); // "edit" | "child" | "entry" | "delete"

  const children = goal.children || [];
  const isBusy = Boolean(busyAction);
  const celebration = celebrating[goal._id];

  // Sub-goals may not be due after this goal (or any goal above it).
  const today = localDateString();
  const subGoalLimit =
    [dueLimit, goal.targetDate?.slice(0, 10)].filter(Boolean).sort()[0] || undefined;
  const editMinDate = [today, latestDueDate(children)].sort().pop();

  const isHabit = goal.trackingType === "habit";
  const isTarget = goal.trackingType === "target";
  const isLeafMilestone = goal.trackingType === "milestones" && children.length === 0;

  const milestones =
    goal.trackingType === "milestones" || children.length > 0
      ? countMilestones(goal)
      : { done: 0, all: 0 };

  const habit = isHabit ? getHabitSummary(goal) : null;
  const history = isHabit ? getHabitHistory(goal, habit.streakUnit === "week" ? 4 : 7) : [];
  const target = isTarget ? getTargetSummary(goal) : null;

  const branchPercent = milestones.all ? Math.round((milestones.done / milestones.all) * 100) : 0;
  const ringValue = habit ? habit.percent : target ? target.percent : branchPercent;

  const finished = isGoalFinished(goal);

  const due = dueChip(goal, finished);
  const TypeIcon = TYPE_ICONS[goal.trackingType];

  const classes = [
    "goal-card",
    `goal-card-${goal.trackingType}`,
    finished ? "is-finished" : "",
    goal.status === "paused" ? "is-paused" : "",
    celebration ? "is-celebrating" : "",
    depth > 0 ? "is-nested" : "",
  ]
    .filter(Boolean)
    .join(" ");

  function logRemaining() {
    return actions.createEntry(goal, {
      value: habit.remaining,
      note: "",
      localDate: localDateString(),
      occurredAt: new Date().toISOString(),
    });
  }

  const closePanel = () => setPanel(null);

  return (
    <article className={classes} data-celebration={celebration?.kind}>
      <div className="goal-card-top">
        <div className="goal-lead">
          {isLeafMilestone ? (
            <button
              type="button"
              role="checkbox"
              aria-checked={Boolean(goal.completed)}
              aria-label={`Mark ${goal.title} complete`}
              className={`check-circle${goal.completed ? " is-checked" : ""}`}
              disabled={isBusy}
              onClick={() => actions.toggleMilestone(goal)}
            >
              <CheckIcon />
            </button>
          ) : (
            <ProgressRing
              value={finished ? 100 : ringValue}
              tone={goal.trackingType}
              size={depth > 0 ? 48 : 56}
              label={`Progress for ${goal.title}`}
            >
              {finished ? <CheckIcon className="pring-check" /> : null}
            </ProgressRing>
          )}

          {celebration && <Burst key={celebration.stamp} big={celebration.level === "big"} />}
        </div>

        <div className="goal-card-main">
          <div className="goal-card-chips">
            <span className={`goal-chip goal-chip-${goal.trackingType}`}>
              <TypeIcon />
              {TYPE_LABELS[goal.trackingType]}
            </span>

            {due && (
              <span className={`goal-chip goal-chip-due is-${due.tone}`} title="Target date">
                {due.text}
              </span>
            )}

            {goal.status === "paused" && <span className="goal-chip goal-chip-quiet">Paused</span>}
            {finished && <span className="goal-chip goal-chip-done">Completed</span>}
          </div>

          <h3 className={finished ? "is-finished" : ""}>
            <span>{goal.title}</span>
          </h3>

          {goal.description && <p className="goal-card-description">{goal.description}</p>}
        </div>
      </div>

      {isHabit && (
        <div className="goal-body">
          <div className="goal-figures">
            <strong>
              {habit.currentTotal} / {habit.target} <span>{habit.unit}</span>
            </strong>

            <span className="goal-period">{habit.periodLabel}</span>
          </div>

          <div className="streak-row">
            <span className={`streak-chip${habit.streak > 0 ? " is-lit" : ""}`}>
              <FlameIcon />
              {habit.streak > 0 ? (
                <span>
                  <b key={habit.streak} className="streak-count">
                    {habit.streak}
                  </b>
                  -{habit.streakUnit} streak
                </span>
              ) : (
                "No streak yet"
              )}
            </span>

            {habit.bestStreak > 0 && (
              <span className="streak-best">
                Best {habit.bestStreak} {habit.streakUnit}
                {habit.bestStreak === 1 ? "" : "s"}
              </span>
            )}
          </div>

          <HabitDots history={history} period={habit.streakUnit === "week" ? "week" : "day"} />

          <p className="goal-hint">{habitHint(habit)}</p>
        </div>
      )}

      {isTarget && target.target > 0 && (
        <div className="goal-body">
          <div className="goal-figures">
            <strong>
              {target.current} / {target.target} <span>{target.unit}</span>
            </strong>

            {target.period !== "total" && <span className="goal-period">this {target.period}</span>}
          </div>

          <div
            className="goal-bar"
            role="progressbar"
            aria-label={`Progress for ${goal.title}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={target.percent}
          >
            <span style={{ "--w": target.percent / 100 }} />
          </div>

          <p className="goal-hint">
            {target.reached
              ? "Target reached. Anything more is a bonus."
              : `${target.remaining} ${target.unit} to go.`}
          </p>
        </div>
      )}

      {children.length > 0 && milestones.all > 0 && (
        <div className="goal-body">
          <div className="goal-figures">
            <strong>
              {milestones.done} of {milestones.all} <span>milestones</span>
            </strong>
          </div>

          <div
            className="goal-bar"
            role="progressbar"
            aria-label={`Milestones done for ${goal.title}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={branchPercent}
          >
            <span style={{ "--w": branchPercent / 100 }} />
          </div>
        </div>
      )}

      <div className="goal-actions">
        {isHabit && (
          <button
            type="button"
            className={`goal-primary${habit.met ? " is-done" : ""}`}
            disabled={isBusy || habit.met}
            onClick={logRemaining}
          >
            {habit.met ? (
              <>
                <CheckIcon /> Done {habit.periodLabel.toLowerCase()}
              </>
            ) : (
              <>Log remaining ({habit.remaining} {habit.unit})</>
            )}
          </button>
        )}

        {isTarget && (
          <button
            type="button"
            className="goal-primary"
            disabled={isBusy}
            onClick={() => setPanel(panel === "entry" ? null : "entry")}
          >
            <PlusIcon /> Log progress
          </button>
        )}

        {isHabit && (
          <button
            type="button"
            className="goal-text-button"
            disabled={isBusy}
            onClick={() => setPanel(panel === "entry" ? null : "entry")}
          >
            Log a different amount
          </button>
        )}

        <button
          type="button"
          className="goal-text-button"
          disabled={isBusy}
          onClick={() => setPanel(panel === "child" ? null : "child")}
        >
          Add sub-goal
        </button>

        <button
          type="button"
          className="goal-text-button"
          disabled={isBusy}
          onClick={() => setPanel(panel === "edit" ? null : "edit")}
        >
          Edit
        </button>

        <button
          type="button"
          className="goal-text-button is-danger"
          disabled={isBusy}
          onClick={() => setPanel("delete")}
        >
          Delete
        </button>
      </div>

      {panel === "delete" && (
        <ConfirmInline
          message={
            children.length > 0
              ? `Delete "${goal.title}" with all its sub-goals and progress?`
              : `Delete "${goal.title}" and its progress?`
          }
          confirmLabel="Delete goal"
          busyLabel="Deleting…"
          busy={isBusy}
          onCancel={closePanel}
          onConfirm={() => actions.deleteGoal(goal)}
        />
      )}

      {panel === "edit" && (
        <GoalForm
          initialGoal={goal}
          minDate={editMinDate}
          maxDate={dueLimit}
          busy={isBusy}
          onCancel={closePanel}
          onSave={async (values) => {
            if (await actions.updateGoal(goal, values)) closePanel();
          }}
        />
      )}

      {panel === "child" && (
        <GoalForm
          minDate={today}
          maxDate={subGoalLimit}
          busy={isBusy}
          onCancel={closePanel}
          onSave={async (values) => {
            if (await actions.createSubgoal(goal, values)) {
              closePanel();
              setIsExpanded(true);
            }
          }}
        />
      )}

      {panel === "entry" && (isHabit || isTarget) && (
        <EntryForm
          goal={goal}
          busy={isBusy}
          onCancel={closePanel}
          onSave={async (values) => {
            if (await actions.createEntry(goal, values)) closePanel();
          }}
        />
      )}

      {(isHabit || isTarget) && (
        <EntryHistory
          goal={goal}
          busy={isBusy}
          onEdit={(entry, values) => actions.updateEntry(goal, entry, values)}
          onDelete={(entry) => actions.deleteEntry(goal, entry)}
        />
      )}

      {children.length > 0 && (
        <>
          <button
            type="button"
            className="expand-row"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((current) => !current)}
          >
            <ChevronIcon />
            {children.length} sub-goal{children.length === 1 ? "" : "s"}
            <span>{isExpanded ? "Hide" : "Show"}</span>
          </button>

          <div className={`goal-children-wrap${isExpanded ? " is-open" : ""}`} inert={!isExpanded}>
            <div className="goal-children">
              {children.map((child) => (
                <GoalCard
                  key={child._id}
                  goal={child}
                  depth={depth + 1}
                  dueLimit={subGoalLimit}
                  ctx={ctx}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </article>
  );
}

export default GoalCard;
