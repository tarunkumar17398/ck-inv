import { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { syncWithServer, isOnline } from '@/lib/syncService';
import { getPendingOperations } from '@/lib/indexedDB';

export function OfflineIndicator() {
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkPending = async () => {
      const ops = await getPendingOperations();
      setPendingCount(ops.length);
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await syncWithServer();
    const ops = await getPendingOperations();
    setPendingCount(ops.length);
    setSyncing(false);
  };

  if (online && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      {!online && (
        <Badge variant="destructive" className="flex items-center gap-2">
          <WifiOff className="h-3 w-3" />
          Offline Mode
        </Badge>
      )}
      
      {pendingCount > 0 && (
        <Badge variant="secondary" className="flex items-center gap-2">
          {pendingCount} pending changes
        </Badge>
      )}

      {online && pendingCount > 0 && (
        <Button
          size="sm"
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      )}
    </div>
  );
}
