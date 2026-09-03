import { useState, useEffect } from 'react';

// Variabile globale per condividere lo stato online "reale" con il codice non-React
let globalIsOnline = navigator.onLine;
const listeners = new Set<(online: boolean) => void>();
let checkIntervalId: NodeJS.Timeout | null = null;

export function getIsOnline() {
  return globalIsOnline;
}

function setGlobalIsOnline(value: boolean) {
  if (globalIsOnline !== value) {
    globalIsOnline = value;
    listeners.forEach(l => l(value));
  }
}

// Configura il polling dinamico adattivo:
// Se siamo offline, controlliamo più spesso (ogni 10s) per rilevare rapidamente la riconnessione.
// Se siamo online, eseguiamo una verifica lenta (ogni 45s) per disconnessioni silenti su iOS.
function setupDynamicPolling(online: boolean) {
  if (checkIntervalId) {
    clearInterval(checkIntervalId);
  }
  const intervalTime = online ? 45000 : 10000;
  checkIntervalId = setInterval(checkRealOnlineStatus, intervalTime);
}

// Funzione esportata per forzare un ricontrollo (es. al focus o visibilità)
export async function checkRealOnlineStatus(): Promise<boolean> {
  if (!navigator.onLine) {
    setGlobalIsOnline(false);
    setupDynamicPolling(false);
    return false;
  }

  // Se navigator.onLine indica true, facciamo un ping reale di verifica
  // Usiamo AbortController per interrompere la chiamata dopo 2 secondi
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const response = await fetch('/health', {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' }
    });
    clearTimeout(timeoutId);
    
    const online = response.status === 200;
    setGlobalIsOnline(online);
    setupDynamicPolling(online);
    return online;
  } catch (err) {
    clearTimeout(timeoutId);
    setGlobalIsOnline(false);
    setupDynamicPolling(false);
    return false;
  }
}

// Inizializza i listener globali lato browser
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    checkRealOnlineStatus();
  });
  window.addEventListener('offline', () => {
    setGlobalIsOnline(false);
    setupDynamicPolling(false);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkRealOnlineStatus();
    }
  });
  window.addEventListener('focus', () => {
    checkRealOnlineStatus();
  });

  // Eseguiamo un controllo iniziale immediato
  checkRealOnlineStatus();
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(globalIsOnline);

  useEffect(() => {
    const handleStatusChange = (newOnline: boolean) => {
      setOnline(newOnline);
    };

    listeners.add(handleStatusChange);
    // Allinea lo stato iniziale nel caso sia cambiato prima del mount
    setOnline(globalIsOnline);

    return () => {
      listeners.delete(handleStatusChange);
    };
  }, []);

  return online;
}
