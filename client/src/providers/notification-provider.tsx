import { ReactNode, useEffect } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuth } from '@/hooks/use-auth';
import { queryClient } from '@/lib/queryClient';
import { NotificationProvider as BaseNotificationProvider } from '@/hooks/use-notifications';

/**
 * Enhanced Notification Provider that adds real-time WebSocket functionality
 * while maintaining compatibility with the existing notification system
 */
export function RealTimeNotificationProvider({ children }: { children: ReactNode }) {
  const { lastMessage } = useWebSocket();
  const { user } = useAuth();
  
  // Handle incoming WebSocket notifications by invalidating relevant queries
  useEffect(() => {
    if (!lastMessage) return;
    
    // Refresh data based on notification type
    if (lastMessage.type === 'payment') {
      // Invalidate payment and job data
      if (lastMessage.jobId) {
        queryClient.invalidateQueries({ queryKey: ['/api/jobs', lastMessage.jobId] });
        queryClient.invalidateQueries({ queryKey: ['/api/payments/job', lastMessage.jobId] });
      }
      
      // Invalidate user payment methods if this was a payment
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
        queryClient.invalidateQueries({ queryKey: ['/api/payments/user', user.id] });
      }
    }
    
    // Handle user account updates
    if (lastMessage.type === 'account') {
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/connect/account-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    }
    
    // Always refresh notifications list when we get a new notification
    queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    
  }, [lastMessage, user]);
  
  // Wrap the existing notification provider to add real-time functionality
  // without changing its interface
  return (
    <BaseNotificationProvider>
      {children}
    </BaseNotificationProvider>
  );
}