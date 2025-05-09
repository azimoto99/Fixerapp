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
import { eq, and, or, like, desc, asc, isNotNull, sql } from "drizzle-orm";
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

  // No sample data in this implementation

  // User operations
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async getUserByUsernameAndType(username: string, accountType: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username && user.accountType === accountType
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const lastActive = new Date();
    const rating = 0;
    const completedJobs = 0;
    const successRate = 0;
    const responseTime = 0;
    const skills = insertUser.skills || [];
    const skillsVerified = {};
    const badgeIds = [];
    
    const user: User = { 
      ...insertUser, 
      id, 
      lastActive, 
      rating,
      completedJobs,
      successRate,
      responseTime,
      skills,
      skillsVerified,
      badgeIds,
      stripeCustomerId: null,
      stripeConnectAccountId: null
    };
    
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<InsertUser> & { 
    stripeConnectAccountId?: string, 
    stripeConnectAccountStatus?: string,
    stripeCustomerId?: string 
  }): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async uploadProfileImage(userId: number, imageData: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    // Store image data directly as URL (could be a base64 string)
    const updatedUser = { ...user, avatarUrl: imageData };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async updateUserSkills(userId: number, skills: string[]): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    // Update skills array
    const updatedUser = { ...user, skills };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async verifyUserSkill(userId: number, skill: string, isVerified: boolean): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    // Create a copy of the existing skills verification map or initialize if not exists
    const skillsVerified = { ...(user.skillsVerified || {}) };
    
    // Update the verification status for the specified skill
    skillsVerified[skill] = isVerified;
    
    const updatedUser = { ...user, skillsVerified };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async updateUserMetrics(userId: number, metrics: {
    completedJobs?: number;
    successRate?: number;
    responseTime?: number;
  }): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = { 
      ...user,
      completedJobs: metrics.completedJobs !== undefined ? metrics.completedJobs : user.completedJobs,
      successRate: metrics.successRate !== undefined ? metrics.successRate : user.successRate,
      responseTime: metrics.responseTime !== undefined ? metrics.responseTime : user.responseTime,
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async getUsersWithSkills(skills: string[]): Promise<User[]> {
    if (!skills.length) return [];
    
    return Array.from(this.users.values()).filter(user => {
      // Skip users with no skills
      if (!user.skills || !user.skills.length) return false;
      
      // Check if user has at least one of the required skills
      return skills.some(skill => user.skills?.includes(skill));
    });
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
    return this.jobs.get(id);
  }

  async getJobs(filters?: {
    category?: string;
    status?: string;
    posterId?: number;
    workerId?: number;
    search?: string;
  }): Promise<Job[]> {
    let jobList = Array.from(this.jobs.values());
    
    if (filters) {
      if (filters.category) {
        jobList = jobList.filter(job => job.category === filters.category);
      }
      
      if (filters.status) {
        jobList = jobList.filter(job => job.status === filters.status);
      }
      
      if (filters.posterId) {
        jobList = jobList.filter(job => job.posterId === filters.posterId);
      }
      
      if (filters.workerId) {
        jobList = jobList.filter(job => job.workerId === filters.workerId);
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        jobList = jobList.filter(job => 
          job.title.toLowerCase().includes(searchLower) ||
          job.description.toLowerCase().includes(searchLower) ||
          job.category.toLowerCase().includes(searchLower)
        );
      }
    }
    
    // Sort by date posted (newest first)
    return jobList.sort((a, b) => 
      new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime()
    );
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const id = this.jobIdCounter++;
    const datePosted = new Date();
    const workerId = null;
    const serviceFee = 2.5; // Service fee is fixed at $2.50
    const totalAmount = insertJob.paymentType === 'fixed' ? insertJob.paymentAmount + serviceFee : insertJob.paymentAmount;
    const status = insertJob.status || 'open'; // Default status is 'open'
    
    // Make sure boolean values are defined
    const equipmentProvided = insertJob.equipmentProvided === undefined ? false : insertJob.equipmentProvided;
    
    const job: Job = { 
      ...insertJob, 
      id, 
      datePosted, 
      workerId, 
      serviceFee, 
      totalAmount,
      status,
      equipmentProvided
    };
    
    this.jobs.set(id, job);
    return job;
  }

  async updateJob(id: number, data: Partial<InsertJob>): Promise<Job | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    
    let updatedJob = { ...job, ...data };
    
    // Recalculate total amount and service fee if payment information has been updated
    if (data.paymentAmount !== undefined || data.paymentType !== undefined) {
      const paymentType = data.paymentType || job.paymentType;
      const paymentAmount = data.paymentAmount !== undefined ? data.paymentAmount : job.paymentAmount;
      const serviceFee = 2.5; // Fixed service fee
      
      updatedJob = {
        ...updatedJob,
        serviceFee,
        totalAmount: paymentType === 'fixed' ? paymentAmount + serviceFee : paymentAmount
      };
    }
    
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async deleteJob(id: number): Promise<boolean> {
    return this.jobs.delete(id);
  }

  async getJobsNearLocation(
    latitude: number, 
    longitude: number, 
    radiusMiles: number
  ): Promise<Job[]> {
    const jobs = Array.from(this.jobs.values());
    
    return jobs.filter(job => {
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
    return this.earnings.get(id);
  }

  async getEarningsForWorker(workerId: number): Promise<Earning[]> {
    return Array.from(this.earnings.values())
      .filter(earning => earning.workerId === workerId)
      .sort((a, b) => new Date(b.dateEarned).getTime() - new Date(a.dateEarned).getTime());
  }

  async getEarningsForJob(jobId: number): Promise<Earning[]> {
    return Array.from(this.earnings.values())
      .filter(earning => earning.jobId === jobId)
      .sort((a, b) => new Date(b.dateEarned).getTime() - new Date(a.dateEarned).getTime());
  }

  async createEarning(earning: InsertEarning): Promise<Earning> {
    const id = this.earningIdCounter++;
    const dateEarned = new Date();
    const datePaid = null;
    const status = "pending";  // Initial status is always "pending"
    const serviceFee = earning.serviceFee || 2.5; // Default service fee is $2.50
    
    const newEarning: Earning = {
      ...earning,
      id,
      dateEarned,
      datePaid,
      status,
      serviceFee
    };
    this.earnings.set(id, newEarning);
    return newEarning;
  }

  async updateEarningStatus(id: number, status: string, datePaid?: Date): Promise<Earning | undefined> {
    const earning = this.earnings.get(id);
    if (!earning) return undefined;
    
    const updatedEarning: Earning = {
      ...earning,
      status,
      datePaid: status === "paid" ? (datePaid || new Date()) : earning.datePaid
    };
    this.earnings.set(id, updatedEarning);
    return updatedEarning;
  }
  
  // Payment operations
  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }
  
  async getPaymentByTransactionId(transactionId: string): Promise<Payment | undefined> {
    return Array.from(this.payments.values())
      .find(payment => payment.transactionId === transactionId);
  }

  async getPaymentsForUser(userId: number): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.userId === userId)
      .sort((a, b) => {
        // Use createdAt instead of dateInitiated
        const dateA = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        const dateB = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        return dateA - dateB;
      });
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.paymentIdCounter++;
    const createdAt = new Date();
    const status = "pending";
    const transactionId = null;
    
    const newPayment: Payment = {
      ...payment,
      id,
      createdAt,
      status,
      transactionId
    };
    this.payments.set(id, newPayment);
    return newPayment;
  }

  async updatePaymentStatus(id: number, status: string, transactionId?: string): Promise<Payment | undefined> {
    const payment = this.payments.get(id);
    if (!payment) return undefined;
    
    const updatedPayment: Payment = {
      ...payment,
      status,
      transactionId: transactionId || payment.transactionId
    };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }
  
  // Badge operations
  async getBadge(id: number): Promise<Badge | undefined> {
    return this.badges.get(id);
  }
  
  async getAllBadges(): Promise<Badge[]> {
    return Array.from(this.badges.values());
  }
  
  async getBadgesByCategory(category: string): Promise<Badge[]> {
    return Array.from(this.badges.values())
      .filter(badge => badge.category === category);
  }
  
  async createBadge(badge: InsertBadge): Promise<Badge> {
    const id = this.badgeIdCounter++;
    const createdAt = new Date();
    
    const newBadge: Badge = {
      ...badge,
      id,
      createdAt
    };
    
    this.badges.set(id, newBadge);
    return newBadge;
  }
  
  // User badge operations
  async getUserBadges(userId: number): Promise<UserBadge[]> {
    return Array.from(this.userBadges.values())
      .filter(userBadge => userBadge.userId === userId);
  }
  
  async awardBadge(userBadge: InsertUserBadge): Promise<UserBadge> {
    const id = this.userBadgeIdCounter++;
    const earnedAt = new Date();
    
    const newUserBadge: UserBadge = {
      ...userBadge,
      id,
      earnedAt
    };
    
    this.userBadges.set(id, newUserBadge);
    
    // Also update user's badgeIds array
    const user = this.users.get(userBadge.userId);
    if (user) {
      const badgeIds = [...(user.badgeIds || [])];
      
      // Check if badge ID already exists in user's badges
      if (!badgeIds.includes(userBadge.badgeId.toString())) {
        badgeIds.push(userBadge.badgeId.toString());
        const updatedUser = { ...user, badgeIds };
        this.users.set(user.id, updatedUser);
      }
    }
    
    return newUserBadge;
  }
  
  async revokeBadge(userId: number, badgeId: number): Promise<boolean> {
    // Find and remove the user badge entry
    const userBadgeEntries = Array.from(this.userBadges.entries());
    let removed = false;
    
    for (const [key, userBadge] of userBadgeEntries) {
      if (userBadge.userId === userId && userBadge.badgeId === badgeId) {
        this.userBadges.delete(key);
        removed = true;
      }
    }
    
    // Also update user's badgeIds array if found
    if (removed) {
      const user = this.users.get(userId);
      if (user && user.badgeIds && user.badgeIds.length) {
        const badgeIds = user.badgeIds.filter(id => id !== badgeId.toString());
        const updatedUser = { ...user, badgeIds };
        this.users.set(userId, updatedUser);
      }
    }
    
    return removed;
  }

  // Notification operations
  async getNotifications(userId: number, options?: { isRead?: boolean, limit?: number }): Promise<Notification[]> {
    let notifications = Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId);
    
    // Filter by read status if specified
    if (options && options.isRead !== undefined) {
      notifications = notifications.filter(notification => notification.isRead === options.isRead);
    }
    
    // Sort by createdAt (newest first)
    notifications = notifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Apply limit if specified
    if (options && options.limit) {
      notifications = notifications.slice(0, options.limit);
    }
    
    return notifications;
  }
  
  async getNotification(id: number): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }
  
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = this.notificationIdCounter++;
    const createdAt = new Date();
    const isRead = false;
    
    const newNotification: Notification = {
      ...notification,
      id,
      createdAt,
      isRead
    };
    
    this.notifications.set(id, newNotification);
    return newNotification;
  }
  
  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    
    const updatedNotification = { ...notification, isRead: true };
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }
  
  async markAllNotificationsAsRead(userId: number): Promise<number> {
    const notifications = Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId && !notification.isRead);
    
    let count = 0;
    for (const notification of notifications) {
      const updatedNotification = { ...notification, isRead: true };
      this.notifications.set(notification.id, updatedNotification);
      count++;
    }
    
    return count;
  }
  
  async deleteNotification(id: number): Promise<boolean> {
    return this.notifications.delete(id);
  }
  
  // Specialized notification methods
  async notifyNearbyWorkers(jobId: number, radiusMiles: number): Promise<number> {
    const job = this.jobs.get(jobId);
    if (!job) return 0;
    
    // Get all users with worker account type or those who haven't selected an account type yet
    const workers = Array.from(this.users.values())
      .filter(user => user.accountType === 'worker' || !user.accountType);
    
    // Find workers within the radius
    const nearbyWorkers = workers.filter(worker => {
      if (!worker.latitude || !worker.longitude) return false;
      
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
