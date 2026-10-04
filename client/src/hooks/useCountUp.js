import { useEffect, useRef, useState } from "react";

// Counts a number up (or down) to its target so changes feel gentle instead of jumping.
// Under reduced motion, or without matchMedia, the target is returned as it is.
export function useCountUp(target, duration = 900) {
  const reduced =
    typeof window === "undefined" ||
    !window.matchMedia ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [value, setValue] = useState(0);
  const shown = useRef(0);

  useEffect(() => {
    if (reduced) return undefined;

    const from = shown.current;
    const startedAt = performance.now();
    let frame;

    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);

      shown.current = Math.round(from + (target - from) * eased);
      setValue(shown.current);

      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduced]);

  return reduced ? target : value;
}
