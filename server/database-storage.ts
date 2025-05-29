import { eq, and, like, notLike, desc, or, asc } from 'drizzle-orm';
import { db } from './db';
import { IStorage } from './storage';
import {
  users, jobs, applications, reviews, tasks, earnings, payments, badges, userBadges, notifications, messages,
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
import pkg from 'pg';
const { Pool } = pkg;
import { config } from 'dotenv';
config();
const pool = new Pool({ connectionString: process.env.SUPABASE_DATABASE_URL });

// Define a set of vibrant colors for job markers
const JOB_MARKER_COLORS = [
  "#FF5733", // Coral red
  "#33FF57", // Bright green
  "#3357FF", // Bright blue
  "#F033FF", // Bright magenta
  "#FF3393", // Hot pink
  "#33FFF0", // Turquoise
  "#FFC833", // Amber
  "#8A33FF", // Purple
  "#FF8A33", // Orange
  "#33B8FF"  // Sky blue
];

// Function to get a random color from the predefined set
function getRandomMarkerColor(): string {
  const randomIndex = Math.floor(Math.random() * JOB_MARKER_COLORS.length);
  return JOB_MARKER_COLORS[randomIndex];
}

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Initialize session store with better configuration
    this.sessionStore = new PostgresSessionStore({ 
      pool: pool,
      // Always ensure the table exists
      createTableIfMissing: true,
      // Set proper pruning interval (every 24 hours)
      pruneSessionInterval: 86400000,
      // Set a long session lifetime for better persistence (30 days)
      ttl: 30 * 24 * 60 * 60
    });
  }
  
  // User operations
  async getAllUsers(): Promise<User[]> {
    try {
      // First try to get all users with all fields
      const allUsers = await db.select().from(users);
      
      // Add the virtual fields to each user
      return allUsers.map(user => this.addVirtualFields(user));
    } catch (error: any) {
      // If there's an error about missing columns, try a more selective query
      if (error.message && error.message.includes("column") && error.message.includes("does not exist")) {
        console.warn("Missing columns in users table, using fallback query:", error.message);
        
        // Use a specific select without the new columns
        const query = `
          SELECT 
            id, username, password, full_name as "fullName", email, phone, bio, 
            avatar_url as "avatarUrl", account_type as "accountType", skills, 
            rating, is_active as "isActive", last_active as "lastActive",
            google_id as "googleId", facebook_id as "facebookId",
            stripe_customer_id as "stripeCustomerId", 
            stripe_connect_account_id as "stripeConnectAccountId", 
            stripe_connect_account_status as "stripeConnectAccountStatus",
            stripe_terms_accepted as "stripeTermsAccepted", 
            stripe_terms_accepted_at as "stripeTermsAcceptedAt",
            stripe_representative_name as "stripeRepresentativeName", 
            stripe_representative_title as "stripeRepresentativeTitle",
            stripe_representative_requirements_complete as "stripeRepresentativeRequirementsComplete", 
            stripe_banking_details_complete as "stripeBankingDetailsComplete"
          FROM users
        `;
        
        const result = await db.execute(query);
        if (!result.rows) return [];
        
        // Add the virtual fields to each user
        return result.rows.map(user => this.addVirtualFields(user));
      }
      // For other errors, rethrow
      throw error;
    }
  }

  // Helper function to add virtual fields to user objects
  private addVirtualFields(user: typeof users.$inferSelect): User {
    if (!user) return user;
    
    // Check if user needs to complete profile
    const hasSocialLogin = Boolean(user.googleId || user.facebookId);
    const hasPendingAccountType = user.accountType === 'pending';
    const hasMissingProfileFields = !user.bio || !user.phone;
    const needsProfileCompletion = hasSocialLogin && (hasPendingAccountType || hasMissingProfileFields);
    
    // Check if user needs to accept Stripe terms
    // User needs to accept terms if they have a Stripe Connect account but haven't accepted terms
    const hasStripeAccount = Boolean(user.stripeConnectAccountId);
    const needsStripeTerms = hasStripeAccount && !user.stripeTermsAccepted;
    
    // Check if user needs to provide representative information
    // User needs to provide representative info if they have accepted terms but haven't provided representative info
    const needsRepresentative = user.stripeTermsAccepted && 
      (!user.stripeRepresentativeName || !user.stripeRepresentativeTitle);
    
    return {
      ...user,
      requiresProfileCompletion: needsProfileCompletion,
      requiresStripeTerms: needsStripeTerms,
      requiresStripeRepresentative: needsRepresentative
    };
  }
  
  async getUser(id: number): Promise<User | undefined> {
    try {
      // First try to get the user with all fields
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return this.addVirtualFields(user);
    } catch (error) {
      // If there's an error about missing columns, try a more selective query
      if (error.message && error.message.includes("column") && error.message.includes("does not exist")) {
        console.warn("Missing columns in users table, using fallback query:", error.message);
        
        // Use a specific select without the new columns
        const query = `
          SELECT 
            id, username, password, full_name as "fullName", email, phone, bio, 
            avatar_url as "avatarUrl", account_type as "accountType", skills, 
            rating, is_active as "isActive", last_active as "lastActive",
            google_id as "googleId", facebook_id as "facebookId",
            stripe_customer_id as "stripeCustomerId", 
            stripe_connect_account_id as "stripeConnectAccountId", 
            stripe_connect_account_status as "stripeConnectAccountStatus",
            stripe_terms_accepted as "stripeTermsAccepted", 
            stripe_terms_accepted_at as "stripeTermsAcceptedAt",
            stripe_representative_name as "stripeRepresentativeName", 
            stripe_representative_title as "stripeRepresentativeTitle",
            stripe_representative_requirements_complete as "stripeRepresentativeRequirementsComplete", 
            stripe_banking_details_complete as "stripeBankingDetailsComplete"
          FROM users WHERE id = $1
        `;
        
        const result = await db.execute(query, [id]);
        if (result.length === 0) return undefined;
        
        return this.addVirtualFields(result[0]);
      }
      // For other errors, rethrow
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      // First try to get the user with all fields
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return this.addVirtualFields(user);
    } catch (error) {
      // If there's an error about missing columns, try a more selective query
      if (error.message && error.message.includes("column") && error.message.includes("does not exist")) {
        console.warn("Missing columns in users table, using fallback query:", error.message);
        
        // Use a specific select without the new columns
        const query = `
          SELECT 
            id, username, password, full_name as "fullName", email, phone, bio, 
            avatar_url as "avatarUrl", account_type as "accountType", skills, 
            rating, is_active as "isActive", last_active as "lastActive",
            google_id as "googleId", facebook_id as "facebookId",
            stripe_customer_id as "stripeCustomerId", 
            stripe_connect_account_id as "stripeConnectAccountId", 
            stripe_connect_account_status as "stripeConnectAccountStatus",
            stripe_terms_accepted as "stripeTermsAccepted", 
            stripe_terms_accepted_at as "stripeTermsAcceptedAt",
            stripe_representative_name as "stripeRepresentativeName", 
            stripe_representative_title as "stripeRepresentativeTitle",
            stripe_representative_requirements_complete as "stripeRepresentativeRequirementsComplete", 
            stripe_banking_details_complete as "stripeBankingDetailsComplete"
          FROM users WHERE username = $1
        `;
        
        const result = await db.execute(query, [username]);
        if (result.length === 0) return undefined;
        
        return this.addVirtualFields(result[0]);
      }
      // For other errors, rethrow
      throw error;
    }
  }
  
  async getUserByUsernameAndType(username: string, accountType: string): Promise<User | undefined> {
    try {
      // First try to get the user with all fields
      const [user] = await db.select().from(users).where(
        and(
          eq(users.username, username),
          eq(users.accountType, accountType)
        )
      );
      return this.addVirtualFields(user);
    } catch (error: any) {
      // If there's an error about missing columns, try a more selective query
      if (error.message && error.message.includes("column") && error.message.includes("does not exist")) {
        console.warn("Missing columns in users table, using fallback query:", error.message);
        
        // Use a specific select without the new columns
        const query = `
          SELECT 
            id, username, password, full_name as "fullName", email, phone, bio, 
            avatar_url as "avatarUrl", account_type as "accountType", skills, 
            rating, is_active as "isActive", last_active as "lastActive",
            google_id as "googleId", facebook_id as "facebookId",
            stripe_customer_id as "stripeCustomerId", 
            stripe_connect_account_id as "stripeConnectAccountId", 
            stripe_connect_account_status as "stripeConnectAccountStatus",
            stripe_terms_accepted as "stripeTermsAccepted", 
            stripe_terms_accepted_at as "stripeTermsAcceptedAt",
            stripe_representative_name as "stripeRepresentativeName", 
            stripe_representative_title as "stripeRepresentativeTitle",
            stripe_representative_requirements_complete as "stripeRepresentativeRequirementsComplete", 
            stripe_banking_details_complete as "stripeBankingDetailsComplete"
          FROM users WHERE username = $1 AND account_type = $2
        `;
        
        const result = await db.execute(query, [username, accountType]);
        if (!result.rows || result.rows.length === 0) return undefined;
        
        return this.addVirtualFields(result.rows[0]);
      }
      // For other errors, rethrow
      throw error;
    }
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      // First try to get the user with all fields
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return this.addVirtualFields(user);
    } catch (error: any) {
      // If there's an error about missing columns, try a more selective query
      if (error.message && error.message.includes("column") && error.message.includes("does not exist")) {
        console.warn("Missing columns in users table, using fallback query:", error.message);
        
        // Use a specific select without the new columns
        const query = `
          SELECT 
            id, username, password, full_name as "fullName", email, phone, bio, 
            avatar_url as "avatarUrl", account_type as "accountType", skills, 
            rating, is_active as "isActive", last_active as "lastActive",
            google_id as "googleId", facebook_id as "facebookId",
            stripe_customer_id as "stripeCustomerId", 
            stripe_connect_account_id as "stripeConnectAccountId", 
            stripe_connect_account_status as "stripeConnectAccountStatus",
            stripe_terms_accepted as "stripeTermsAccepted", 
            stripe_terms_accepted_at as "stripeTermsAcceptedAt",
            stripe_representative_name as "stripeRepresentativeName", 
            stripe_representative_title as "stripeRepresentativeTitle",
            stripe_representative_requirements_complete as "stripeRepresentativeRequirementsComplete", 
            stripe_banking_details_complete as "stripeBankingDetailsComplete"
          FROM users WHERE email = $1
        `;
        
        const result = await db.execute(query, [email]);
        if (!result.rows || result.rows.length === 0) return undefined;
        
        return this.addVirtualFields(result.rows[0]);
      }
      // For other errors, rethrow
      throw error;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    // Extract virtual properties that don't exist in the database schema
    const { 
      requiresProfileCompletion, 
      requiresStripeTerms, 
      requiresStripeRepresentative, 
      ...dbUser 
    } = user;
    
    // Insert the user without the virtual fields
    const [createdUser] = await db.insert(users).values(dbUser).returning();
    
    // Add the virtual fields using our helper function
    return this.addVirtualFields(createdUser);
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    // Extract virtual properties that don't exist in the database schema
    const { 
      requiresProfileCompletion, 
      requiresStripeTerms, 
      requiresStripeRepresentative, 
      ...dbData 
    } = data;
    
    // Update the user without the virtual fields
    const [updatedUser] = await db.update(users)
      .set(dbData)
      .where(eq(users.id, id))
      .returning();
      
    if (!updatedUser) return undefined;
    
    // Add the virtual fields using our helper function
    return this.addVirtualFields(updatedUser);
  }
  
  // User profile methods
  async uploadProfileImage(userId: number, imageData: string): Promise<User | undefined> {
    return this.updateUser(userId, { avatarUrl: imageData });
  }
  
  async updateUserSkills(userId: number, skills: string[]): Promise<User | undefined> {
    return this.updateUser(userId, { skills });
  }
  
  async verifyUserSkill(userId: number, skill: string, isVerified: boolean): Promise<User | undefined> {
    // Get the user first
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    // In a real implementation, we would update a separate table tracking verified skills
    // For now, we'll just return the user with an updated skillsVerified property
    const skillsVerified = { ...(user.skillsVerified || {}) };
    skillsVerified[skill] = isVerified;
    
    const updatedUser = {
      ...user,
      skillsVerified
    };
    
    return updatedUser;
  }
  
  async updateUserMetrics(userId: number, metrics: {
    completedJobs?: number;
    successRate?: number;
    responseTime?: number;
  }): Promise<User | undefined> {
    // Get the user first
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    // In a real implementation, we would update a metrics table
    // For now, we'll just return the user with updated metrics
    const updatedUser = {
      ...user,
      completedJobs: metrics.completedJobs !== undefined ? metrics.completedJobs : (user.completedJobs || 0),
      successRate: metrics.successRate !== undefined ? metrics.successRate : (user.successRate || 0),
      responseTime: metrics.responseTime !== undefined ? metrics.responseTime : (user.responseTime || 0)
    };
    
    return updatedUser;
  }
  
  async getUsersWithSkills(skills: string[]): Promise<User[]> {
    // Get all users and filter by skills
    const allUsers = await this.getAllUsers();
    
    // Filter users that have at least one of the requested skills
    return allUsers.filter(user => {
      if (!user.skills || !Array.isArray(user.skills)) return false;
      return user.skills.some(skill => skills.includes(skill));
    });
  }
  
  // Job operations
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
    let conditions = [];
    
    // By default, only show open jobs if status is not explicitly specified
    if (!filters?.status) {
      conditions.push(eq(jobs.status, 'open'));
    }
    
    if (filters) {
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
    }
    
    if (conditions.length > 0) {
      return await db.select().from(jobs).where(and(...conditions)).orderBy(desc(jobs.datePosted));
    } else {
      return await db.select().from(jobs).orderBy(desc(jobs.datePosted));
    }
  }

  async createJob(job: InsertJob): Promise<Job> {
    // Service fee is fixed at $2.50
    const serviceFee = 2.5;
    const totalAmount = job.paymentType === 'fixed' ? job.paymentAmount + serviceFee : job.paymentAmount;
    
    // Create a job object with all required fields, including those specified in InsertJob
    const jobData = {
      title: job.title,
      description: job.description,
      category: job.category,
      posterId: job.posterId,
      paymentType: job.paymentType,
      paymentAmount: job.paymentAmount,
      location: job.location,
      latitude: job.latitude,
      longitude: job.longitude,
      dateNeeded: job.dateNeeded,
      requiredSkills: job.requiredSkills,
      equipmentProvided: job.equipmentProvided ?? false,
      // Additional fields with default values
      status: 'open',
      serviceFee: serviceFee,
      totalAmount: totalAmount,
      workerId: null as number | null,
      datePosted: new Date(),
      markerColor: getRandomMarkerColor() // Assign a random color to the job marker
    };
    
    const [createdJob] = await db.insert(jobs).values(jobData).returning();
    return createdJob;
  }

  async updateJob(id: number, data: Partial<InsertJob>): Promise<Job | undefined> {
    // If payment info is updated, recalculate total amount
    const [existingJob] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!existingJob) {
      return undefined;
    }
    
    // Build an object with just the fields we want to update
    const updateData: Partial<Job> = {};
    
    // Copy over fields from data that we want to update
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.dateNeeded !== undefined) updateData.dateNeeded = data.dateNeeded;
    if (data.requiredSkills !== undefined) updateData.requiredSkills = data.requiredSkills;
    if (data.equipmentProvided !== undefined) updateData.equipmentProvided = data.equipmentProvided;
    
    // Special handling for payment info to recalculate the total
    if (data.paymentAmount !== undefined || data.paymentType !== undefined) {
      const paymentType = data.paymentType || existingJob.paymentType;
      const paymentAmount = data.paymentAmount !== undefined ? data.paymentAmount : existingJob.paymentAmount;
      const serviceFee = 2.5; // Fixed service fee
      
      updateData.paymentType = paymentType;
      updateData.paymentAmount = paymentAmount;
      updateData.serviceFee = serviceFee;
      updateData.totalAmount = paymentType === 'fixed' ? paymentAmount + serviceFee : paymentAmount;
    }
    
    const [updatedJob] = await db.update(jobs)
      .set(updateData)
      .where(eq(jobs.id, id))
      .returning();
    
    return updatedJob;
  }

  async deleteJob(id: number): Promise<boolean> {
    const result = await db.delete(jobs).where(eq(jobs.id, id));
    // For PostgreSQL, we can check if any rows were affected
    return !!result;
  }
  
  // Helper function to calculate distance between two points
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
  
  async getJobsNearLocation(
    latitude: number, 
    longitude: number, 
    radiusMiles: number
  ): Promise<Job[]> {
    // First get all jobs, then filter by distance
    // This is not efficient for large datasets, but for a small app it's simpler
    // than implementing a complex geospatial query
    const allJobs = await db.select().from(jobs).where(eq(jobs.status, 'open'));
    
    return allJobs.filter(job => {
      // Skip jobs without coordinates
      if (!job.latitude || !job.longitude) {
        return false;
      }
      
      const distance = this.calculateDistance(
        latitude, 
        longitude, 
        job.latitude, 
        job.longitude
      );
      return distance <= radiusMiles;
    });
  }
  
  // Application operations
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
    // Create an application object with all required fields
    const applicationData = {
      jobId: application.jobId,
      workerId: application.workerId,
      message: application.message ?? null,
      // Additional fields with default values
      status: 'pending',
      dateApplied: new Date(),
    };
    
    const [createdApplication] = await db.insert(applications).values(applicationData).returning();
    return createdApplication;
  }

  async updateApplication(id: number, data: Partial<InsertApplication>): Promise<Application | undefined> {
    const updateData: Partial<Application> = {};
    
    // Copy over fields from data that we want to update
    if (data.message !== undefined) updateData.message = data.message;
    
    const [updatedApplication] = await db.update(applications)
      .set(updateData)
      .where(eq(applications.id, id))
      .returning();
    
    return updatedApplication;
  }
  
  // Review operations
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
    // Create a review object with all required fields
    const reviewData = {
      jobId: review.jobId,
      reviewerId: review.reviewerId,
      revieweeId: review.revieweeId,
      rating: review.rating,
      comment: review.comment ?? null,
      // Additional fields with default values
      dateReviewed: new Date(),
    };
    
    const [createdReview] = await db.insert(reviews).values(reviewData).returning();
    return createdReview;
  }

  // Task operations
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
    // First, count existing tasks for this job to determine position
    const existingTasks = await this.getTasksForJob(task.jobId);
    const position = existingTasks.length;
    
    // Create a task object with all required fields
    const taskData = {
      jobId: task.jobId,
      description: task.description,
      position,
      // Additional fields with default values
      isCompleted: false,
      completedAt: null,
      completedBy: null
    };
    
    const [createdTask] = await db.insert(tasks).values(taskData).returning();
    return createdTask;
  }

  async updateTask(id: number, data: Partial<Task>): Promise<Task | undefined> {
    const updateData: Partial<Task> = {};
    
    // Copy over fields from data that we want to update
    if (data.description !== undefined) updateData.description = data.description;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.isCompleted !== undefined) updateData.isCompleted = data.isCompleted;
    
    const [updatedTask] = await db.update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    
    return updatedTask;
  }

  async completeTask(id: number, completedBy: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) return undefined;
    
    const updateData = {
      isCompleted: true,
      completedAt: new Date(),
      completedBy
    };
    
    const [updatedTask] = await db.update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    
    return updatedTask;
  }

  async reorderTasks(jobId: number, taskIds: number[]): Promise<Task[]> {
    // Get all tasks for the job
    const jobTasks = await this.getTasksForJob(jobId);
    
    // Make sure all tasks exist and belong to this job
    const allTasksExist = taskIds.every(id => jobTasks.some(task => task.id === id));
    if (!allTasksExist) {
      throw new Error('Some tasks do not exist or do not belong to this job');
    }
    
    // Update positions for each task
    const updatedTasks: Task[] = [];
    
    for (let i = 0; i < taskIds.length; i++) {
      const taskId = taskIds[i];
      const [updatedTask] = await db.update(tasks)
        .set({ position: i })
        .where(and(eq(tasks.id, taskId), eq(tasks.jobId, jobId)))
        .returning();
      
      updatedTasks.push(updatedTask);
    }
    
    // Return tasks sorted by position
    return updatedTasks.sort((a, b) => a.position - b.position);
  }

  // Earnings operations
  async getEarning(id: number): Promise<Earning | undefined> {
    const [earning] = await db.select().from(earnings).where(eq(earnings.id, id));
    return earning;
  }

  async getEarningsForWorker(workerId: number): Promise<Earning[]> {
    return await db.select()
      .from(earnings)
      .where(eq(earnings.workerId, workerId))
      .orderBy(desc(earnings.dateEarned));
  }

  async getEarningsForJob(jobId: number): Promise<Earning[]> {
    return await db.select()
      .from(earnings)
      .where(eq(earnings.jobId, jobId))
      .orderBy(desc(earnings.dateEarned));
  }

  async createEarning(earning: InsertEarning): Promise<Earning> {
    // Default service fee if not provided
    const serviceFee = earning.serviceFee ?? 2.5;
    
    // Calculate net amount (earnings - service fee)
    const netAmount = earning.amount - serviceFee;
    
    // Create earning object with all required fields
    const earningData = {
      workerId: earning.workerId,
      jobId: earning.jobId,
      amount: earning.amount,
      serviceFee: serviceFee,
      netAmount: netAmount,
      // Default values
      status: 'pending',
      dateEarned: new Date(),
      datePaid: null,
    };
    
    const [createdEarning] = await db.insert(earnings).values(earningData).returning();
    return createdEarning;
  }

  async updateEarningStatus(id: number, status: string, datePaid?: Date): Promise<Earning | undefined> {
    const updateData: Partial<Earning> = { status };
    
    if (status === 'paid' && datePaid) {
      updateData.datePaid = datePaid;
    }
    
    const [updatedEarning] = await db.update(earnings)
      .set(updateData)
      .where(eq(earnings.id, id))
      .returning();
    
    return updatedEarning;
  }

  // Payment operations
  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }
  
  async getPaymentByTransactionId(transactionId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.transactionId, transactionId));
    return payment;
  }
  
  async getPaymentByJobId(jobId: number): Promise<Payment | undefined> {
    // Find the most recent payment for this job (not a refund)
    // Get all payments for this job first
    const jobPayments = await db.select()
      .from(payments)
      .where(eq(payments.jobId, jobId))
      .orderBy(desc(payments.createdAt));
      
    // Filter out refunds in JavaScript
    const nonRefundPayment = jobPayments.find(payment => !payment.type.includes('refund'));
    return nonRefundPayment;
  }

  async getPaymentsForUser(userId: number): Promise<Payment[]> {
    return await db.select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [createdPayment] = await db.insert(payments).values({
      ...payment,
      createdAt: new Date()
    }).returning();
    
    return createdPayment;
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
  
  // Badge operations
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
    const [createdBadge] = await db.insert(badges).values(badge).returning();
    return createdBadge;
  }

  // User badge operations
  async getUserBadges(userId: number): Promise<UserBadge[]> {
    return await db.select()
      .from(userBadges)
      .where(eq(userBadges.userId, userId));
  }

  async awardBadge(userBadge: InsertUserBadge): Promise<UserBadge> {
    const [awardedBadge] = await db.insert(userBadges).values(userBadge).returning();
    return awardedBadge;
  }

  async revokeBadge(userId: number, badgeId: number): Promise<boolean> {
    const result = await db.delete(userBadges)
      .where(
        and(
          eq(userBadges.userId, userId),
          eq(userBadges.badgeId, badgeId)
        )
      );
    // For PostgreSQL, we can check if any rows were affected
    return !!result;
  }

  // Notification operations
  async getNotifications(userId: number, options?: { isRead?: boolean, limit?: number }): Promise<Notification[]> {
    let query = db.select().from(notifications).where(eq(notifications.userId, userId));
    
    // Apply read status filter if provided
    if (options && options.isRead !== undefined) {
      query = query.where(eq(notifications.isRead, options.isRead));
    }
    
    // Order by created date (newest first)
    query = query.orderBy(desc(notifications.createdAt));
    
    // Apply limit if provided
    if (options && options.limit) {
      query = query.limit(options.limit);
    }
    
    const result = await query;
    return result;
  }
  
  async getNotification(id: number): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }
  
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [result] = await db.insert(notifications).values(notification).returning();
    return result;
  }
  
  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const [notification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    
    return notification;
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
      );
    
    // Return the number of affected rows
    return result.rowCount || 0;
  }
  
  async deleteNotification(id: number): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id));
    return !!result.rowCount;
  }
  
  async notifyNearbyWorkers(jobId: number, radiusMiles: number): Promise<number> {
    // Get the job details
    const job = await this.getJob(jobId);
    if (!job) return 0;
    
    // Get the poster's details for the notification
    const poster = await this.getUser(job.posterId);
    if (!poster) return 0;
    
    // Find all workers in the database
    const allWorkers = await db
      .select()
      .from(users)
      .where(eq(users.accountType, 'worker'))
      .execute();
    
    let notificationCount = 0;
    
    for (const worker of allWorkers) {
      // Skip workers who don't have location data
      if (!worker.latitude || !worker.longitude) continue;
      
      // Calculate distance between job and worker
      const distance = this.calculateDistance(
        job.latitude,
        job.longitude,
        worker.latitude,
        worker.longitude
      );
      
      // If worker is within the radius, send notification
      if (distance <= radiusMiles) {
        try {
          await this.createNotification({
            userId: worker.id,
            title: 'New Job Nearby',
            message: `${poster.fullName} posted a new job "${job.title}" ${distance.toFixed(1)} miles from you`,
            type: 'job_posted',
            sourceId: job.id,
            sourceType: 'job',
            metadata: { distance: distance.toFixed(1) }
          });
          
          notificationCount++;
        } catch (error) {
          console.error(`Failed to notify worker ${worker.id} about job ${jobId}:`, error);
        }
      }
    }
    
    return notificationCount;
  }
  
  // Helper function to calculate distance between two points using Haversine formula
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

  // === MESSAGING METHODS ===
  
  async createMessage(message: any): Promise<any> {
    const [newMessage] = await this.db.insert(messages).values(message).returning();
    return newMessage;
  }

  async getMessagesForJob(jobId: number): Promise<any[]> {
    const jobMessages = await this.db
      .select()
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.jobId, jobId))
      .orderBy(messages.sentAt);
    
    return jobMessages.map(({ messages: msg, users: sender }) => ({
      ...msg,
      sender: sender ? {
        id: sender.id,
        username: sender.username,
        avatarUrl: sender.avatarUrl
      } : null
    }));
  }

  async getConversation(userId1: number, userId2: number): Promise<any[]> {
    const conversation = await this.db
      .select()
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(
        or(
          and(eq(messages.senderId, userId1), eq(messages.recipientId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.recipientId, userId1))
        )
      )
      .orderBy(messages.sentAt);
    
    return conversation.map(({ messages: msg, users: sender }) => ({
      ...msg,
      sender: sender ? {
        id: sender.id,
        username: sender.username,
        avatarUrl: sender.avatarUrl
      } : null
    }));
  }

  async markMessageAsRead(messageId: number, userId: number): Promise<any> {
    const [updatedMessage] = await this.db
      .update(messages)
      .set({ 
        isRead: true, 
        readAt: new Date() 
      })
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.recipientId, userId)
        )
      )
      .returning();
    
    return updatedMessage;
  }

  // Enhanced messaging methods for real-time chat
  async getMessageById(messageId: number): Promise<Message | undefined> {
    const [message] = await this.db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);
    
    return message;
  }

  async getPendingMessages(userId: number): Promise<Message[]> {
    const pendingMessages = await this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.recipientId, userId),
          eq(messages.isRead, false)
        )
      )
      .orderBy(asc(messages.createdAt));
    
    return pendingMessages;
  }

  async getMessagesForJob(jobId: number): Promise<Message[]> {
    const jobMessages = await this.db
      .select()
      .from(messages)
      .where(eq(messages.jobId, jobId))
      .orderBy(asc(messages.createdAt));
    
    return jobMessages;
  }

  async getConversation(userId1: number, userId2: number, jobId?: number): Promise<Message[]> {
    let query = this.db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId1), eq(messages.recipientId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.recipientId, userId1))
        )
      );

    if (jobId) {
      query = query.where(eq(messages.jobId, jobId));
    }

    const conversation = await query.orderBy(asc(messages.createdAt));
    return conversation;
  }

  async createMessage(message: any): Promise<Message> {
    const [newMessage] = await this.db.insert(messages).values(message).returning();
    return newMessage;
  }

  async markMessageAsRead(messageId: number, userId: number): Promise<Message | undefined> {
    const [updatedMessage] = await this.db
      .update(messages)
      .set({ 
        isRead: true, 
        readAt: new Date() 
      })
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.recipientId, userId)
        )
      )
      .returning();
    
    return updatedMessage;
  }
}