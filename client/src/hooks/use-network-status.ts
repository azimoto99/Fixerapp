import { useEffect, useState, useCallback } from 'react';
import { useToast } from './use-toast';

interface NetworkStatus {
  online: boolean;
  type: 'wifi' | '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlink: number;
  rtt: number;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    online: navigator.onLine,
    type: 'unknown',
    downlink: 0,
    rtt: 0
  });
  
  const { toast } = useToast();

  const updateNetworkInfo = useCallback(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setStatus({
        online: navigator.onLine,
        type: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0
      });
    } else {
      setStatus(s => ({ ...s, online: navigator.onLine }));
    }
  }, []);

  const handleOnline = useCallback(() => {
    updateNetworkInfo();
    // Network status changed to online
    toast({
      title: 'Connection Restored',
      description: 'Your internet connection has been restored.',
      variant: 'default'
    });
  }, [toast, updateNetworkInfo]);

  const handleOffline = useCallback(() => {
    updateNetworkInfo();
    // Network status changed to offline
    toast({
      title: 'No Internet Connection',
      description: 'Working in offline mode. Some features may be limited.',
      variant: 'destructive'
    });
  }, [toast, updateNetworkInfo]);

  useEffect(() => {
    updateNetworkInfo();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', updateNetworkInfo);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('connection' in navigator) {
        (navigator as any).connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, [handleOnline, handleOffline, updateNetworkInfo]);

  return status;
}
