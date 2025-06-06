import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from './storage';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  isAlive?: boolean;
}

const connectedClients = new Map<number, AuthenticatedWebSocket>();
const messageRooms = new Map<string, Set<AuthenticatedWebSocket>>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server, 
    path: '/ws'
  });

  console.log('WebSocket server initialized');

  wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
    console.log('New WebSocket connection established');
    
    ws.isAlive = true;
    
    // Heartbeat to detect broken connections
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'authenticate':
            await handleAuthentication(ws, message);
            break;
            
          case 'join_job_room':
            handleJoinJobRoom(ws, message);
            break;
            
          case 'leave_job_room':
            handleLeaveJobRoom(ws, message);
            break;
            
          case 'typing':
            handleTyping(ws, message);
            break;
            
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
            
          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      handleDisconnection(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      handleDisconnection(ws);
    });
  });

  // Heartbeat interval to detect broken connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (!ws.isAlive) {
        console.log('Terminating dead connection');
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // 30 seconds

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
}

async function handleAuthentication(ws: AuthenticatedWebSocket, message: any) {
  try {
    const { userId, sessionId } = message;
    
    if (!userId) {
      ws.send(JSON.stringify({
        type: 'auth_error',
        message: 'User ID required'
      }));
      return;
    }

    // Verify user exists and is active
    const user = await storage.getUser(userId);
    if (!user || !user.isActive) {
      ws.send(JSON.stringify({
        type: 'auth_error',
        message: 'Invalid user or account inactive'
      }));
      return;
    }

    // Store authenticated connection
    ws.userId = userId;
    connectedClients.set(userId, ws);
    
    console.log(`User ${userId} authenticated via WebSocket`);
    
    ws.send(JSON.stringify({
      type: 'authenticated',
      userId: userId
    }));
    
    // Send any pending notifications
    const notifications = await storage.getNotifications(userId, { isRead: false, limit: 10 });
    if (notifications.length > 0) {
      ws.send(JSON.stringify({
        type: 'pending_notifications',
        notifications
      }));
    }
    
  } catch (error) {
    console.error('Authentication error:', error);
    ws.send(JSON.stringify({
      type: 'auth_error',
      message: 'Authentication failed'
    }));
  }
}

function handleJoinJobRoom(ws: AuthenticatedWebSocket, message: any) {
  const { jobId } = message;
  
  if (!jobId || !ws.userId) {
    return;
  }
  
  const roomKey = `job-${jobId}`;
  if (!messageRooms.has(roomKey)) {
    messageRooms.set(roomKey, new Set());
  }
  
  messageRooms.get(roomKey)!.add(ws);
  console.log(`User ${ws.userId} joined job room: ${roomKey}`);
  
  ws.send(JSON.stringify({
    type: 'joined_room',
    roomKey
  }));
}

function handleLeaveJobRoom(ws: AuthenticatedWebSocket, message: any) {
  const { jobId } = message;
  
  if (!jobId) {
    return;
  }
  
  const roomKey = `job-${jobId}`;
  const room = messageRooms.get(roomKey);
  if (room) {
    room.delete(ws);
    if (room.size === 0) {
      messageRooms.delete(roomKey);
    }
  }
  
  console.log(`User ${ws.userId} left job room: ${roomKey}`);
}

function handleTyping(ws: AuthenticatedWebSocket, message: any) {
  const { jobId } = message;
  
  if (!jobId || !ws.userId) {
    return;
  }
  
  const roomKey = `job-${jobId}`;
  const room = messageRooms.get(roomKey);
  if (room) {
    room.forEach(socket => {
      if (socket !== ws && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'user_typing',
          userId: ws.userId,
          jobId
        }));
      }
    });
  }
}

function handleDisconnection(ws: AuthenticatedWebSocket) {
  if (ws.userId) {
    connectedClients.delete(ws.userId);
    console.log(`User ${ws.userId} disconnected`);
  }
  
  // Remove from all rooms
  messageRooms.forEach((room, roomKey) => {
    room.delete(ws);
    if (room.size === 0) {
      messageRooms.delete(roomKey);
    }
  });
}

// Utility functions for sending messages
export function sendToUser(userId: number, message: any) {
  const ws = connectedClients.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
    return true;
  }
  return false;
}

export function sendToJobRoom(jobId: number, message: any, excludeUserId?: number) {
  const roomKey = `job-${jobId}`;
  const room = messageRooms.get(roomKey);
  if (room) {
    room.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN && ws.userId !== excludeUserId) {
        ws.send(JSON.stringify(message));
      }
    });
  }
}

export function broadcastToAll(message: any) {
  connectedClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

export { connectedClients, messageRooms };