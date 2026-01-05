import { useEffect, useRef } from "react";

/**
 * Sets a CSS variable --app-height to a stable viewport height that does not shrink with the keyboard on iOS.
 * It captures the maximum seen height and never lets the value go below 90% of that baseline
 * to avoid jumps when the software keyboard appears.
 */
export const useViewportHeight = () => {
  const baseHeightRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const setHeight = () => {
      const vv = window.visualViewport;
      const current = vv?.height ?? window.innerHeight;

      // Initialize baseline with the first observed height (likely the full viewport without keyboard)
      if (baseHeightRef.current === null) {
        baseHeightRef.current = current;
      }

      // Keep track of the largest height seen (e.g., when URL bar hides)
      if (current > baseHeightRef.current!) {
        baseHeightRef.current = current;
      }

      // Do not shrink more than 10% below the baseline to avoid jumps on keyboard show
      const minAllowed = baseHeightRef.current! * 0.9;
      const stable = Math.max(current, minAllowed);

      document.documentElement.style.setProperty("--app-height", `${stable}px`);
    };

    setHeight();
    window.visualViewport?.addEventListener("resize", setHeight);
    window.addEventListener("resize", setHeight);

    return () => {
      window.visualViewport?.removeEventListener("resize", setHeight);
      window.removeEventListener("resize", setHeight);
    };
  }, []);
};