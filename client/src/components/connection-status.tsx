import { useNetworkStatus } from '@/hooks/use-network-status';
import { useSessionMonitor } from '@/hooks/use-session-monitor';
import { useToast } from '@/hooks/use-toast';
import React from 'react';

export function ConnectionStatus() {
  const networkStatus = useNetworkStatus();
  const { sessionHealth } = useSessionMonitor();
  const { toast } = useToast();
  
  React.useEffect(() => {
    let timeout: number;
    
    if (!networkStatus.online || !sessionHealth?.isAuthenticated) {
      timeout = window.setTimeout(() => {
        toast({
          title: networkStatus.online ? 'Session Issue' : 'Connection Issue',
          description: networkStatus.online 
            ? 'Having trouble with your session. Trying to reconnect...' 
            : 'You are currently offline. Some features may be limited.',
          variant: 'warning',
          duration: 10000,
        });
      }, 1000);
    }
    
    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [networkStatus.online, sessionHealth?.isAuthenticated, toast]);

  if (networkStatus.online && sessionHealth?.isAuthenticated) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-background/80 backdrop-blur-sm rounded-lg shadow-lg p-4 border border-border">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${networkStatus.online ? 'bg-yellow-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium">
            {!networkStatus.online 
              ? 'Offline Mode' 
              : 'Reconnecting...'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {!networkStatus.online 
            ? 'Some features may be limited'
            : 'Attempting to restore connection'}
        </p>
      </div>
    </div>
  );
}
