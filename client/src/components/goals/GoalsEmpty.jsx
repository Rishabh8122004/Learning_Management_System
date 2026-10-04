import { FlagIcon, RepeatIcon, TargetIcon } from "./icons";

const IDEAS = [
  {
    type: "milestones",
    Icon: FlagIcon,
    title: "Milestones",
    text: "Break something big into steps and tick them off, like “Learn React”.",
  },
  {
    type: "habit",
    Icon: RepeatIcon,
    title: "A habit",
    text: "Something you repeat, like “Study 30 minutes a day”. Build a streak.",
  },
  {
    type: "target",
    Icon: TargetIcon,
    title: "A number",
    text: "Count toward an amount, like “Solve 100 problems”.",
  },
];

// Shown before the first goal: explains the three kinds and lets you start with one.
function GoalsEmpty({ onStart }) {
  return (
    <div className="goals-empty">
      <h2>What would you like to work toward?</h2>

      <p>Pick the kind of goal that fits. You can add sub-goals and log progress later.</p>

      <ul>
        {IDEAS.map(({ type, Icon, title, text }) => (
          <li key={type}>
            <button type="button" className={`idea idea-${type}`} onClick={() => onStart(type)}>
              <span className="idea-icon">
                <Icon />
              </span>

              <strong>{title}</strong>
              <span>{text}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default GoalsEmpty;
