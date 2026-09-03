import { useEffect } from "react";

/**
 * Blocca la gesture iOS "swipe da sinistra per tornare indietro" sulla pagina corrente.
 * Utile nelle PWA dove lo swipe può uscire dalla pagina o perdere filtri/scroll.
 */
export function usePreventIosBackSwipe(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const guardHistory = () => {
      window.history.pushState({ iosBackGuard: true }, "", window.location.href);
    };

    guardHistory();

    const handlePopState = () => {
      guardHistory();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [enabled]);
}
