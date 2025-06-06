/**
 * Enterprise-grade WebSocket Hook for Real-time Messaging
 * Provides reliable connection management, message delivery, and real-time features
 * Fixed version with proper TypeScript types and error handling
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

interface WebSocketMessage {
  type: string;
  userId?: number;
  jobId?: number;
  messageId?: number;
  content?: string;
  recipientId?: number;
  timestamp?: string;
  connectionId?: string;
  senderId?: number;
  status?: string;
  members?: number[];
  message?: string;
  [key: string]: any;
}

interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
  connectionId?: string;
}

interface MessageState {
  messages: any[];
  typingUsers: Set<number>;
  onlineUsers: Set<number>;
  unreadCounts: Map<number, number>;
}

export function useWebSocket(userId?: number) {
  // Helper function to calculate reconnect delay with jitter
  const calculateReconnectDelay = (attempt: number) => {
    const baseDelay = Math.min(1000 * Math.pow(1.5, attempt), 15000); // Max 15s, gentler backoff
    const jitter = Math.random() * 1000; // Add up to 1s jitter
    return Math.floor(baseDelay + jitter);
  };

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0
  });

  const [messageState, setMessageState] = useState<MessageState>({
    messages: [],
    typingUsers: new Set(),
    onlineUsers: new Set(),
    unreadCounts: new Map()
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const messageQueueRef = useRef<WebSocketMessage[]>([]);

  // Auto-connect when user is available
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
    enabled: !!userId
  });

  const connect = useCallback(() => {
    if (!userId || connectionState.isConnecting || connectionState.isConnected) {
      return;
    }

    setConnectionState(prev => ({ ...prev, isConnecting: true }));

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        
        setConnectionState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          lastConnected: new Date(),
          reconnectAttempts: 0
        }));

        // Authenticate user immediately
        ws.send(JSON.stringify({
          type: 'authenticate',
          userId,
          timestamp: new Date().toISOString()
        }));

        // Send queued messages
        while (messageQueueRef.current.length > 0) {
          const queuedMessage = messageQueueRef.current.shift();
          if (queuedMessage) {
            ws.send(JSON.stringify(queuedMessage));
          }
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        const closeMessage = `🔌 WebSocket closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}, Clean: ${event.wasClean ? 'Yes' : 'No'}`;
        console.log(closeMessage);
        
        setConnectionState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false
        }));

        // Clean up the WebSocket reference
        if (wsRef.current === ws) {
          wsRef.current = null;
        }

        // Only attempt to reconnect if this wasn't a normal closure
        if (event.code !== 1000) {
          console.log(`🔄 Will attempt to reconnect in ${calculateReconnectDelay(connectionState.reconnectAttempts)}ms`);
          scheduleReconnect();
        } else {
          console.log('ℹ️ Normal WebSocket closure, not reconnecting');
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        
        setConnectionState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false
        }));
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setConnectionState(prev => ({
        ...prev,
        isConnecting: false
      }));
      scheduleReconnect();
    }
  }, [userId, connectionState.isConnecting, connectionState.isConnected]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    setConnectionState({
      isConnected: false,
      isConnecting: false,
      reconnectAttempts: 0
    });
  }, []);

  const scheduleReconnect = useCallback(() => {
    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    setConnectionState(prev => {
      // Don't exceed max reconnection attempts
      if (prev.reconnectAttempts >= 15) {
        console.error('❌ Max reconnection attempts reached. Please refresh the page to try again.');
        return prev;
      }

      const attempts = prev.reconnectAttempts + 1;
      const delay = calculateReconnectDelay(attempts);
      
      console.log(`🔄 Scheduling reconnect attempt ${attempts} in ${delay}ms`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log(`🔄 Attempting to reconnect (attempt ${attempts})...`);
        
        // Check if we should still reconnect (user might have navigated away)
        if (document.visibilityState === 'visible') {
          connect();
        } else {
          console.log('📱 Page not visible, skipping reconnection attempt');
          // Reschedule for when page becomes visible
          const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
              document.removeEventListener('visibilitychange', handleVisibilityChange);
              connect();
            }
          };
          document.addEventListener('visibilitychange', handleVisibilityChange);
        }
      }, delay);

      return { ...prev, reconnectAttempts: attempts };
    });
  }, [connect]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    console.log('📨 Received WebSocket message:', message.type);

    switch (message.type) {
      case 'connection_ack':
        console.log('✅ Connection acknowledged');
        break;

      case 'authenticated':
        console.log('🔐 Authentication successful');
        setConnectionState(prev => ({ 
          ...prev, 
          connectionId: message.connectionId 
        }));
        break;

      case 'new_message':
        setMessageState(prev => ({
          ...prev,
          messages: [...prev.messages, message]
        }));
        
        // Update unread count if not from current user
        if (message.senderId && message.senderId !== userId) {
          setMessageState(prev => {
            const newUnreadCounts = new Map(prev.unreadCounts);
            const currentCount = newUnreadCounts.get(message.senderId!) || 0;
            newUnreadCounts.set(message.senderId!, currentCount + 1);
            return { ...prev, unreadCounts: newUnreadCounts };
          });
        }
        break;

      case 'message_sent':
      case 'message_delivered':
      case 'message_read':
        // Update message status
        setMessageState(prev => ({
          ...prev,
          messages: prev.messages.map(msg => 
            msg.messageId === message.messageId 
              ? { ...msg, status: message.type.replace('message_', '') }
              : msg
          )
        }));
        break;

      case 'user_typing':
        if (message.userId && typeof message.userId === 'number') {
          setMessageState(prev => {
            const newTypingUsers = new Set(prev.typingUsers);
            newTypingUsers.add(message.userId!);
            return { ...prev, typingUsers: newTypingUsers };
          });
          
          // Auto-clear typing after 3 seconds
          setTimeout(() => {
            setMessageState(prev => {
              const newTypingUsers = new Set(prev.typingUsers);
              if (message.userId) {
                newTypingUsers.delete(message.userId);
              }
              return { ...prev, typingUsers: newTypingUsers };
            });
          }, 3000);
        }
        break;

      case 'user_stopped_typing':
        if (message.userId && typeof message.userId === 'number') {
          setMessageState(prev => {
            const newTypingUsers = new Set(prev.typingUsers);
            newTypingUsers.delete(message.userId!);
            return { ...prev, typingUsers: newTypingUsers };
          });
        }
        break;

      case 'user_status_change':
        if (message.userId && typeof message.userId === 'number') {
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

      case 'room_joined':
        console.log(`🏠 Joined room ${message.jobId} with ${message.members?.length || 0} members`);
        break;

      case 'user_joined_room':
      case 'user_left_room':
        console.log(`👥 User ${message.userId || 'unknown'} ${message.type.includes('joined') ? 'joined' : 'left'} room ${message.jobId || 'unknown'}`);
        break;

      case 'error':
        console.error('❌ WebSocket error:', message.message);
        break;

      case 'ping':
        // Send pong response
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
        }
        break;

      case 'pong':
        // Server responded to our ping
        console.log('🏓 Received pong from server');
        break;

      default:
        console.log('📨 Unknown message type:', message.type);
    }
  }, [userId]);

  // WebSocket actions
  const sendMessage = useCallback((message: Omit<WebSocketMessage, 'timestamp'>) => {
    const messageWithTimestamp: WebSocketMessage = {
      ...message,
      timestamp: new Date().toISOString()
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(messageWithTimestamp));
    } else {
      // Queue message for when connection is restored
      messageQueueRef.current.push(messageWithTimestamp);
      console.log('📦 Message queued for delivery when connected');
    }
  }, []);

  const joinRoom = useCallback((jobId: number) => {
    sendMessage({
      type: 'join_room',
      jobId,
      userId
    });
  }, [sendMessage, userId]);

  const leaveRoom = useCallback((jobId: number) => {
    sendMessage({
      type: 'leave_room',
      jobId,
      userId
    });
  }, [sendMessage, userId]);

  const sendChatMessage = useCallback((content: string, recipientId: number, jobId?: number) => {
    sendMessage({
      type: 'send_message',
      content,
      recipientId,
      jobId,
      userId
    });
  }, [sendMessage, userId]);

  const startTyping = useCallback((recipientId: number, jobId?: number) => {
    sendMessage({
      type: 'typing',
      recipientId,
      jobId,
      userId
    });
  }, [sendMessage, userId]);

  const stopTyping = useCallback((recipientId: number, jobId?: number) => {
    sendMessage({
      type: 'stop_typing',
      recipientId,
      jobId,
      userId
    });
  }, [sendMessage, userId]);

  const markMessageAsRead = useCallback((messageId: number) => {
    sendMessage({
      type: 'mark_read',
      messageId,
      userId
    });
  }, [sendMessage, userId]);

  // Auto-connect when user becomes available
  useEffect(() => {
    if (userId && !connectionState.isConnected && !connectionState.isConnecting) {
      connect();
    }
  }, [userId, connectionState.isConnected, connectionState.isConnecting, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // Connection state
    isConnected: connectionState.isConnected,
    isConnecting: connectionState.isConnecting,
    reconnectAttempts: connectionState.reconnectAttempts,
    lastConnected: connectionState.lastConnected,
    
    // Message state
    messages: messageState.messages,
    typingUsers: Array.from(messageState.typingUsers),
    onlineUsers: Array.from(messageState.onlineUsers),
    unreadCounts: messageState.unreadCounts,
    
    // Actions
    connect,
    disconnect,
    sendMessage: sendChatMessage,
    joinRoom,
    leaveRoom,
    startTyping,
    stopTyping,
    markMessageAsRead,
    
    // Raw WebSocket access for advanced use cases
    sendRawMessage: sendMessage
  };
}
