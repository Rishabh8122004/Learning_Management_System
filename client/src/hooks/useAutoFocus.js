import { useEffect, useRef } from "react";

// Puts the cursor in the first field when a page opens, on screens with a mouse or keyboard.
// On phones it stays off so the on-screen keyboard does not cover the page.
export function useAutoFocus() {
  const ref = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) {
      ref.current?.focus();
    }
  }, []);

  return ref;
}
