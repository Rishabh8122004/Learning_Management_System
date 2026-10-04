import { useEffect, useRef } from "react";

// Fades elements in as they scroll into view.
// - Elements already on screen are left alone (no flash).
// - Nothing is hidden when the browser lacks IntersectionObserver or the visitor prefers reduced motion.
// Mark elements with data-reveal-item; add style={{ "--i": n }} to stagger them. The look is in polish.css.
export function useReveal(selector = "[data-reveal-item]") {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;

    if (
      !root ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return undefined;
    }

    const belowTheFold = [...root.querySelectorAll(selector)].filter(
      (element) => element.getBoundingClientRect().top > window.innerHeight * 0.92,
    );

    belowTheFold.forEach((element) => {
      element.dataset.reveal = "hidden";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.dataset.reveal = "shown";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );

    belowTheFold.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [selector]);

  return rootRef;
}
