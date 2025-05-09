import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { storage } from './storage';
import { User } from '@shared/schema';

// Client connection mapping
interface ConnectedClient {
  userId: number;
  socket: WebSocket;
  lastPing: number;
}

/**
 * NotificationService provides real-time notifications for payment events and other updates
 */
export class NotificationService {
  private wss: WebSocketServer;
  private clients: Map<string, ConnectedClient> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  
  constructor(server: Server) {
    // Create WebSocket server with a custom path to avoid conflict with Vite
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws/notifications' 
    });
    
    this.setupWebSocketHandlers();
    this.startPingInterval();
  }
  
  private setupWebSocketHandlers() {
    this.wss.on('connection', (socket, request) => {
      console.log('Client connected to notification service');
      
      // Extract user ID from URL query parameters
      try {
        const urlParams = new URLSearchParams(request.url?.split('?')[1] || '');
        const userIdStr = urlParams.get('userId');
        
        if (!userIdStr) {
          console.log('Connection rejected: No user ID provided');
          socket.send(JSON.stringify({ 
            type: 'error', 
            message: 'User ID required for WebSocket connection' 
          }));
          socket.close(1008, 'User ID required');
          return;
        }
        
        const userId = parseInt(userIdStr);
        
        if (isNaN(userId) || userId <= 0) {
          console.log('Connection rejected: Invalid user ID format', userIdStr);
          socket.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid user ID format' 
          }));
          socket.close(1008, 'Invalid user ID');
          return;
        }
      } catch (error) {
        console.error('Error processing WebSocket connection parameters:', error);
        socket.close(1011, 'Server error processing connection');
        return;
      }
      
      // Extract user ID from URL query parameters (again, now that we've validated it exists)
      const urlParams = new URLSearchParams(request.url?.split('?')[1] || '');
      const userIdParam = urlParams.get('userId') || '0';
      const userId = parseInt(userIdParam);
      
      // Generate a unique client ID
      const clientId = `${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      // Store the client connection
      this.clients.set(clientId, {
        userId,
        socket,
        lastPing: Date.now()
      });
      
      console.log(`Client ${clientId} registered for user ${userId}`);
      
      // Send initial connection success message
      this.sendToClient(clientId, {
        type: 'connection',
        message: 'Connected to notification service',
        connected: true,
        timestamp: new Date().toISOString()
      });
      
      // Set up message handling
      socket.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          // Handle pong responses to keep connection alive
          if (data.type === 'pong') {
            const client = this.clients.get(clientId);
            if (client) {
              client.lastPing = Date.now();
            }
          }
        } catch (err) {
          console.error('Error parsing message:', err);
        }
      });
      
      // Handle client disconnection
      socket.on('close', () => {
        console.log(`Client ${clientId} disconnected`);
        this.clients.delete(clientId);
      });
      
      // Handle connection errors
      socket.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });
    });
  }
  
  /**
   * Start ping interval to keep connections alive and clean up stale connections
   */
  private startPingInterval() {
    // Send ping every 30 seconds to keep connections alive
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      
      // Check all clients
      this.clients.forEach((client, clientId) => {
        // If client hasn't responded in 2 minutes, consider it disconnected
        if (now - client.lastPing > 120000) {
          console.log(`Client ${clientId} timed out, removing`);
          this.clients.delete(clientId);
          try {
            client.socket.terminate();
          } catch (e) {
            // Socket may already be closed
          }
          return;
        }
        
        // Otherwise send a ping
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.send(JSON.stringify({ type: 'ping', timestamp: now }));
        }
      });
    }, 30000);
  }
  
  /**
   * Stop the notification service
   */
  public stop() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.wss.close();
  }
  
  /**
   * Send a notification to a specific client
   */
  private sendToClient(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (client && client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(data));
      return true;
    }
    return false;
  }
  
  /**
   * Send a notification to all connected clients for a specific user
   */
  public sendToUser(userId: number, data: any) {
    let sent = false;
    
    this.clients.forEach((client, clientId) => {
      if (client.userId === userId && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(JSON.stringify(data));
        sent = true;
      }
    });
    
    return sent;
  }
  
  /**
   * Send a payment notification for a job
   */
  public async sendPaymentNotification(
    jobId: number, 
    paymentStatus: string,
    amount: number,
    userId: number,
    notificationType: 'payment' | 'payout' = 'payment'
  ) {
    try {
      // Get job details
      const job = await storage.getJob(jobId);
      if (!job) {
        console.error(`Job ${jobId} not found for payment notification`);
        return false;
      }
      
      // Format amount
      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
      
      // Create notification data
      const notificationData = {
        type: notificationType,
        status: paymentStatus,
        jobId,
        jobTitle: job.title,
        amount: formattedAmount,
        timestamp: new Date().toISOString()
      };
      
      // Send to the user
      const sent = this.sendToUser(userId, notificationData);
      
      // Also store in database for when they log back in
      let title = '';
      let message = '';
      
      if (notificationType === 'payment') {
        if (paymentStatus === 'completed') {
          title = 'Payment Successful';
          message = `Your payment of ${formattedAmount} for "${job.title}" has been processed successfully.`;
        } else if (paymentStatus === 'failed') {
          title = 'Payment Failed';
          message = `Your payment of ${formattedAmount} for "${job.title}" has failed. Please try again.`;
        } else {
          title = 'Payment Update';
          message = `Your payment of ${formattedAmount} for "${job.title}" is ${paymentStatus}.`;
        }
      } else { // payout
        if (paymentStatus === 'paid') {
          title = 'Payout Received';
          message = `Your payout of ${formattedAmount} for "${job.title}" has been deposited to your account.`;
        } else if (paymentStatus === 'failed') {
          title = 'Payout Failed';
          message = `Your payout of ${formattedAmount} for "${job.title}" has failed. Please check your banking details.`;
        } else {
          title = 'Payout Update';
          message = `Your payout of ${formattedAmount} for "${job.title}" is ${paymentStatus}.`;
        }
      }
      
      // Save the notification to the database
      await storage.createNotification({
        userId,
        type: notificationType,
        title,
        message,
        isRead: false,
        linkType: notificationType === 'payment' ? 'payment' : 'earning',
        linkId: jobId
      });
      
      return sent;
    } catch (error) {
      console.error('Error sending payment notification:', error);
      return false;
    }
  }
  
  /**
   * Send a Stripe Connect account update notification
   */
  public async sendAccountUpdateNotification(userId: number, status: string) {
    try {
      // Create notification data
      const notificationData = {
        type: 'account',
        status,
        timestamp: new Date().toISOString()
      };
      
      // Send to the user
      const sent = this.sendToUser(userId, notificationData);
      
      // Also store in database
      let title = '';
      let message = '';
      
      if (status === 'verified') {
        title = 'Account Verified';
        message = 'Your Stripe Connect account has been verified. You can now receive payments.';
      } else if (status === 'requires_information') {
        title = 'Account Information Needed';
        message = 'Your Stripe Connect account requires additional information. Please update your profile.';
      } else {
        title = 'Account Update';
        message = `Your Stripe Connect account status has been updated to ${status}.`;
      }
      
      // Save the notification to the database
      await storage.createNotification({
        userId,
        type: 'account',
        title,
        message,
        isRead: false,
        linkType: 'profile',
        linkId: userId
      });
      
      return sent;
    } catch (error) {
      console.error('Error sending account update notification:', error);
      return false;
    }
  }
}

// Singleton instance
let notificationServiceInstance: NotificationService | null = null;

/**
 * Initialize the notification service with the HTTP server
 */
export function initNotificationService(server: Server): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService(server);
    console.log('Notification service initialized');
  }
  
  return notificationServiceInstance;
}

/**
 * Get the notification service instance
 */
export function getNotificationService(): NotificationService | null {
  return notificationServiceInstance;
}