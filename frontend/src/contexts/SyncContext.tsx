import React, { createContext, useContext, useEffect, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePendingSync } from '@/hooks/usePendingSync';
import { syncData, SyncResult } from '@/lib/sync';
import { refreshCacheAfterSync, preloadCache } from '@/lib/cacheManager';
import { isServerReachable, isFullyOnline, checkServerHealth } from '@/lib/api';
import { toast } from 'sonner';

interface SyncContextType {
  isOnline: boolean;
  isServerReachable: boolean;
  isFullyOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  hasPending: boolean;
  lastSyncResult: SyncResult | null;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus();
  const { pendingCount, hasPending, refresh: refreshPending } = usePendingSync();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [serverReachable, setServerReachable] = useState(true);

  const currentFullyOnline = isOnline && serverReachable;

  // Periodic server health check (every 60 seconds for mobile optimization)
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const performHealthCheck = async () => {
      await checkServerHealth();
      setServerReachable(isServerReachable());
    };

    // Initial check
    performHealthCheck();

    // Set up periodic checks (every 60 seconds)
    intervalId = setInterval(() => {
      performHealthCheck();
    }, 60000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  // Update server reachability state on focus/visibility change and refresh cache
  useEffect(() => {
    const updateServerStatus = async () => {
      await checkServerHealth();
      const reachable = isServerReachable();
      setServerReachable(reachable);
      return reachable;
    };

    const handleFocus = async () => {
      const reachable = await updateServerStatus();
      if (isOnline && reachable) {
        // Refresh cache in background when app is focused
        preloadCache().catch(err => console.error('Focus cache preload failed:', err));
      }
    };

    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        const reachable = await updateServerStatus();
        if (isOnline && reachable) {
          // Refresh cache in background when returning to foreground
          console.log('App returned to foreground, preloading cache...');
          preloadCache().catch(err => console.error('Foreground cache preload failed:', err));
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOnline]);

  const isFullyOnline = isOnline && serverReachable;

  const triggerSync = async () => {
    if (!isFullyOnline || isSyncing || !hasPending) {
      return;
    }

    setIsSyncing(true);

    try {
      const result = await syncData();
      setLastSyncResult(result);

      if (result.success) {
        toast.success(`Sincronizzato! ${result.synced} operazioni completate.`);
        // Refresh cache after successful sync
        await refreshCacheAfterSync();
        // Trigger global reload event
        window.dispatchEvent(new Event('dataSynced'));
      } else {
        toast.error(`Sincronizzazione parziale: ${result.synced} ok, ${result.failed} fallite.`);
      }

      await refreshPending();
    } catch (error: any) {
      toast.error(`Errore sincronizzazione: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync logic:
  // 1. When coming back online (isFullyOnline becomes true)
  // 2. When new pending items are added (hasPending becomes true)
  // 3. Periodic retry if pending items exist (every 60s)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    let interval: NodeJS.Timeout;

    if (isFullyOnline && hasPending && !isSyncing) {
      // Debounce the initial trigger to avoid double-firing
      timer = setTimeout(() => {
        triggerSync();
      }, 1000);

      // Retry every 60s if we still have pending items (and are online)
      interval = setInterval(() => {
        if (isFullyOnline && hasPending && !isSyncing) {
          console.log("Periodic sync retry...");
          triggerSync();
        }
      }, 60000);
    }

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [isFullyOnline, hasPending]);

  // Auto-sync when app regains focus
  useEffect(() => {
    const handleFocus = () => {
      if (isFullyOnline && hasPending && !isSyncing) {
        triggerSync();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && isFullyOnline && hasPending && !isSyncing) {
        triggerSync();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isFullyOnline, hasPending, isSyncing]);

  const value: SyncContextType = {
    isOnline,
    isServerReachable: serverReachable,
    isFullyOnline,
    isSyncing,
    pendingCount,
    hasPending,
    lastSyncResult,
    triggerSync,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}


