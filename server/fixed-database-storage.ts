// @ts-nocheck
import { IStorage } from "./storage";
import { DatabaseStorage } from "./database-storage";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { uploadProfileImage as uploadToS3, base64ToBuffer, validateImageFile } from './services/s3Service.js';
import { pool, db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import { supportTickets, supportMessages, users } from "@shared/schema";

/**
 * This is a wrapper around DatabaseStorage that catches errors and logs them,
 * ensuring that the application doesn't crash due to database errors.
 */
export class FixedDatabaseStorage implements IStorage {
  private storage: DatabaseStorage;
  public sessionStore: session.Store;
  public db = db; // Expose the database connection for admin queries

  constructor() {
    this.storage = new DatabaseStorage();
    
    // Create PostgreSQL session store with better configuration
    const PostgresStore = connectPg(session);
    
    // Use a custom table name to avoid conflicts with other session tables
    this.sessionStore = new PostgresStore({
      pool,
      tableName: 'sessions', // Default is "session"
      createTableIfMissing: true, // Create the table if it doesn't exist
      pruneSessionInterval: 60 * 60, // Prune every hour (reduced frequency)
      errorLog: (error) => {
        // Only log non-timeout errors to reduce noise
        if (!error.message.includes('timeout') && !error.message.includes('57014')) {
          console.error('Session store error:', error);
        }
      },
      ttl: 7 * 24 * 60 * 60, // 7 days (reduced from 30 days)
      disableTouch: true, // Disable touch to reduce database writes
      queryTimeout: 10000, // 10 seconds max for session queries
    });
    
    console.log("PostgreSQL session store initialized");
  }

  // Delegate all methods to the underlying storage
  // User operations
  async getAllUsers() {
    try {
      return await this.storage.getAllUsers();
    } catch (error) {
      console.error("Error in getAllUsers:", error);
      return [];
    }
  }

  async getUser(id: number) {
    try {
      return await this.storage.getUser(id);
    } catch (error) {
      console.error(`Error in getUser(${id}):`, error);
      return undefined;
    }
  }

  async getUserByUsername(username: string) {
    try {
      return await this.storage.getUserByUsername(username);
    } catch (error) {
      console.error(`Error in getUserByUsername(${username}):`, error);
      return undefined;
    }
  }

  async getUserByUsernameAndType(username: string, accountType: string) {
    try {
      return await this.storage.getUserByUsernameAndType(username, accountType);
    } catch (error) {
      console.error(`Error in getUserByUsernameAndType(${username}, ${accountType}):`, error);
      return undefined;
    }
  }
  
  async getUserByEmail(email: string) {
    try {
      return await this.storage.getUserByEmail(email);
    } catch (error) {
      console.error(`Error in getUserByEmail(${email}):`, error);
      return undefined;
    }
  }

  async createUser(user: any) {
    try {
      return await this.storage.createUser(user);
    } catch (error) {
      console.error("Error in createUser:", error);
      throw error; // Rethrow as this is critical
    }
  }

  async updateUser(id: number, data: any) {
    try {
      return await this.storage.updateUser(id, data);
    } catch (error) {
      console.error(`Error in updateUser(${id}):`, error);
      return undefined;
    }
  }

  async uploadProfileImage(userId: number, imageData: string) {
    try {
      // Check if the underlying storage has S3 upload capability
      if (typeof this.storage.uploadProfileImage === 'function') {
        return await this.storage.uploadProfileImage(userId, imageData);
      }

      // Fallback S3 implementation
      console.log(`Using S3 fallback for uploadProfileImage(${userId})`);

      try {
        // Convert base64 to buffer
        const imageBuffer = base64ToBuffer(imageData);

        // Validate image
        validateImageFile(imageBuffer, 5 * 1024 * 1024); // 5MB max

        // Upload to S3
        const uploadResult = await uploadToS3(userId, imageBuffer);

        // Update user with S3 URL
        const updatedUser = await this.updateUser(userId, {
          avatarUrl: uploadResult.url
        });

        console.log(`Profile image uploaded for user ${userId}: ${uploadResult.url}`);
        return updatedUser;

      } catch (uploadError) {
        console.error(`S3 upload failed for user ${userId}:`, uploadError);
        // Final fallback - store as base64 (not recommended for production)
        return await this.updateUser(userId, { avatarUrl: imageData });
      }
    } catch (error) {
      console.error(`Error in uploadProfileImage(${userId}):`, error);
      return undefined;
    }
  }

  async updateUserSkills(userId: number, skills: string[]) {
    try {
      // Check if the method exists in the underlying storage
      if (typeof this.storage.updateUserSkills === 'function') {
        return await this.storage.updateUserSkills(userId, skills);
      }
      
      // Fallback implementation if not available
      console.warn(`updateUserSkills not implemented in storage, using fallback implementation`);
      // Update the user's skills directly
      return await this.updateUser(userId, { skills });
    } catch (error) {
      console.error(`Error in updateUserSkills(${userId}):`, error);
      return undefined;
    }
  }

  async verifyUserSkill(userId: number, skill: string, isVerified: boolean) {
    try {
      // Check if the method exists in the underlying storage
      if (typeof this.storage.verifyUserSkill === 'function') {
        return await this.storage.verifyUserSkill(userId, skill, isVerified);
      }
      
      // Fallback implementation if not available
      console.warn(`verifyUserSkill not implemented in storage, using fallback implementation`);
      // Get the user first
      const user = await this.getUser(userId);
      if (!user) return undefined;
      
      // Clone the skills verified object or create a new one
      const skillsVerified = { ...(user.skillsVerified || {}) };
      skillsVerified[skill] = isVerified;
      
      // In a real implementation, we would update the database
      // For now, just return the user with the updated skillsVerified
      return {
        ...user,
        skillsVerified
      };
    } catch (error) {
      console.error(`Error in verifyUserSkill(${userId}, ${skill}):`, error);
      return undefined;
    }
  }

  async updateUserMetrics(userId: number, metrics: any) {
    try {
      // Check if the method exists in the underlying storage
      if (typeof this.storage.updateUserMetrics === 'function') {
        return await this.storage.updateUserMetrics(userId, metrics);
      }
      
      // Fallback implementation if not available
      console.warn(`updateUserMetrics not implemented in storage, using fallback implementation`);
      // Get the user first
      const user = await this.getUser(userId);
      if (!user) return undefined;
      
      // Update metrics
      const updatedUser = {
        ...user,
        completedJobs: metrics.completedJobs !== undefined ? metrics.completedJobs : user.completedJobs,
        successRate: metrics.successRate !== undefined ? metrics.successRate : user.successRate,
        responseTime: metrics.responseTime !== undefined ? metrics.responseTime : user.responseTime
      };
      
      // In a real implementation, we would update the database
      // For now, just return the updated user
      return updatedUser;
    } catch (error) {
      console.error(`Error in updateUserMetrics(${userId}):`, error);
      return undefined;
    }
  }

  async getUsersWithSkills(skills: string[]) {
    try {
      // Check if the method exists in the underlying storage
      if (typeof this.storage.getUsersWithSkills === 'function') {
        return await this.storage.getUsersWithSkills(skills);
      }
      
      // Fallback implementation if not available
      console.warn(`getUsersWithSkills not implemented in storage, using fallback implementation`);
      // Get all users and filter by skills
      const allUsers = await this.getAllUsers();
      
      // Filter users that have at least one of the requested skills
      return allUsers.filter(user => {
        if (!user.skills || !Array.isArray(user.skills)) return false;
        return user.skills.some(skill => skills.includes(skill));
      });
    } catch (error) {
      console.error(`Error in getUsersWithSkills:`, error);
      return [];
    }
  }

  // Job operations
  async getJob(id: number) {
    try {
      return await this.storage.getJob(id);
    } catch (error) {
      console.error(`Error in getJob(${id}):`, error);
      return undefined;
    }
  }

  async getJobs(filters?: any) {
    try {
      return await this.storage.getJobs(filters);
    } catch (error) {
      console.error(`Error in getJobs:`, error);
      return [];
    }
  }

  async createJob(job: any) {
    try {
      return await this.storage.createJob(job);
    } catch (error) {
      console.error(`Error in createJob:`, error);
      throw error; // Rethrow as this is critical
    }
  }

  async updateJob(id: number, data: any) {
    try {
      return await this.storage.updateJob(id, data);
    } catch (error) {
      console.error(`Error in updateJob(${id}):`, error);
      return undefined;
    }
  }

  async deleteJob(id: number) {
    try {
      return await this.storage.deleteJob(id);
    } catch (error) {
      console.error(`Error in deleteJob(${id}):`, error);
      return false;
    }
  }

  async getJobsNearLocation(latitude: number, longitude: number, radiusMiles: number) {
    try {
      return await this.storage.getJobsNearLocation(latitude, longitude, radiusMiles);
    } catch (error) {
      console.error(`Error in getJobsNearLocation:`, error);
      return [];
    }
  }

  // Application operations
  async getApplication(id: number) {
    try {
      return await this.storage.getApplication(id);
    } catch (error) {
      console.error(`Error in getApplication(${id}):`, error);
      return undefined;
    }
  }

  async getApplicationsForJob(jobId: number) {
    try {
      return await this.storage.getApplicationsForJob(jobId);
    } catch (error) {
      console.error(`Error in getApplicationsForJob(${jobId}):`, error);
      return [];
    }
  }

  async getApplicationsForWorker(workerId: number) {
    try {
      return await this.storage.getApplicationsForWorker(workerId);
    } catch (error) {
      console.error(`Error in getApplicationsForWorker(${workerId}):`, error);
      return [];
    }
  }

  async createApplication(application: any) {
    try {
      return await this.storage.createApplication(application);
    } catch (error) {
      console.error(`Error in createApplication:`, error);
      throw error; // Rethrow as this is critical
    }
  }

  async updateApplication(id: number, data: any) {
    try {
      return await this.storage.updateApplication(id, data);
    } catch (error) {
      console.error(`Error in updateApplication(${id}):`, error);
      return undefined;
    }
  }

  // Review operations
  async getReview(id: number) {
    try {
      return await this.storage.getReview(id);
    } catch (error) {
      console.error(`Error in getReview(${id}):`, error);
      return undefined;
    }
  }

  async getReviewsForUser(userId: number) {
    try {
      return await this.storage.getReviewsForUser(userId);
    } catch (error) {
      console.error(`Error in getReviewsForUser(${userId}):`, error);
      return [];
    }
  }

  async getReviewsForJob(jobId: number) {
    try {
      return await this.storage.getReviewsForJob(jobId);
    } catch (error) {
      console.error(`Error in getReviewsForJob(${jobId}):`, error);
      return [];
    }
  }

  async createReview(review: any) {
    try {
      return await this.storage.createReview(review);
    } catch (error) {
      console.error(`Error in createReview:`, error);
      throw error; // Rethrow as this is critical
    }
  }

  // Task operations
  async getTask(id: number) {
    try {
      return await this.storage.getTask(id);
    } catch (error) {
      console.error(`Error in getTask(${id}):`, error);
      return undefined;
    }
  }

  async getTasksForJob(jobId: number) {
    try {
      return await this.storage.getTasksForJob(jobId);
    } catch (error) {
      console.error(`Error in getTasksForJob(${jobId}):`, error);
      return [];
    }
  }

  async createTask(task: any) {
    try {
      return await this.storage.createTask(task);
    } catch (error) {
      console.error(`Error in createTask:`, error);
      throw error; // Rethrow as this is critical
    }
  }

  async updateTask(id: number, data: any) {
    try {
      return await this.storage.updateTask(id, data);
    } catch (error) {
      console.error(`Error in updateTask(${id}):`, error);
      return undefined;
    }
  }

  async completeTask(id: number, completedBy: number) {
    try {
      return await this.storage.completeTask(id, completedBy);
    } catch (error) {
      console.error(`Error in completeTask(${id}):`, error);
      return undefined;
    }
  }

  async reorderTasks(jobId: number, taskIds: number[]) {
    try {
      return await this.storage.reorderTasks(jobId, taskIds);
    } catch (error) {
      console.error(`Error in reorderTasks(${jobId}):`, error);
      return [];
    }
  }

  // Earnings operations
  async getEarning(id: number) {
    try {
      return await this.storage.getEarning(id);
    } catch (error) {
      console.error(`Error in getEarning(${id}):`, error);
      return undefined;
    }
  }

  async getEarningsForWorker(workerId: number) {
    try {
      return await this.storage.getEarningsForWorker(workerId);
    } catch (error) {
      console.error(`Error in getEarningsForWorker(${workerId}):`, error);
      return [];
    }
  }

  async getEarningsForJob(jobId: number) {
    try {
      return await this.storage.getEarningsForJob(jobId);
    } catch (error) {
      console.error(`Error in getEarningsForJob(${jobId}):`, error);
      return [];
    }
  }

  async createEarning(earning: any) {
    try {
      return await this.storage.createEarning(earning);
    } catch (error) {
      console.error(`Error in createEarning:`, error);
      throw error; // Rethrow as this is critical
    }
  }

  async updateEarningStatus(id: number, status: string, datePaid?: Date) {
    try {
      return await this.storage.updateEarningStatus(id, status, datePaid);
    } catch (error) {
      console.error(`Error in updateEarningStatus(${id}):`, error);
      return undefined;
    }
  }

  // Payment operations
  async getPayment(id: number) {
    try {
      return await this.storage.getPayment(id);
    } catch (error) {
      console.error(`Error in getPayment(${id}):`, error);
      return undefined;
    }
  }

  async getPaymentByTransactionId(transactionId: string) {
    try {
      return await this.storage.getPaymentByTransactionId(transactionId);
    } catch (error) {
      console.error(`Error in getPaymentByTransactionId(${transactionId}):`, error);
      return undefined;
    }
  }

  async getPaymentByJobId(jobId: number) {
    try {
      return await this.storage.getPaymentByJobId(jobId);
    } catch (error) {
      console.error(`Error in getPaymentByJobId(${jobId}):`, error);
      return undefined;
    }
  }

  async getPaymentsForUser(userId: number) {
    try {
      return await this.storage.getPaymentsForUser(userId);
    } catch (error) {
      console.error(`Error in getPaymentsForUser(${userId}):`, error);
      return [];
    }
  }

  async createPayment(payment: any) {
    try {
      return await this.storage.createPayment(payment);
    } catch (error) {
      console.error(`Error in createPayment:`, error);
      throw error; // Rethrow as this is critical
    }
  }

  async updatePaymentStatus(id: number, status: string, transactionId?: string) {
    try {
      return await this.storage.updatePaymentStatus(id, status, transactionId);
    } catch (error) {
      console.error(`Error in updatePaymentStatus(${id}):`, error);
      return undefined;
    }
  }

  // Badge operations
  async getBadge(id: number) {
    try {
      // Check if the method exists in the underlying storage
      if (typeof this.storage.getBadge === 'function') {
        return await this.storage.getBadge(id);
      }
      console.warn(`getBadge not implemented in storage, returning empty result`);
      return undefined;
    } catch (error) {
      console.error(`Error in getBadge(${id}):`, error);
      return undefined;
    }
  }

  async getAllBadges() {
    try {
      // Check if the method exists in the underlying storage
      if (typeof this.storage.getAllBadges === 'function') {
        return await this.storage.getAllBadges();
      }
      console.warn(`getAllBadges not implemented in storage, returning empty array`);
      return [];
    } catch (error) {
      console.error(`Error in getAllBadges:`, error);
      return [];
    }
  }

  async getBadgesByCategory(category: string) {
    try {
      // Check if the method exists in the underlying storage
      if (typeof this.storage.getBadgesByCategory === 'function') {
        return await this.storage.getBadgesByCategory(category);
      }
      console.warn(`getBadgesByCategory not implemented in storage, returning empty array`);
      return [];
    } catch (error) {
      console.error(`Error in getBadgesByCategory(${category}):`, error);
      return [];
    }
  }

  async createBadge(badge: any) {
    try {
      // Check if the method exists in the underlying storage
      if (typeof this.storage.createBadge === 'function') {
        return await this.storage.createBadge(badge);
      }
      throw new Error(`createBadge not implemented in storage`);
    } catch (error) {
      console.error(`Error in createBadge:`, error);
      throw error; // Rethrow as this is critical
    }
  }

  // User badge operations
  async getUserBadges(userId: number) {
    try {
      // Check if the method exists in the underlying storage
      if (typeof this.storage.getUserBadges === 'function') {
        return await this.storage.getUserBadges(userId);
      }
      console.warn(`getUserBadges not implemented in storage, returning empty array`);
      return [];
    } catch (error) {
      console.error(`Error in getUserBadges(${userId}):`, error);
      return [];
    }
  }

  async awardBadge(userBadge: any) {
    try {
      // Check if the method exists in the underlying storage
      if (typeof this.storage.awardBadge === 'function') {
        return await this.storage.awardBadge(userBadge);
      }
      throw new Error(`awardBadge not implemented in storage`);
    } catch (error) {
      console.error(`Error in awardBadge:`, error);
      throw error; // Rethrow as this is critical
    }
  }

  async revokeBadge(userId: number, badgeId: number) {
    try {
      // Check if the method exists in the underlying storage
      if (typeof this.storage.revokeBadge === 'function') {
        return await this.storage.revokeBadge(userId, badgeId);
      }
      console.warn(`revokeBadge not implemented in storage, returning false`);
      return false;
    } catch (error) {
      console.error(`Error in revokeBadge(${userId}, ${badgeId}):`, error);
      return false;
    }
  }

  // Notification operations
  async getNotifications(userId: number, options?: { isRead?: boolean, limit?: number }) {
    try {
      // Check if the method exists in the underlying storage
      if (typeof this.storage.getNotifications === 'function') {
        return await this.storage.getNotifications(userId, options);
      }
      console.warn(`getNotifications not implemented in storage, returning empty array`);
      return [];
    } catch (error) {
      console.error(`Error in getNotifications(${userId}):`, error);
      return [];
    }
  }

  async getNotification(id: number) {
    try {
      // Check if the method exists in the underlying storage
      if (typeof this.storage.getNotification === 'function') {
        return await this.storage.getNotification(id);
      }
      console.warn(`getNotification not implemented in storage, returning undefined`);
      return undefined;
    } catch (error) {
      console.error(`Error in getNotification(${id}):`, error);
      return undefined;
    }
  }

  async createNotification(notification: any) {
    try {
      // Check if the method exists in the underlying storage
      if (typeof this.storage.createNotification === 'function') {
        return await this.storage.createNotification(notification);
      }
      console.warn(`createNotification not implemented in storage, throwing error`);
      throw new Error("createNotification not implemented");
    } catch (error) {
      console.error(`Error in createNotification:`, error);
      throw error; // Rethrow as this is critical
    }
  }

  async markNotificationAsRead(id: number) {
    try {
      // Check if the method exists in the underlying storage
      if (typeof this.storage.markNotificationAsRead === 'function') {
        return await this.storage.markNotificationAsRead(id);
      }
      console.warn(`markNotificationAsRead not implemented in storage, returning undefined`);
      return undefined;
    } catch (error) {
      console.error(`Error in markNotificationAsRead(${id}):`, error);
      return undefined;
    }
  }

  async markAllNotificationsAsRead(userId: number) {
    try {
      // Check if the method exists in the underlying storage
      if (typeof this.storage.markAllNotificationsAsRead === 'function') {
        return await this.storage.markAllNotificationsAsRead(userId);
      }
      console.warn(`markAllNotificationsAsRead not implemented in storage, returning 0`);
      return 0;
    } catch (error) {
      console.error(`Error in markAllNotificationsAsRead(${userId}):`, error);
      return 0;
    }
  }

  async deleteNotification(id: number) {
    try {
      // Check if the method exists in the underlying storage
      if (typeof this.storage.deleteNotification === 'function') {
        return await this.storage.deleteNotification(id);
      }
      console.warn(`deleteNotification not implemented in storage, returning false`);
      return false;
    } catch (error) {
      console.error(`Error in deleteNotification(${id}):`, error);
      return false;
    }
  }

  // Specialized notification methods
  async notifyNearbyWorkers(jobId: number, radiusMiles: number) {
    try {
      // Check if the method exists in the underlying storage
      if (typeof this.storage.notifyNearbyWorkers === 'function') {
        return await this.storage.notifyNearbyWorkers(jobId, radiusMiles);
      }
      console.warn(`notifyNearbyWorkers not implemented in storage, returning 0`);
      return 0;
    } catch (error) {
      console.error(`Error in notifyNearbyWorkers(${jobId}):`, error);
      return 0;
    }
  }

  // Admin operations
  async getAllJobs() {
    try {
      return await this.storage.getJobs();
    } catch (error) {
      console.error("Error in getAllJobs:", error);
      return [];
    }
  }

  async getAllPayments() {
    try {
      // Get all payments using database query
      const result = await this.db.select().from(require('@shared/schema').payments);
      return result;
    } catch (error) {
      console.error("Error in getAllPayments:", error);
      return [];
    }
  }

  async getAllEarnings() {
    try {
      // Get all earnings using database query
      const result = await this.db.select().from(require('@shared/schema').earnings);
      return result;
    } catch (error) {
      console.error("Error in getAllEarnings:", error);
      return [];
    }
  }

  async getUserById(id: number) {
    try {
      return await this.storage.getUser(id);
    } catch (error) {
      console.error(`Error in getUserById(${id}):`, error);
      return undefined;
    }
  }

  async deleteUser(id: number) {
    try {
      // Delete user from database
      const { users } = require('@shared/schema');
      const result = await this.db.delete(users).where(require('drizzle-orm').eq(users.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error in deleteUser(${id}):`, error);
      return false;
    }
  }

  async getJobById(id: number) {
    try {
      return await this.storage.getJob(id);
    } catch (error) {
      console.error(`Error in getJobById(${id}):`, error);
      return undefined;
    }
  }

  async notifyNearbyWorkers(jobId: number, radiusMiles: number): Promise<number> {
    try {
      console.warn(`notifyNearbyWorkers not implemented in storage, returning 0`);
      return 0;
    } catch (error) {
      console.error(`Error in notifyNearbyWorkers(${jobId}, ${radiusMiles}):`, error);
      return 0;
    }
  }

  // Contact/Message Operations
  async getUserContacts(userId: number) {
    try {
      return await this.storage.getUserContacts(userId);
    } catch (error) {
      console.error(`Error in getUserContacts(${userId}):`, error);
      return [];
    }
  }
  
  async addUserContact(userId: number, contactId: number) {
    try {
      return await this.storage.addUserContact(userId, contactId);
    } catch (error) {
      console.error(`Error in addUserContact(${userId}, ${contactId}):`, error);
      throw error;
    }
  }
  
  async removeUserContact(userId: number, contactId: number) {
    try {
      return await this.storage.removeUserContact(userId, contactId);
    } catch (error) {
      console.error(`Error in removeUserContact(${userId}, ${contactId}):`, error);
      return false;
    }
  }
  
  // Search users by username or email
  async searchUsers(query: string, currentUserId: number) {
    try {
      // Validate inputs to prevent SQL errors
      if (isNaN(currentUserId)) {
        console.error("Invalid currentUserId (NaN) in searchUsers");
        return [];
      }
      
      // Use underlying storage if available
      if (typeof this.storage.searchUsers === 'function') {
        return await this.storage.searchUsers(query, currentUserId);
      }
      
      // Fallback implementation if not in the underlying storage
      const { and, or, sql, ne } = await import('drizzle-orm');
      const { db } = await import('./db');
      const { users } = await import('@shared/schema');
      
      if (!query || query.length < 2) {
        return [];
      }
      
      console.log(`Executing search query for: "${query}" with currentUserId: ${currentUserId}`);
      
      // Search by username, email, or full name
      const searchResults = await db.select()
        .from(users)
        .where(
          and(
            // Don't include the current user in results
            ne(users.id, currentUserId),
            // Search by username, email or fullName
            or(
              sql`LOWER(${users.username}) LIKE ${`%${query.toLowerCase()}%`}`,
              sql`LOWER(${users.email}) LIKE ${`%${query.toLowerCase()}%`}`,
              sql`LOWER(COALESCE(${users.fullName}, '')) LIKE ${`%${query.toLowerCase()}%`}`
            )
          )
        )
        .limit(10); // Limit to 10 results for performance
      
      console.log(`Found ${searchResults.length} results for query "${query}"`);
      return searchResults;
    } catch (error) {
      console.error(`Error in searchUsers(${query}, ${currentUserId}):`, error);
      return [];
    }
  }
  
  // Message operations
  async getMessagesBetweenUsers(userId1: number, userId2: number) {
    try {
      return await this.storage.getMessagesBetweenUsers(userId1, userId2);
    } catch (error) {
      console.error(`Error in getMessagesBetweenUsers(${userId1}, ${userId2}):`, error);
      return [];
    }
  }
  
  async markMessagesAsRead(recipientId: number, senderId: number) {
    try {
      return await this.storage.markMessagesAsRead(recipientId, senderId);
    } catch (error) {
      console.error(`Error in markMessagesAsRead(${recipientId}, ${senderId}):`, error);
      return false;
    }
  }

  // Support ticket methods
  async getAllSupportTickets() {
    try {
      const tickets = await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
      return tickets;
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      return [];
    }
  }

  async createSupportTicket(ticketData: any) {
    try {
      const [ticket] = await db.insert(supportTickets).values({
        userId: ticketData.userId,
        userName: ticketData.userName,
        userEmail: ticketData.userEmail,
        title: ticketData.title,
        description: ticketData.description,
        category: ticketData.category,
        priority: ticketData.priority || 'medium',
        status: 'open',
        jobId: ticketData.jobId || null
      }).returning();
      return ticket;
    } catch (error) {
      console.error('Error creating support ticket:', error);
      throw error;
    }
  }

  async deleteSupportTicket(ticketId: number) {
    try {
      const [deletedTicket] = await db.delete(supportTickets)
        .where(eq(supportTickets.id, ticketId))
        .returning();
      return deletedTicket;
    } catch (error) {
      console.error('Error deleting support ticket:', error);
      throw error;
    }
  }

  async updateSupportTicket(ticketId: number, updates: any) {
    try {
      const [updatedTicket] = await db.update(supportTickets)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(supportTickets.id, ticketId))
        .returning();
      return updatedTicket;
    } catch (error) {
      console.error('Error updating support ticket:', error);
      throw error;
    }
  }

  // Support ticket messages methods for Ultrabug Prompt 2
  async getSupportTicketMessages(ticketId: number) {
    try {
      const messages = await db.select({
        id: supportMessages.id,
        ticketId: supportMessages.ticketId,
        senderId: supportMessages.senderId,
        message: supportMessages.message,
        isInternal: supportMessages.isInternal,
        attachmentUrl: supportMessages.attachmentUrl,
        createdAt: supportMessages.createdAt,
        senderName: users.fullName,
        senderType: sql<string>`CASE WHEN ${users.isAdmin} = true THEN 'admin' ELSE 'user' END`
      })
      .from(supportMessages)
      .leftJoin(users, eq(supportMessages.senderId, users.id))
      .where(eq(supportMessages.ticketId, ticketId))
      .orderBy(supportMessages.createdAt);
      
      return messages;
    } catch (error) {
      console.error('Error fetching support ticket messages:', error);
      return [];
    }
  }

  async createSupportTicketMessage(messageData: any) {
    try {
      const [message] = await db.insert(supportMessages).values({
        ticketId: messageData.ticketId,
        senderId: messageData.senderId,
        message: messageData.message,
        isInternal: messageData.isInternal || false,
        attachmentUrl: messageData.attachmentUrl || null
      }).returning();
      return message;
    } catch (error) {
      console.error('Error creating support ticket message:', error);
      throw error;
    }
  }

  async getSupportTicketById(ticketId: number) {
    try {
      const [ticket] = await db.select()
        .from(supportTickets)
        .where(eq(supportTickets.id, ticketId));
      return ticket;
    } catch (error) {
      console.error('Error fetching support ticket by ID:', error);
      return null;
    }
  }

  async assignSupportTicket(ticketId: number, adminId: number) {
    try {
      const [updatedTicket] = await db.update(supportTickets)
        .set({
          assignedTo: adminId,
          status: 'in_progress',
          updatedAt: new Date()
        })
        .where(eq(supportTickets.id, ticketId))
        .returning();
      return updatedTicket;
    } catch (error) {
      console.error('Error assigning support ticket:', error);
      throw error;
    }
  }

  // Enhanced user management methods for Ultrabug Prompt 3
  async safeDeleteUser(userId: number) {
    try {
      // Begin transaction for safe deletion
      const result = await db.transaction(async (tx) => {
        // Get user info first
        const [user] = await tx.select().from(users).where(eq(users.id, userId));
        if (!user) {
          throw new Error('User not found');
        }

        // Handle related records
        // 1. Anonymize reviews instead of deleting
        await tx.update(reviews).set({
          reviewerName: 'Anonymous User',
          reviewText: '[User account deleted]'
        }).where(eq(reviews.reviewerId, userId));

        // 2. Cancel active jobs posted by user
        await tx.update(jobs).set({
          status: 'cancelled'
        }).where(eq(jobs.posterId, userId));

        // 3. Cancel applications by user
        await tx.update(applications).set({
          status: 'cancelled'
        }).where(eq(applications.workerId, userId));

        // 4. Delete user's payments and earnings (keep for audit)
        // Note: We keep financial records for legal compliance

        // 5. Delete notifications
        await tx.delete(notifications).where(eq(notifications.userId, userId));

        // 6. Delete contacts
        await tx.delete(contacts).where(eq(contacts.userId, userId));

        // 7. Finally delete the user
        const [deletedUser] = await tx.delete(users)
          .where(eq(users.id, userId))
          .returning();

        return deletedUser;
      });

      return result;
    } catch (error) {
      console.error('Error safely deleting user:', error);
      throw error;
    }
  }

  async updateUserAccountType(userId: number, newAccountType: string) {
    try {
      const [updatedUser] = await db.update(users)
        .set({
          accountType: newAccountType,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error('Error updating user account type:', error);
      throw error;
    }
  }

  async updateUserVerificationStatus(userId: number, verificationData: any) {
    try {
      const updateData: any = {};
      
      if (verificationData.emailVerified !== undefined) {
        updateData.emailVerified = verificationData.emailVerified;
      }
      if (verificationData.phoneVerified !== undefined) {
        updateData.phoneVerified = verificationData.phoneVerified;
      }
      if (verificationData.identityVerified !== undefined) {
        updateData.identityVerified = verificationData.identityVerified;
      }
      
      updateData.updatedAt = new Date();

      const [updatedUser] = await db.update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error('Error updating user verification status:', error);
      throw error;
    }
  }

  async toggleUserAdminStatus(userId: number, isAdmin: boolean, isSuperAdmin: boolean = false) {
    try {
      const [updatedUser] = await db.update(users)
        .set({
          isAdmin,
          isSuperAdmin,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error('Error updating user admin status:', error);
      throw error;
    }
  }

  async bulkUpdateUsers(userIds: number[], updateData: any) {
    try {
      const results = [];
      for (const userId of userIds) {
        const [updatedUser] = await db.update(users)
          .set({
            ...updateData,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId))
          .returning();
        results.push(updatedUser);
      }
      return results;
    } catch (error) {
      console.error('Error bulk updating users:', error);
      throw error;
    }
  }

  async getUserStats() {
    try {
      const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(users);
      const [activeUsers] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isActive, true));
      const [verifiedUsers] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.emailVerified, true));
      const [adminUsers] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isAdmin, true));

      return {
        total: totalUsers.count,
        active: activeUsers.count,
        verified: verifiedUsers.count,
        admins: adminUsers.count
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return { total: 0, active: 0, verified: 0, admins: 0 };
    }
  }
}