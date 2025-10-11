import { useState, useEffect } from 'react';
import { getPendingCount, hasPendingOperations } from '@/lib/db';

export function usePendingSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [hasPending, setHasPending] = useState(false);

  const refresh = async () => {
    const count = await getPendingCount();
    const pending = await hasPendingOperations();
    setPendingCount(count);
    setHasPending(pending);
  };

  useEffect(() => {
    refresh();
    
    // Refresh every 5 seconds
    const interval = setInterval(refresh, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return { pendingCount, hasPending, refresh };
}


