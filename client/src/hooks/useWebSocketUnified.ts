/**
 * Unified WebSocket Hook - Robust client-side WebSocket management
 * Fixes disconnection/reconnection issues with smart connection handling
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './use-auth';

interface WebSocketMessage {
  type: string;
  data?: any;
  userId?: number;
  jobId?: number;
  message?: any;
  timestamp?: string;
  connectionId?: string;
  senderId?: number;
  recipientId?: number;
  content?: string;
  status?: string;
  messageId?: number;
}

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  isConnected: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
  connectionId?: string;
  error?: string;
}

interface MessageState {
  messages: any[];
  typingUsers: Set<number>;
  onlineUsers: Set<number>;
  unreadCounts: Map<number, number>;
}

export interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

export function useWebSocketUnified(options: UseWebSocketOptions = {}) {
  const { user, isLoading: authLoading } = useAuth();
  
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectInterval = 5000,
    heartbeatInterval = 30000
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    isConnected: false,
    reconnectAttempts: 0
  });

  const [messageState, setMessageState] = useState<MessageState>({
    messages: [],
    typingUsers: new Set(),
    onlineUsers: new Set(),
    unreadCounts: new Map()
  });

  // Refs for managing connection lifecycle
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);
  const mountedRef = useRef(true);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);
  const lastHeartbeatRef = useRef<number>(0);
  const connectionAttemptsRef = useRef(0);

  // Circuit breaker pattern for connection attempts
  const circuitBreakerRef = useRef({
    failures: 0,
    lastFailure: 0,
    isOpen: false,
    timeout: 60000 // 1 minute circuit breaker timeout
  });

  const resetCircuitBreaker = useCallback(() => {
    circuitBreakerRef.current = {
      failures: 0,
      lastFailure: 0,
      isOpen: false,
      timeout: 60000
    };
  }, []);

  const checkCircuitBreaker = useCallback(() => {
    const breaker = circuitBreakerRef.current;
    const now = Date.now();
    
    if (breaker.isOpen && (now - breaker.lastFailure) > breaker.timeout) {
      console.log('🔄 Circuit breaker reset - attempting reconnection');
      resetCircuitBreaker();
      return false;
    }
    
    return breaker.isOpen;
  }, [resetCircuitBreaker]);

  const recordFailure = useCallback(() => {
    const breaker = circuitBreakerRef.current;
    breaker.failures++;
    breaker.lastFailure = Date.now();
    
    if (breaker.failures >= 3) {
      breaker.isOpen = true;
      console.log('⚡ Circuit breaker opened - too many connection failures');
    }
  }, []);

  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up WebSocket connection...');
    
    // Clear timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    
    // Reset connection state
    isConnectingRef.current = false;
    
    // Close WebSocket
    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;
      
      // Remove event listeners to prevent callbacks during cleanup
      ws.onopen = null;
      ws.onclose = null;
      ws.onmessage = null;
      ws.onerror = null;
      
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, 'Client cleanup');
      }
    }
    
    if (mountedRef.current) {
      setConnectionState(prev => ({
        ...prev,
        status: 'disconnected',
        isConnected: false,
        error: undefined
      }));
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    const sendHeartbeat = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const now = Date.now();
        lastHeartbeatRef.current = now;
        
        wsRef.current.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
          clientTime: now
        }));
        
        heartbeatTimeoutRef.current = setTimeout(sendHeartbeat, heartbeatInterval);
      }
    };

    heartbeatTimeoutRef.current = setTimeout(sendHeartbeat, heartbeatInterval);
  }, [heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: Omit<WebSocketMessage, 'timestamp'>) => {
    const messageWithTimestamp = {
      ...message,
      timestamp: new Date().toISOString()
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(messageWithTimestamp));
        return true;
      } catch (error) {
        console.error('❌ Error sending WebSocket message:', error);
        return false;
      }
    } else {
      // Queue message for when connection is restored
      messageQueueRef.current.push(messageWithTimestamp);
      console.log('📦 Message queued for delivery when connected');
      return false;
    }
  }, []);

  const processMessageQueue = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && messageQueueRef.current.length > 0) {
      console.log(`📬 Processing ${messageQueueRef.current.length} queued messages`);
      
      while (messageQueueRef.current.length > 0) {
        const queuedMessage = messageQueueRef.current.shift();
        if (queuedMessage) {
          try {
            wsRef.current.send(JSON.stringify(queuedMessage));
          } catch (error) {
            console.error('❌ Error sending queued message:', error);
            // Put message back at front of queue
            messageQueueRef.current.unshift(queuedMessage);
            break;
          }
        }
      }
    }
  }, []);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (!mountedRef.current) return;

    console.log(`📨 Received WebSocket message: ${message.type}`);

    switch (message.type) {
      case 'connection_ack':
        console.log('✅ Connection acknowledged');
        setConnectionState(prev => ({
          ...prev,
          connectionId: message.connectionId
        }));
        break;

      case 'authenticated':
        console.log('🔐 Authentication successful');
        setConnectionState(prev => ({
          ...prev,
          status: 'connected',
          isConnected: true,
          lastConnected: new Date(),
          reconnectAttempts: 0,
          error: undefined,
          connectionId: message.connectionId
        }));
        
        resetCircuitBreaker();
        connectionAttemptsRef.current = 0;
        
        // Process queued messages
        processMessageQueue();
        
        // Start heartbeat
        startHeartbeat();
        
        onConnect?.();
        break;

      case 'heartbeat_ack':
        // Update last seen time
        lastHeartbeatRef.current = Date.now();
        break;

      case 'new_message':
        setMessageState(prev => ({
          ...prev,
          messages: [...prev.messages, message]
        }));
        
        // Update unread count if not from current user
        if (message.senderId && message.senderId !== user?.id) {
          setMessageState(prev => {
            const newUnreadCounts = new Map(prev.unreadCounts);
            const currentCount = newUnreadCounts.get(message.senderId!) || 0;
            newUnreadCounts.set(message.senderId!, currentCount + 1);
            return { ...prev, unreadCounts: newUnreadCounts };
          });
        }
        break;

      case 'user_typing':
        if (message.userId) {
          setMessageState(prev => ({
            ...prev,
            typingUsers: new Set([...prev.typingUsers, message.userId!])
          }));
          
          // Auto-clear typing after 5 seconds
          setTimeout(() => {
            if (mountedRef.current && message.userId) {
              setMessageState(prev => {
                const newTypingUsers = new Set(prev.typingUsers);
                newTypingUsers.delete(message.userId!);
                return { ...prev, typingUsers: newTypingUsers };
              });
            }
          }, 5000);
        }
        break;

      case 'user_stopped_typing':
        if (message.userId) {
          setMessageState(prev => {
            const newTypingUsers = new Set(prev.typingUsers);
            newTypingUsers.delete(message.userId!);
            return { ...prev, typingUsers: newTypingUsers };
          });
        }
        break;

      case 'user_status_change':
        if (message.userId) {
          setMessageState(prev => {
            const newOnlineUsers = new Set(prev.onlineUsers);
            if (message.status === 'online') {
              newOnlineUsers.add(message.userId!);
            } else {
              newOnlineUsers.delete(message.userId!);
            }
            return { ...prev, onlineUsers: newOnlineUsers };
          });
        }
        break;

      case 'error':
        console.error('❌ WebSocket error from server:', message.message);
        setConnectionState(prev => ({
          ...prev,
          error: message.message
        }));
        onError?.(message.message);
        break;

      default:
        console.log(`📨 Unknown message type: ${message.type}`);
    }

    // Call custom message handler
    onMessage?.(message);
  }, [user?.id, onMessage, onConnect, onError, processMessageQueue, startHeartbeat, resetCircuitBreaker]);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (!user || authLoading || isConnectingRef.current || !mountedRef.current) {
      return;
    }

    // Check circuit breaker
    if (checkCircuitBreaker()) {
      console.log('⚡ Circuit breaker is open - skipping connection attempt');
      return;
    }

    // Don't connect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Check if we've exceeded max attempts
    if (connectionAttemptsRef.current >= maxReconnectAttempts) {
      console.log(`❌ Max reconnection attempts (${maxReconnectAttempts}) exceeded`);
      setConnectionState(prev => ({
        ...prev,
        status: 'error',
        error: 'Max reconnection attempts exceeded'
      }));
      return;
    }

    try {
      isConnectingRef.current = true;
      connectionAttemptsRef.current++;
      
      setConnectionState(prev => ({
        ...prev,
        status: prev.reconnectAttempts > 0 ? 'reconnecting' : 'connecting',
        isConnected: false,
        error: undefined
      }));
      
      // Determine WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;
      
      console.log(`🔌 Connecting to WebSocket: ${wsUrl} (attempt ${connectionAttemptsRef.current})`);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.log('⏰ Connection timeout');
          ws.close();
        }
      }, 10000); // 10 second timeout

      ws.onopen = () => {
        if (!mountedRef.current) return;
        
        clearTimeout(connectionTimeout);
        isConnectingRef.current = false;
        
        console.log('✅ WebSocket connected successfully');
        
        // Authenticate with the server
        try {
          ws.send(JSON.stringify({
            type: 'authenticate',
            userId: user.id,
            username: user.username,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.error('❌ Error sending auth message:', error);
        }
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        
        clearTimeout(connectionTimeout);
        isConnectingRef.current = false;
        
        console.log(`🔌 WebSocket disconnected: ${event.code} - ${event.reason}`);
        
        setConnectionState(prev => ({
          ...prev,
          status: 'disconnected',
          isConnected: false,
          reconnectAttempts: prev.reconnectAttempts + 1
        }));
        
        stopHeartbeat();
        onDisconnect?.();
        
        // Auto-reconnect for unexpected closures
        const shouldReconnect = autoReconnect && 
                               event.code !== 1000 && // Not a normal closure
                               event.code !== 1001 && // Not going away
                               connectionAttemptsRef.current < maxReconnectAttempts &&
                               user && !authLoading &&
                               !checkCircuitBreaker();
        
        if (shouldReconnect) {
          const delay = Math.min(reconnectInterval * Math.pow(2, connectionAttemptsRef.current - 1), 30000);
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${connectionAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current && user && !authLoading) {
              connect();
            }
          }, delay);
        } else {
          if (connectionAttemptsRef.current >= maxReconnectAttempts) {
            recordFailure();
            setConnectionState(prev => ({
              ...prev,
              status: 'error',
              error: 'Max reconnection attempts exceeded'
            }));
          }
        }
      };

      ws.onerror = (error) => {
        if (!mountedRef.current) return;
        
        clearTimeout(connectionTimeout);
        isConnectingRef.current = false;
        
        console.error('❌ WebSocket connection error:', error);
        
        recordFailure();
        
        setConnectionState(prev => ({
          ...prev,
          status: 'error',
          error: 'Connection error occurred'
        }));
        
        onError?.('Connection error occurred');
      };

    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error);
      isConnectingRef.current = false;
      recordFailure();
      
      if (mountedRef.current) {
        setConnectionState(prev => ({
          ...prev,
          status: 'error',
          error: 'Failed to create connection'
        }));
      }
    }
  }, [
    user, 
    authLoading, 
    autoReconnect, 
    maxReconnectAttempts, 
    reconnectInterval, 
    handleMessage, 
    onDisconnect, 
    onError, 
    stopHeartbeat,
    checkCircuitBreaker,
    recordFailure
  ]);

  const disconnect = useCallback(() => {
    console.log('🔌 Manually disconnecting WebSocket...');
    cleanup();
    onDisconnect?.();
  }, [cleanup, onDisconnect]);

  // Auto-connect when user becomes available
  useEffect(() => {
    if (user && user.id && !authLoading && !connectionState.isConnected && !isConnectingRef.current) {
      console.log('👤 User authenticated, initiating WebSocket connection...', {
        userId: user.id,
        isConnected: connectionState.isConnected,
        isConnecting: isConnectingRef.current
      });
      connect();
    }
  }, [user?.id, authLoading, connectionState.isConnected, connect]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      console.log('🧹 Component unmounting, cleaning up WebSocket...');
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Helper functions for common actions
  const joinRoom = useCallback((jobId: number) => {
    return sendMessage({
      type: 'join_room',
      jobId,
      userId: user?.id
    });
  }, [sendMessage, user?.id]);

  const leaveRoom = useCallback((jobId: number) => {
    return sendMessage({
      type: 'leave_room',
      jobId,
      userId: user?.id
    });
  }, [sendMessage, user?.id]);

  const sendChatMessage = useCallback((content: string, recipientId: number, jobId?: number) => {
    return sendMessage({
      type: 'send_message',
      content,
      recipientId,
      jobId,
      userId: user?.id
    });
  }, [sendMessage, user?.id]);

  const startTyping = useCallback((recipientId: number, jobId?: number) => {
    return sendMessage({
      type: 'typing',
      recipientId,
      jobId,
      userId: user?.id
    });
  }, [sendMessage, user?.id]);

  const stopTyping = useCallback((recipientId: number, jobId?: number) => {
    return sendMessage({
      type: 'stop_typing',
      recipientId,
      jobId,
      userId: user?.id
    });
  }, [sendMessage, user?.id]);

  const markMessageAsRead = useCallback((messageId: number) => {
    return sendMessage({
      type: 'mark_read',
      messageId,
      userId: user?.id
    });
  }, [sendMessage, user?.id]);

  const forceReconnect = useCallback(() => {
    console.log('🔄 Forcing WebSocket reconnection...');
    connectionAttemptsRef.current = 0;
    resetCircuitBreaker();
    cleanup();
    setTimeout(() => {
      if (mountedRef.current) {
        connect();
      }
    }, 1000);
  }, [cleanup, connect, resetCircuitBreaker]);

  return {
    // Connection state
    ...connectionState,
    
    // Message state
    messages: messageState.messages,
    typingUsers: Array.from(messageState.typingUsers),
    onlineUsers: Array.from(messageState.onlineUsers),
    unreadCounts: messageState.unreadCounts,
    
    // Actions
    connect,
    disconnect,
    forceReconnect,
    sendMessage: sendChatMessage,
    joinRoom,
    leaveRoom,
    startTyping,
    stopTyping,
    markMessageAsRead,
    
    // Raw message sending for advanced use cases
    sendRawMessage: sendMessage,
    
    // Stats
    queuedMessages: messageQueueRef.current.length,
    connectionAttempts: connectionAttemptsRef.current,
    circuitBreakerOpen: circuitBreakerRef.current.isOpen
  };
}