import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    let active = true;
    let intervalId: NodeJS.Timeout;

    const checkRealStatus = async () => {
      if (!navigator.onLine) {
        if (active) setIsOnline(false);
        return;
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
        
        if (active) {
          setIsOnline(response.status === 200);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (active) {
          // Se la fetch fallisce o va in timeout, siamo effettivamente offline
          setIsOnline(false);
        }
      }
    };

    const handleOnline = () => {
      checkRealStatus();
    };

    const handleOffline = () => {
      if (active) setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleOnline);
    window.addEventListener('focus', handleOnline);

    // Eseguiamo un controllo iniziale immediato
    checkRealStatus();

    // Verifica periodica lenta ogni 45 secondi per disconnessioni silenti su iOS
    intervalId = setInterval(checkRealStatus, 45000);

    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleOnline);
      window.removeEventListener('focus', handleOnline);
      clearInterval(intervalId);
    };
  }, []);

  return isOnline;
}


