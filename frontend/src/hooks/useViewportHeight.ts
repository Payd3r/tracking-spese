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

      // Initialize baseline with the first observed height (likely full viewport without keyboard)
      if (baseHeightRef.current === null) {
        baseHeightRef.current = Math.max(window.innerHeight, current);
      }

      // If current is within 90% of baseline, allow updates and raise baseline if larger
      const baseline = baseHeightRef.current;

      if (current >= baseline * 0.9) {
        if (current > baseline) {
          baseHeightRef.current = current;
        }
        document.documentElement.style.setProperty("--app-height", `${Math.max(current, baseHeightRef.current)}px`);
      } else {
        // Ignore keyboard-induced shrink: keep baseline height
        document.documentElement.style.setProperty("--app-height", `${baseHeightRef.current}px`);
      }
    };

    setHeight();
    window.visualViewport?.addEventListener("resize", setHeight);
    window.addEventListener("resize", setHeight);
    window.addEventListener("orientationchange", setHeight);

    return () => {
      window.visualViewport?.removeEventListener("resize", setHeight);
      window.removeEventListener("resize", setHeight);
      window.removeEventListener("orientationchange", setHeight);
    };
  }, []);
};