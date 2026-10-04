import { CheckIcon } from "./icons";

const STATE_TEXT = {
  met: "target met",
  missed: "missed",
  pending: "not met yet",
  off: "not scheduled",
  before: "before this habit started",
};

// The last days (or weeks) of a habit as small dots, oldest first.
function HabitDots({ history, period }) {
  return (
    <ol className="habit-dots" aria-label={period === "week" ? "Last weeks" : "Last 7 days"}>
      {history.map((item) => (
        <li key={item.date} className={`habit-dot habit-dot-${item.state}`}>
          <span className="habit-dot-mark" aria-hidden="true">
            {item.state === "met" && <CheckIcon />}
          </span>

          <span className="habit-dot-label" aria-hidden="true">
            {item.label}
          </span>

          <span className="visually-hidden">
            {item.date}: {STATE_TEXT[item.state]}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default HabitDots;
