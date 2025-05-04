import { eq, and, like, desc, or, asc } from 'drizzle-orm';
import { db } from './db';
import { IStorage } from './storage';
import {
  users, jobs, applications, reviews, tasks, earnings, payments, badges, userBadges,
  User, InsertUser,
  Job, InsertJob,
  Application, InsertApplication,
  Review, InsertReview,
  Task, InsertTask,
  Earning, InsertEarning,
  Payment, InsertPayment,
  Badge, InsertBadge,
  UserBadge, InsertUserBadge
} from '@shared/schema';
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from './db';

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true
    });
  }
  
  // HELPER METHODS
  private addProfileCompletionFlag(user: typeof users.$inferSelect): User {
    // Check if user has social login and either has 'pending' account type or missing profile fields
    const hasSocialLogin = Boolean(user.googleId || user.facebookId);
    const hasPendingAccountType = user.accountType === 'pending';
    const hasMissingProfileFields = !user.bio || !user.phone;
    const needsProfileCompletion = hasSocialLogin && (hasPendingAccountType || hasMissingProfileFields);
    
    // Handle missing fields that are defined in the schema but may not exist in the DB yet
    const enhancedUser: User = {
      ...user,
      skillsVerified: user.skillsVerified || {},
      badgeIds: user.badgeIds || [],
      skills: user.skills || [],
      requiresProfileCompletion: needsProfileCompletion === true ? true : null
    };
    
    return enhancedUser;
  }
  
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
  
  // USER OPERATIONS
  async getAllUsers(): Promise<User[]> {
    try {
      const allUsers = await db.select().from(users);
      return allUsers.map(user => this.addProfileCompletionFlag(user));
    } catch (error) {
      console.error("Error getting all users:", error);
      // Fallback to basic query to get minimal user data
      const query = `SELECT id, username, password, full_name, email, 
                    phone, bio, avatar_url, account_type, 
                    google_id, facebook_id FROM users`;
      const result = await db.execute(query);
      return result.rows.map(user => this.addProfileCompletionFlag({
        id: user.id,
        username: user.username,
        password: user.password,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        accountType: user.account_type,
        googleId: user.google_id,
        facebookId: user.facebook_id,
        skills: [],
        skillsVerified: {},
        badgeIds: [],
        lastActive: new Date(),
        isActive: true
      }));
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (!user) return undefined;
      return this.addProfileCompletionFlag(user);
    } catch (error) {
      console.error("Error getting user by ID:", error);
      // Fallback to basic query to get minimal user data
      const query = `SELECT id, username, password, full_name, email, 
                    phone, bio, avatar_url, account_type, 
                    google_id, facebook_id FROM users WHERE id = $1`;
      const result = await db.execute(query, [id]);
      if (result.rows.length === 0) return undefined;
      
      const user = result.rows[0];
      return this.addProfileCompletionFlag({
        id: user.id,
        username: user.username,
        password: user.password,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        accountType: user.account_type,
        googleId: user.google_id,
        facebookId: user.facebook_id,
        skills: [],
        skillsVerified: {},
        badgeIds: [],
        lastActive: new Date(),
        isActive: true
      });
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      if (!user) return undefined;
      return this.addProfileCompletionFlag(user);
    } catch (error) {
      console.error("Error getting user by username:", error);
      // Fallback to basic query to get minimal user data
      const query = `SELECT id, username, password, full_name, email, 
                    phone, bio, avatar_url, account_type, 
                    google_id, facebook_id FROM users WHERE username = $1`;
      const result = await db.execute(query, [username]);
      if (result.rows.length === 0) return undefined;
      
      const user = result.rows[0];
      return this.addProfileCompletionFlag({
        id: user.id,
        username: user.username,
        password: user.password,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        accountType: user.account_type,
        googleId: user.google_id,
        facebookId: user.facebook_id,
        skills: [],
        skillsVerified: {},
        badgeIds: [],
        lastActive: new Date(),
        isActive: true
      });
    }
  }
  
  async getUserByUsernameAndType(username: string, accountType: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(
        and(
          eq(users.username, username),
          eq(users.accountType, accountType)
        )
      );
      if (!user) return undefined;
      return this.addProfileCompletionFlag(user);
    } catch (error) {
      console.error("Error getting user by username and type:", error);
      // Fallback to basic query to get minimal user data
      const query = `SELECT id, username, password, full_name, email, 
                    phone, bio, avatar_url, account_type, 
                    google_id, facebook_id FROM users 
                    WHERE username = $1 AND account_type = $2`;
      const result = await db.execute(query, [username, accountType]);
      if (result.rows.length === 0) return undefined;
      
      const user = result.rows[0];
      return this.addProfileCompletionFlag({
        id: user.id,
        username: user.username,
        password: user.password,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        accountType: user.account_type,
        googleId: user.google_id,
        facebookId: user.facebook_id,
        skills: [],
        skillsVerified: {},
        badgeIds: [],
        lastActive: new Date(),
        isActive: true
      });
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    // Extract the requiresProfileCompletion property (if it exists) and remove it from the user object
    // since it doesn't exist in the database schema
    const { requiresProfileCompletion, needsAccountType, ...dbUser } = user;
    
    // Insert the user without the requiresProfileCompletion & needsAccountType fields
    const [createdUser] = await db.insert(users).values(dbUser).returning();
    
    // Add the requiresProfileCompletion property back to the user object for the client
    return this.addProfileCompletionFlag(createdUser);
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    // Extract the requiresProfileCompletion property (if it exists) and remove it from the data object
    // since it doesn't exist in the database schema
    const { requiresProfileCompletion, needsAccountType, ...dbData } = data;
    
    // Update the user without the requiresProfileCompletion field
    const [updatedUser] = await db.update(users)
      .set(dbData)
      .where(eq(users.id, id))
      .returning();
      
    if (!updatedUser) return undefined;
    
    // Add the requiresProfileCompletion property back to the user object for the client
    return this.addProfileCompletionFlag(updatedUser);
  }
  
  async uploadProfileImage(userId: number, imageData: string): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set({ avatarUrl: imageData })
      .where(eq(users.id, userId))
      .returning();
      
    if (!updatedUser) return undefined;
    return this.addProfileCompletionFlag(updatedUser);
  }
  
  async updateUserSkills(userId: number, skills: string[]): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set({ skills })
      .where(eq(users.id, userId))
      .returning();
      
    if (!updatedUser) return undefined;
    return this.addProfileCompletionFlag(updatedUser);
  }
  
  async verifyUserSkill(userId: number, skill: string, isVerified: boolean): Promise<User | undefined> {
    try {
      // First get the current user to access the existing skillsVerified object
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return undefined;
      
      // Create a copy of the existing skills verification map or initialize if not exists
      const skillsVerified = { ...(user.skillsVerified || {}) };
      
      // Update the verification status for the specified skill
      skillsVerified[skill] = isVerified;
      
      // Save the updated skillsVerified object
      const [updatedUser] = await db.update(users)
        .set({ skillsVerified })
        .where(eq(users.id, userId))
        .returning();
        
      if (!updatedUser) return undefined;
      return this.addProfileCompletionFlag(updatedUser);
    } catch (error) {
      console.error("Error verifying user skill:", error);
      
      // If the column doesn't exist yet, return the user without changes
      // This allows the app to continue working while we wait for DB migrations
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return undefined;
      
      // Add the skill verification status manually
      const enhancedUser = this.addProfileCompletionFlag(user);
      if (!enhancedUser.skillsVerified) {
        enhancedUser.skillsVerified = {};
      }
      enhancedUser.skillsVerified[skill] = isVerified;
      
      return enhancedUser;
    }
  }
  
  async updateUserMetrics(userId: number, metrics: {
    completedJobs?: number;
    successRate?: number;
    responseTime?: number;
  }): Promise<User | undefined> {
    // First get the current user metrics
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return undefined;
    
    // Create the update data with only the fields that were provided
    const updateData: Partial<User> = {};
    
    if (metrics.completedJobs !== undefined) {
      updateData.completedJobs = metrics.completedJobs;
    }
    
    if (metrics.successRate !== undefined) {
      updateData.successRate = metrics.successRate;
    }
    
    if (metrics.responseTime !== undefined) {
      updateData.responseTime = metrics.responseTime;
    }
    
    // Update the user with the new metrics
    const [updatedUser] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
      
    if (!updatedUser) return undefined;
    return this.addProfileCompletionFlag(updatedUser);
  }
  
  async getUsersWithSkills(skills: string[]): Promise<User[]> {
    if (!skills.length) return [];
    
    try {
      // Get all users (we'll need to filter in-memory since PostgreSQL array operations are more complex)
      const allUsers = await db.select().from(users);
      
      // Filter users who have at least one of the required skills
      return allUsers
        .filter(user => {
          if (!user.skills || !user.skills.length) return false;
          return skills.some(skill => user.skills?.includes(skill));
        })
        .map(user => this.addProfileCompletionFlag(user));
    } catch (error) {
      console.error("Error getting users with skills:", error);
      
      // Fallback to basic query to get minimal user data
      const query = `SELECT id, username, password, full_name, email, 
                    phone, bio, avatar_url, account_type, 
                    google_id, facebook_id FROM users`;
      const result = await db.execute(query);
      
      // Since we can't filter by skills with raw SQL, we'll just return all users
      // The frontend can filter if needed
      return result.rows.map(user => this.addProfileCompletionFlag({
        id: user.id,
        username: user.username,
        password: user.password,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        accountType: user.account_type,
        googleId: user.google_id,
        facebookId: user.facebook_id,
        skills: [],
        skillsVerified: {},
        badgeIds: [],
        lastActive: new Date(),
        isActive: true
      }));
    }
  }
  
  // JOB OPERATIONS
  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
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
      const conditions = [];
      
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
        conditions.push(eq(jobs.workerId, filters.workerId));
      }
      
      if (filters.search) {
        conditions.push(
          or(
            like(jobs.title, `%${filters.search}%`),
            like(jobs.description, `%${filters.search}%`),
            like(jobs.category, `%${filters.search}%`)
          )
        );
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    // Sort by date posted (newest first)
    query = query.orderBy(desc(jobs.datePosted));
    
    return await query;
  }

  async createJob(job: InsertJob): Promise<Job> {
    const [newJob] = await db.insert(jobs).values(job).returning();
    return newJob;
  }

  async updateJob(id: number, data: Partial<InsertJob>): Promise<Job | undefined> {
    const [updatedJob] = await db.update(jobs)
      .set(data)
      .where(eq(jobs.id, id))
      .returning();
      
    return updatedJob;
  }

  async deleteJob(id: number): Promise<boolean> {
    const result = await db.delete(jobs).where(eq(jobs.id, id));
    return result.count > 0;
  }
  
  async getJobsNearLocation(
    latitude: number, 
    longitude: number, 
    radiusMiles: number
  ): Promise<Job[]> {
    // Get all jobs, then filter by distance
    const allJobs = await db.select().from(jobs);
    
    return allJobs.filter(job => {
      if (job.latitude === null || job.longitude === null) return false;
      
      const distance = this.calculateDistance(
        latitude, 
        longitude, 
        job.latitude, 
        job.longitude
      );
      
      return distance <= radiusMiles;
    });
  }
  
  // APPLICATION OPERATIONS
  async getApplication(id: number): Promise<Application | undefined> {
    const [application] = await db.select().from(applications).where(eq(applications.id, id));
    return application;
  }

  async getApplicationsForJob(jobId: number): Promise<Application[]> {
    return await db.select().from(applications).where(eq(applications.jobId, jobId));
  }

  async getApplicationsForWorker(workerId: number): Promise<Application[]> {
    return await db.select().from(applications).where(eq(applications.workerId, workerId));
  }

  async createApplication(application: InsertApplication): Promise<Application> {
    const [newApplication] = await db.insert(applications).values(application).returning();
    return newApplication;
  }

  async updateApplication(id: number, data: Partial<InsertApplication>): Promise<Application | undefined> {
    const [updatedApplication] = await db.update(applications)
      .set(data)
      .where(eq(applications.id, id))
      .returning();
      
    return updatedApplication;
  }
  
  // REVIEW OPERATIONS
  async getReview(id: number): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    return review;
  }

  async getReviewsForUser(userId: number): Promise<Review[]> {
    return await db.select().from(reviews).where(eq(reviews.revieweeId, userId));
  }

  async getReviewsForJob(jobId: number): Promise<Review[]> {
    return await db.select().from(reviews).where(eq(reviews.jobId, jobId));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    return newReview;
  }
  
  // TASK OPERATIONS
  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasksForJob(jobId: number): Promise<Task[]> {
    return await db.select()
      .from(tasks)
      .where(eq(tasks.jobId, jobId))
      .orderBy(asc(tasks.position));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, data: Partial<InsertTask>): Promise<Task | undefined> {
    const [updatedTask] = await db.update(tasks)
      .set(data)
      .where(eq(tasks.id, id))
      .returning();
      
    return updatedTask;
  }

  async completeTask(id: number, completedBy: number): Promise<Task | undefined> {
    const now = new Date();
    
    const [updatedTask] = await db.update(tasks)
      .set({
        isCompleted: true,
        completedAt: now,
        completedBy
      })
      .where(eq(tasks.id, id))
      .returning();
      
    return updatedTask;
  }

  async reorderTasks(jobId: number, taskIds: number[]): Promise<Task[]> {
    // Update position of each task based on its index in taskIds array
    const updatedTasks: Task[] = [];
    
    for (let i = 0; i < taskIds.length; i++) {
      const [updatedTask] = await db.update(tasks)
        .set({ position: i })
        .where(and(
          eq(tasks.id, taskIds[i]),
          eq(tasks.jobId, jobId)
        ))
        .returning();
        
      if (updatedTask) {
        updatedTasks.push(updatedTask);
      }
    }
    
    return updatedTasks;
  }
  
  // EARNINGS OPERATIONS
  async getEarning(id: number): Promise<Earning | undefined> {
    const [earning] = await db.select().from(earnings).where(eq(earnings.id, id));
    return earning;
  }

  async getEarningsForWorker(workerId: number): Promise<Earning[]> {
    return await db.select().from(earnings).where(eq(earnings.workerId, workerId));
  }

  async getEarningsForJob(jobId: number): Promise<Earning[]> {
    return await db.select().from(earnings).where(eq(earnings.jobId, jobId));
  }

  async createEarning(earning: InsertEarning): Promise<Earning> {
    const [newEarning] = await db.insert(earnings).values(earning).returning();
    return newEarning;
  }

  async updateEarningStatus(id: number, status: string, datePaid?: Date): Promise<Earning | undefined> {
    const updateData: Partial<Earning> = { status };
    
    if (datePaid) {
      updateData.datePaid = datePaid;
    }
    
    const [updatedEarning] = await db.update(earnings)
      .set(updateData)
      .where(eq(earnings.id, id))
      .returning();
      
    return updatedEarning;
  }
  
  // PAYMENT OPERATIONS
  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async getPaymentByTransactionId(transactionId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.transactionId, transactionId));
    return payment;
  }

  async getPaymentsForUser(userId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.userId, userId));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async updatePaymentStatus(id: number, status: string, transactionId?: string): Promise<Payment | undefined> {
    const updateData: Partial<Payment> = { status };
    
    if (transactionId) {
      updateData.transactionId = transactionId;
    }
    
    const [updatedPayment] = await db.update(payments)
      .set(updateData)
      .where(eq(payments.id, id))
      .returning();
      
    return updatedPayment;
  }
  
  // BADGE OPERATIONS
  async getBadge(id: number): Promise<Badge | undefined> {
    const [badge] = await db.select().from(badges).where(eq(badges.id, id));
    return badge;
  }
  
  async getAllBadges(): Promise<Badge[]> {
    return await db.select().from(badges);
  }
  
  async getBadgesByCategory(category: string): Promise<Badge[]> {
    return await db.select().from(badges).where(eq(badges.category, category));
  }
  
  async createBadge(badge: InsertBadge): Promise<Badge> {
    const [newBadge] = await db.insert(badges).values(badge).returning();
    return newBadge;
  }
  
  // USER BADGE OPERATIONS
  async getUserBadges(userId: number): Promise<UserBadge[]> {
    return await db.select().from(userBadges).where(eq(userBadges.userId, userId));
  }
  
  async awardBadge(userBadge: InsertUserBadge): Promise<UserBadge> {
    // First, check if the user already has this badge
    const existingBadges = await db.select()
      .from(userBadges)
      .where(
        and(
          eq(userBadges.userId, userBadge.userId),
          eq(userBadges.badgeId, userBadge.badgeId)
        )
      );
    
    if (existingBadges.length > 0) {
      // User already has this badge, just return the existing one
      return existingBadges[0];
    }
    
    // Add the badge to the user's collection
    const [newUserBadge] = await db.insert(userBadges).values(userBadge).returning();
    
    // Now update the user's badgeIds array
    const [user] = await db.select().from(users).where(eq(users.id, userBadge.userId));
    
    if (user) {
      // Create a copy of badgeIds or initialize as empty array if null
      const badgeIds = [...(user.badgeIds || [])];
      
      // Check if badge ID already exists in user's badges
      if (!badgeIds.includes(userBadge.badgeId.toString())) {
        badgeIds.push(userBadge.badgeId.toString());
        await db.update(users)
          .set({ badgeIds })
          .where(eq(users.id, userBadge.userId));
      }
    }
    
    return newUserBadge;
  }
  
  async revokeBadge(userId: number, badgeId: number): Promise<boolean> {
    // Delete the user badge entry
    const result = await db.delete(userBadges)
      .where(
        and(
          eq(userBadges.userId, userId),
          eq(userBadges.badgeId, badgeId)
        )
      );
    
    // Also update user's badgeIds array if found
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (user && user.badgeIds && user.badgeIds.length) {
      const badgeIds = user.badgeIds.filter(id => id !== badgeId.toString());
      await db.update(users)
        .set({ badgeIds })
        .where(eq(users.id, userId));
    }
    
    return result.count > 0;
  }
}