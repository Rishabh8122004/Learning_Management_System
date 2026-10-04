import { useState } from "react";

import ConfirmInline from "../ConfirmInline";
import EntryForm from "./EntryForm";
import { unitOf } from "../../lib/goalProgress";
import { ChevronIcon } from "./icons";

const SHOWN_AT_FIRST = 5;

function formatDay(localDate) {
  const date = new Date(`${localDate}T12:00:00`);

  return Number.isNaN(date.getTime())
    ? localDate
    : date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function EntryRow({ goal, entry, busy, onEdit, onDelete }) {
  const [mode, setMode] = useState("view");

  if (mode === "edit") {
    return (
      <li className="entry-row is-editing">
        <EntryForm
          goal={goal}
          initialEntry={entry}
          busy={busy}
          onCancel={() => setMode("view")}
          onSave={async (values) => {
            if (await onEdit(entry, values)) setMode("view");
          }}
        />
      </li>
    );
  }

  return (
    <li className="entry-row">
      <div className="entry-main">
        <strong>
          {entry.value} {unitOf(goal)}
        </strong>

        <span>{formatDay(entry.localDate)}</span>

        {entry.note && <p>{entry.note}</p>}
      </div>

      {mode === "delete" ? (
        <ConfirmInline
          message="Delete this entry?"
          confirmLabel="Delete"
          busyLabel="Deleting…"
          busy={busy}
          onCancel={() => setMode("view")}
          onConfirm={() => onDelete(entry)}
        />
      ) : (
        <div className="entry-actions">
          <button type="button" className="goal-text-button" onClick={() => setMode("edit")}>
            Edit
          </button>

          <button type="button" className="goal-text-button is-danger" disabled={busy} onClick={() => setMode("delete")}>
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

// Newest first. Shows the latest few, with the rest one click away.
function EntryHistory({ goal, busy, onEdit, onDelete }) {
  const [showAll, setShowAll] = useState(false);

  const sorted = [...(goal.entries || [])].sort(
    (a, b) =>
      b.localDate.localeCompare(a.localDate) ||
      String(b.occurredAt).localeCompare(String(a.occurredAt)),
  );

  if (sorted.length === 0) return null;

  const visible = showAll ? sorted : sorted.slice(0, SHOWN_AT_FIRST);

  return (
    <details className="entry-history">
      <summary>
        <ChevronIcon className="entry-history-chevron" />
        Progress history ({sorted.length})
      </summary>

      <ul>
        {visible.map((entry) => (
          <EntryRow
            key={entry._id}
            goal={goal}
            entry={entry}
            busy={busy}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>

      {sorted.length > SHOWN_AT_FIRST && (
        <button type="button" className="link-button" onClick={() => setShowAll((current) => !current)}>
          {showAll ? "Show fewer" : `Show all ${sorted.length}`}
        </button>
      )}
    </details>
  );
}

export default EntryHistory;
