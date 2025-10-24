import { useSync } from '@/contexts/SyncContext';
import { Loader2, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

export function SyncIndicator() {
  const { isOnline, isSyncing, pendingCount, hasPending, triggerSync } = useSync();

  if (!isOnline) {
    return (
      <div className="fixed bottom-20 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-destructive/90 text-destructive-foreground rounded-full shadow-lg backdrop-blur-sm">
        <CloudOff className="w-4 h-4" />
        <span className="text-sm font-medium">Offline</span>
        {hasPending && (
          <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="fixed bottom-20 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-primary/90 text-primary-foreground rounded-full shadow-lg backdrop-blur-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm font-medium">Sincronizzando...</span>
      </div>
    );
  }

  if (hasPending) {
    return (
      <Button
        onClick={triggerSync}
        size="sm"
        className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full shadow-lg"
        variant="default"
      >
        <RefreshCw className="w-4 h-4" />
        <span className="text-sm font-medium">
          Sincronizza ({pendingCount})
        </span>
      </Button>
    );
  }

  // Online and synced
  return (
    <div className="fixed bottom-20 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-success/90 text-white rounded-full shadow-lg backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity">
      <Cloud className="w-4 h-4" />
      <span className="text-sm font-medium">Sincronizzato</span>
    </div>
  );
}


