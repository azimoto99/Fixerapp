import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from './storage';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { jobs, users, applications, payments, earnings } from '@shared/schema';

interface ConnectedClient {
  ws: WebSocket;
  userId: number;
  username: string;
  lastActivity: Date;
  rooms: Set<string>;
}

interface WebSocketMessage {
  type: string;
  data?: any;
  userId?: number;
  jobId?: number;
  roomId?: string;
}

export class ConnectionManager {
  private wss!: WebSocketServer; // Using definite assignment assertion
  private clients: Map<number, ConnectedClient> = new Map();
  private rooms: Map<string, Set<number>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupHeartbeat();
  }

  public initialize(wss: WebSocketServer) {
    this.wss = wss;
    
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      console.log('New WebSocket connection from:', req.socket.remoteAddress);
      this.handleConnection(ws, req);
    });

    console.log('Connection Manager initialized with existing WebSocket server');
  }

  private handleConnection(ws: WebSocket, req: any) {
    let clientData: ConnectedClient | null = null;

    ws.on('message', async (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        await this.handleMessage(ws, message, clientData);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        this.sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      if (clientData) {
        this.handleDisconnection(clientData);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      if (clientData) {
        this.handleDisconnection(clientData);
      }
    });

    // Send welcome message
    this.sendMessage(ws, {
      type: 'connected',
      data: { message: 'Connected to Fixer real-time system' }
    });
  }

  private async handleMessage(ws: WebSocket, message: WebSocketMessage, clientData: ConnectedClient | null) {
    switch (message.type) {
      case 'authenticate':
        clientData = await this.authenticateClient(ws, message);
        break;

      case 'join_room':
        if (clientData && message.roomId) {
          this.joinRoom(clientData, message.roomId);
        }
        break;

      case 'leave_room':
        if (clientData && message.roomId) {
          this.leaveRoom(clientData, message.roomId);
        }
        break;

      case 'join_job_room':
        if (clientData && message.jobId) {
          this.joinRoom(clientData, `job-${message.jobId}`);
        }
        break;

      case 'leave_job_room':
        if (clientData && message.jobId) {
          this.leaveRoom(clientData, `job-${message.jobId}`);
        }
        break;

      case 'typing':
        if (clientData && message.jobId) {
          this.broadcastToRoom(`job-${message.jobId}`, {
            type: 'user_typing',
            data: {
              userId: clientData.userId,
              username: clientData.username,
              jobId: message.jobId
            }
          }, clientData.userId);
        }
        break;

      case 'ping':
        if (clientData) {
          clientData.lastActivity = new Date();
          this.sendMessage(ws, { type: 'pong' });
        }
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private async authenticateClient(ws: WebSocket, message: WebSocketMessage): Promise<ConnectedClient | null> {
    try {
      if (!message.userId) {
        this.sendError(ws, 'User ID required for authentication');
        return null;
      }

      // Verify user exists and is active
      const user = await storage.getUser(message.userId);
      if (!user || !user.isActive) {
        this.sendError(ws, 'Invalid user or user not active');
        return null;
      }

      // Remove existing connection for this user
      const existingClient = this.clients.get(user.id);
      if (existingClient) {
        this.handleDisconnection(existingClient);
      }

      // Create new client data
      const clientData: ConnectedClient = {
        ws,
        userId: user.id,
        username: user.username,
        lastActivity: new Date(),
        rooms: new Set()
      };

      this.clients.set(user.id, clientData);

      console.log(`User ${user.username} (${user.id}) authenticated via WebSocket`);

      // Send authentication success
      this.sendMessage(ws, {
        type: 'authenticated',
        data: {
          userId: user.id,
          username: user.username,
          message: 'Authentication successful'
        }
      });

      // Send any pending notifications
      await this.sendPendingNotifications(user.id);

      return clientData;
    } catch (error) {
      console.error('Authentication error:', error);
      this.sendError(ws, 'Authentication failed');
      return null;
    }
  }

  private handleDisconnection(clientData: ConnectedClient) {
    console.log(`User ${clientData.username} (${clientData.userId}) disconnected`);

    // Remove from all rooms
    clientData.rooms.forEach(roomId => {
      const room = this.rooms.get(roomId);
      if (room) {
        room.delete(clientData.userId);
        if (room.size === 0) {
          this.rooms.delete(roomId);
        }
      }
    });

    // Remove from clients
    this.clients.delete(clientData.userId);

    // Close WebSocket if still open
    if (clientData.ws.readyState === WebSocket.OPEN) {
      clientData.ws.close();
    }
  }

  private joinRoom(clientData: ConnectedClient, roomId: string) {
    // Add client to room
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(clientData.userId);
    clientData.rooms.add(roomId);

    console.log(`User ${clientData.username} joined room: ${roomId}`);

    // Notify client
    this.sendMessage(clientData.ws, {
      type: 'room_joined',
      data: { roomId, message: `Joined room ${roomId}` }
    });
  }

  private leaveRoom(clientData: ConnectedClient, roomId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(clientData.userId);
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }
    clientData.rooms.delete(roomId);

    console.log(`User ${clientData.username} left room: ${roomId}`);

    // Notify client
    this.sendMessage(clientData.ws, {
      type: 'room_left',
      data: { roomId, message: `Left room ${roomId}` }
    });
  }

  private sendMessage(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    }
  }

  private sendError(ws: WebSocket, error: string) {
    this.sendMessage(ws, {
      type: 'error',
      data: { error }
    });
  }

  private broadcastToRoom(roomId: string, message: WebSocketMessage, excludeUserId?: number) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.forEach(userId => {
      if (excludeUserId && userId === excludeUserId) return;

      const client = this.clients.get(userId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client.ws, message);
      }
    });
  }

  private async sendPendingNotifications(userId: number) {
    try {
      const notifications = await storage.getNotifications(userId, { isRead: false, limit: 10 });
      
      if (notifications.length > 0) {
        const client = this.clients.get(userId);
        if (client) {
          this.sendMessage(client.ws, {
            type: 'pending_notifications',
            data: { notifications, count: notifications.length }
          });
        }
      }
    } catch (error) {
      console.error('Error sending pending notifications:', error);
    }
  }

  private setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeout = 5 * 60 * 1000; // 5 minutes

      this.clients.forEach((client, userId) => {
        const timeSinceActivity = now.getTime() - client.lastActivity.getTime();
        
        if (timeSinceActivity > timeout) {
          console.log(`Disconnecting inactive user: ${client.username}`);
          this.handleDisconnection(client);
        } else {
          // Send ping to active clients
          this.sendMessage(client.ws, { type: 'ping' });
        }
      });
    }, 60000); // Check every minute
  }

  // Public methods for broadcasting events

  public broadcastJobUpdate(jobId: number, jobData: any) {
    console.log(`Broadcasting job update for job ${jobId}`);

    this.broadcastToRoom(`job-${jobId}`, {
      type: 'job_update',
      data: { jobId, ...jobData }
    });

    // For new jobs, only broadcast to map viewers for real-time pin updates
    if (jobData.status === 'open' && jobData.isNew) {
      this.broadcastToAllUsers({
        type: 'job_pin_update',
        data: {
          jobId,
          action: 'added',
          job: jobData
        }
      });
    }
  }

  public broadcastPaymentUpdate(userId: number, paymentData: any) {
    console.log(`Broadcasting payment update for user ${userId}`);
    
    const client = this.clients.get(userId);
    if (client) {
      this.sendMessage(client.ws, {
        type: 'payment_update',
        data: paymentData
      });
    }
  }

  public broadcastApplicationUpdate(jobId: number, applicationData: any) {
    console.log(`Broadcasting application update for job ${jobId}`);
    
    this.broadcastToRoom(`job-${jobId}`, {
      type: 'application_update',
      data: { jobId, ...applicationData }
    });
  }

  public broadcastNewMessage(jobId: number, messageData: any) {
    console.log(`Broadcasting new message for job ${jobId}`);
    
    this.broadcastToRoom(`job-${jobId}`, {
      type: 'new_message',
      data: { jobId, ...messageData }
    });
  }

  public broadcastNotification(userId: number, notificationData: any) {
    console.log(`Broadcasting notification to user ${userId}`);

    const client = this.clients.get(userId);
    if (client) {
      this.sendMessage(client.ws, {
        type: 'notification',
        data: notificationData
      });
    }
  }

  public broadcastJobPinUpdate(action: 'added' | 'updated' | 'removed', jobData: any) {
    console.log(`Broadcasting job pin ${action} for job ${jobData.id}`);

    this.broadcastToAllUsers({
      type: 'job_pin_update',
      data: {
        action,
        job: jobData,
        timestamp: new Date().toISOString()
      }
    });
  }

  private broadcastToAllUsers(message: WebSocketMessage) {
    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client.ws, message);
      }
    });
  }

  // Admin methods
  public getConnectionStats() {
    return {
      connectedUsers: this.clients.size,
      activeRooms: this.rooms.size,
      totalConnections: Array.from(this.clients.values()).length
    };
  }

  public disconnectUser(userId: number) {
    const client = this.clients.get(userId);
    if (client) {
      this.handleDisconnection(client);
      return true;
    }
    return false;
  }

  public broadcastSystemMessage(message: string, type: 'info' | 'warning' | 'error' = 'info') {
    this.broadcastToAllUsers({
      type: 'system_message',
      data: { message, messageType: type, timestamp: new Date() }
    });
  }

  // Cleanup
  public shutdown() {
    console.log('Shutting down Connection Manager...');
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Disconnect all clients
    this.clients.forEach(client => {
      this.handleDisconnection(client);
    });

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }

    console.log('Connection Manager shutdown complete');
  }
}

// Export singleton instance
export const connectionManager = new ConnectionManager();