import { useCountUp } from "../../hooks/useCountUp";

// A ring that fills (and counts) up to a percentage. Children replace the number in the middle.
function ProgressRing({ value, size = 56, stroke = 6, tone = "habit", label, children }) {
  const shown = useCountUp(value);

  return (
    <div
      className={`pring pring-${tone}${value >= 100 ? " is-full" : ""}`}
      style={{ "--p": shown, "--size": `${size}px`, "--stroke": `${stroke}px` }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span className="pring-center" aria-hidden="true">
        {children ?? `${shown}%`}
      </span>
    </div>
  );
}

export default ProgressRing;
