
import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { WifiOff } from 'lucide-react';

export default function OfflineNotice() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <Alert variant="destructive" className="fixed bottom-4 left-4 right-4 z-50">
      <WifiOff className="h-4 w-4" />
      <AlertDescription>
        You are currently offline. Some features may be unavailable.
      </AlertDescription>
    </Alert>
  );
}
