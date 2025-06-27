/**
 * WebSocket Context Provider - Singleton WebSocket connection
 * Prevents multiple WebSocket connections from being created
 */
import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useWebSocketUnified, UseWebSocketOptions } from '@/hooks/useWebSocketUnified';
import { useAuth } from '@/hooks/use-auth';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface WebSocketContextType {
  // Connection state
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  isConnected: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
  connectionId?: string;
  error?: string;
  
  // Message state
  messages: any[];
  typingUsers: number[];
  onlineUsers: number[];
  unreadCounts: Map<number, number>;
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  forceReconnect: () => void;
  sendMessage: (content: string, recipientId: number, jobId?: number) => boolean;
  joinRoom: (jobId: number) => boolean;
  leaveRoom: (jobId: number) => boolean;
  startTyping: (recipientId: number, jobId?: number) => boolean;
  stopTyping: (recipientId: number, jobId?: number) => boolean;
  markMessageAsRead: (messageId: number) => boolean;
  sendRawMessage: (message: any) => boolean;
  
  // Stats
  queuedMessages: number;
  connectionAttempts: number;
  circuitBreakerOpen: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  options?: UseWebSocketOptions;
  onMessage?: (message: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
}

export function WebSocketProvider({ 
  children, 
  options = {},
  onMessage,
  onConnect,
  onDisconnect,
  onError
}: WebSocketProviderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Default event handlers for common app events
  const handleMessage = useCallback((message: any) => {
    console.log('WebSocket Context - Message received:', message);
    
    try {
      switch (message.type) {
        case 'job_update':
          // Invalidate job-related queries
          queryClient.invalidateQueries({ queryKey: ['/api/jobs'] })
            .catch(err => console.error('Error invalidating job queries:', err));
          queryClient.invalidateQueries({ queryKey: ['/api/applications'] })
            .catch(err => console.error('Error invalidating application queries:', err));
          break;
        case 'payment_update':
          // Invalidate payment-related queries
          queryClient.invalidateQueries({ queryKey: ['/api/payments'] })
            .catch(err => console.error('Error invalidating payment queries:', err));
          queryClient.invalidateQueries({ queryKey: ['/api/earnings'] })
            .catch(err => console.error('Error invalidating earnings queries:', err));
          break;
        case 'new_message':
          // Invalidate message queries
          queryClient.invalidateQueries({ queryKey: ['/api/messages'] })
            .catch(err => console.error('Error invalidating message queries:', err));
          break;
        case 'notification':
          // Only show notification if it's for this user
          if (message.data.userId === user?.id) {
            toast({
              title: message.data.title,
              description: message.data.message,
            });
          }
          // Invalidate notification queries
          queryClient.invalidateQueries({ queryKey: ['/api/notifications'] })
            .catch(err => console.error('Error invalidating notification queries:', err));
          break;

        case 'instant_application':
          // Only show to job poster
          if (message.posterId === user?.id) {
            toast({
              title: "⚡ New Application!",
              description: `${message.workerName} just applied for your job!`,
              duration: 6000,
            });

            // Refresh applications
            queryClient.invalidateQueries({ queryKey: [`/api/applications/job/${message.jobId}`] })
              .catch(err => console.error('Error invalidating job applications queries:', err));
          }
          break;

        case 'application_accepted':
          // Only show to the worker whose application was accepted
          if (message.workerId === user?.id) {
            toast({
              title: "🎉 Application Accepted!",
              description: "Your application has been accepted!",
              duration: 5000,
            });

            // Refresh applications and jobs
            queryClient.invalidateQueries({ queryKey: ['/api/applications'] })
              .catch(err => console.error('Error invalidating applications queries:', err));
            queryClient.invalidateQueries({ queryKey: ['/api/jobs'] })
              .catch(err => console.error('Error invalidating jobs queries:', err));
          }
          break;
        case 'job_pin_update':
          console.log('📍 Job pin update:', message.data);

          // Invalidate jobs query to update the map pins
          queryClient.invalidateQueries({ queryKey: ['/api/jobs'] })
            .catch(err => console.error('Error invalidating jobs queries:', err));

          // Emit custom event for map components to listen to
          window.dispatchEvent(new CustomEvent('jobPinUpdate', {
            detail: {
              action: message.data.action,
              job: message.data.job
            }
          }));
          break;
      }
      
      // Call custom handler if provided
      onMessage?.(message);
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }, [queryClient, onMessage, user, toast]);

  const handleConnect = useCallback(() => {
    console.log('WebSocket Context - Connected');
    toast({
      title: "Connected",
      description: "Real-time updates are now active.",
    });
    onConnect?.();
  }, [toast, onConnect]);

  const handleDisconnect = useCallback(() => {
    console.log('WebSocket Context - Disconnected');
    onDisconnect?.();
  }, [onDisconnect]);

  const handleError = useCallback((error: string) => {
    console.error('WebSocket Context - Error:', error);
    toast({
      title: "Connection Issue",
      description: "Experiencing connectivity issues. Retrying...",
      variant: "destructive",
    });
    onError?.(error);
  }, [toast, onError]);

  const webSocketState = useWebSocketUnified({
    autoReconnect: true,
    maxReconnectAttempts: 10,
    onMessage: handleMessage,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onError: handleError,
    ...options
  });

  return (
    <WebSocketContext.Provider value={webSocketState}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
