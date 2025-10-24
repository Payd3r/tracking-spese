import React, { createContext, useContext, useEffect, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePendingSync } from '@/hooks/usePendingSync';
import { syncData, SyncResult } from '@/lib/sync';
import { refreshCacheAfterSync } from '@/lib/cacheManager';
import { toast } from 'sonner';
import { checkServerHealth, isServerReachable } from '@/lib/api';

interface SyncContextType {
  isOnline: boolean;
  serverReachable: boolean;
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

  const triggerSync = async () => {
    if (!isOnline || !serverReachable || isSyncing || !hasPending) {
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

  // Health check for server reachability
  useEffect(() => {
    if (!isOnline) return;

    const performHealthCheck = async () => {
      const isReachable = await checkServerHealth();
      setServerReachable(isReachable);
    };

    // Initial health check
    performHealthCheck();

    // Periodic health check every 30 seconds
    const interval = setInterval(performHealthCheck, 30000);

    return () => clearInterval(interval);
  }, [isOnline]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && serverReachable && hasPending && !isSyncing) {
      const timer = setTimeout(() => {
        triggerSync();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isOnline, serverReachable, hasPending]);

  // Auto-sync when app regains focus
  useEffect(() => {
    const handleFocus = () => {
      if (isOnline && serverReachable && hasPending && !isSyncing) {
        triggerSync();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && isOnline && serverReachable && hasPending && !isSyncing) {
        triggerSync();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOnline, serverReachable, hasPending, isSyncing]);

  const value: SyncContextType = {
    isOnline,
    serverReachable,
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


