/**
 * WebSocket Context Provider - Singleton WebSocket connection
 * Prevents multiple WebSocket connections from being created
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface WebSocketContextType {
  // Connection state
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectAttempt: number;
  
  // User state
  onlineUsers: number[];
  
  // Raw WebSocket methods
  sendRawMessage: (message: any) => boolean;
  
  // Statistics
  queuedMessages: number;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: React.ReactNode;
  onMessage?: (message: any) => void;
}

export function WebSocketProvider({ 
  children, 
  onMessage 
}: WebSocketProviderProps) {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  
  // User state
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  
  // Statistics
  const [queuedMessages, setQueuedMessages] = useState(0);
  
  // Dependencies
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleMessage = useCallback((message: any) => {
    console.log('WebSocket Context - Message received:', message);
    
    switch (message.type) {
      case 'user_online':
        setOnlineUsers(prev => [...new Set([...prev, message.userId])]);
        break;
        
      case 'user_offline':
        setOnlineUsers(prev => prev.filter(id => id !== message.userId));
        break;
        
      case 'notification':
        if (message.data.userId === user?.id) {
          toast({
            title: message.data.title,
            description: message.data.message,
          });
        }
        break;
        
      case 'new_application':
        if (message.posterId === user?.id) {
          toast({
            title: "New Job Application",
            description: `${message.workerName} just applied for your job!`,
          });
        }
        
        queryClient.invalidateQueries({ queryKey: [`/api/applications/job/${message.jobId}`] });
        break;
        
      case 'application_status_update':
        if (message.workerId === user?.id) {
          const status = message.status === 'accepted' ? 'accepted' : 'rejected';
          toast({
            title: `Application ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            description: `Your application for "${message.jobTitle}" has been ${status}.`,
            variant: status === 'accepted' ? 'default' : 'destructive',
          });
        }
        break;
        
      case 'job_pin_update':
        console.log('📍 Job pin update:', message.data);
        
        queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
        queryClient.invalidateQueries({ queryKey: ['/api/jobs/nearby'] });
        
        // Emit custom event for map updates
        window.dispatchEvent(new CustomEvent('job-pin-update', {
          detail: {
            action: message.data.action,
            job: message.data.job
          }
        }));
        break;
        
      default:
        console.log('Unhandled message type:', message.type);
        break;
    }
    
    onMessage?.(message);
  }, [queryClient, onMessage, user, toast]);
  
  const connect = useCallback(() => {
    if (!user) return;
    
    if (wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    
    setConnectionStatus('connecting');
    
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        setReconnectAttempt(0);
        setQueuedMessages(0);
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect if it wasn't a clean close
        if (event.code !== 1000 && user) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempt(prev => prev + 1);
            connect();
          }, delay);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, [user, reconnectAttempt, handleMessage]);
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setReconnectAttempt(0);
  }, []);
  
  const sendRawMessage = useCallback((message: any): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        setQueuedMessages(prev => prev + 1);
        return false;
      }
    } else {
      setQueuedMessages(prev => prev + 1);
      return false;
    }
  }, []);
  
  // Connect when user is available
  useEffect(() => {
    if (user) {
      connect();
    } else {
      disconnect();
    }
    
    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);
  
  const contextValue: WebSocketContextType = {
    isConnected,
    connectionStatus,
    reconnectAttempt,
    onlineUsers,
    sendRawMessage,
    queuedMessages,
  };
  
  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
