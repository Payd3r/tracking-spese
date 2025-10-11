import React, { createContext, useContext, useEffect, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePendingSync } from '@/hooks/usePendingSync';
import { syncData, SyncResult } from '@/lib/sync';
import { toast } from 'sonner';

interface SyncContextType {
  isOnline: boolean;
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

  const triggerSync = async () => {
    if (!isOnline || isSyncing || !hasPending) {
      return;
    }

    setIsSyncing(true);
    
    try {
      const result = await syncData();
      setLastSyncResult(result);
      
      if (result.success) {
        toast.success(`Sincronizzato! ${result.synced} operazioni completate.`);
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

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && hasPending && !isSyncing) {
      const timer = setTimeout(() => {
        triggerSync();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isOnline, hasPending]);

  // Auto-sync when app regains focus
  useEffect(() => {
    const handleFocus = () => {
      if (isOnline && hasPending && !isSyncing) {
        triggerSync();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && isOnline && hasPending && !isSyncing) {
        triggerSync();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOnline, hasPending, isSyncing]);

  const value: SyncContextType = {
    isOnline,
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


