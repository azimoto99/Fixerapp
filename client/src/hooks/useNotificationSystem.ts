import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  sourceId?: number;
  sourceType?: string;
  createdAt: string;
  metadata?: any;
}

interface NotificationSystemHooks {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: number) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: number) => void;
  createNotification: (notification: Partial<Notification>) => void;
}

export function useNotificationSystem(): NotificationSystemHooks {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/notifications');
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Calculate unread count
  const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest('PATCH', `/api/notifications/${notificationId}/read`);
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/notifications/mark-all-read');
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: "All notifications marked as read",
        description: "All your notifications have been marked as read.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest('DELETE', `/api/notifications/${notificationId}`);
      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Create notification (for admin or system use)
  const createNotificationMutation = useMutation({
    mutationFn: async (notification: Partial<Notification>) => {
      const response = await apiRequest('POST', '/api/notifications', notification);
      if (!response.ok) {
        throw new Error('Failed to create notification');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle real-time notifications via WebSocket
  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'notification':
        // Show toast for new notification
        toast({
          title: message.data.title,
          description: message.data.message,
        });
        
        // Refresh notifications
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
        break;
        
      case 'job_update':
        // Show toast for job updates
        if (message.data.status === 'assigned') {
          toast({
            title: "Job Assigned!",
            description: `Your application for "${message.data.title}" has been accepted.`,
          });
        } else if (message.data.status === 'completed') {
          toast({
            title: "Job Completed!",
            description: `The job "${message.data.title}" has been marked as completed.`,
          });
        }
        break;
        
      case 'payment_update':
        // Show toast for payment updates
        if (message.data.status === 'succeeded') {
          toast({
            title: "Payment Received!",
            description: `You've received $${message.data.amount} for your completed work.`,
          });
        }
        break;
        
      case 'new_message':
        // Show toast for new messages
        toast({
          title: "New Message",
          description: `${message.data.sender.username}: ${message.data.content.substring(0, 50)}...`,
        });
        break;
    }
  }, [toast, queryClient]);

  // WebSocket connection is now handled by useAppConnections to prevent multiple instances
  // useWebSocketClient({
  //   onMessage: handleWebSocketMessage,
  //   onConnect: () => {
  //     console.log('Connected to notification system');
  //   },
  //   onDisconnect: () => {
  //     console.log('Disconnected from notification system');
  //   }
  // });

  // Browser notification permission and display
  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Show browser notifications for important updates
  useEffect(() => {
    if (!user || !notifications.length) return;
    
    // Get the latest unread notification
    const latestUnread = notifications
      .filter((n: Notification) => !n.isRead)
      .sort((a: Notification, b: Notification) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
    
    if (latestUnread && 'Notification' in window && Notification.permission === 'granted') {
      // Only show browser notification for high-priority types
      const highPriorityTypes = [
        'job_assigned',
        'application_accepted',
        'payment_received',
        'job_completed'
      ];
      
      if (highPriorityTypes.includes(latestUnread.type)) {
        new Notification(latestUnread.title, {
          body: latestUnread.message,
          icon: '/favicon.png',
          tag: `notification-${latestUnread.id}` // Prevent duplicate notifications
        });
      }
    }
  }, [notifications, user]);

  // Auto-mark notifications as read when viewed
  const markAsRead = useCallback((notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  }, [markAsReadMutation]);

  const markAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const deleteNotification = useCallback((notificationId: number) => {
    deleteNotificationMutation.mutate(notificationId);
  }, [deleteNotificationMutation]);

  const createNotification = useCallback((notification: Partial<Notification>) => {
    createNotificationMutation.mutate(notification);
  }, [createNotificationMutation]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification
  };
}