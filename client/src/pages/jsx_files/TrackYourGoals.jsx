import { useState } from "react";

import ErrorState from "../../components/ErrorState";
import GoalCard from "../../components/goals/GoalCard";
import GoalForm from "../../components/goals/GoalForm";
import GoalsEmpty from "../../components/goals/GoalsEmpty";
import TodayStrip from "../../components/goals/TodayStrip";
import { effectiveStatus, localDateString } from "../../lib/goalProgress";
import { useGoals } from "../../hooks/useGoals";
import "../css_files/TrackYourGoals.css";

const FILTERS = [
  ["all", "All"],
  ["active", "Active"],
  ["paused", "Paused"],
  ["completed", "Completed"],
];

const STATUS_ORDER = { active: 0, paused: 1, completed: 2 };

function TrackYourGoals() {
  const {
    goals,
    isLoading,
    error,
    busyAction,
    celebrating,
    dayStamp,
    retry,
    createGoal,
    createSubgoal,
    updateGoal,
    deleteGoal,
    toggleMilestone,
    createEntry,
    updateEntry,
    deleteEntry,
  } = useGoals();

  const [createType, setCreateType] = useState(null); // null = closed, otherwise the starting type
  const [filter, setFilter] = useState("all");

  const actions = {
    createSubgoal,
    updateGoal,
    deleteGoal,
    toggleMilestone,
    createEntry,
    updateEntry,
    deleteEntry,
  };

  const counts = {
    all: goals.length,
    active: goals.filter((goal) => effectiveStatus(goal) === "active").length,
    paused: goals.filter((goal) => effectiveStatus(goal) === "paused").length,
    completed: goals.filter((goal) => effectiveStatus(goal) === "completed").length,
  };

  const visible = [...(filter === "all" ? goals : goals.filter((goal) => effectiveStatus(goal) === filter))].sort(
    (a, b) => (STATUS_ORDER[effectiveStatus(a)] ?? 3) - (STATUS_ORDER[effectiveStatus(b)] ?? 3),
  );

  const ctx = { busyAction, celebrating, actions };

  return (
    <main className="goals-page" aria-busy={isLoading}>
      <header className="goals-header">
        <div>
          <p className="goals-eyebrow">YOUR PROGRESS, YOUR WAY</p>

          <h1>Track Your Goals</h1>

          <p>Choose what matters to you and track it in a way that fits.</p>
        </div>

        <button
          type="button"
          className="goal-primary goals-new"
          onClick={() => setCreateType((current) => (current ? null : "milestones"))}
        >
          {createType ? "Close" : "+ New goal"}
        </button>
      </header>

      {createType && (
        <section className="goal-create-panel" aria-label="Create a goal">
          <GoalForm
            initialType={createType}
            minDate={localDateString()}
            busy={busyAction === "create"}
            onCancel={() => setCreateType(null)}
            onSave={async (values) => {
              if (await createGoal(values)) setCreateType(null);
            }}
          />
        </section>
      )}

      {error && (
        <ErrorState message={error} onRetry={retry} />
      )}

      {isLoading ? (
        <div aria-hidden="true">
          <span className="skeleton goals-skeleton-today" />
          <span className="skeleton goals-skeleton-card" />
          <span className="skeleton goals-skeleton-card" />
          <p className="visually-hidden" role="status">
            Loading your goals…
          </p>
        </div>
      ) : goals.length === 0 ? (
        !error && !createType && <GoalsEmpty onStart={setCreateType} />
      ) : (
        <>
          <TodayStrip goals={goals} dayStamp={dayStamp} />

          <div className="goals-filters" role="group" aria-label="Filter goals">
            {FILTERS.map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={filter === value ? "is-active" : ""}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
                <span>{counts[value]}</span>
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="goals-none">Nothing here yet. Try another filter.</p>
          ) : (
            <section className="goals-list" aria-label="Your goals">
              {visible.map((goal) => (
                <GoalCard key={goal._id} goal={goal} depth={0} ctx={ctx} />
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}

export default TrackYourGoals;
