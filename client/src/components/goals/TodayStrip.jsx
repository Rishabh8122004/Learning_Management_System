import { getActivityGrid, getTodaySummary } from "../../lib/goalProgress";
import { daysUntil, relativeDay } from "../../lib/timeText";
import Burst from "./Burst";
import { CheckIcon, FlameIcon } from "./icons";
import ProgressRing from "./ProgressRing";

function levelOf(count) {
  if (count >= 3) return 3;
  if (count === 2) return 2;
  if (count === 1) return 1;

  return 0;
}

// The calendar of the last weeks: a day is filled when progress was logged on it.
function ActivityGrid({ goals }) {
  const grid = getActivityGrid(goals, 12);

  return (
    <div className="activity">
      <div className="activity-head">
        <h3>Your last 12 weeks</h3>

        <span>
          {grid.activeDays === 0
            ? "No progress logged yet"
            : `${grid.activeDays} day${grid.activeDays === 1 ? "" : "s"} with progress`}
        </span>
      </div>

      <div
        className="activity-grid"
        role="img"
        aria-label={`Progress was logged on ${grid.activeDays} of the last 84 days.`}
      >
        {grid.columns.map((column, index) => (
          <div className="activity-column" key={index}>
            {column.map((day) => (
              <i
                key={day.date}
                className={`activity-cell level-${levelOf(day.count)}${day.future ? " is-future" : ""}`}
                title={
                  day.future
                    ? undefined
                    : `${day.date}: ${day.count === 0 ? "no progress logged" : `progress on ${day.count} goal${day.count === 1 ? "" : "s"}`}`
                }
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TodayStrip({ goals, dayStamp }) {
  const summary = getTodaySummary(goals);
  const left = summary.habitsScheduled - summary.habitsMet;
  const allDone = summary.habitsScheduled > 0 && left === 0;
  const ringValue = summary.habitsScheduled
    ? Math.round((summary.habitsMet / summary.habitsScheduled) * 100)
    : 0;

  const deadlineDays = summary.nextDeadline ? daysUntil(summary.nextDeadline.targetDate) : null;

  return (
    <section className={`today${allDone ? " is-all-done" : ""}${dayStamp ? " is-celebrating" : ""}`} aria-label="Today at a glance">
      <div className="today-main">
        <div className="today-ring">
          <ProgressRing
            value={ringValue}
            size={92}
            stroke={8}
            tone={allDone ? "done" : "habit"}
            label="Habits done today"
          >
            {summary.habitsScheduled > 0 ? (
              allDone ? (
                <CheckIcon className="pring-check" />
              ) : (
                `${summary.habitsMet}/${summary.habitsScheduled}`
              )
            ) : (
              "–"
            )}
          </ProgressRing>

          {dayStamp > 0 && <Burst key={dayStamp} big />}
        </div>

        <div>
          <p className="today-eyebrow">TODAY</p>

          <h2>
            {summary.habitsScheduled === 0
              ? "No habits scheduled today"
              : allDone
                ? "Everything for today is done"
                : `${left} habit${left === 1 ? "" : "s"} left today`}
          </h2>

          <p className="today-sub">
            {summary.habitsScheduled === 0
              ? "Add a habit, or log progress on a target, to see your day here."
              : allDone
                ? "Well done. Come back tomorrow to keep the run going."
                : "Small, steady steps are what count."}
          </p>
        </div>
      </div>

      <ul className="today-tiles">
        <li className="today-tile">
          <span className="today-tile-label">Current streak</span>

          {summary.bestStreak ? (
            <>
              <strong className="today-streak">
                <FlameIcon />
                <span>
                  {summary.bestStreak.streak}-{summary.bestStreak.unit} streak
                </span>
              </strong>
              <span className="today-tile-note">{summary.bestStreak.title}</span>
            </>
          ) : (
            <>
              <strong>None yet</strong>
              <span className="today-tile-note">Meet a habit target to begin one.</span>
            </>
          )}
        </li>

        <li className="today-tile">
          <span className="today-tile-label">Goals</span>
          <strong>
            {summary.active} active
          </strong>
          <span className="today-tile-note">
            {summary.milestones.all > 0
              ? `${summary.milestones.done} of ${summary.milestones.all} milestones done`
              : `${summary.completed} completed`}
          </span>
        </li>

        <li className="today-tile">
          <span className="today-tile-label">Next deadline</span>

          {summary.nextDeadline ? (
            <>
              <strong className={deadlineDays <= 2 ? "is-soon" : ""}>
                {relativeDay(deadlineDays)}
              </strong>
              <span className="today-tile-note">{summary.nextDeadline.title}</span>
            </>
          ) : (
            <>
              <strong>None</strong>
              <span className="today-tile-note">No upcoming dates.</span>
            </>
          )}
        </li>
      </ul>

      <ActivityGrid goals={goals} />
    </section>
  );
}

export default TodayStrip;
