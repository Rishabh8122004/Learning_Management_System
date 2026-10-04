import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";
import { apiRequest } from "../services/apiRequest";
import { findAchievements, headlineOf } from "../lib/goalCelebrations";

const CELEBRATION_MS = 2600;

function mapGoals(goals, id, change) {
  return goals.map((goal) =>
    goal._id === id
      ? change(goal)
      : { ...goal, children: mapGoals(goal.children || [], id, change) },
  );
}

function jsonOptions(method, body) {
  return { method, body: JSON.stringify(body) };
}

// Loads the user's goals and runs every change to them.
// After each change the fresh goals are compared with the old ones to notice real achievements
// (a habit target met, a streak milestone, a goal finished) so the page can celebrate them.
export function useGoals() {
  const { token } = useAuth();
  const toast = useToast();

  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(() => Boolean(token));
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [celebrating, setCelebrating] = useState({});
  const [dayStamp, setDayStamp] = useState(0);

  const goalsRef = useRef([]);

  const commit = useCallback((next) => {
    goalsRef.current = next;
    setGoals(next);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadGoals() {
      setIsLoading(true);
      setError("");

      try {
        const data = await apiRequest("/goals");

        if (isCurrent) commit(data.goals || []);
      } catch (loadError) {
        if (isCurrent) setError(loadError.message || "Could not load your goals.");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    if (token) loadGoals();

    return () => {
      isCurrent = false;
    };
  }, [token, reloadKey, commit]);

  const celebrate = useCallback((events) => {
    const headline = headlineOf(events);

    if (!headline) return null;

    const stamp = Date.now();
    const marked = events.filter((event) => event.goalId);

    if (marked.length) {
      setCelebrating((current) => ({
        ...current,
        ...Object.fromEntries(
          marked.map((event) => [event.goalId, { kind: event.kind, level: event.level, stamp }]),
        ),
      }));
    }

    if (events.some((event) => event.kind === "day-complete")) setDayStamp(stamp);

    window.setTimeout(() => {
      setCelebrating((current) =>
        Object.fromEntries(Object.entries(current).filter(([, value]) => value.stamp !== stamp)),
      );
      setDayStamp((current) => (current === stamp ? 0 : current));
    }, CELEBRATION_MS);

    // A tiny buzz on phones that support it
    navigator.vibrate?.(headline.level === "big" ? [14, 40, 14] : 12);

    return headline;
  }, []);

  // Runs one change. `optimistic` updates the screen at once and is rolled back if the change fails.
  const runMutation = useCallback(
    async (key, path, options = {}, optimistic) => {
      const before = goalsRef.current;

      setBusyAction(key);

      if (optimistic) commit(optimistic(before));

      let data;

      try {
        data = (await apiRequest(path, options)) || {};
      } catch (mutationError) {
        if (optimistic) commit(before);
        toast.error(mutationError.message || "Could not save that change.");
        setBusyAction("");

        return false;
      }

      try {
        const fresh = (await apiRequest("/goals")).goals || [];

        commit(fresh);

        const headline = celebrate(findAchievements(before, fresh));

        setBusyAction("");

        return { data, headline };
      } catch {
        toast.error("Saved, but we could not refresh the page. Reload to see the latest.");
        setBusyAction("");

        return { data, headline: null };
      }
    },
    [commit, celebrate, toast],
  );

  // Shows the achievement pop-up (with an optional Undo) for a finished change.
  const announce = useCallback(
    (result, undo) => {
      if (!result?.headline) return false;

      toast.show({
        message: result.headline.message,
        type: "celebrate",
        actionLabel: undo ? "Undo" : undefined,
        onAction: undo,
      });

      return true;
    },
    [toast],
  );

  const createGoal = (values) => runMutation("create", "/goals", jsonOptions("POST", values));

  const createSubgoal = (parent, values) =>
    runMutation(`subgoal-${parent._id}`, `/goals/${parent._id}/subgoals`, jsonOptions("POST", values));

  async function updateGoal(goal, values) {
    const result = await runMutation(`goal-${goal._id}`, `/goals/${goal._id}`, jsonOptions("PATCH", values));

    announce(result);

    return result;
  }

  const deleteGoal = (goal) => runMutation(`goal-${goal._id}`, `/goals/${goal._id}`, { method: "DELETE" });

  async function toggleMilestone(goal) {
    const result = await runMutation(
      `goal-${goal._id}`,
      `/goals/${goal._id}`,
      jsonOptions("PATCH", { completed: !goal.completed }),
      (current) => mapGoals(current, goal._id, (item) => ({ ...item, completed: !item.completed })),
    );

    announce(result, () => toggleMilestoneBack(goal));

    return result;
  }

  // Undoing a toggle is the same request again (the goal now has the opposite state).
  function toggleMilestoneBack(goal) {
    return runMutation(
      `goal-${goal._id}`,
      `/goals/${goal._id}`,
      jsonOptions("PATCH", { completed: Boolean(goal.completed) }),
      (current) => mapGoals(current, goal._id, (item) => ({ ...item, completed: Boolean(goal.completed) })),
    );
  }

  async function createEntry(goal, values) {
    // Same-day logs are summed into one entry, so undo restores the old total.
    const previous = (goal.entries || []).find((entry) => entry.localDate === values.localDate);

    const result = await runMutation(`goal-${goal._id}`, `/goals/${goal._id}/entries`, jsonOptions("POST", values));

    if (!result) return false;

    const saved = result.data;

    if (saved.entry) {
      const entryPath = `/goals/${goal._id}/entries/${saved.entry._id}`;

      const undoLog = () =>
        previous
          ? runMutation(`goal-${goal._id}`, entryPath, jsonOptions("PATCH", { value: previous.value }))
          : runMutation(`goal-${goal._id}`, entryPath, { method: "DELETE" });

      if (!announce(result, undoLog)) {
        toast.show({
          message: `Logged ${values.value}.`,
          type: "success",
          actionLabel: "Undo",
          onAction: undoLog,
          duration: 6000,
        });
      }
    }

    return result;
  }

  async function updateEntry(goal, entry, values) {
    const result = await runMutation(
      `goal-${goal._id}`,
      `/goals/${goal._id}/entries/${entry._id}`,
      jsonOptions("PATCH", values),
    );

    announce(result);

    return result;
  }

  const deleteEntry = (goal, entry) =>
    runMutation(`goal-${goal._id}`, `/goals/${goal._id}/entries/${entry._id}`, { method: "DELETE" });

  return {
    goals,
    isLoading,
    error,
    busyAction,
    celebrating,
    dayStamp,
    retry: () => setReloadKey((key) => key + 1),
    createGoal,
    createSubgoal,
    updateGoal,
    deleteGoal,
    toggleMilestone,
    createEntry,
    updateEntry,
    deleteEntry,
  };
}
