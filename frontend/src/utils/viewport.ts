/**
 * Utility per gestire la viewport height su dispositivi iOS
 * Risolve il problema dello spazio vuoto nella parte inferiore dello schermo
 * causato dalle inconsistenze di 100dvh su iOS Safari/PWA
 */

export const updateViewportHeight = () => {
  // Su iOS PWA, window.innerHeight può non includere tutto lo schermo
  // Usiamo window.screen.height per ottenere l'altezza fisica completa
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                (window.navigator as any).standalone;
  
  let targetHeight: number;
  
  if (isIOS && isPWA) {
    // Per iOS PWA, usa l'altezza fisica dello schermo
    targetHeight = window.screen.height;
    if (process.env.NODE_ENV === 'development') {
      console.log('iOS PWA detected - using screen height:', targetHeight);
    }
  } else {
    // Per browser normali, usa window.innerHeight
    targetHeight = window.innerHeight;
  }
  
  const vh = targetHeight * 0.01;
  
  // Imposta la variabile CSS custom --vh
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  
  // Log di debug (rimuovere in produzione se necessario)
  if (process.env.NODE_ENV === 'development') {
    console.log(`Viewport height updated:`, {
      isIOS,
      isPWA,
      windowHeight: window.innerHeight,
      screenHeight: window.screen.height,
      targetHeight,
      vh: vh,
      calculatedHeight: vh * 100,
      diff: window.screen.height - window.innerHeight
    });
  }
};

/**
 * Inizializza il listener per il resize della viewport
 * Necessario per gestire i cambi di orientamento e altre modifiche della viewport
 */
export const initViewportFix = () => {
  // Aggiorna immediatamente
  updateViewportHeight();
  
  // Aggiorna su resize
  window.addEventListener('resize', updateViewportHeight);
  
  // Aggiorna su cambio orientamento (con delay per iOS)
  window.addEventListener('orientationchange', () => {
    setTimeout(updateViewportHeight, 100);
  });
  
  // Aggiorna quando la viewport cambia (per iOS Safari)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateViewportHeight);
  }
};
