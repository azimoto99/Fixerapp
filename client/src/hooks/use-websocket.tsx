import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'unauthorized';

/**
 * Hook for connecting to the notification service WebSocket
 * Handles connection, reconnection, and message parsing
 */
export function useWebSocket() {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [messages, setMessages] = useState<any[]>([]);
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Connect to the WebSocket server
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }
    
    // If we have a pending reconnect timer, clear it
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    setStatus('connecting');
    
    try {
      // Determine the WebSocket URL based on current protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      
      // Get user ID from auth context via localStorage
      let userId: string | null = null;
      try {
        // Try multiple sources for the user ID to ensure we can connect
        // 1. Try direct userId from localStorage (set by our updated queryClient)
        userId = localStorage.getItem('userId');
        
        // 2. Try from auth object in localStorage
        if (!userId) {
          const auth = JSON.parse(localStorage.getItem('auth') || '{}');
          userId = auth.user?.id?.toString();
        }
        
        // Log the retrieved user ID
        if (userId) {
          console.log(`WebSocket using user ID: ${userId}`);
        }
      } catch (e) {
        console.error('Error retrieving user ID for WebSocket connection:', e);
      }
      
      // Only connect if we have a user ID
      if (!userId) {
        console.log('Not connecting WebSocket - no user ID available');
        setStatus('unauthorized');
        return; // Exit without throwing an error
      }
      
      const wsUrl = `${protocol}//${host}/ws/notifications?userId=${userId}`;
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        setStatus('connected');
        console.log('WebSocket connection established');
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Add message to history and set as last message
          setMessages((prev) => [...prev, data]);
          setLastMessage(data);
          
          // Show toast notification for payment events
          if (data.type === 'payment') {
            toast({
              title: 'Payment Update',
              description: data.message || 'Payment status updated',
              variant: data.status === 'failed' ? 'destructive' : 'default',
            });
          }
          
          // Show toast notification for account events
          if (data.type === 'account') {
            toast({
              title: 'Stripe Account Update',
              description: data.message || 'Your Stripe account status has changed',
              variant: data.status === 'requires_information' ? 'destructive' : 'default',
            });
          }
          
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('disconnected');
      };
      
      socket.onclose = (event) => {
        console.log(`WebSocket connection closed with code ${event.code}`);
        setStatus('disconnected');
        
        // Check if the connection was closed because of an authentication issue
        if (event.code === 1008) {
          console.error('WebSocket connection closed due to authentication issue');
          setStatus('unauthorized');
          
          // Try to get a fresh user ID before reconnecting
          fetch('/api/user', { credentials: 'include' })
            .then(response => {
              if (response.ok) {
                return response.json();
              }
              throw new Error('Failed to refresh user authentication');
            })
            .then(userData => {
              if (userData && userData.id) {
                localStorage.setItem('userId', userData.id.toString());
                console.log('Refreshed user ID for WebSocket:', userData.id);
                
                // Reconnect after successful auth refresh
                setTimeout(() => {
                  if (document.visibilityState === 'visible') {
                    connect();
                  }
                }, 1000);
              }
            })
            .catch(err => {
              console.error('Failed to refresh authentication:', err);
            });
        } else {
          // Normal reconnection for non-auth related disconnects
          // Use exponential backoff starting with 3 seconds
          const delay = Math.min(3000 * (reconnectTimerRef.current ? 2 : 1), 30000);
          console.log(`Will attempt to reconnect in ${delay/1000} seconds`);
          
          reconnectTimerRef.current = setTimeout(() => {
            if (document.visibilityState === 'visible') {
              connect();
            }
          }, delay);
        }
      };
      
      socketRef.current = socket;
    } catch (err) {
      console.error('Error connecting to WebSocket:', err);
      setStatus('disconnected');
    }
  }, [toast]);
  
  // Disconnect from the WebSocket server
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setStatus('disconnected');
    }
  }, []);
  
  // Send a message to the WebSocket server
  const sendMessage = useCallback((message: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected. Cannot send message.');
    }
  }, []);
  
  // Connect on mount and reconnect when tab becomes visible
  useEffect(() => {
    connect();
    
    // Reconnect when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 
          socketRef.current?.readyState !== WebSocket.OPEN) {
        connect();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connect, disconnect]);
  
  return {
    status,
    messages,
    lastMessage,
    sendMessage
  };
}