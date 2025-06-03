import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SessionHealth {
  status: string;
  hasSession: boolean;
  isAuthenticated: boolean;
  hasUser: boolean;
  userVerified?: boolean;
  hasCookie: boolean;
  cookieMaxAge?: number;
  cookieExpired: boolean;
  userActive?: boolean;
  lastActivity?: Date;
  sessionStarted?: Date;
}

interface SessionMonitorOptions {
  checkInterval?: number;
  autoRedirect?: boolean;
  onSessionExpired?: () => void;
}

export function useSessionMonitor(options: SessionMonitorOptions = {}) {
  const { 
    checkInterval = 5 * 60 * 1000, // 5 minutes default
    autoRedirect = true,
    onSessionExpired
  } = options;
  
  const { toast } = useToast();
  const [sessionHealth, setSessionHealth] = useState<SessionHealth | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const checkSessionHealth = async () => {
    try {
      setIsChecking(true);
      const res = await apiRequest('GET', '/api/session/check', {});
      if (!res.ok) {
        throw new Error('Session check failed');
      }
      
      const health = await res.json();
      setSessionHealth(health);
      
      // Detect session issues
      if (!health.hasSession || !health.isAuthenticated || health.cookieExpired) {
        const message = {
          title: 'Session Expired',
          description: 'Please log in again to continue.',
          variant: 'destructive' as const,
          action: autoRedirect ? undefined : {
            label: 'Login',
            onClick: () => {
              window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
            }
          }
        };
        
        toast(message);
        
        if (onSessionExpired) {
          onSessionExpired();
        }
        
        if (autoRedirect) {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
          return false;
        }
      }
      
      // Check for inactive user
      if (health.hasUser && !health.userActive) {
        toast({
          title: 'Account Inactive',
          description: 'Your account is currently inactive. Please contact support.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Session health check failed:', error);
      setSessionHealth(null);
    } finally {
      setIsChecking(false);
    }
  };  // Track session duration
  const [sessionDuration, setSessionDuration] = useState(0);
  
  useEffect(() => {
    // Check session health on mount
    checkSessionHealth();

    // Set up periodic checks
    const healthInterval = setInterval(checkSessionHealth, checkInterval);
    
    // Set up session duration tracking
    const durationInterval = setInterval(() => {
      if (sessionHealth?.isAuthenticated) {
        setSessionDuration(prev => prev + 1);
      }
    }, 60000); // Update every minute
    
    // Add visibility change listener to check when tab becomes active
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSessionHealth();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Increase check frequency for long sessions
    if (sessionDuration > 120) { // After 2 hours
      const frequentInterval = setInterval(checkSessionHealth, Math.min(checkInterval, 30000));
      return () => {
        clearInterval(healthInterval);
        clearInterval(durationInterval);
        clearInterval(frequentInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
    
    // Clean up
    return () => {
      clearInterval(healthInterval);
      clearInterval(durationInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkInterval]);

  return {
    sessionHealth,
    isChecking,
    checkSessionHealth
  };
}
