import { useSync } from '@/contexts/SyncContext';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline } = useSync();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive px-4 py-2">
      <div className="max-w-md mx-auto flex items-center justify-center gap-2 text-destructive-foreground">
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">
          Modalità Offline - Le modifiche verranno sincronizzate quando tornerai online
        </span>
      </div>
    </div>
  );
}


