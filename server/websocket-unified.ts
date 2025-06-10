/**
 * Unified WebSocket Service - Robust real-time messaging implementation
 * Fixes disconnection/reconnection issues with proper connection management
 */
import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { storage } from './storage';

interface ConnectedUser {
  socket: WebSocket;
  userId: number;
  username: string;
  lastSeen: Date;
  isAuthenticated: boolean;
  connectionId: string;
  heartbeatInterval?: NodeJS.Timeout;
  reconnectCount: number;
}

interface WebSocketMessage {
  type: string;
  userId?: number;
  jobId?: number;
  messageId?: number;
  content?: string;
  recipientId?: number;
  timestamp?: string;
  connectionId?: string;
  [key: string]: any;
}

export class UnifiedWebSocketService {
  private wss: WebSocketServer;
  private connectedUsers = new Map<number, ConnectedUser>();
  private connectionsBySocket = new Map<WebSocket, ConnectedUser>();
  private jobRooms = new Map<number, Set<number>>(); // jobId -> Set of userIds
  private globalHeartbeatInterval: NodeJS.Timeout;
  private connectionCount = 0;
  private maxConnections = 1000;
  private cleanupInterval: NodeJS.Timeout;

  /**
   * Get the underlying WebSocket server instance
   * @returns The WebSocketServer instance
   */
  public getWSS(): WebSocketServer {
    return this.wss;
  }

  constructor(server: Server) {
    console.log('🚀 Initializing Unified WebSocket Service...');
    
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      perMessageDeflate: {
        threshold: 1024,
        concurrencyLimit: 10,
        memLevel: 8
      },
      maxPayload: 1024 * 1024, // 1MB max message size
      clientTracking: true
    });

    this.setupWebSocketServer();
    this.startGlobalHeartbeat();
    this.startCleanupProcess();
    
    console.log('✅ Unified WebSocket Service initialized successfully');
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (socket: WebSocket, request) => {
      const clientIP = request.socket.remoteAddress;
      console.log(`🔌 New WebSocket connection from ${clientIP}`);
      
      // Check connection limits
      if (this.connectionCount >= this.maxConnections) {
        console.warn(`❌ Connection limit reached (${this.maxConnections}), rejecting connection`);
        socket.close(1013, 'Server overloaded');
        return;
      }

      this.connectionCount++;
      const connectionId = this.generateConnectionId();
      
      // Set connection timeout for authentication
      const authTimeout = setTimeout(() => {
        if (!this.connectionsBySocket.has(socket)) {
          console.log(`⏰ Authentication timeout for connection ${connectionId}`);
          socket.close(1008, 'Authentication timeout');
        }
      }, 30000); // 30 second timeout

      // Send connection acknowledgment
      this.sendMessage(socket, {
        type: 'connection_ack',
        connectionId,
        timestamp: new Date().toISOString(),
        serverTime: Date.now()
      });

      socket.on('message', async (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          await this.handleMessage(socket, message, authTimeout, connectionId);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
          this.sendError(socket, 'Invalid message format', connectionId);
        }
      });

      socket.on('close', (code, reason) => {
        clearTimeout(authTimeout);
        this.handleDisconnection(socket, code, reason?.toString());
      });

      socket.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        clearTimeout(authTimeout);
        this.handleDisconnection(socket, 1006, 'Connection error');
      });

      socket.on('pong', () => {
        const userConnection = this.connectionsBySocket.get(socket);
        if (userConnection) {
          userConnection.lastSeen = new Date();
        }
      });
    });

    this.wss.on('error', (error) => {
      console.error('❌ WebSocket Server error:', error);
    });

    this.wss.on('close', () => {
      console.log('🔌 WebSocket Server closed');
      this.cleanup();
    });
  }

  private async handleMessage(
    socket: WebSocket, 
    message: WebSocketMessage, 
    authTimeout: NodeJS.Timeout,
    connectionId: string
  ) {
    try {
      switch (message.type) {
        case 'authenticate':
          clearTimeout(authTimeout);
          await this.handleAuthentication(socket, message, connectionId);
          break;
          
        case 'ping':
          this.sendMessage(socket, {
            type: 'pong',
            timestamp: new Date().toISOString(),
            connectionId
          });
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
          
        case 'heartbeat':
          await this.handleHeartbeat(socket, message);
          break;

        case 'instant_application':
          await this.handleInstantApplication(socket, message);
          break;

        case 'application_accepted':
          await this.handleApplicationAccepted(socket, message);
          break;

        case 'application_rejected':
          await this.handleApplicationRejected(socket, message);
          break;

        default:
          console.log(`❓ Unknown message type: ${message.type}`);
          this.sendError(socket, `Unknown message type: ${message.type}`, connectionId);
      }
    } catch (error) {
      console.error(`❌ Error handling message type ${message.type}:`, error);
      this.sendError(socket, 'Message processing failed', connectionId);
    }
  }

  private async handleAuthentication(socket: WebSocket, message: WebSocketMessage, connectionId: string) {
    const { userId, username } = message;
    
    if (!userId) {
      this.sendError(socket, 'User ID required for authentication', connectionId);
      return;
    }

    try {
      // Verify user exists and is active
      const user = await storage.getUser(userId);
      if (!user || !user.isActive) {
        this.sendError(socket, 'Invalid user or account inactive', connectionId);
        socket.close(1008, 'Authentication failed');
        return;
      }

      // Close any existing connection for this user
      const existingConnection = this.connectedUsers.get(userId);
      if (existingConnection) {
        console.log(`🔄 Replacing existing connection for user ${userId}`);
        this.cleanupUserConnection(existingConnection);
      }

      // Create new user connection
      const userConnection: ConnectedUser = {
        socket,
        userId,
        username: username || user.username,
        lastSeen: new Date(),
        isAuthenticated: true,
        connectionId,
        reconnectCount: 0
      };

      // Store connection mappings
      this.connectedUsers.set(userId, userConnection);
      this.connectionsBySocket.set(socket, userConnection);

      console.log(`✅ User ${userId} (${userConnection.username}) authenticated via WebSocket`);

      // Send authentication success
      this.sendMessage(socket, {
        type: 'authenticated',
        userId,
        connectionId,
        timestamp: new Date().toISOString(),
        serverInfo: {
          connectedUsers: this.connectedUsers.size,
          serverTime: Date.now()
        }
      });

      // Start individual heartbeat for this connection
      this.startUserHeartbeat(userConnection);

      // Send online status to contacts
      await this.broadcastUserStatus(userId, 'online');

      // Deliver any pending messages
      await this.deliverPendingMessages(userId);

    } catch (error) {
      console.error('❌ Authentication error:', error);
      this.sendError(socket, 'Authentication failed', connectionId);
      socket.close(1008, 'Authentication error');
    }
  }

  private async handleJoinRoom(socket: WebSocket, message: WebSocketMessage) {
    const userConnection = this.connectionsBySocket.get(socket);
    if (!userConnection || !message.jobId) {
      this.sendError(socket, 'Authentication required or invalid job ID');
      return;
    }

    const { userId } = userConnection;
    const jobId = message.jobId;

    // Add user to job room
    if (!this.jobRooms.has(jobId)) {
      this.jobRooms.set(jobId, new Set());
    }
    this.jobRooms.get(jobId)!.add(userId);

    console.log(`👥 User ${userId} joined job room ${jobId}`);

    // Notify other room members
    this.broadcastToRoom(jobId, {
      type: 'user_joined_room',
      userId,
      jobId,
      username: userConnection.username,
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

  private async handleLeaveRoom(socket: WebSocket, message: WebSocketMessage) {
    const userConnection = this.connectionsBySocket.get(socket);
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

    console.log(`👥 User ${userId} left job room ${jobId}`);

    // Notify other room members
    this.broadcastToRoom(jobId, {
      type: 'user_left_room',
      userId,
      jobId,
      username: userConnection.username,
      timestamp: new Date().toISOString()
    }, userId);
  }

  private async handleSendMessage(socket: WebSocket, message: WebSocketMessage) {
    const userConnection = this.connectionsBySocket.get(socket);
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
        isRead: false,
        senderName: userConnection.username
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
      }

      // Broadcast to job room if applicable
      if (message.jobId) {
        this.broadcastToRoom(message.jobId, messageData, userId);
      }

    } catch (error) {
      console.error('❌ Error sending message:', error);
      this.sendError(socket, 'Failed to send message');
    }
  }

  private async handleTyping(socket: WebSocket, message: WebSocketMessage, isTyping: boolean) {
    const userConnection = this.connectionsBySocket.get(socket);
    if (!userConnection || !message.recipientId) return;

    const { userId } = userConnection;

    // Send typing indicator to recipient
    const recipientConnection = this.connectedUsers.get(message.recipientId);
    if (recipientConnection && recipientConnection.socket.readyState === WebSocket.OPEN) {
      this.sendMessage(recipientConnection.socket, {
        type: isTyping ? 'user_typing' : 'user_stopped_typing',
        userId,
        jobId: message.jobId,
        username: userConnection.username,
        timestamp: new Date().toISOString()
      });
    }

    // Broadcast to job room if applicable
    if (message.jobId) {
      this.broadcastToRoom(message.jobId, {
        type: isTyping ? 'user_typing' : 'user_stopped_typing',
        userId,
        jobId: message.jobId,
        username: userConnection.username,
        timestamp: new Date().toISOString()
      }, userId);
    }
  }

  private async handleMarkRead(socket: WebSocket, message: WebSocketMessage) {
    const userConnection = this.connectionsBySocket.get(socket);
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
      console.error('❌ Error marking message as read:', error);
      this.sendError(socket, 'Failed to mark message as read');
    }
  }

  private async handleHeartbeat(socket: WebSocket, message: WebSocketMessage) {
    const userConnection = this.connectionsBySocket.get(socket);
    if (userConnection) {
      userConnection.lastSeen = new Date();
      
      // Send heartbeat response
      this.sendMessage(socket, {
        type: 'heartbeat_ack',
        timestamp: new Date().toISOString(),
        connectionId: userConnection.connectionId,
        serverTime: Date.now(),
        userId: userConnection.userId
      });
      
      // Update reconnect count if this is a manual heartbeat (client initiated)
      if (message.connectionId && userConnection.reconnectCount > 0) {
        userConnection.reconnectCount = Math.max(0, userConnection.reconnectCount - 1);
      }
    }
  }

  private startUserHeartbeat(userConnection: ConnectedUser) {
    // Clear any existing heartbeat
    if (userConnection.heartbeatInterval) {
      clearInterval(userConnection.heartbeatInterval);
    }

    userConnection.heartbeatInterval = setInterval(() => {
      if (userConnection.socket.readyState === WebSocket.OPEN) {
        try {
          // Send ping for connection health check
          userConnection.socket.ping();
          userConnection.lastSeen = new Date();
          
          // Also send a heartbeat message every 3rd interval (90 seconds) to maintain activity
          // This helps with proxies and load balancers that might timeout inactive connections
          if (Math.floor(Date.now() / 30000) % 3 === 0) {
            this.sendMessage(userConnection.socket, {
              type: 'server_heartbeat',
              timestamp: new Date().toISOString(),
              connectionId: userConnection.connectionId
            });
          }
        } catch (error) {
          console.error(`❌ Error in user heartbeat for ${userConnection.userId}:`, error);
          this.cleanupUserConnection(userConnection);
        }
      } else {
        this.cleanupUserConnection(userConnection);
      }
    }, 30000); // 30 second heartbeat
  }

  private startGlobalHeartbeat() {
    this.globalHeartbeatInterval = setInterval(() => {
      const now = new Date();
      const staleThreshold = 120000; // 2 minutes (increased from 1 minute)
      const warningThreshold = 90000; // 1.5 minutes - warn before considering stale
      const deadConnections: ConnectedUser[] = [];
      const pingPromises: Promise<void>[] = [];

      this.connectedUsers.forEach((userConnection, userId) => {
        const timeSinceLastSeen = now.getTime() - userConnection.lastSeen.getTime();
        
        // Check if connection is still alive
        if (userConnection.socket.readyState === WebSocket.OPEN) {
          if (timeSinceLastSeen > staleThreshold) {
            // Send ping to check if connection is responsive
            try {
              userConnection.socket.ping();
              console.log(`🏓 Ping sent to user ${userId} (${timeSinceLastSeen}ms since last seen)`);
              
              // Add a ping timeout to detect unresponsive connections
              const pingPromise = new Promise<void>((resolve) => {
                const timeout = setTimeout(() => {
                  console.log(`⏱️ Ping timeout for user ${userId}, marking for cleanup`);
                  deadConnections.push(userConnection);
                  resolve();
                }, 10000); // 10 second timeout for ping response
                
                // Using the existing socket.on('pong') event handler approach
                const originalLastSeen = userConnection.lastSeen;
                
                // Create a check that resolves when lastSeen is updated
                const checkInterval = setInterval(() => {
                  if (userConnection.lastSeen > originalLastSeen) {
                    clearTimeout(timeout);
                    clearInterval(checkInterval);
                    resolve();
                  }
                }, 500); // Check every 500ms
              });
              
              pingPromises.push(pingPromise);
            } catch (error) {
              console.log(`❌ Failed to ping user ${userId}, marking for cleanup`);
              deadConnections.push(userConnection);
            }
          } else if (timeSinceLastSeen > warningThreshold) {
            // Connection approaching stale threshold, send a preventive ping
            try {
              userConnection.socket.ping();
              console.log(`🏸 Preventive ping sent to user ${userId} (${timeSinceLastSeen}ms since last seen)`);
            } catch (error) {
              console.log(`❌ Failed to send preventive ping to user ${userId}`);
            }
          }
        } else {
          // Connection is already closed
          deadConnections.push(userConnection);
        }
      });

      // Wait for all ping promises to resolve
      Promise.all(pingPromises).then(() => {
        // Clean up dead connections
        deadConnections.forEach(userConnection => {
          console.log(`🧹 Cleaning up dead connection for user ${userConnection.userId}`);
          this.cleanupUserConnection(userConnection);
        });
      });
    }, 45000); // Check every 45 seconds (increased interval)
  }

  private startCleanupProcess() {
    this.cleanupInterval = setInterval(() => {
      // Clean up closed connections
      this.connectionsBySocket.forEach((userConnection, socket) => {
        if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
          this.cleanupUserConnection(userConnection);
        }
      });

      // Clean up empty rooms
      this.jobRooms.forEach((members, jobId) => {
        if (members.size === 0) {
          this.jobRooms.delete(jobId);
        }
      });

      console.log(`📊 WebSocket Stats: ${this.connectedUsers.size} users, ${this.jobRooms.size} rooms`);
    }, 60000); // Clean up every minute
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
          console.log(`📬 Delivered ${pendingMessages.length} pending messages to user ${userId}`);
        }
      }
    } catch (error) {
      console.error('❌ Error delivering pending messages:', error);
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
      console.error('❌ Error broadcasting user status:', error);
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

  private sendMessage(socket: WebSocket, message: any) {
    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('❌ Error sending message:', error);
      }
    }
  }

  private async handleInstantApplication(socket: WebSocket, message: WebSocketMessage) {
    const userConnection = this.connectionsBySocket.get(socket);
    if (!userConnection) {
      this.sendError(socket, 'Authentication required');
      return;
    }

    const { posterId, jobId, workerId, workerName, applicationId } = message;

    if (!posterId || !jobId || !workerId || !applicationId) {
      this.sendError(socket, 'Missing required application data');
      return;
    }

    try {
      // Send real-time notification to job poster
      const posterConnection = this.connectedUsers.get(posterId);
      if (posterConnection && posterConnection.socket.readyState === WebSocket.OPEN) {
        this.sendMessage(posterConnection.socket, {
          type: 'instant_application_received',
          jobId,
          workerId,
          workerName,
          applicationId,
          timestamp: new Date().toISOString()
        });

        console.log(`⚡ Instant application notification sent to poster ${posterId} for job ${jobId}`);
      }

      // Broadcast to job room if applicable
      this.broadcastToRoom(jobId, {
        type: 'new_application_in_room',
        jobId,
        workerId,
        workerName,
        applicationId,
        timestamp: new Date().toISOString()
      }, workerId);

    } catch (error) {
      console.error('❌ Error handling instant application:', error);
      this.sendError(socket, 'Failed to process instant application');
    }
  }

  private async handleApplicationAccepted(socket: WebSocket, message: WebSocketMessage) {
    const userConnection = this.connectionsBySocket.get(socket);
    if (!userConnection) {
      this.sendError(socket, 'Authentication required');
      return;
    }

    const { workerId, jobId, applicationId } = message;

    if (!workerId || !jobId || !applicationId) {
      this.sendError(socket, 'Missing required acceptance data');
      return;
    }

    try {
      // Send real-time notification to worker
      const workerConnection = this.connectedUsers.get(workerId);
      if (workerConnection && workerConnection.socket.readyState === WebSocket.OPEN) {
        this.sendMessage(workerConnection.socket, {
          type: 'application_accepted_notification',
          jobId,
          applicationId,
          timestamp: new Date().toISOString()
        });

        console.log(`🎉 Application acceptance notification sent to worker ${workerId} for job ${jobId}`);
      }

      // Broadcast to job room
      this.broadcastToRoom(jobId, {
        type: 'job_assigned',
        jobId,
        workerId,
        applicationId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error handling application acceptance:', error);
      this.sendError(socket, 'Failed to process application acceptance');
    }
  }

  private async handleApplicationRejected(socket: WebSocket, message: WebSocketMessage) {
    const userConnection = this.connectionsBySocket.get(socket);
    if (!userConnection) {
      this.sendError(socket, 'Authentication required');
      return;
    }

    const { workerId, jobId, applicationId } = message;

    if (!workerId || !jobId || !applicationId) {
      this.sendError(socket, 'Missing required rejection data');
      return;
    }

    try {
      // Send real-time notification to worker
      const workerConnection = this.connectedUsers.get(workerId);
      if (workerConnection && workerConnection.socket.readyState === WebSocket.OPEN) {
        this.sendMessage(workerConnection.socket, {
          type: 'application_rejected_notification',
          jobId,
          applicationId,
          timestamp: new Date().toISOString()
        });

        console.log(`❌ Application rejection notification sent to worker ${workerId} for job ${jobId}`);
      }

    } catch (error) {
      console.error('❌ Error handling application rejection:', error);
      this.sendError(socket, 'Failed to process application rejection');
    }
  }

  private sendError(socket: WebSocket, error: string, connectionId?: string) {
    this.sendMessage(socket, {
      type: 'error',
      message: error,
      connectionId,
      timestamp: new Date().toISOString()
    });
  }

  private handleDisconnection(socket: WebSocket, code?: number, reason?: string) {
    const userConnection = this.connectionsBySocket.get(socket);
    if (!userConnection) {
      this.connectionCount = Math.max(0, this.connectionCount - 1);
      return;
    }

    const { userId, username } = userConnection;
    
    console.log(`🔌 User ${userId} (${username}) disconnected: ${code} - ${reason || 'No reason'}`);
    
    this.cleanupUserConnection(userConnection);
    
    // Broadcast offline status
    this.broadcastUserStatus(userId, 'offline');
  }

  private cleanupUserConnection(userConnection: ConnectedUser) {
    const { userId, socket, heartbeatInterval } = userConnection;
    
    // Clear heartbeat
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    
    // Remove from maps
    this.connectedUsers.delete(userId);
    this.connectionsBySocket.delete(socket);
    
    // Remove from all rooms
    this.jobRooms.forEach((members, jobId) => {
      if (members.has(userId)) {
        members.delete(userId);
        if (members.size === 0) {
          this.jobRooms.delete(jobId);
        } else {
          // Notify room members of departure
          this.broadcastToRoom(jobId, {
            type: 'user_left_room',
            userId,
            jobId,
            username: userConnection.username,
            timestamp: new Date().toISOString()
          });
        }
      }
    });
    
    // Close socket if still open
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close(1000, 'Server cleanup');
    }
    
    this.connectionCount = Math.max(0, this.connectionCount - 1);
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanup() {
    console.log('🧹 Cleaning up WebSocket service...');
    
    if (this.globalHeartbeatInterval) {
      clearInterval(this.globalHeartbeatInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.connectedUsers.forEach((userConnection) => {
      this.cleanupUserConnection(userConnection);
    });
    
    this.connectedUsers.clear();
    this.connectionsBySocket.clear();
    this.jobRooms.clear();
  }

  // Public methods for external use
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

  public sendToUser(userId: number, message: any): boolean {
    const userConnection = this.connectedUsers.get(userId);
    if (userConnection && userConnection.socket.readyState === WebSocket.OPEN) {
      this.sendMessage(userConnection.socket, message);
      return true;
    }
    return false;
  }

  public broadcastToAll(message: any) {
    this.connectedUsers.forEach((userConnection) => {
      if (userConnection.socket.readyState === WebSocket.OPEN) {
        this.sendMessage(userConnection.socket, message);
      }
    });
  }

  public broadcastJobPinUpdate(action: 'added' | 'updated' | 'removed', jobData: any) {
    console.log(`📍 Broadcasting job pin ${action} for job ${jobData.id}`);

    this.broadcastToAll({
      type: 'job_pin_update',
      data: {
        action,
        job: jobData,
        timestamp: new Date().toISOString()
      }
    });
  }

  public getConnectionStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      activeRooms: this.jobRooms.size,
      totalConnections: this.connectionCount,
      maxConnections: this.maxConnections,
      serverUptime: process.uptime()
    };
  }

  public destroy() {
    console.log('💥 Destroying WebSocket service...');
    this.cleanup();
    this.wss.close();
  }
}