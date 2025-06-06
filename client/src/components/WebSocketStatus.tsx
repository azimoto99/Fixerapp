/**
 * WebSocket Status Component - Real-time connection monitoring
 * Shows connection status and provides debugging information
 */
import React from "react";
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Clock, RefreshCw, Wifi, WifiOff, Zap } from 'lucide-react';

interface WebSocketStatusProps {
  showDetails?: boolean;
  className?: string;
}

export function WebSocketStatus({ showDetails = false, className = "" }: WebSocketStatusProps) {
  const {
    status,
    isConnected,
    lastConnected,
    reconnectAttempts,
    connectionId,
    error,
    queuedMessages,
    connectionAttempts,
    circuitBreakerOpen,
    forceReconnect,
    onlineUsers,
    typingUsers
  } = useWebSocket();

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'connecting':
      case 'reconnecting':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'disconnected':
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
      case 'reconnecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'disconnected':
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return `Reconnecting... (${reconnectAttempts})`;
      case 'error':
        return 'Connection Error';
      case 'disconnected':
      default:
        return 'Disconnected';
    }
  };

  const formatLastConnected = () => {
    if (!lastConnected) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - lastConnected.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  if (!showDetails) {
    // Compact status indicator
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span className="text-sm text-muted-foreground">
          {getStatusText()}
        </span>
        {circuitBreakerOpen && (
          <Zap className="h-3 w-3 text-orange-500" title="Circuit breaker active" />
        )}
      </div>
    );
  }

  // Detailed status card
  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {getStatusIcon()}
          WebSocket Status
          <Badge variant={isConnected ? "default" : "secondary"} className={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          Real-time connection monitoring
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Connection Info */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="font-medium">Status:</span>
            <div className="flex items-center gap-1 mt-1">
              {getStatusIcon()}
              <span>{getStatusText()}</span>
            </div>
          </div>
          
          <div>
            <span className="font-medium">Last Connected:</span>
            <div className="mt-1">{formatLastConnected()}</div>
          </div>
          
          {connectionId && (
            <div className="col-span-2">
              <span className="font-medium">Connection ID:</span>
              <div className="mt-1 font-mono text-xs bg-muted p-1 rounded">
                {connectionId.slice(-8)}...
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
            <div className="font-medium text-red-800">Error:</div>
            <div className="text-red-600 mt-1">{error}</div>
          </div>
        )}

        {/* Circuit Breaker Warning */}
        {circuitBreakerOpen && (
          <div className="p-2 bg-orange-50 border border-orange-200 rounded text-xs">
            <div className="flex items-center gap-1 font-medium text-orange-800">
              <Zap className="h-3 w-3" />
              Circuit Breaker Active
            </div>
            <div className="text-orange-600 mt-1">
              Too many connection failures. Automatic reconnection paused.
            </div>
          </div>
        )}

        {/* Connection Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-muted rounded">
            <div className="font-medium">{connectionAttempts}</div>
            <div className="text-muted-foreground">Attempts</div>
          </div>
          
          <div className="text-center p-2 bg-muted rounded">
            <div className="font-medium">{queuedMessages}</div>
            <div className="text-muted-foreground">Queued</div>
          </div>
          
          <div className="text-center p-2 bg-muted rounded">
            <div className="font-medium">{onlineUsers.length}</div>
            <div className="text-muted-foreground">Online</div>
          </div>
        </div>

        {/* Activity Indicators */}
        {typingUsers.length > 0 && (
          <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
            <div className="font-medium text-blue-800">Activity:</div>
            <div className="text-blue-600 mt-1">
              {typingUsers.length} user{typingUsers.length > 1 ? 's' : ''} typing...
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={forceReconnect}
            disabled={status === 'connecting' || status === 'reconnecting'}
            className="flex-1"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reconnect
          </Button>
          
          {isConnected && (
            <Button size="sm" variant="outline" className="flex-1">
              <Wifi className="h-3 w-3 mr-1" />
              Connected
            </Button>
          )}
        </div>

        {/* Debug Info */}
        <details className="text-xs">
          <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
            Debug Info
          </summary>
          <div className="mt-2 p-2 bg-muted rounded font-mono text-xs space-y-1">
            <div>Reconnect Attempts: {reconnectAttempts}</div>
            <div>Connection Attempts: {connectionAttempts}</div>
            <div>Queued Messages: {queuedMessages}</div>
            <div>Circuit Breaker: {circuitBreakerOpen ? 'Open' : 'Closed'}</div>
            <div>Online Users: {onlineUsers.length}</div>
            <div>Typing Users: {typingUsers.length}</div>
            {lastConnected && (
              <div>Last Connected: {lastConnected.toLocaleTimeString()}</div>
            )}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

// Compact status indicator for use in headers/navbars
export function WebSocketIndicator({ className = "" }: { className?: string }) {
  const { status, isConnected, circuitBreakerOpen } = useWebSocket();
  
  const getIndicatorColor = () => {
    if (circuitBreakerOpen) return 'bg-orange-500';
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
      case 'reconnecting':
        return 'bg-yellow-500 animate-pulse';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`} title={`WebSocket: ${status}`}>
      <div className={`w-2 h-2 rounded-full ${getIndicatorColor()}`} />
      {circuitBreakerOpen && (
        <Zap className="h-3 w-3 text-orange-500" title="Circuit breaker active" />
      )}
    </div>
  );
}

// Hook for getting connection status in other components
export function useWebSocketStatus() {
  const {
    status,
    isConnected,
    error,
    reconnectAttempts,
    connectionAttempts,
    circuitBreakerOpen
  } = useWebSocket();

  return {
    status,
    isConnected,
    error,
    reconnectAttempts,
    connectionAttempts,
    circuitBreakerOpen,
    isHealthy: isConnected && !error && !circuitBreakerOpen
  };
}