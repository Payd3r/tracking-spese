import { useEffect, useRef } from "react";

/**
 * Sets a CSS variable --app-height to a stable viewport height that does not shrink with the keyboard on iOS.
 * It also handles the iOS PWA case where window.innerHeight might report incorrectly relative to the safe area.
 */
export const useViewportHeight = () => {
  const baseHeightRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const setHeight = () => {
      // Logic from previous utils/viewport.ts + hook logic combined

      // 1. Detect environment
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone;

      // 2. Determine raw physical target height
      let targetRawHeight: number;

      if (isIOS && isPWA) {
        // On iOS PWA, window.innerHeight can be unstable or exclude safe areas in weird ways
        // window.screen.height gives the full screen height. 
        // We might need to subtract safe areas if we wanted exact internal height, 
        // but often setting 100% of screen height and letting safe-area-inset handle padding is better.
        // However, usually we want the 'visual' height.
        // Let's stick to the robust logic: if visualViewport is available, use it, BUT clamp it.
        targetRawHeight = window.screen.height;
      } else {
        targetRawHeight = window.innerHeight;
      }

      const vv = window.visualViewport;
      const currentVisualHeight = vv?.height ?? window.innerHeight;

      // Initialize baseline
      if (baseHeightRef.current === null) {
        // If we are in PWA mode on iOS, we trust screen height more as a "full screen" baseline
        // otherwise we use the larger of innerHeight/visualHeight
        baseHeightRef.current = isIOS && isPWA ? window.screen.height : Math.max(window.innerHeight, currentVisualHeight);
      }

      // 3. Logic: If the keyboard is likely open (current height is significantly smaller), 
      // we DO NOT update the --app-height. We keep it at the "tall" value.
      // This prevents the UI from shrinking/jumping when keyboard opens.

      const baseline = baseHeightRef.current;

      // Check if current height is "close enough" to baseline (e.g. within 15% to account for toolbars hiding/showing)
      // If it's drastically smaller (e.g. < 75%), it's likely a keyboard.
      const isLikelyKeyboard = currentVisualHeight < (baseline * 0.75);

      if (!isLikelyKeyboard) {
        // Update baseline if we found a larger height (e.g. toolbar disappeared)
        if (currentVisualHeight > baseline) {
          baseHeightRef.current = currentVisualHeight;
        }
        // Also if we are specifically on iOS PWA, we might just want to enforce screen height
        // but let's be careful.
        // The safest "App Height" is the one where the keyboard is NOT visible.
        const newHeight = isIOS && isPWA ? window.screen.height : Math.max(currentVisualHeight, baseHeightRef.current);

        document.documentElement.style.setProperty("--app-height", `${newHeight}px`);
      } else {
        // Keyboard is open, keep the stored baseline
        document.documentElement.style.setProperty("--app-height", `${baseHeightRef.current}px`);
      }
    };

    setHeight();

    // Multiple listeners for robustness
    window.visualViewport?.addEventListener("resize", setHeight);
    window.addEventListener("resize", setHeight);
    window.addEventListener("orientationchange", () => setTimeout(setHeight, 100)); // Delay for iOS

    return () => {
      window.visualViewport?.removeEventListener("resize", setHeight);
      window.removeEventListener("resize", setHeight);
      window.removeEventListener("orientationchange", setHeight);
    };
  }, []);
};