import { useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useNotificationSystem } from './useNotificationSystem';
import { useJobLifecycle } from './useJobLifecycle';
import { usePaymentFlow } from './usePaymentFlow';
import { useAdminSystem } from './useAdminSystem';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

/**
 * Central connection manager that coordinates all app systems
 * This hook ensures proper flow between authentication, jobs, payments, notifications, etc.
 */
export function useAppConnections() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // WebSocket event handlers - defined before useWebSocketClient
  const handleWebSocketMessage = useCallback((message: any) => {
    console.log('App Connection Manager - WebSocket message:', message);
    
    switch (message.type) {
      case 'job_update':
        handleJobUpdate(message.data);
        break;
      case 'payment_update':
        handlePaymentUpdate(message.data);
        break;
      case 'application_update':
        handleApplicationUpdate(message.data);
        break;
      case 'new_message':
        handleNewMessage(message.data);
        break;
      case 'notification':
        handleNotification(message.data);
        break;
      default:
        console.log('Unhandled WebSocket message type:', message.type);
    }
  }, []);

  const handleWebSocketConnect = useCallback(() => {
    console.log('App Connection Manager - WebSocket connected');
    toast({
      title: "Connected",
      description: "Real-time updates are now active.",
    });
  }, [toast]);

  const handleWebSocketDisconnect = useCallback(() => {
    console.log('App Connection Manager - WebSocket disconnected');
    // Don't show toast for disconnection as it might be temporary
  }, []);

  const handleWebSocketError = useCallback((error: Event) => {
    console.error('App Connection Manager - WebSocket error:', error);
    toast({
      title: "Connection Issue",
      description: "Experiencing connectivity issues. Retrying...",
      variant: "destructive",
    });
  }, [toast]);

  // Initialize all systems
  const { isConnected, status: connectionStatus, joinRoom: joinJobRoom, leaveRoom: leaveJobRoom } = useWebSocket();

  const { notifications, unreadCount, markAsRead } = useNotificationSystem();
  const jobLifecycle = useJobLifecycle();
  const paymentFlow = usePaymentFlow();
  const adminSystem = useAdminSystem();

  // Specific event handlers
  const handleJobUpdate = useCallback((jobData: any) => {
    console.log('Job update received:', jobData);
    
    // Invalidate job-related queries
    queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
    
    // Show appropriate toast based on job status
    switch (jobData.status) {
      case 'assigned':
        if (jobData.workerId === user?.id) {
          toast({
            title: "Job Assigned!",
            description: `You've been assigned to "${jobData.title}".`,
          });
        }
        break;
      case 'in_progress':
        toast({
          title: "Job Started",
          description: `Work has begun on "${jobData.title}".`,
        });
        break;
      case 'completed':
        toast({
          title: "Job Completed",
          description: `"${jobData.title}" has been marked as completed.`,
        });
        break;
      case 'canceled':
        toast({
          title: "Job Canceled",
          description: `"${jobData.title}" has been canceled.`,
          variant: "destructive",
        });
        break;
    }
  }, [user?.id, queryClient, toast]);

  const handlePaymentUpdate = useCallback((paymentData: any) => {
    console.log('Payment update received:', paymentData);
    
    // Invalidate payment-related queries
    queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
    queryClient.invalidateQueries({ queryKey: ['/api/earnings'] });
    
    // Show payment status toast
    if (paymentData.status === 'succeeded') {
      toast({
        title: "Payment Processed",
        description: `Payment of $${paymentData.amount} has been processed successfully.`,
      });
    } else if (paymentData.status === 'failed') {
      toast({
        title: "Payment Failed",
        description: "There was an issue processing your payment. Please try again.",
        variant: "destructive",
      });
    }
  }, [queryClient, toast]);

  const handleApplicationUpdate = useCallback((applicationData: any) => {
    console.log('Application update received:', applicationData);
    
    // Invalidate application queries
    queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
    
    // Show application status toast
    if (applicationData.status === 'accepted' && applicationData.workerId === user?.id) {
      toast({
        title: "Application Accepted!",
        description: `Your application has been accepted for "${applicationData.jobTitle}".`,
      });
    } else if (applicationData.status === 'rejected' && applicationData.workerId === user?.id) {
      toast({
        title: "Application Update",
        description: `Your application for "${applicationData.jobTitle}" was not selected.`,
      });
    }
  }, [user?.id, queryClient, toast]);

  const handleNewMessage = useCallback((messageData: any) => {
    console.log('New message received:', messageData);
    
    // Invalidate message queries
    queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    
    // Show message notification if not from current user
    if (messageData.senderId !== user?.id) {
      toast({
        title: "New Message",
        description: `${messageData.senderName}: ${messageData.content.substring(0, 50)}...`,
      });
    }
  }, [user?.id, queryClient, toast]);

  const handleNotification = useCallback((notificationData: any) => {
    console.log('Notification received:', notificationData);
    
    // Invalidate notification queries
    queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    
    // Show notification toast
    toast({
      title: notificationData.title,
      description: notificationData.message,
    });
  }, [queryClient, toast]);

  // Job lifecycle event handlers
  const handleJobCreated = useCallback((job: any) => {
    console.log('Job created:', job);
    
    // Join job room for real-time updates
    if (job.id) {
      joinJobRoom(job.id);
    }
    
    // Show success message
    toast({
      title: "Job Posted Successfully!",
      description: `Your job "${job.title}" is now live.`,
    });
  }, [joinJobRoom, toast]);

  const handleJobCompleted = useCallback((job: any) => {
    console.log('Job completed:', job);
    
    // Leave job room
    if (job.id) {
      leaveJobRoom(job.id);
    }
    
    // Trigger payment processing if applicable
    if (job.workerId && job.paymentAmount) {
      console.log('Triggering automatic payment processing for completed job');
      // Payment processing is handled automatically by the backend
    }
  }, [leaveJobRoom]);

  // Payment flow event handlers
  const handlePaymentSuccess = useCallback((payment: any) => {
    console.log('Payment successful:', payment);
    
    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
    
    toast({
      title: "Payment Successful!",
      description: "Your payment has been processed and the job is now active.",
    });
  }, [queryClient, toast]);

  // Admin system event handlers
  const handleAdminAction = useCallback((action: string, target: any) => {
    console.log('Admin action performed:', action, target);
    
    // Invalidate admin queries
    if (adminSystem.isAdmin) {
      queryClient.invalidateQueries({ queryKey: ['/api/admin'] });
    }
    
    // Log admin actions for audit trail
    console.log(`Admin action: ${action} on ${target.type} ${target.id}`);
  }, [adminSystem.isAdmin, queryClient]);

  // Connection status monitoring
  useEffect(() => {
    if (user && !authLoading) {
      console.log('App Connection Manager - User authenticated, initializing connections');
      
      // Set up any additional connections or subscriptions here
      // For example, subscribe to user-specific channels
      
      return () => {
        console.log('App Connection Manager - Cleaning up connections');
        // Clean up any subscriptions
      };
    }
  }, [user, authLoading]);

  // Monitor connection health
  useEffect(() => {
    const interval = setInterval(() => {
      if (user && connectionStatus !== 'connected') {
        console.log('Connection health check - Status:', connectionStatus);
        // Could implement reconnection logic here if needed
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [user, connectionStatus]);

  // Auto-mark notifications as read when user is active
  useEffect(() => {
    let activityTimer: NodeJS.Timeout;
    
    const resetTimer = () => {
      clearTimeout(activityTimer);
      activityTimer = setTimeout(() => {
        // Mark old notifications as read after 5 minutes of inactivity
        if (notifications.length > 0) {
          const oldNotifications = notifications.filter(n => 
            !n.isRead && 
            new Date().getTime() - new Date(n.createdAt).getTime() > 5 * 60 * 1000
          );
          
          oldNotifications.forEach(notification => {
            markAsRead(notification.id);
          });
        }
      }, 5 * 60 * 1000); // 5 minutes
    };

    // Reset timer on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    resetTimer();

    return () => {
      clearTimeout(activityTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
    };
  }, [notifications, markAsRead]);

  return {
    // Connection status
    isConnected,
    connectionStatus,
    
    // System states
    user,
    authLoading,
    notifications,
    unreadCount,
    
    // System managers
    jobLifecycle,
    paymentFlow,
    adminSystem,
    
    // Event handlers (for external use)
    handleJobCreated,
    handleJobCompleted,
    handlePaymentSuccess,
    handleAdminAction,
    
    // WebSocket event handlers
    handleWebSocketMessage,
    handleWebSocketConnect,
    handleWebSocketDisconnect,
    handleWebSocketError,
    
    // Utility functions
    joinJobRoom,
    leaveJobRoom,
    markAsRead
  };
}