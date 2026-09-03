import { useEffect, useRef, useState } from "react";

/**
 * Hook che calcola dinamicamente il padding-bottom necessario per evitare
 * che il contenuto venga nascosto dal BottomNav.
 * 
 * Aggiunge padding solo quando il contenuto è più corto della viewport.
 * 
 * @param minPadding - Padding minimo da applicare quando necessario (default: 160px)
 * @returns Ref da applicare al contenitore e lo stile con padding
 */
export function useBottomNavPadding(minPadding: number = 160) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [paddingBottom, setPaddingBottom] = useState<number>(0);

  useEffect(() => {
    const calculatePadding = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const contentHeight = container.scrollHeight;
      const viewportHeight = window.innerHeight;
      
      // Altezza del BottomNav: 100px + 26px padding = 126px
      // Safe area iOS: usa un valore conservativo di 40px per coprire la maggior parte dei dispositivi
      const bottomNavHeight = 126;
      const safeAreaBottom = 40; // Valore conservativo per iPhone con home indicator e altri dispositivi
      
      const availableHeight = viewportHeight - bottomNavHeight - safeAreaBottom;
      
      // Se il contenuto è più corto dello spazio disponibile, aggiungi padding
      if (contentHeight < availableHeight) {
        const neededPadding = availableHeight - contentHeight + 40; // +20px margine di sicurezza
        setPaddingBottom(Math.max(minPadding, neededPadding));
      } else {
        // Se il contenuto è più lungo, non serve padding extra
        setPaddingBottom(0);
      }
    };

    // Calcola dopo un piccolo delay per assicurarsi che il DOM sia pronto
    const timeoutId = setTimeout(() => {
      calculatePadding();
    }, 0);

    // Ricalcola quando:
    // - La finestra viene ridimensionata
    // - Il contenuto cambia (usando ResizeObserver)
    const resizeObserver = new ResizeObserver(() => {
      calculatePadding();
    });

    // Osserva il contenitore quando è disponibile
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    } else {
      // Se il ref non è ancora disponibile, riprova dopo un breve delay
      const checkRef = setInterval(() => {
        if (containerRef.current) {
          resizeObserver.observe(containerRef.current);
          clearInterval(checkRef);
        }
      }, 10);
      
      // Cleanup dopo 1 secondo se il ref non è ancora disponibile
      setTimeout(() => clearInterval(checkRef), 1000);
    }

    window.addEventListener('resize', calculatePadding);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculatePadding);
    };
  }, [minPadding]);

  return {
    ref: containerRef,
    style: { paddingBottom: paddingBottom > 0 ? `${paddingBottom}px` : undefined },
  };
}

