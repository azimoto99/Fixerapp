import { useEffect, useState } from 'react';

/**
 * Simple WebSocket test hook to debug connection issues
 * Use this temporarily to test if the WebSocket server is working
 */
export function useWebSocketTest() {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<string>('');

  useEffect(() => {
    console.log('WebSocket Test: Starting connection test...');
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    
    console.log('WebSocket Test: Connecting to:', wsUrl);
    setStatus('connecting');
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket Test: Connected successfully');
      setStatus('connected');
      setLastMessage('Connected successfully');
      
      // Send a test message
      ws.send(JSON.stringify({
        type: 'test',
        message: 'Hello from test client'
      }));
    };
    
    ws.onmessage = (event) => {
      console.log('WebSocket Test: Message received:', event.data);
      setLastMessage(`Received: ${event.data}`);
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket Test: Connection closed:', event.code, event.reason);
      setStatus('disconnected');
      setLastMessage(`Disconnected: ${event.code} - ${event.reason}`);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket Test: Error:', error);
      setStatus('error');
      setLastMessage('Connection error occurred');
    };
    
    // Cleanup
    return () => {
      console.log('WebSocket Test: Cleaning up...');
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, []);

  return { status, lastMessage };
}