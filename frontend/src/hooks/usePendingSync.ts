import { useState, useEffect, useCallback } from 'react';
import { getPendingCount, hasPendingOperations } from '@/lib/db';

export function usePendingSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [hasPending, setHasPending] = useState(false);

  const refresh = useCallback(async () => {
    const count = await getPendingCount();
    const pending = await hasPendingOperations();
    
    // Only update state if values actually changed
    setPendingCount(prev => prev !== count ? count : prev);
    setHasPending(prev => prev !== pending ? pending : prev);
  }, []);

  useEffect(() => {
    refresh();
    
    // Refresh every 2 minutes (much less frequent)
    const interval = setInterval(() => {
      // Skip refresh if app is not visible
      if (!document.hidden) {
        refresh();
      }
    }, 120000);
    
    return () => clearInterval(interval);
  }, []);

  return { pendingCount, hasPending, refresh };
}


