/**
 * WebSocket Service - Robust real-time messaging implementation
 * Handles connection management, message delivery, and real-time features
 */
import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { storage } from './storage';

interface ConnectedUser {
  socket: WebSocket;
  userId: number;
  lastSeen: Date;
  isTyping: boolean;
  currentJobRoom?: number;
}

interface MessagePayload {
  type: 'authenticate' | 'join_room' | 'leave_room' | 'send_message' | 'typing' | 'stop_typing' | 'mark_read';
  userId?: number;
  jobId?: number;
  messageId?: number;
  content?: string;
  recipientId?: number;
  timestamp?: string;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private connectedUsers = new Map<number, ConnectedUser>();
  private jobRooms = new Map<number, Set<number>>(); // jobId -> Set of userIds
  private heartbeatInterval: NodeJS.Timeout;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      perMessageDeflate: true,
      maxPayload: 1024 * 1024 // 1MB max message size
    });

    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (socket: WebSocket, request) => {
      console.log('New WebSocket connection established');
      
      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (socket.readyState === WebSocket.OPEN) {
          console.log('WebSocket connection timeout - no authentication received');
          socket.close(1008, 'Authentication timeout');
        }
      }, 30000); // 30 second timeout

      socket.on('message', async (data: Buffer) => {
        try {
          const message: MessagePayload = JSON.parse(data.toString());
          await this.handleMessage(socket, message, connectionTimeout);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          this.sendError(socket, 'Invalid message format');
        }
      });

      socket.on('close', (code, reason) => {
        clearTimeout(connectionTimeout);
        this.handleDisconnection(socket);
        console.log(`WebSocket connection closed: ${code} - ${reason}`);
      });

      socket.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnection(socket);
      });

      // Send connection acknowledgment
      this.sendMessage(socket, {
        type: 'connection_ack',
        timestamp: new Date().toISOString()
      });
    });
  }

  private async handleMessage(socket: WebSocket, message: MessagePayload, connectionTimeout?: NodeJS.Timeout) {
    switch (message.type) {
      case 'authenticate':
        await this.handleAuthentication(socket, message, connectionTimeout);
        break;
        
      case 'join_room':
        await this.handleJoinRoom(socket, message);
        break;
        
      case 'leave_room':
        await this.handleLeaveRoom(socket, message);
        break;
        
      case 'send_message':
        await this.handleSendMessage(socket, message);
        break;
        
      case 'typing':
        await this.handleTyping(socket, message, true);
        break;
        
      case 'stop_typing':
        await this.handleTyping(socket, message, false);
        break;
        
      case 'mark_read':
        await this.handleMarkRead(socket, message);
        break;
        
      default:
        this.sendError(socket, 'Unknown message type');
    }
  }

  private async handleAuthentication(socket: WebSocket, message: MessagePayload, connectionTimeout?: NodeJS.Timeout) {
    if (!message.userId) {
      this.sendError(socket, 'User ID required for authentication');
      return;
    }

    const userId = message.userId;
    
    // Clear authentication timeout
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
    }

    // Remove any existing connection for this user
    const existingConnection = this.connectedUsers.get(userId);
    if (existingConnection && existingConnection.socket.readyState === WebSocket.OPEN) {
      existingConnection.socket.close(1000, 'New connection established');
    }

    // Store new connection
    this.connectedUsers.set(userId, {
      socket,
      userId,
      lastSeen: new Date(),
      isTyping: false
    });

    console.log(`User ${userId} authenticated via WebSocket`);

    // Send authentication success
    this.sendMessage(socket, {
      type: 'authenticated',
      userId,
      timestamp: new Date().toISOString()
    });

    // Send online status to contacts
    await this.broadcastUserStatus(userId, 'online');

    // Send any pending messages
    await this.deliverPendingMessages(userId);
  }

  private async handleJoinRoom(socket: WebSocket, message: MessagePayload) {
    const userConnection = this.getUserFromSocket(socket);
    if (!userConnection || !message.jobId) return;

    const { userId } = userConnection;
    const jobId = message.jobId;

    // Add user to job room
    if (!this.jobRooms.has(jobId)) {
      this.jobRooms.set(jobId, new Set());
    }
    this.jobRooms.get(jobId)!.add(userId);
    
    // Update user's current room
    userConnection.currentJobRoom = jobId;

    console.log(`User ${userId} joined job room ${jobId}`);

    // Notify other room members
    this.broadcastToRoom(jobId, {
      type: 'user_joined_room',
      userId,
      jobId,
      timestamp: new Date().toISOString()
    }, userId);

    // Send room info to user
    this.sendMessage(socket, {
      type: 'room_joined',
      jobId,
      members: Array.from(this.jobRooms.get(jobId) || []),
      timestamp: new Date().toISOString()
    });
  }

  private async handleLeaveRoom(socket: WebSocket, message: MessagePayload) {
    const userConnection = this.getUserFromSocket(socket);
    if (!userConnection || !message.jobId) return;

    const { userId } = userConnection;
    const jobId = message.jobId;

    // Remove user from room
    const room = this.jobRooms.get(jobId);
    if (room) {
      room.delete(userId);
      if (room.size === 0) {
        this.jobRooms.delete(jobId);
      }
    }

    // Clear user's current room
    userConnection.currentJobRoom = undefined;

    console.log(`User ${userId} left job room ${jobId}`);

    // Notify other room members
    this.broadcastToRoom(jobId, {
      type: 'user_left_room',
      userId,
      jobId,
      timestamp: new Date().toISOString()
    }, userId);
  }

  private async handleSendMessage(socket: WebSocket, message: MessagePayload) {
    const userConnection = this.getUserFromSocket(socket);
    if (!userConnection || !message.content || !message.recipientId) {
      this.sendError(socket, 'Invalid message data');
      return;
    }

    const { userId } = userConnection;

    try {
      // Store message in database
      const savedMessage = await storage.createMessage({
        senderId: userId,
        recipientId: message.recipientId,
        content: message.content,
        jobId: message.jobId || null,
        isRead: false,
        createdAt: new Date()
      });

      const messageData = {
        type: 'new_message',
        messageId: savedMessage.id,
        senderId: userId,
        recipientId: message.recipientId,
        content: message.content,
        jobId: message.jobId,
        timestamp: savedMessage.createdAt.toISOString(),
        isRead: false
      };

      // Send delivery confirmation to sender
      this.sendMessage(socket, {
        type: 'message_sent',
        messageId: savedMessage.id,
        timestamp: new Date().toISOString()
      });

      // Deliver to recipient if online
      const recipientConnection = this.connectedUsers.get(message.recipientId);
      if (recipientConnection && recipientConnection.socket.readyState === WebSocket.OPEN) {
        this.sendMessage(recipientConnection.socket, messageData);
        
        // Send delivery confirmation to sender
        this.sendMessage(socket, {
          type: 'message_delivered',
          messageId: savedMessage.id,
          timestamp: new Date().toISOString()
        });
      } else {
        // Mark as pending for offline delivery
        console.log(`Message ${savedMessage.id} queued for offline user ${message.recipientId}`);
      }

      // Broadcast to job room if in room context
      if (message.jobId && userConnection.currentJobRoom === message.jobId) {
        this.broadcastToRoom(message.jobId, messageData, userId);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      this.sendError(socket, 'Failed to send message');
    }
  }

  private async handleTyping(socket: WebSocket, message: MessagePayload, isTyping: boolean) {
    const userConnection = this.getUserFromSocket(socket);
    if (!userConnection || !message.recipientId) return;

    const { userId } = userConnection;
    userConnection.isTyping = isTyping;

    // Send typing indicator to recipient
    const recipientConnection = this.connectedUsers.get(message.recipientId);
    if (recipientConnection && recipientConnection.socket.readyState === WebSocket.OPEN) {
      this.sendMessage(recipientConnection.socket, {
        type: isTyping ? 'user_typing' : 'user_stopped_typing',
        userId,
        jobId: message.jobId,
        timestamp: new Date().toISOString()
      });
    }

    // Broadcast to job room if applicable
    if (message.jobId && userConnection.currentJobRoom === message.jobId) {
      this.broadcastToRoom(message.jobId, {
        type: isTyping ? 'user_typing' : 'user_stopped_typing',
        userId,
        jobId: message.jobId,
        timestamp: new Date().toISOString()
      }, userId);
    }
  }

  private async handleMarkRead(socket: WebSocket, message: MessagePayload) {
    const userConnection = this.getUserFromSocket(socket);
    if (!userConnection || !message.messageId) return;

    const { userId } = userConnection;

    try {
      // Mark message as read in database
      await storage.markMessageAsRead(message.messageId, userId);

      // Get message details to notify sender
      const messageDetails = await storage.getMessageById(message.messageId);
      if (messageDetails && messageDetails.senderId) {
        const senderConnection = this.connectedUsers.get(messageDetails.senderId);
        if (senderConnection && senderConnection.socket.readyState === WebSocket.OPEN) {
          this.sendMessage(senderConnection.socket, {
            type: 'message_read',
            messageId: message.messageId,
            readBy: userId,
            timestamp: new Date().toISOString()
          });
        }
      }

    } catch (error) {
      console.error('Error marking message as read:', error);
      this.sendError(socket, 'Failed to mark message as read');
    }
  }

  private async deliverPendingMessages(userId: number) {
    try {
      const pendingMessages = await storage.getPendingMessages(userId);
      const userConnection = this.connectedUsers.get(userId);
      
      if (userConnection && userConnection.socket.readyState === WebSocket.OPEN) {
        for (const message of pendingMessages) {
          this.sendMessage(userConnection.socket, {
            type: 'new_message',
            messageId: message.id,
            senderId: message.senderId,
            recipientId: message.recipientId,
            content: message.content,
            jobId: message.jobId,
            timestamp: message.createdAt.toISOString(),
            isRead: message.isRead
          });
        }
        
        if (pendingMessages.length > 0) {
          console.log(`Delivered ${pendingMessages.length} pending messages to user ${userId}`);
        }
      }
    } catch (error) {
      console.error('Error delivering pending messages:', error);
    }
  }

  private async broadcastUserStatus(userId: number, status: 'online' | 'offline') {
    try {
      const contacts = await storage.getUserContacts(userId);
      
      for (const contact of contacts) {
        const contactConnection = this.connectedUsers.get(contact.id);
        if (contactConnection && contactConnection.socket.readyState === WebSocket.OPEN) {
          this.sendMessage(contactConnection.socket, {
            type: 'user_status_change',
            userId,
            status,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error broadcasting user status:', error);
    }
  }

  private broadcastToRoom(jobId: number, message: any, excludeUserId?: number) {
    const room = this.jobRooms.get(jobId);
    if (!room) return;

    for (const userId of room) {
      if (excludeUserId && userId === excludeUserId) continue;
      
      const userConnection = this.connectedUsers.get(userId);
      if (userConnection && userConnection.socket.readyState === WebSocket.OPEN) {
        this.sendMessage(userConnection.socket, message);
      }
    }
  }

  private getUserFromSocket(socket: WebSocket): ConnectedUser | undefined {
    for (const userConnection of this.connectedUsers.values()) {
      if (userConnection.socket === socket) {
        return userConnection;
      }
    }
    return undefined;
  }

  private sendMessage(socket: WebSocket, message: any) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  private sendError(socket: WebSocket, error: string) {
    this.sendMessage(socket, {
      type: 'error',
      message: error,
      timestamp: new Date().toISOString()
    });
  }

  private handleDisconnection(socket: WebSocket) {
    const userConnection = this.getUserFromSocket(socket);
    if (!userConnection) return;

    const { userId } = userConnection;
    
    // Remove from connected users
    this.connectedUsers.delete(userId);
    
    // Remove from all rooms
    for (const [jobId, room] of this.jobRooms.entries()) {
      if (room.has(userId)) {
        room.delete(userId);
        if (room.size === 0) {
          this.jobRooms.delete(jobId);
        } else {
          // Notify room members of departure
          this.broadcastToRoom(jobId, {
            type: 'user_left_room',
            userId,
            jobId,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    // Broadcast offline status
    this.broadcastUserStatus(userId, 'offline');
    
    console.log(`User ${userId} disconnected from WebSocket`);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.connectedUsers.forEach((userConnection, userId) => {
        if (userConnection.socket.readyState === WebSocket.OPEN) {
          // Update last seen
          userConnection.lastSeen = new Date();
          
          // Send ping
          this.sendMessage(userConnection.socket, {
            type: 'ping',
            timestamp: new Date().toISOString()
          });
        } else {
          // Clean up dead connections
          this.connectedUsers.delete(userId);
        }
      });
    }, 30000); // 30 second heartbeat
  }

  public getConnectedUsers(): number[] {
    return Array.from(this.connectedUsers.keys());
  }

  public getUserCount(): number {
    return this.connectedUsers.size;
  }

  public getRoomInfo(jobId: number) {
    const room = this.jobRooms.get(jobId);
    return room ? Array.from(room) : [];
  }

  public destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.connectedUsers.forEach((userConnection) => {
      if (userConnection.socket.readyState === WebSocket.OPEN) {
        userConnection.socket.close(1001, 'Server shutdown');
      }
    });
    
    this.wss.close();
  }
}