import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useQueryClient } from '@tanstack/react-query';

interface WebSocketMessage {
  type: string;
  data?: any;
  userId?: number;
  jobId?: number;
  message?: any;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocketClient(options: UseWebSocketOptions = {}) {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;
  const isConnectingRef = useRef(false);
  const mountedRef = useRef(true);

  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectInterval = 5000
  } = options;

  const disconnect = useCallback(() => {
    console.log('WebSocket: Disconnecting...');
    
    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    isConnectingRef.current = false;
    
    if (wsRef.current) {
      // Remove event listeners to prevent callbacks during cleanup
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close(1000, 'User disconnected');
      }
      wsRef.current = null;
    }
    
    if (mountedRef.current) {
      setIsConnected(false);
      setConnectionStatus('disconnected');
    }
  }, []);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (!user || authLoading || isConnectingRef.current || !mountedRef.current) {
      return;
    }

    // Don't connect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      isConnectingRef.current = true;
      setConnectionStatus('connecting');
      
      // Determine WebSocket URL based on current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;
      
      console.log('WebSocket: Connecting to:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        
        console.log('WebSocket: Connected successfully');
        isConnectingRef.current = false;
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        
        // Authenticate with the server
        try {
          ws.send(JSON.stringify({
            type: 'authenticate',
            userId: user.id,
            username: user.username
          }));
        } catch (error) {
          console.error('WebSocket: Error sending auth message:', error);
        }
        
        onConnect?.();
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Only log important messages to reduce noise
          if (message.type !== 'ping' && message.type !== 'pong') {
            console.log('WebSocket: Message received:', message.type);
          }
          
          // Handle different message types
          switch (message.type) {
            case 'new_message':
              queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
              break;
            case 'job_update':
              queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
              break;
            case 'notification':
              queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
              break;
            case 'application_update':
              queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
              break;
            case 'payment_update':
              queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
              queryClient.invalidateQueries({ queryKey: ['/api/earnings'] });
              break;
            case 'pong':
              // Handle pong response
              break;
          }
          
          onMessage?.(message);
        } catch (error) {
          console.error('WebSocket: Error parsing message:', error);
        }
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        
        console.log('WebSocket: Disconnected. Code:', event.code, 'Reason:', event.reason);
        isConnectingRef.current = false;
        setIsConnected(false);
        setConnectionStatus('disconnected');
        wsRef.current = null;
        
        onDisconnect?.();
        
        // Only auto-reconnect for unexpected closures and if we haven't exceeded max attempts
        const shouldReconnect = autoReconnect && 
                               event.code !== 1000 && // Not a normal closure
                               event.code !== 1001 && // Not going away
                               reconnectAttemptsRef.current < maxReconnectAttempts &&
                               user && !authLoading;
        
        if (shouldReconnect) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
          console.log(`WebSocket: Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current && user && !authLoading) {
              connect();
            }
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.log('WebSocket: Max reconnection attempts reached');
          setConnectionStatus('error');
        }
      };

      ws.onerror = (error) => {
        if (!mountedRef.current) return;
        
        console.error('WebSocket: Connection error:', error);
        isConnectingRef.current = false;
        setConnectionStatus('error');
        onError?.(error);
      };

    } catch (error) {
      console.error('WebSocket: Error creating connection:', error);
      isConnectingRef.current = false;
      if (mountedRef.current) {
        setConnectionStatus('error');
      }
    }
  }, [user, authLoading, onConnect, onDisconnect, onError, onMessage, autoReconnect, reconnectInterval, queryClient]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('WebSocket: Error sending message:', error);
        return false;
      }
    } else {
      console.warn('WebSocket: Cannot send message, not connected');
      return false;
    }
  }, []);

  // Join a job room for real-time updates
  const joinJobRoom = useCallback((jobId: number) => {
    return sendMessage({
      type: 'join_job_room',
      jobId,
      userId: user?.id
    });
  }, [sendMessage, user?.id]);

  // Leave a job room
  const leaveJobRoom = useCallback((jobId: number) => {
    return sendMessage({
      type: 'leave_job_room',
      jobId,
      userId: user?.id
    });
  }, [sendMessage, user?.id]);

  // Send typing indicator
  const sendTyping = useCallback((jobId: number) => {
    return sendMessage({
      type: 'typing',
      jobId,
      userId: user?.id
    });
  }, [sendMessage, user?.id]);

  // Main connection effect - only runs when user auth state changes
  useEffect(() => {
    // Don't connect if auth is still loading
    if (authLoading) {
      return;
    }

    if (user && user.id) {
      console.log('WebSocket: User authenticated, connecting...');
      connect();
    } else {
      console.log('WebSocket: No user, disconnecting...');
      disconnect();
    }

    // Cleanup function
    return () => {
      disconnect();
    };
  }, [user?.id, authLoading]); // Only depend on user ID and auth loading state

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      console.log('WebSocket: Component unmounting, cleaning up...');
      mountedRef.current = false;
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    sendMessage,
    joinJobRoom,
    leaveJobRoom,
    sendTyping
  };
}