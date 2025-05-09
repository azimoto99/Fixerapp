import { 
  users, 
  jobs, 
  applications, 
  reviews,
  tasks,
  earnings,
  payments,
  badges,
  userBadges,
  notifications,
  type User, 
  type InsertUser, 
  type Job,
  type InsertJob,
  type Application,
  type InsertApplication,
  type Review,
  type InsertReview,
  type Task,
  type InsertTask,
  type Earning,
  type InsertEarning,
  type Payment,
  type InsertPayment,
  type Badge,
  type InsertBadge,
  type UserBadge,
  type InsertUserBadge,
  type Notification,
  type InsertNotification
} from "@shared/schema";

import session from "express-session";
import { db } from "./db";
import { eq, and, or, like, desc, asc, isNotNull, isNull, sql } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

// Storage interface for all CRUD operations
export interface IStorage {
  // Session store for authentication
  sessionStore: session.Store;
  
  // User operations
  getAllUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByUsernameAndType(username: string, accountType: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser> & { 
    stripeConnectAccountId?: string, 
    stripeConnectAccountStatus?: string,
    stripeCustomerId?: string,
    stripeTermsAccepted?: boolean,
    stripeTermsAcceptedAt?: Date,
    stripeRepresentativeName?: string,
    stripeRepresentativeTitle?: string
  }): Promise<User | undefined>;
  uploadProfileImage(userId: number, imageData: string): Promise<User | undefined>;
  updateUserSkills(userId: number, skills: string[]): Promise<User | undefined>;
  verifyUserSkill(userId: number, skill: string, isVerified: boolean): Promise<User | undefined>;
  updateUserMetrics(userId: number, metrics: {
    completedJobs?: number;
    successRate?: number;
    responseTime?: number;
  }): Promise<User | undefined>;
  getUsersWithSkills(skills: string[]): Promise<User[]>;
  
  // Stripe-specific methods
  updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User | undefined>;
  updateStripeConnectAccount(userId: number, connectAccountId: string, connectAccountStatus: string): Promise<User | undefined>;
  updateUserStripeInfo(userId: number, stripeInfo: { 
    stripeCustomerId?: string;
    stripeConnectAccountId?: string;
    stripeConnectAccountStatus?: string;
    stripeTermsAccepted?: boolean;
    stripeTermsAcceptedAt?: Date;
    stripeRepresentativeName?: string;
    stripeRepresentativeTitle?: string;
    stripeRepresentativeRequirementsComplete?: boolean;
    stripeBankingDetailsComplete?: boolean;
  }): Promise<User | undefined>;
  
  // Job operations
  getJob(id: number): Promise<Job | undefined>;
  getJobs(filters?: {
    category?: string;
    status?: string;
    posterId?: number;
    workerId?: number;
    search?: string;
  }): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, data: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: number): Promise<boolean>;
  
  // Jobs by geographical location
  getJobsNearLocation(
    latitude: number, 
    longitude: number, 
    radiusMiles: number
  ): Promise<Job[]>;
  
  // Application operations
  getApplication(id: number): Promise<Application | undefined>;
  getApplicationsForJob(jobId: number): Promise<Application[]>;
  getApplicationsForWorker(workerId: number): Promise<Application[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplication(id: number, data: Partial<InsertApplication>): Promise<Application | undefined>;
  
  // Review operations
  getReview(id: number): Promise<Review | undefined>;
  getReviewsForUser(userId: number): Promise<Review[]>;
  getReviewsForJob(jobId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  
  // Task operations
  getTask(id: number): Promise<Task | undefined>;
  getTasksForJob(jobId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, data: Partial<Task>): Promise<Task | undefined>;
  completeTask(id: number, completedBy: number): Promise<Task | undefined>;
  reorderTasks(jobId: number, taskIds: number[]): Promise<Task[]>;
  
  // Earnings operations
  getEarning(id: number): Promise<Earning | undefined>;
  getEarningsForWorker(workerId: number): Promise<Earning[]>;
  getEarningsForJob(jobId: number): Promise<Earning[]>;
  createEarning(earning: InsertEarning): Promise<Earning>;
  updateEarningStatus(id: number, status: string, datePaid?: Date): Promise<Earning | undefined>;
  
  // Payment operations
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentByTransactionId(transactionId: string): Promise<Payment | undefined>;
  getPaymentsForUser(userId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePaymentStatus(id: number, status: string, transactionId?: string): Promise<Payment | undefined>;
  
  // Badge operations
  getBadge(id: number): Promise<Badge | undefined>;
  getAllBadges(): Promise<Badge[]>;
  getBadgesByCategory(category: string): Promise<Badge[]>;
  createBadge(badge: InsertBadge): Promise<Badge>;
  
  // User badge operations
  getUserBadges(userId: number): Promise<UserBadge[]>;
  awardBadge(userBadge: InsertUserBadge): Promise<UserBadge>;
  revokeBadge(userId: number, badgeId: number): Promise<boolean>;
  
  // Notification operations
  getNotifications(userId: number, options?: { isRead?: boolean, limit?: number }): Promise<Notification[]>;
  getNotification(id: number): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: number): Promise<number>; // Returns count of updated notifications
  deleteNotification(id: number): Promise<boolean>;
  
  // Specialized notification methods
  notifyNearbyWorkers(jobId: number, radiusMiles: number): Promise<number>; // Returns count of notifications sent
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    // Initialize PostgreSQL session store
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      tableName: 'session'
    });
  }

  // Helper function to calculate distance between two points in miles
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3958.8; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // User operations
  async getAllUsers(): Promise<User[]> {
    const result = await db.select().from(users);
    return result.map(user => this.addVirtualFields(user));
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return undefined;
    return this.addVirtualFields(user);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user) return undefined;
    return this.addVirtualFields(user);
  }
  
  async getUserByUsernameAndType(username: string, accountType: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.username, username),
          eq(users.accountType, accountType)
        )
      );
    if (!user) return undefined;
    return this.addVirtualFields(user);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const skills = insertUser.skills || [];
    const now = new Date();
    
    // Ensure we don't pass virtual fields to the database
    const { 
      requiresProfileCompletion, 
      needsAccountType, 
      skillsVerified,
      requiresStripeTerms,
      requiresStripeRepresentative,
      requiresStripeBankingDetails,
      ...dbInsertUser 
    } = insertUser;
    
    const [user] = await db
      .insert(users)
      .values({
        ...dbInsertUser,
        skills,
        lastActive: now,
        rating: 0
      })
      .returning();
    
    return this.addVirtualFields(user);
  }

  async updateUser(id: number, data: Partial<InsertUser> & { 
    stripeConnectAccountId?: string, 
    stripeConnectAccountStatus?: string,
    stripeCustomerId?: string,
    stripeTermsAccepted?: boolean,
    stripeTermsAcceptedAt?: Date,
    stripeRepresentativeName?: string,
    stripeRepresentativeTitle?: string,
    stripeRepresentativeRequirementsComplete?: boolean,
    stripeBankingDetailsComplete?: boolean
  }): Promise<User | undefined> {
    // Remove virtual fields
    const { 
      requiresProfileCompletion, 
      needsAccountType, 
      skillsVerified,
      requiresStripeTerms,
      requiresStripeRepresentative,
      requiresStripeBankingDetails,
      ...dbUpdateData 
    } = data;
    
    const [updatedUser] = await db
      .update(users)
      .set({
        ...dbUpdateData,
        lastActive: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) return undefined;
    return this.addVirtualFields(updatedUser);
  }
  
  // Helper method to add virtual fields to user objects
  private addVirtualFields(user: typeof users.$inferSelect): User {
    // Calculate whether profile completion is needed
    const requiresProfileCompletion = 
      !user.fullName || 
      !user.email || 
      !user.location ||
      (user.accountType === 'worker' && (!user.skills || user.skills.length === 0));
      
    // Check if user needs to set account type (pending)
    const needsAccountType = user.accountType === 'pending';
    
    // For stripe connect users (workers), determine what they need to complete
    const requiresStripeTerms = 
      user.accountType === 'worker' && 
      (!user.stripeTermsAccepted || !user.stripeTermsAcceptedAt);
      
    const requiresStripeRepresentative = 
      user.accountType === 'worker' && 
      (!user.stripeRepresentativeName || !user.stripeRepresentativeTitle);
      
    const requiresStripeBankingDetails = 
      user.accountType === 'worker' && 
      !user.stripeBankingDetailsComplete;
    
    const enhanced: User = {
      ...user,
      requiresProfileCompletion,
      needsAccountType,
      skillsVerified: {},
      requiresStripeTerms,
      requiresStripeRepresentative,
      requiresStripeBankingDetails
    };
    
    return enhanced;
  }
  
  async uploadProfileImage(userId: number, imageData: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ avatarUrl: imageData })
      .where(eq(users.id, userId))
      .returning();
      
    if (!updatedUser) return undefined;
    return this.addVirtualFields(updatedUser);
  }
  
  async updateUserSkills(userId: number, skills: string[]): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ skills })
      .where(eq(users.id, userId))
      .returning();
      
    if (!updatedUser) return undefined;
    return this.addVirtualFields(updatedUser);
  }
  
  async verifyUserSkill(userId: number, skill: string, isVerified: boolean): Promise<User | undefined> {
    // First get the user to access their current skills verification status
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    // We'll store skill verification in the metadata field in the database
    // First, get any existing metadata
    const [updatedUser] = await db
      .update(users)
      .set({
        // Set the lastActive timestamp as well
        lastActive: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
      
    if (!updatedUser) return undefined;
    
    // Update the virtual field in the returned object
    const skillsVerified = { ...(user.skillsVerified || {}) };
    skillsVerified[skill] = isVerified;
    
    const enhanced = this.addVirtualFields(updatedUser);
    enhanced.skillsVerified = skillsVerified;
    
    return enhanced;
  }
  
  async updateUserMetrics(userId: number, metrics: {
    completedJobs?: number;
    successRate?: number;
    responseTime?: number;
  }): Promise<User | undefined> {
    // Get the user first
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    // Only update fields that were provided
    const updateData: Partial<User> = {};
    
    // In a real implementation, we'd store these in the database 
    // For now, we'll just update the virtual fields
    const enhanced = { ...user };
    
    if (metrics.completedJobs !== undefined) {
      enhanced.completedJobs = metrics.completedJobs;
    }
    
    if (metrics.successRate !== undefined) {
      enhanced.successRate = metrics.successRate;
    }
    
    if (metrics.responseTime !== undefined) {
      enhanced.responseTime = metrics.responseTime;
    }
    
    return enhanced;
  }
  
  async getUsersWithSkills(skills: string[]): Promise<User[]> {
    if (!skills.length) return [];
    
    // In PostgreSQL, we can use the array operator @> to check if one array contains another
    // But we need to build a condition for "any of these skills" rather than "all of these skills"
    const usersWithSkills = await db
      .select()
      .from(users)
      .where(
        // Check if user has at least one of the required skills
        // This uses PostgreSQL's array overlap operator &&
        sql`${users.skills} && ${sql.array(skills, 'text')}`
      );
      
    return usersWithSkills.map(user => this.addVirtualFields(user));
  }
  
  // Stripe-specific methods
  async updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User | undefined> {
    return this.updateUser(userId, { stripeCustomerId });
  }
  
  async updateStripeConnectAccount(userId: number, connectAccountId: string, connectAccountStatus: string): Promise<User | undefined> {
    return this.updateUser(userId, { 
      stripeConnectAccountId: connectAccountId,
      stripeConnectAccountStatus: connectAccountStatus
    });
  }
  
  async updateUserStripeInfo(userId: number, stripeInfo: { 
    stripeCustomerId?: string;
    stripeConnectAccountId?: string;
    stripeConnectAccountStatus?: string;
    stripeTermsAccepted?: boolean;
    stripeTermsAcceptedAt?: Date;
    stripeRepresentativeName?: string;
    stripeRepresentativeTitle?: string;
    stripeRepresentativeRequirementsComplete?: boolean;
    stripeBankingDetailsComplete?: boolean;
  }): Promise<User | undefined> {
    return this.updateUser(userId, stripeInfo);
  }

  // Job operations
  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, id));
      
    return job;
  }

  async getJobs(filters?: {
    category?: string;
    status?: string;
    posterId?: number;
    workerId?: number;
    search?: string;
  }): Promise<Job[]> {
    let query = db.select().from(jobs);
    
    if (filters) {
      let conditions = [];
      
      if (filters.category) {
        conditions.push(eq(jobs.category, filters.category));
      }
      
      if (filters.status) {
        conditions.push(eq(jobs.status, filters.status));
      }
      
      if (filters.posterId) {
        conditions.push(eq(jobs.posterId, filters.posterId));
      }
      
      if (filters.workerId) {
        if (filters.workerId) {
          conditions.push(eq(jobs.workerId, filters.workerId));
        } else {
          conditions.push(isNull(jobs.workerId));
        }
      }
      
      // Apply all conditions
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      // Handle search separately as it uses LIKE and is more complex
      if (filters.search) {
        const searchLower = `%${filters.search.toLowerCase()}%`;
        // Use a separate query for search
        query = db
          .select()
          .from(jobs)
          .where(
            or(
              like(sql`LOWER(${jobs.title})`, searchLower),
              like(sql`LOWER(${jobs.description})`, searchLower),
              like(sql`LOWER(${jobs.category})`, searchLower)
            )
          );
        
        // If we have other conditions, add them to the search query
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
      }
    }
    
    // Sort by date posted (newest first)
    return query.orderBy(desc(jobs.datePosted));
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const serviceFee = 2.5; // Service fee is fixed at $2.50
    const totalAmount = insertJob.paymentType === 'fixed' ? 
      insertJob.paymentAmount + serviceFee : insertJob.paymentAmount;
    const status = insertJob.status || 'open'; // Default status is 'open'
    
    // Make sure boolean values are defined
    const equipmentProvided = insertJob.equipmentProvided === undefined ? 
      false : insertJob.equipmentProvided;
    
    const [job] = await db
      .insert(jobs)
      .values({
        ...insertJob,
        datePosted: new Date(),
        workerId: null,
        serviceFee,
        totalAmount,
        status,
        equipmentProvided,
        // Ensure location description is valid
        locationDescription: insertJob.locationDescription || null
      })
      .returning();
    
    return job;
  }

  async updateJob(id: number, data: Partial<InsertJob>): Promise<Job | undefined> {
    // First get the existing job
    const job = await this.getJob(id);
    if (!job) return undefined;
    
    let updateData: any = { ...data };
    
    // Recalculate total amount and service fee if payment information has been updated
    if (data.paymentAmount !== undefined || data.paymentType !== undefined) {
      const paymentType = data.paymentType || job.paymentType;
      const paymentAmount = data.paymentAmount !== undefined ? 
        data.paymentAmount : job.paymentAmount;
      const serviceFee = 2.5; // Fixed service fee
      
      updateData.serviceFee = serviceFee;
      updateData.totalAmount = paymentType === 'fixed' ? 
        paymentAmount + serviceFee : paymentAmount;
    }
    
    // Update the job
    const [updatedJob] = await db
      .update(jobs)
      .set(updateData)
      .where(eq(jobs.id, id))
      .returning();
    
    return updatedJob;
  }

  async deleteJob(id: number): Promise<boolean> {
    const result = await db
      .delete(jobs)
      .where(eq(jobs.id, id));
      
    // Return true if at least one row was affected
    return !!result;
  }

  async getJobsNearLocation(
    latitude: number, 
    longitude: number, 
    radiusMiles: number
  ): Promise<Job[]> {
    // Get all jobs
    const allJobs = await db
      .select()
      .from(jobs);
    
    // Filter jobs that have valid coordinates
    const jobsWithCoordinates = allJobs.filter(job => 
      job.latitude !== null && job.longitude !== null
    );
    
    // Filter jobs by distance
    return jobsWithCoordinates.filter(job => {
      const distance = this.calculateDistance(
        latitude, 
        longitude, 
        job.latitude!, // Non-null assertion since we filtered
        job.longitude! // Non-null assertion since we filtered
      );
      return distance <= radiusMiles;
    });
  }

  // Application operations
  async getApplication(id: number): Promise<Application | undefined> {
    return this.applications.get(id);
  }

  async getApplicationsForJob(jobId: number): Promise<Application[]> {
    return Array.from(this.applications.values())
      .filter(application => application.jobId === jobId);
  }

  async getApplicationsForWorker(workerId: number): Promise<Application[]> {
    return Array.from(this.applications.values())
      .filter(application => application.workerId === workerId);
  }

  async createApplication(insertApplication: InsertApplication): Promise<Application> {
    const id = this.applicationIdCounter++;
    const dateApplied = new Date();
    const status = "pending";
    
    // Ensure message is null when undefined
    const message = insertApplication.message === undefined ? null : insertApplication.message;
    
    const application: Application = { 
      ...insertApplication, 
      id, 
      dateApplied, 
      status,
      message
    };
    this.applications.set(id, application);
    return application;
  }

  async updateApplication(id: number, data: Partial<InsertApplication>): Promise<Application | undefined> {
    const application = this.applications.get(id);
    if (!application) return undefined;
    
    const updatedApplication = { ...application, ...data };
    this.applications.set(id, updatedApplication);
    return updatedApplication;
  }

  // Review operations
  async getReview(id: number): Promise<Review | undefined> {
    return this.reviews.get(id);
  }

  async getReviewsForUser(userId: number): Promise<Review[]> {
    return Array.from(this.reviews.values())
      .filter(review => review.revieweeId === userId);
  }

  async getReviewsForJob(jobId: number): Promise<Review[]> {
    return Array.from(this.reviews.values())
      .filter(review => review.jobId === jobId);
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const id = this.reviewIdCounter++;
    const dateReviewed = new Date();
    
    // Ensure comment is null when undefined
    const comment = insertReview.comment === undefined ? null : insertReview.comment;
    
    const review: Review = { 
      ...insertReview, 
      id, 
      dateReviewed,
      comment 
    };
    this.reviews.set(id, review);
    return review;
  }
  
  // Task operations
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasksForJob(jobId: number): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.jobId === jobId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = this.taskIdCounter++;
    const createdAt = new Date();
    const completedAt = null;
    const completedBy = null;
    
    // Get the max order index for tasks in this job and add 1
    const tasksForJob = await this.getTasksForJob(task.jobId);
    const orderIndex = tasksForJob.length === 0 
      ? 0 
      : Math.max(...tasksForJob.map(t => t.orderIndex)) + 1;
    
    const newTask: Task = {
      ...task,
      id,
      createdAt,
      completedAt,
      completedBy,
      isCompleted: false,
      orderIndex
    };
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: number, data: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...data };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async completeTask(id: number, completedBy: number): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = {
      ...task,
      isCompleted: true,
      completedAt: new Date(),
      completedBy
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async reorderTasks(jobId: number, taskIds: number[]): Promise<Task[]> {
    // Verify all task IDs belong to this job
    const tasksForJob = await this.getTasksForJob(jobId);
    const taskMap = new Map<number, Task>();
    tasksForJob.forEach(task => taskMap.set(task.id, task));
    
    // Check that all provided IDs exist and belong to this job
    for (const id of taskIds) {
      if (!taskMap.has(id)) {
        throw new Error(`Task ID ${id} not found or does not belong to job ${jobId}`);
      }
    }
    
    // Update order indices
    const updatedTasks: Task[] = [];
    for (let i = 0; i < taskIds.length; i++) {
      const taskId = taskIds[i];
      const task = taskMap.get(taskId)!;
      const updatedTask = await this.updateTask(taskId, { orderIndex: i });
      updatedTasks.push(updatedTask!);
    }
    
    return updatedTasks.sort((a, b) => a.orderIndex - b.orderIndex);
  }
  
  // Earnings operations
  async getEarning(id: number): Promise<Earning | undefined> {
    const [earning] = await db
      .select()
      .from(earnings)
      .where(eq(earnings.id, id));
      
    return earning;
  }

  async getEarningsForWorker(workerId: number): Promise<Earning[]> {
    return db
      .select()
      .from(earnings)
      .where(eq(earnings.workerId, workerId))
      .orderBy(desc(earnings.dateEarned));
  }

  async getEarningsForJob(jobId: number): Promise<Earning[]> {
    return db
      .select()
      .from(earnings)
      .where(eq(earnings.jobId, jobId))
      .orderBy(desc(earnings.dateEarned));
  }
  
  async getAllEarningsByStatus(status: string): Promise<Earning[]> {
    return db
      .select()
      .from(earnings)
      .where(eq(earnings.status, status))
      .orderBy(desc(earnings.dateEarned));
  }

  async createEarning(earning: InsertEarning): Promise<Earning> {
    const serviceFee = earning.serviceFee || 2.5; // Default service fee is $2.50
    
    const [newEarning] = await db
      .insert(earnings)
      .values({
        ...earning,
        status: "pending",
        dateEarned: new Date(),
        datePaid: null,
        transferId: null,
        description: earning.description || null,
        serviceFee
      })
      .returning();
      
    return newEarning;
  }

  async updateEarningStatus(id: number, status: string, datePaid?: Date): Promise<Earning | undefined> {
    const [updatedEarning] = await db
      .update(earnings)
      .set({ 
        status,
        datePaid: status === 'paid' ? (datePaid || new Date()) : null
      })
      .where(eq(earnings.id, id))
      .returning();
      
    return updatedEarning;
  }
  
  // Update an earning with a Stripe transfer ID
  async updateEarningTransferId(id: number, transferId: string): Promise<Earning | undefined> {
    const [updatedEarning] = await db
      .update(earnings)
      .set({ transferId })
      .where(eq(earnings.id, id))
      .returning();
      
    return updatedEarning;
  }
  
  // Payment operations
  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, id));
      
    return payment;
  }
  
  async getPaymentByTransactionId(transactionId: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.transactionId, transactionId));
      
    return payment;
  }

  async getPaymentsForUser(userId: number): Promise<Payment[]> {
    return db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db
      .insert(payments)
      .values({
        ...payment,
        status: "pending",
        createdAt: new Date(),
        transactionId: null
      })
      .returning();
      
    return newPayment;
  }

  async updatePaymentStatus(id: number, status: string, transactionId?: string): Promise<Payment | undefined> {
    const updateData: any = { status };
    
    if (transactionId) {
      updateData.transactionId = transactionId;
    }
    
    const [updatedPayment] = await db
      .update(payments)
      .set(updateData)
      .where(eq(payments.id, id))
      .returning();
      
    return updatedPayment;
  }
  
  // Badge operations
  async getBadge(id: number): Promise<Badge | undefined> {
    const [badge] = await db
      .select()
      .from(badges)
      .where(eq(badges.id, id));
      
    return badge;
  }
  
  async getAllBadges(): Promise<Badge[]> {
    return db
      .select()
      .from(badges);
  }
  
  async getBadgesByCategory(category: string): Promise<Badge[]> {
    return db
      .select()
      .from(badges)
      .where(eq(badges.category, category));
  }
  
  async createBadge(badge: InsertBadge): Promise<Badge> {
    const [newBadge] = await db
      .insert(badges)
      .values({
        ...badge,
        createdAt: new Date()
      })
      .returning();
      
    return newBadge;
  }
  
  // User badge operations
  async getUserBadges(userId: number): Promise<UserBadge[]> {
    return db
      .select()
      .from(userBadges)
      .where(eq(userBadges.userId, userId));
  }
  
  async awardBadge(userBadge: InsertUserBadge): Promise<UserBadge> {
    // Check if the user already has this badge
    const existingBadges = await this.getUserBadges(userBadge.userId);
    const alreadyHasBadge = existingBadges.some(badge => 
      badge.badgeId === userBadge.badgeId
    );
    
    if (alreadyHasBadge) {
      // Just return the existing badge
      return existingBadges.find(badge => badge.badgeId === userBadge.badgeId)!;
    }
    
    // Add the new badge
    const [newUserBadge] = await db
      .insert(userBadges)
      .values({
        ...userBadge,
        earnedAt: new Date()
      })
      .returning();
      
    // We'll track badge IDs in user virtual fields when retrieving the user
    return newUserBadge;
  }
  
  async revokeBadge(userId: number, badgeId: number): Promise<boolean> {
    const result = await db
      .delete(userBadges)
      .where(
        and(
          eq(userBadges.userId, userId),
          eq(userBadges.badgeId, badgeId)
        )
      );
      
    // Return true if at least one row was deleted
    return !!result;
  }

  // Notification operations
  async getNotifications(userId: number, options?: { isRead?: boolean, limit?: number }): Promise<Notification[]> {
    let queryBuilder = db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId));
    
    // Filter by read status if specified
    if (options && options.isRead !== undefined) {
      queryBuilder = queryBuilder.where(eq(notifications.isRead, options.isRead));
    }
    
    // Order by created date
    queryBuilder = queryBuilder.orderBy(desc(notifications.createdAt));
    
    // Apply limit if specified
    if (options && options.limit) {
      queryBuilder = queryBuilder.limit(options.limit);
    }
    
    return await queryBuilder;
  }
  
  async getNotification(id: number): Promise<Notification | undefined> {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id));
      
    return notification;
  }
  
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values({
        ...notification,
        createdAt: new Date(),
        isRead: false,
        // Ensure metadata is valid JSON or null
        metadata: notification.metadata || null,
        // Ensure sourceId and sourceType are not undefined
        sourceId: notification.sourceId || null,
        sourceType: notification.sourceType || null
      })
      .returning();
      
    return newNotification;
  }
  
  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const [updatedNotification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
      
    return updatedNotification;
  }
  
  async markAllNotificationsAsRead(userId: number): Promise<number> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      )
      .returning();
    
    // Return count of affected rows
    return result.length;
  }
  
  async deleteNotification(id: number): Promise<boolean> {
    const result = await db
      .delete(notifications)
      .where(eq(notifications.id, id))
      .returning();
      
    // Return true if at least one row was affected
    return result.length > 0;
  }
  
  // Specialized notification methods
  async notifyNearbyWorkers(jobId: number, radiusMiles: number): Promise<number> {
    // First get the job
    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId));
      
    if (!job) return 0;
    
    // Get all users with worker account type or those who haven't selected an account type yet
    const workers = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.accountType, 'worker'),
          isNull(users.accountType)
        )
      );
    
    // Find workers within the radius who have location data
    const nearbyWorkers = workers.filter(worker => {
      if (!worker.latitude || !worker.longitude || 
          !job.latitude || !job.longitude) return false;
      
      const distance = this.calculateDistance(
        job.latitude,
        job.longitude,
        worker.latitude,
        worker.longitude
      );
      
      return distance <= radiusMiles;
    });
    
    // Create notifications for each nearby worker
    let notificationCount = 0;
    for (const worker of nearbyWorkers) {
      // Skip job's poster (don't notify poster about their own job)
      if (worker.id === job.posterId) continue;
      
      // Create notification
      const notification: InsertNotification = {
        userId: worker.id,
        type: 'job_posted',
        title: 'New job nearby!',
        message: `"${job.title}" was just posted ${radiusMiles} miles from you.`,
        sourceId: job.id,
        sourceType: 'job',
        metadata: { jobId: job.id }
      };
      
      await this.createNotification(notification);
      notificationCount++;
    }
    
    return notificationCount;
  }
}

// Import the fixed database storage implementation - don't rename the import
import { FixedDatabaseStorage } from './fixed-database-storage';

// Use the enhanced database storage implementation with better session handling
export const storage = new FixedDatabaseStorage();
