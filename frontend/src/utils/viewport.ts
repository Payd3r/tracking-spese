/**
 * Utility per gestire la viewport height su dispositivi iOS
 * Risolve il problema dello spazio vuoto nella parte inferiore dello schermo
 * causato dalle inconsistenze di 100dvh su iOS Safari/PWA
 */

export const updateViewportHeight = () => {
  // Calcola l'altezza reale della viewport
  const vh = window.innerHeight * 0.01;
  
  // Imposta la variabile CSS custom --vh
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  
  // Debug log (può essere rimosso in produzione)
  console.log(`Viewport height updated: ${window.innerHeight}px (${vh}px per unit)`);
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
