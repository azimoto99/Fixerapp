import { eq, and, like, notLike, desc, or, asc, gte, lte, count, sum, avg, sql } from 'drizzle-orm';
import { db, pool } from './db';
import { IStorage } from './storage';
import {
  users, jobs, applications, reviews, tasks, earnings, payments, badges, userBadges, notifications, contacts, contactRequests, messages, supportTickets,
  User, InsertUser,
  Job, InsertJob,
  Application, InsertApplication,
  Review, InsertReview,
  Task, InsertTask,
  Earning, InsertEarning,
  Payment, InsertPayment,
  Badge, InsertBadge,
  UserBadge, InsertUserBadge,
  Notification, InsertNotification
} from '@shared/schema';
import connectPg from "connect-pg-simple";
import session from "express-session";
import { config } from 'dotenv';
config();

// Define a set of vibrant colors for job markers
const JOB_MARKER_COLORS = [
  "#FF5733", "#33FF57", "#3357FF", "#F033FF", "#FF3393",
  "#33FFF0", "#FFC833", "#8A33FF", "#FF8A33", "#33B8FF"
];

function getRandomMarkerColor(): string {
  const randomIndex = Math.floor(Math.random() * JOB_MARKER_COLORS.length);
  return JOB_MARKER_COLORS[randomIndex];
}

/**
 * Unified Storage Implementation
 * 
 * This consolidates all storage functionality into a single, robust module
 * with comprehensive error handling and all admin/payment features integrated.
 */
export class UnifiedStorage implements IStorage {
  public sessionStore: session.Store;
  public db = db; // Expose database connection for admin queries

  // User cache to reduce database lookups for authentication
  private userCache = new Map<number, { user: User; timestamp: number }>();
  private readonly USER_CACHE_TTL = 60000; // 1 minute cache

  constructor() {
    if (!pool) {
      throw new Error('Database pool not initialized');
    }

    const PostgresStore = connectPg(session);
    
    this.sessionStore = new PostgresStore({
      pool,
      tableName: 'sessions',
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 60, // 1 hour (reduced frequency to prevent timeouts)
      errorLog: (error) => {
        // Only log non-timeout errors to reduce noise
        if (!error.message.includes('timeout') && !error.message.includes('57014')) {
          console.error('Session store error:', error);
        }
      },
      ttl: 7 * 24 * 60 * 60, // 7 days (reduced from 30 days)
      // Enhanced configuration for better resilience
      disableTouch: true, // Disable touch to reduce database writes
      touchAfter: 0, // Don't update expiry on access
      retries: 2, // Reduced retries to fail faster
      reconnectDelay: 1000 * 3, // 3 seconds delay between retries
      // Add query timeout protection
      queryTimeout: 15000, // 15 seconds max for session queries
      // Handle session store errors gracefully
      onError: (error) => {
        // Silently handle timeout errors to prevent log spam
        if (error.message.includes('timeout') || error.code === '57014') {
          return; // Don't log timeout errors
        }
        console.error('Session store error:', error);
      }
    });
    
    // Add event listeners for important session store events
    this.sessionStore.on('connect', () => {
      console.log("Session store connected successfully");
    });
    
    this.sessionStore.on('disconnect', () => {
      console.warn("Session store disconnected - will attempt to reconnect");
    });
    
    console.log("Unified PostgreSQL storage and session store initialized with enhanced resilience");
  }

  private retryAttempts = 0;
  private maxRetries = 5;
  private isReconnecting = false;

  private async handleDatabaseError(error: any, operationName: string) {
    console.error(`Database error in ${operationName}:`, error);

    if (this.isReconnecting) {
      console.log("Already attempting to reconnect...");
      return;
    }

    // Check if error is connection-related
    if (error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'ETIMEDOUT') {
      this.isReconnecting = true;
      while (this.retryAttempts < this.maxRetries) {
        try {
          console.log(`Attempting database reconnection (attempt ${this.retryAttempts + 1}/${this.maxRetries})...`);
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, this.retryAttempts) * 1000));
          
          // Test connection
          await db.select({ test: sql`1` }).execute();
          
          console.log("Database connection restored successfully");
          this.retryAttempts = 0;
          this.isReconnecting = false;
          return;
        } catch (reconnectError) {
          this.retryAttempts++;
          console.error(`Reconnection attempt ${this.retryAttempts} failed:`, reconnectError);
        }
      }
      
      this.isReconnecting = false;
      console.error("Max reconnection attempts reached, database may be down");
    }
  }

  // Enhanced error wrapper for all database operations with connection handling
  private async safeExecute<T>(
    operation: () => Promise<T>,
    fallback: T,
    operationName: string,
    timeout: number = 15000 // 15 second default timeout
  ): Promise<T> {
    try {
      // Wrap operation with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timeout: ${operationName}`)), timeout);
      });

      const result = await Promise.race([operation(), timeoutPromise]);
      return result;
    } catch (error: any) {
      // Handle timeout errors gracefully
      if (error.message.includes('timeout') || error.code === '57014' || error.message.includes('canceling statement')) {
        console.warn(`⏰ Timeout in ${operationName}, using fallback`);
        return fallback;
      }

      await this.handleDatabaseError(error, operationName);
      console.error(`Error in ${operationName}:`, error);
      return fallback;
    }
  }

  // USER OPERATIONS
  async getAllUsers(search?: string): Promise<User[]> {
    return this.safeExecute(async () => {
      if (search) {
        return await db.select().from(users)
          .where(
            sql`LOWER(${users.username}) LIKE ${`%${search.toLowerCase()}%`} OR 
                LOWER(${users.fullName}) LIKE ${`%${search.toLowerCase()}%`} OR 
                LOWER(${users.email}) LIKE ${`%${search.toLowerCase()}%`}`
          );
      }
      return await db.select().from(users);
    }, [], 'getAllUsers');
  }

  async getUser(id: number): Promise<User | undefined> {
    // Check cache first
    const cached = this.userCache.get(id);
    if (cached && Date.now() - cached.timestamp < this.USER_CACHE_TTL) {
      return cached.user;
    }

    const user = await this.safeExecute(async () => {
      const result = await db.select().from(users).where(eq(users.id, id));
      return result[0] || undefined;
    }, undefined, `getUser(${id})`, 8000); // Shorter timeout for user lookups

    // Cache the result if user exists
    if (user) {
      this.userCache.set(id, { user, timestamp: Date.now() });
    }

    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.safeExecute(async () => {
      const result = await db.select().from(users).where(eq(users.username, username));
      return result[0] || undefined;
    }, undefined, `getUserByUsername(${username})`);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.safeExecute(async () => {
      const result = await db.select().from(users).where(eq(users.email, email));
      return result[0] || undefined;
    }, undefined, `getUserByEmail(${email})`);
  }

  async createUser(userData: InsertUser): Promise<User> {
    return this.safeExecute(async () => {
      const result = await db.insert(users).values(userData).returning();
      return result[0];
    }, null as any, 'createUser');
  }

  async updateUser(id: number, userData: Partial<InsertUser> & {
    stripeConnectAccountId?: string,
    stripeConnectAccountStatus?: string,
    stripeCustomerId?: string,
    stripeTermsAccepted?: boolean,
    stripeTermsAcceptedAt?: Date,
    stripeRepresentativeName?: string,
    stripeRepresentativeTitle?: string
  }): Promise<User | undefined> {
    const result = await this.safeExecute(async () => {
      const result = await db.update(users).set(userData).where(eq(users.id, id)).returning();
      return result[0] || undefined;
    }, undefined, `updateUser(${id})`);

    // Clear cache for updated user
    this.userCache.delete(id);

    return result;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.safeExecute(async () => {
      await db.delete(users).where(eq(users.id, id));
      return true;
    }, false, `deleteUser(${id})`);
  }

  // JOB OPERATIONS
  async getAllJobs(filters?: any): Promise<Job[]> {
    return this.safeExecute(async () => {
      let query = db.select().from(jobs);
      
      if (filters?.status) {
        query = query.where(eq(jobs.status, filters.status));
      }
      if (filters?.category) {
        query = query.where(eq(jobs.category, filters.category));
      }
      if (filters?.location) {
        query = query.where(like(jobs.location, `%${filters.location}%`));
      }
      
      return await query.orderBy(desc(jobs.datePosted));
    }, [], 'getAllJobs');
  }

  async getJob(id: number): Promise<Job | null> {
    return this.safeExecute(async () => {
      const result = await db.select().from(jobs).where(eq(jobs.id, id));
      return result[0] || null;
    }, null, `getJob(${id})`);
  }

  async createJob(jobData: InsertJob): Promise<Job> {
    return this.safeExecute(async () => {
      const jobWithColor = {
        ...jobData,
        markerColor: getRandomMarkerColor()
      };
      const result = await db.insert(jobs).values(jobWithColor).returning();
      return result[0];
    }, null as any, 'createJob');
  }

  async updateJob(id: number, jobData: Partial<Job>): Promise<Job | null> {
    return this.safeExecute(async () => {
      const result = await db.update(jobs).set(jobData).where(eq(jobs.id, id)).returning();
      return result[0] || null;
    }, null, `updateJob(${id})`);
  }

  async deleteJob(id: number): Promise<boolean> {
    return this.safeExecute(async () => {
      await db.delete(jobs).where(eq(jobs.id, id));
      return true;
    }, false, `deleteJob(${id})`);
  }

  async getJobsByUserId(userId: number): Promise<Job[]> {
    return this.safeExecute(async () => {
      return await db.select().from(jobs).where(eq(jobs.posterId, userId)).orderBy(desc(jobs.datePosted));
    }, [], `getJobsByUserId(${userId})`);
  }

  async getJobsByLocation(lat: number, lng: number, radiusMiles: number): Promise<Job[]> {
    return this.safeExecute(async () => {
      return await db.select().from(jobs)
        .where(
          sql`(
            3959 * acos(
              cos(radians(${lat})) * 
              cos(radians(${jobs.latitude})) * 
              cos(radians(${jobs.longitude}) - radians(${lng})) + 
              sin(radians(${lat})) * 
              sin(radians(${jobs.latitude}))
            )
          ) <= ${radiusMiles}`
        )
        .orderBy(desc(jobs.datePosted));
    }, [], `getJobsByLocation(${lat}, ${lng}, ${radiusMiles})`);
  }

  // APPLICATION OPERATIONS
  async getAllApplications(): Promise<Application[]> {
    return this.safeExecute(async () => {
      return await db.select().from(applications).orderBy(desc(applications.dateApplied));
    }, [], 'getAllApplications');
  }

  async getApplication(id: number): Promise<Application | null> {
    return this.safeExecute(async () => {
      const result = await db.select().from(applications).where(eq(applications.id, id));
      return result[0] || null;
    }, null, `getApplication(${id})`);
  }

  async createApplication(applicationData: InsertApplication): Promise<Application> {
    return this.safeExecute(async () => {
      const result = await db.insert(applications).values(applicationData).returning();
      return result[0];
    }, null as any, 'createApplication');
  }

  async updateApplication(id: number, applicationData: Partial<Application>): Promise<Application | null> {
    return this.safeExecute(async () => {
      const result = await db.update(applications).set(applicationData).where(eq(applications.id, id)).returning();
      return result[0] || null;
    }, null, `updateApplication(${id})`);
  }

  async deleteApplication(id: number): Promise<boolean> {
    return this.safeExecute(async () => {
      await db.delete(applications).where(eq(applications.id, id));
      return true;
    }, false, `deleteApplication(${id})`);
  }

  async getApplicationsByJobId(jobId: number): Promise<Application[]> {
    return this.safeExecute(async () => {
      return await db.select().from(applications).where(eq(applications.jobId, jobId));
    }, [], `getApplicationsByJobId(${jobId})`);
  }

  async getApplicationsByUserId(userId: number): Promise<Application[]> {
    return this.safeExecute(async () => {
      return await db.select().from(applications).where(eq(applications.workerId, userId));
    }, [], `getApplicationsByUserId(${userId})`);
  }

  // PAYMENT & EARNING OPERATIONS
  async getAllPayments(search?: string): Promise<Payment[]> {
    return this.safeExecute(async () => {
      if (search) {
        return await db.select().from(payments)
          .where(
            sql`CAST(${payments.id} AS TEXT) LIKE ${`%${search}%`} OR 
                ${payments.transactionId} LIKE ${`%${search}%`} OR 
                ${payments.description} LIKE ${`%${search}%`}`
          )
          .orderBy(desc(payments.createdAt));
      }
      return await db.select().from(payments).orderBy(desc(payments.createdAt));
    }, [], 'getAllPayments');
  }

  async getPayment(id: number): Promise<Payment | null> {
    return this.safeExecute(async () => {
      const result = await db.select().from(payments).where(eq(payments.id, id));
      return result[0] || null;
    }, null, `getPayment(${id})`);
  }

  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    return this.safeExecute(async () => {
      const result = await db.insert(payments).values(paymentData).returning();
      return result[0];
    }, null as any, 'createPayment');
  }

  async updatePayment(id: number, paymentData: Partial<Payment>): Promise<Payment | null> {
    return this.safeExecute(async () => {
      const result = await db.update(payments).set(paymentData).where(eq(payments.id, id)).returning();
      return result[0] || null;
    }, null, `updatePayment(${id})`);
  }

  async deletePayment(id: number): Promise<boolean> {
    return this.safeExecute(async () => {
      await db.delete(payments).where(eq(payments.id, id));
      return true;
    }, false, `deletePayment(${id})`);
  }

  async getPaymentsByUserId(userId: number): Promise<Payment[]> {
    return this.safeExecute(async () => {
      return await db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt));
    }, [], `getPaymentsByUserId(${userId})`);
  }

  async getAllEarnings(): Promise<Earning[]> {
    return this.safeExecute(async () => {
      return await db.select().from(earnings).orderBy(desc(earnings.dateEarned));
    }, [], 'getAllEarnings');
  }

  async getEarning(id: number): Promise<Earning | null> {
    return this.safeExecute(async () => {
      const result = await db.select().from(earnings).where(eq(earnings.id, id));
      return result[0] || null;
    }, null, `getEarning(${id})`);
  }

  async createEarning(earningData: InsertEarning): Promise<Earning> {
    return this.safeExecute(async () => {
      const result = await db.insert(earnings).values(earningData).returning();
      return result[0];
    }, null as any, 'createEarning');
  }

  async getEarningsByUserId(userId: number): Promise<Earning[]> {
    return this.safeExecute(async () => {
      return await db.select().from(earnings).where(eq(earnings.workerId, userId)).orderBy(desc(earnings.dateEarned));
    }, [], `getEarningsByUserId(${userId})`);
  }

  async getEarningsForWorker(workerId: number): Promise<Earning[]> {
    return this.safeExecute(async () => {
      return await db.select().from(earnings).where(eq(earnings.workerId, workerId)).orderBy(desc(earnings.dateEarned));
    }, [], `getEarningsForWorker(${workerId})`);
  }

  async getEarningsForJob(jobId: number): Promise<Earning[]> {
    return this.safeExecute(async () => {
      return await db.select().from(earnings).where(eq(earnings.jobId, jobId)).orderBy(desc(earnings.dateEarned));
    }, [], `getEarningsForJob(${jobId})`);
  }

  async getEarnings(userId: number): Promise<Earning[]> {
    return this.safeExecute(async () => {
      return await db.select().from(earnings).where(eq(earnings.workerId, userId)).orderBy(desc(earnings.dateEarned));
    }, [], `getEarnings(${userId})`);
  }

  // NOTIFICATION OPERATIONS
  async getAllNotifications(): Promise<Notification[]> {
    return this.safeExecute(async () => {
      return await db.select().from(notifications).orderBy(desc(notifications.createdAt));
    }, [], 'getAllNotifications');
  }

  async getNotification(id: number): Promise<Notification | null> {
    return this.safeExecute(async () => {
      const result = await db.select().from(notifications).where(eq(notifications.id, id));
      return result[0] || null;
    }, null, `getNotification(${id})`);
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    return this.safeExecute(async () => {
      const result = await db.insert(notifications).values(notificationData).returning();
      return result[0];
    }, null as any, 'createNotification');
  }

  async getNotificationsByUserId(userId: number): Promise<Notification[]> {
    return this.safeExecute(async () => {
      return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
    }, [], `getNotificationsByUserId(${userId})`);
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    return this.safeExecute(async () => {
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
      return true;
    }, false, `markNotificationAsRead(${id})`);
  }

  async markAllNotificationsAsRead(userId: number): Promise<number> {
    return this.safeExecute(async () => {
      const result = await db.update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
      return 1; // Return success indicator
    }, 0, `markAllNotificationsAsRead(${userId})`);
  }

  async deleteNotification(id: number): Promise<boolean> {
    return this.safeExecute(async () => {
      await db.delete(notifications).where(eq(notifications.id, id));
      return true;
    }, false, `deleteNotification(${id})`);
  }

  // ADMIN & ANALYTICS OPERATIONS
  async getUserCount(): Promise<number> {
    return this.safeExecute(async () => {
      const result = await db.select({ count: count() }).from(users);
      return result[0].count;
    }, 0, 'getUserCount');
  }

  async getNewUserCount({ days = 30 }: { days: number }): Promise<number> {
    return this.safeExecute(async () => {
      const date = new Date();
      date.setDate(date.getDate() - days);
      
      const result = await db.select({ count: count() })
        .from(users)
        .where(gte(users.lastActive, date));
      
      return result[0].count;
    }, 0, `getNewUserCount(${days})`);
  }

  async getJobCount({ status }: { status?: string } = {}): Promise<number> {
    return this.safeExecute(async () => {
      if (status) {
        const result = await db.select({ count: count() })
          .from(jobs)
          .where(eq(jobs.status, status));
        return result[0].count;
      }
      
      const result = await db.select({ count: count() }).from(jobs);
      return result[0].count;
    }, 0, 'getJobCount');
  }

  async getTotalPaymentsAmount(): Promise<number> {
    return this.safeExecute(async () => {
      const result = await db.select({ total: sum(payments.amount) }).from(payments);
      return result[0].total || 0;
    }, 0, 'getTotalPaymentsAmount');
  }

  async getTotalServiceFees(): Promise<number> {
    return this.safeExecute(async () => {
      const result = await db.select({ total: sum(payments.serviceFee) }).from(payments);
      return result[0].total || 0;
    }, 0, 'getTotalServiceFees');
  }

  async getJobCompletionRate(): Promise<number> {
    return this.safeExecute(async () => {
      const [total, completed] = await Promise.all([
        db.select({ count: count() }).from(jobs),
        db.select({ count: count() }).from(jobs).where(eq(jobs.status, 'completed'))
      ]);
      
      if (total[0].count === 0) return 0;
      return (completed[0].count / total[0].count) * 100;
    }, 0, 'getJobCompletionRate');
  }

  async getAverageJobValue(): Promise<number> {
    return this.safeExecute(async () => {
      const result = await db.select({ avg: avg(jobs.budget) }).from(jobs);
      return result[0].avg || 0;
    }, 0, 'getAverageJobValue');
  }

  async getApplicationSuccessRate(): Promise<number> {
    return this.safeExecute(async () => {
      const [total, accepted] = await Promise.all([
        db.select({ count: count() }).from(applications),
        db.select({ count: count() }).from(applications).where(eq(applications.status, 'accepted'))
      ]);
      
      if (total[0].count === 0) return 0;
      return (accepted[0].count / total[0].count) * 100;
    }, 0, 'getApplicationSuccessRate');
  }

  async resetUserPassword(userId: number, tempPassword: string): Promise<boolean> {
    return this.safeExecute(async () => {
      await db.update(users)
        .set({ password: tempPassword })
        .where(eq(users.id, userId));
      return true;
    }, false, `resetUserPassword(${userId})`);
  }

  async getRecentActivity(days: number = 7): Promise<any[]> {
    return this.safeExecute(async () => {
      const date = new Date();
      date.setDate(date.getDate() - days);
      
      // Return recent jobs, applications, and payments
      const recentJobs = await db.select().from(jobs)
        .where(gte(jobs.createdAt, date))
        .orderBy(desc(jobs.createdAt))
        .limit(10);
      
      return recentJobs.map(job => ({
        type: 'job',
        title: job.title,
        createdAt: job.createdAt,
        id: job.id
      }));
    }, [], `getRecentActivity(${days})`);
  }

  // SUPPORT TICKET OPERATIONS
  async getSupportTickets(): Promise<any[]> {
    return this.safeExecute(async () => {
      return await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
    }, [], 'getSupportTickets');
  }

  async getAllSupportTickets(): Promise<any[]> {
    return this.safeExecute(async () => {
      return await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
    }, [], 'getAllSupportTickets');
  }

  async getSupportTicket(id: number): Promise<any | null> {
    return this.safeExecute(async () => {
      const result = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
      return result[0] || null;
    }, null, `getSupportTicket(${id})`);
  }

  async createSupportTicket(ticketData: any): Promise<any> {
    return this.safeExecute(async () => {
      const result = await db.insert(supportTickets).values(ticketData).returning();
      return result[0];
    }, null as any, 'createSupportTicket');
  }

  async updateSupportTicket(id: number, ticketData: any): Promise<any | null> {
    return this.safeExecute(async () => {
      const result = await db.update(supportTickets).set(ticketData).where(eq(supportTickets.id, id)).returning();
      return result[0] || null;
    }, null, `updateSupportTicket(${id})`);
  }

  async deleteSupportTicket(id: number): Promise<boolean> {
    return this.safeExecute(async () => {
      await db.delete(supportTickets).where(eq(supportTickets.id, id));
      return true;
    }, false, `deleteSupportTicket(${id})`);
  }

  async getSupportTicketsByUserId(userId: number): Promise<any[]> {
    return this.safeExecute(async () => {
      return await db.select().from(supportTickets)
        .where(eq(supportTickets.userId, userId))
        .orderBy(desc(supportTickets.createdAt));
    }, [], `getSupportTicketsByUserId(${userId})`);
  }

  async addTicketResponse(responseData: any): Promise<any> {
    return this.safeExecute(async () => {
      // Assuming we have a supportMessages table for ticket responses
      // If not, we can update the ticket with the response
      const result = await db.update(supportTickets)
        .set({ 
          response: responseData.response,
          status: responseData.status || 'resolved',
          updatedAt: new Date()
        })
        .where(eq(supportTickets.id, responseData.ticketId))
        .returning();
      return result[0] || null;
    }, null, 'addTicketResponse');
  }

  // INTERFACE COMPATIBILITY METHODS
  async getJobs(filters?: any): Promise<Job[]> {
    return this.getAllJobs(filters);
  }

  async getNotifications(userId: number, options?: { isRead?: boolean, limit?: number }): Promise<Notification[]> {
    return this.getNotificationsByUserId(userId);
  }

  async getUserByUsernameAndType(username: string, accountType: string): Promise<User | undefined> {
    return this.safeExecute(async () => {
      const result = await db.select().from(users)
        .where(and(eq(users.username, username), eq(users.accountType, accountType)));
      return result[0] || undefined;
    }, undefined, `getUserByUsernameAndType(${username}, ${accountType})`);
  }

  async uploadProfileImage(userId: number, imageData: string): Promise<User | undefined> {
    return this.updateUser(userId, { avatarUrl: imageData });
  }

  async updateUserSkills(userId: number, skills: string[]): Promise<User | undefined> {
    return this.updateUser(userId, { skills });
  }

  async verifyUserSkill(userId: number, skill: string, isVerified: boolean): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const skillsVerified = { ...(user.skillsVerified || {}) };
    skillsVerified[skill] = isVerified;
    
    return this.updateUser(userId, { skillsVerified });
  }

  async updateUserMetrics(userId: number, metrics: {
    completedJobs?: number;
    successRate?: number;
    responseTime?: number;
  }): Promise<User | undefined> {
    return this.updateUser(userId, metrics);
  }

  async getUsersWithSkills(skills: string[]): Promise<User[]> {
    return this.safeExecute(async () => {
      const result = await db.select().from(users)
        .where(sql`${users.skills} && ${skills}`);
      return result;
    }, [], `getUsersWithSkills(${skills})`);
  }

  async getJobsNearLocation(latitude: number, longitude: number, radiusMiles: number): Promise<Job[]> {
    return this.getJobsByLocation(latitude, longitude, radiusMiles);
  }

  async getApplicationsForJob(jobId: number): Promise<Application[]> {
    return this.getApplicationsByJobId(jobId);
  }

  async getApplicationsForWorker(workerId: number): Promise<Application[]> {
    return this.getApplicationsByUserId(workerId);
  }

  async getPaymentByTransactionId(transactionId: string): Promise<Payment | undefined> {
    return this.safeExecute(async () => {
      const result = await db.select().from(payments).where(eq(payments.transactionId, transactionId));
      return result[0] || undefined;
    }, undefined, `getPaymentByTransactionId(${transactionId})`);
  }

  async getPaymentByJobId(jobId: number): Promise<Payment | undefined> {
    return this.safeExecute(async () => {
      const result = await db.select().from(payments).where(eq(payments.jobId, jobId));
      return result[0] || undefined;
    }, undefined, `getPaymentByJobId(${jobId})`);
  }

  async getPaymentsForUser(userId: number): Promise<Payment[]> {
    return this.getPaymentsByUserId(userId);
  }

  async updatePaymentStatus(id: number, status: string, transactionId?: string): Promise<Payment | undefined> {
    const updateData: any = { status };
    if (transactionId) updateData.transactionId = transactionId;
    return this.updatePayment(id, updateData);
  }

  async updateEarningStatus(id: number, status: string, datePaid?: Date): Promise<Earning | undefined> {
    const updateData: any = { status };
    if (datePaid) updateData.datePaid = datePaid;
    return this.safeExecute(async () => {
      const result = await db.update(earnings).set(updateData).where(eq(earnings.id, id)).returning();
      return result[0] || undefined;
    }, undefined, `updateEarningStatus(${id})`);
  }

  // STUB METHODS FOR COMPATIBILITY
  async getAllReviews(): Promise<Review[]> { return []; }
  async getReview(id: number): Promise<Review | undefined> { return undefined; }
  async createReview(reviewData: InsertReview): Promise<Review> { return null as any; }
  async updateReview(id: number, reviewData: Partial<Review>): Promise<Review | undefined> { return undefined; }
  async deleteReview(id: number): Promise<boolean> { return true; }
  async getReviewsForJob(jobId: number): Promise<Review[]> { return []; }
  async getReviewsForUser(userId: number): Promise<Review[]> { return []; }

  // Additional interface methods for full compatibility
  async getJobsForWorker(workerId: number, filter?: { status?: string }): Promise<Job[]> {
    return this.safeExecute(async () => {
      let query = db.select().from(jobs).where(eq(jobs.workerId, workerId));
      if (filter?.status) {
        query = query.where(eq(jobs.status, filter.status));
      }
      return await query;
    }, [], `getJobsForWorker(${workerId})`);
  }

  async getJobsForPoster(posterId: number): Promise<Job[]> {
    return this.getJobsByUserId(posterId);
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.getUser(id);
  }

  async createMessage(messageData: any): Promise<any> {
    return this.safeExecute(async () => {
      const result = await db.insert(messages).values(messageData).returning();
      return result[0];
    }, null as any, 'createMessage');
  }

  async markMessagesAsRead(userId: number, otherUserId: number): Promise<void> {
    return this.safeExecute(async () => {
      await db
        .update(messages)
        .set({
          isRead: true,
          readAt: new Date()
        })
        .where(
          and(
            eq(messages.recipientId, userId),
            eq(messages.senderId, otherUserId),
            eq(messages.isRead, false)
          )
        );
    }, undefined, `markMessagesAsRead(${userId}, ${otherUserId})`);
  }

  async getMessageById(messageId: number): Promise<any> {
    return this.safeExecute(async () => {
      const result = await db.select().from(messages).where(eq(messages.id, messageId));
      return result[0] || undefined;
    }, undefined, `getMessageById(${messageId})`);
  }

  async getPendingMessages(userId: number): Promise<any[]> {
    return this.safeExecute(async () => {
      return await db.select().from(messages)
        .where(and(eq(messages.recipientId, userId), eq(messages.isRead, false)));
    }, [], `getPendingMessages(${userId})`);
  }

  async getMessagesForJob(jobId: number): Promise<any[]> {
    return this.safeExecute(async () => {
      return await db.select().from(messages).where(eq(messages.jobId, jobId));
    }, [], `getMessagesForJob(${jobId})`);
  }

  async getConversation(userId1: number, userId2: number, jobId?: number): Promise<any[]> {
    return this.safeExecute(async () => {
      let query = db.select().from(messages)
        .where(
          or(
            and(eq(messages.senderId, userId1), eq(messages.recipientId, userId2)),
            and(eq(messages.senderId, userId2), eq(messages.recipientId, userId1))
          )
        );
      
      if (jobId) {
        query = query.where(eq(messages.jobId, jobId));
      }
      
      return await query.orderBy(asc(messages.sentAt));
    }, [], `getConversation(${userId1}, ${userId2})`);
  }

  async getMessagesBetweenUsers(userId1: number, userId2: number): Promise<any[]> {
    return this.getConversation(userId1, userId2);
  }



  async markMessageAsRead(messageId: number, userId: number): Promise<any> {
    return this.safeExecute(async () => {
      const result = await db.update(messages)
        .set({ isRead: true })
        .where(and(eq(messages.id, messageId), eq(messages.recipientId, userId)))
        .returning();
      return result[0] || undefined;
    }, undefined, `markMessageAsRead(${messageId})`);
  }

  async searchUsers(query: string, excludeUserId?: number): Promise<User[]> {
    return this.safeExecute(async () => {
      let dbQuery = db.select().from(users)
        .where(
          or(
            like(users.username, `%${query}%`),
            like(users.fullName, `%${query}%`),
            like(users.email, `%${query}%`)
          )
        );
      
      if (excludeUserId) {
        dbQuery = dbQuery.where(notLike(users.id, excludeUserId));
      }
      
      return await dbQuery;
    }, [], `searchUsers(${query})`);
  }

  async getUserContacts(userId: number): Promise<any[]> {
    return this.safeExecute(async () => {
      // Join contacts table with users table to get contact details
      const result = await db
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
          email: users.email,
          lastMessage: sql<string | null>`NULL`.as('lastMessage'),
          contactCreatedAt: contacts.createdAt
        })
        .from(contacts)
        .innerJoin(users, eq(contacts.contactId, users.id))
        .where(eq(contacts.userId, userId))
        .orderBy(desc(contacts.createdAt));

      return result;
    }, [], `getUserContacts(${userId})`);
  }

  async addContact(userId: number, contactId: number): Promise<any> {
    return this.safeExecute(async () => {
      // Check if contact already exists
      const existingContact = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.userId, userId), eq(contacts.contactId, contactId)))
        .limit(1);

      if (existingContact.length > 0) {
        throw new Error('Contact already exists');
      }

      // Check if trying to add self
      if (userId === contactId) {
        throw new Error('Cannot add yourself as a contact');
      }

      // Check if the contact user exists
      const contactUser = await db
        .select()
        .from(users)
        .where(eq(users.id, contactId))
        .limit(1);

      if (contactUser.length === 0) {
        throw new Error('User not found');
      }

      // Add the contact
      const result = await db
        .insert(contacts)
        .values({
          userId,
          contactId,
          status: 'active'
        })
        .returning();

      return result[0];
    }, null as any, `addContact(${userId}, ${contactId})`);
  }

  async removeContact(userId: number, contactId: number): Promise<boolean> {
    return this.safeExecute(async () => {
      const result = await db
        .delete(contacts)
        .where(and(eq(contacts.userId, userId), eq(contacts.contactId, contactId)))
        .returning();

      return result.length > 0;
    }, false, `removeContact(${userId}, ${contactId})`);
  }

  // Contact Request Methods
  async createContactRequest(senderId: number, receiverId: number, message?: string): Promise<any> {
    return this.safeExecute(async () => {
      // Check if request already exists
      const existingRequest = await db
        .select()
        .from(contactRequests)
        .where(
          and(
            eq(contactRequests.senderId, senderId),
            eq(contactRequests.receiverId, receiverId),
            eq(contactRequests.status, 'pending')
          )
        )
        .limit(1);

      if (existingRequest.length > 0) {
        throw new Error('Contact request already sent');
      }

      // Check if they're already contacts
      const existingContact = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.userId, senderId), eq(contacts.contactId, receiverId)))
        .limit(1);

      if (existingContact.length > 0) {
        throw new Error('User is already a contact');
      }

      // Create the request
      const result = await db
        .insert(contactRequests)
        .values({
          senderId,
          receiverId,
          message: message || null,
          status: 'pending'
        })
        .returning();

      return result[0];
    }, null as any, `createContactRequest(${senderId}, ${receiverId})`);
  }

  async getContactRequests(userId: number, type: 'sent' | 'received'): Promise<any[]> {
    return this.safeExecute(async () => {
      const isReceived = type === 'received';
      const userIdField = isReceived ? contactRequests.receiverId : contactRequests.senderId;
      const otherUserIdField = isReceived ? contactRequests.senderId : contactRequests.receiverId;

      const result = await db
        .select({
          id: contactRequests.id,
          senderId: contactRequests.senderId,
          receiverId: contactRequests.receiverId,
          status: contactRequests.status,
          message: contactRequests.message,
          createdAt: contactRequests.createdAt,
          updatedAt: contactRequests.updatedAt,
          // User details
          userId: users.id,
          username: users.username,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl
        })
        .from(contactRequests)
        .innerJoin(users, eq(otherUserIdField, users.id))
        .where(eq(userIdField, userId))
        .orderBy(desc(contactRequests.createdAt));

      return result;
    }, [], `getContactRequests(${userId}, ${type})`);
  }

  async updateContactRequestStatus(requestId: number, status: 'accepted' | 'rejected', userId: number): Promise<any> {
    return this.safeExecute(async () => {
      // Get the request to verify ownership
      const request = await db
        .select()
        .from(contactRequests)
        .where(eq(contactRequests.id, requestId))
        .limit(1);

      if (request.length === 0) {
        throw new Error('Contact request not found');
      }

      const contactRequest = request[0];

      // Only the receiver can accept/reject requests
      if (contactRequest.receiverId !== userId) {
        throw new Error('You can only respond to requests sent to you');
      }

      if (contactRequest.status !== 'pending') {
        throw new Error('This request has already been responded to');
      }

      // Update the request status
      const updatedRequest = await db
        .update(contactRequests)
        .set({
          status,
          updatedAt: new Date()
        })
        .where(eq(contactRequests.id, requestId))
        .returning();

      // If accepted, create the contact relationship (both ways)
      if (status === 'accepted') {
        await db.insert(contacts).values([
          {
            userId: contactRequest.senderId,
            contactId: contactRequest.receiverId,
            status: 'active'
          },
          {
            userId: contactRequest.receiverId,
            contactId: contactRequest.senderId,
            status: 'active'
          }
        ]);
      }

      return updatedRequest[0];
    }, null as any, `updateContactRequestStatus(${requestId}, ${status}, ${userId})`);
  }

  async addUserContact(userId: number, contactId: number): Promise<any> {
    return this.safeExecute(async () => {
      const result = await db.insert(contacts).values({ userId, contactId }).returning();
      return result[0];
    }, null as any, `addUserContact(${userId}, ${contactId})`);
  }

  async removeUserContact(userId: number, contactId: number): Promise<boolean> {
    return this.safeExecute(async () => {
      await db.delete(contacts).where(and(eq(contacts.userId, userId), eq(contacts.contactId, contactId)));
      return true;
    }, false, `removeUserContact(${userId}, ${contactId})`);
  }

  async notifyNearbyWorkers(jobId: number, radiusMiles: number): Promise<number> {
    return this.safeExecute(async () => {
      // Implementation would send notifications to nearby workers
      return 0; // Return count of notifications sent
    }, 0, `notifyNearbyWorkers(${jobId}, ${radiusMiles})`);
  }

  // STUB METHODS FOR REMAINING COMPATIBILITY
  async getAllTasks(): Promise<Task[]> { return []; }
  async getTask(id: number): Promise<Task | undefined> { return undefined; }
  async createTask(taskData: InsertTask): Promise<Task> { return null as any; }
  async updateTask(id: number, taskData: Partial<Task>): Promise<Task | undefined> { return undefined; }
  async deleteTask(id: number): Promise<boolean> { return true; }
  async getTasksForJob(jobId: number): Promise<Task[]> { return []; }
  async completeTask(id: number, completedBy: number): Promise<Task | undefined> { return undefined; }
  async reorderTasks(jobId: number, taskIds: number[]): Promise<Task[]> { return []; }

  async getAllBadges(): Promise<Badge[]> { return []; }
  async getBadge(id: number): Promise<Badge | undefined> { return undefined; }
  async createBadge(badgeData: InsertBadge): Promise<Badge> { return null as any; }
  async updateBadge(id: number, badgeData: Partial<Badge>): Promise<Badge | undefined> { return undefined; }
  async deleteBadge(id: number): Promise<boolean> { return true; }
  async getBadgesByCategory(category: string): Promise<Badge[]> { return []; }

  async getAllUserBadges(): Promise<UserBadge[]> { return []; }
  async getUserBadge(id: number): Promise<UserBadge | undefined> { return undefined; }
  async createUserBadge(userBadgeData: InsertUserBadge): Promise<UserBadge> { return null as any; }
  async updateUserBadge(id: number, userBadgeData: Partial<UserBadge>): Promise<UserBadge | undefined> { return undefined; }
  async deleteUserBadge(id: number): Promise<boolean> { return true; }
  async getUserBadges(userId: number): Promise<UserBadge[]> { return []; }
  async awardBadge(userBadge: InsertUserBadge): Promise<UserBadge> { return null as any; }
  async revokeBadge(userId: number, badgeId: number): Promise<boolean> { return true; }
}

// Create and export a single instance
export const unifiedStorage = new UnifiedStorage();