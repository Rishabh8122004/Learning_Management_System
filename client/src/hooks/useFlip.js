import { useCallback, useLayoutEffect, useRef } from "react";

// Smooth re-ordering: items slide from where they were to where they are now.
// Mark each movable element with data-flip="<unique key>" and data-flip-level="<group>" inside the container,
// call capture("<group>") just before changing the order, and that group's move is animated after the screen updates.
export function useFlip(containerRef) {
  const before = useRef(null);

  const capture = useCallback(
    (level) => {
      const container = containerRef.current;

      if (!container) return;

      before.current = new Map(
        [...container.querySelectorAll(`[data-flip-level="${level}"]`)].map((element) => [
          element.dataset.flip,
          element.getBoundingClientRect().top,
        ]),
      );
    },
    [containerRef],
  );

  // Runs after every render; does nothing unless capture() was called first.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const previous = before.current;

    before.current = null;

    if (!container || !previous) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    for (const element of container.querySelectorAll("[data-flip]")) {
      const oldTop = previous.get(element.dataset.flip);

      if (oldTop === undefined) continue;

      const distance = oldTop - element.getBoundingClientRect().top;

      if (Math.abs(distance) < 1) continue;

      element.animate(
        [{ transform: `translateY(${distance}px)` }, { transform: "translateY(0)" }],
        { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    }
  });

  return capture;
}
