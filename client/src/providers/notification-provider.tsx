import { ReactNode, useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuth } from '@/hooks/use-auth';
import { queryClient } from '@/lib/queryClient';
import { NotificationProvider as BaseNotificationProvider } from '@/hooks/use-notifications';

/**
 * Enhanced Notification Provider that adds real-time WebSocket functionality
 * while maintaining compatibility with the existing notification system
 */
export function RealTimeNotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [userId, setUserId] = useState<number | null>(null);
  
  // Only create a WebSocket connection if we have a user
  useEffect(() => {
    if (user?.id) {
      // Store the user ID in localStorage for the WebSocket connection
      localStorage.setItem('userId', user.id.toString());
      setUserId(user.id);
    } else {
      localStorage.removeItem('userId');
      setUserId(null);
    }
  }, [user]);
  
  // Only use the WebSocket when we have a user ID
  const WebSocketComponent = () => {
    const { lastMessage } = useWebSocket();
    
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
        if (userId) {
          queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
          queryClient.invalidateQueries({ queryKey: ['/api/payments/user', userId] });
        }
      }
      
      // Handle user account updates
      if (lastMessage.type === 'account') {
        queryClient.invalidateQueries({ queryKey: ['/api/stripe/connect/account-status'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      }
      
      // Always refresh notifications list when we get a new notification
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      
    }, [lastMessage]);
    
    return null;
  };
  
  // Wrap the existing notification provider to add real-time functionality
  // without changing its interface
  return (
    <BaseNotificationProvider>
      {userId && <WebSocketComponent />}
      {children}
    </BaseNotificationProvider>
  );
}