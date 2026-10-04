// Small line icons for the goals page (stroke follows the text colour).
function Icon({ children, className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

export function FlameIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M12 3c.6 3.2 4.5 5 4.5 9.6A4.5 4.5 0 0 1 12 17.1a4.5 4.5 0 0 1-4.5-4.5c0-1.6.7-2.7 1.6-3.7.3 1.1.9 1.8 1.7 2.1C10.4 8.3 10.6 5.4 12 3Z" />
      <path d="M12 21a2.5 2.5 0 0 1-2.5-2.5" />
    </Icon>
  );
}

export function CheckIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Icon>
  );
}

export function ChevronIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="m7 10 5 5 5-5" />
    </Icon>
  );
}

export function PlusIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function FlagIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M6 21V4M6 5h11l-2 4 2 4H6" />
    </Icon>
  );
}

export function RepeatIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4" />
    </Icon>
  );
}

export function TargetIcon({ className }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </Icon>
  );
}

export const TYPE_ICONS = {
  milestones: FlagIcon,
  habit: RepeatIcon,
  target: TargetIcon,
};
