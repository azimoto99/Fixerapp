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
  
  // Handle user authentication for WebSocket connections
  useEffect(() => {
    // Check for userId in multiple places to ensure we have the most up-to-date value
    if (user?.id) {
      // User from auth context is the primary source
      setUserId(user.id);
      
      // Also store in localStorage for WebSocket connection persistence
      localStorage.setItem('userId', user.id.toString());
      
      console.log('RealTimeNotificationProvider: User authenticated with ID:', user.id);
    } else {
      // Try to get userId from localStorage as fallback
      const storedUserId = localStorage.getItem('userId');
      
      if (storedUserId && !isNaN(parseInt(storedUserId))) {
        // If we have a valid userId in localStorage, use it
        const parsedId = parseInt(storedUserId);
        setUserId(parsedId);
        console.log('RealTimeNotificationProvider: Using stored user ID:', parsedId);
      } else {
        // No valid user ID found
        setUserId(null);
        
        // Clean up localStorage to avoid using stale data
        localStorage.removeItem('userId');
        console.log('RealTimeNotificationProvider: No valid user ID found');
      }
    }
  }, [user]);
  
  // WebSocket component that handles real-time notifications
  const WebSocketComponent = () => {
    // Use the WebSocket hook which will connect using the userId in localStorage
    const { lastMessage, status } = useWebSocket();
    
    // Log WebSocket status changes
    useEffect(() => {
      console.log('WebSocket status:', status);
    }, [status]);
    
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