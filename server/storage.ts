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
  contacts,
  messages,
  type DbUser as User, 
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
  type InsertNotification,
  type Message,
  type InsertMessage
} from "@shared/schema";

import session from "express-session";

// Storage interface for all CRUD operations
export interface IStorage {
  // Session store for authentication
  sessionStore?: session.Store;
  
  // User operations
  getAllUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByUsernameInsensitive(username: string): Promise<User | undefined>;
  getUserByUsernameAndType(username: string, accountType: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
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
  getPaymentByJobId(jobId: number): Promise<Payment | undefined>;
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
  
  // Contact/Friendship operations
  getUserContacts(userId: number): Promise<(User & { lastMessage?: string | null })[]>;
  addUserContact(userId: number, contactId: number): Promise<{ userId: number, contactId: number }>;
  removeUserContact(userId: number, contactId: number): Promise<boolean>;
  searchUsers(query: string, currentUserId: number): Promise<User[]>;
  
  // Message operations
  getMessagesBetweenUsers(userId1: number, userId2: number): Promise<Message[]>;
  markMessagesAsRead(recipientId: number, senderId: number): Promise<boolean>;
  markMessageAsRead(messageId: number, userId: number): Promise<Message | undefined>;
  // Admin operations
  getAllJobs(): Promise<Job[]>;
  getAllPayments(): Promise<Payment[]>;
  getAllEarnings(): Promise<Earning[]>;
  getAllSupportTickets(): Promise<any[]>;
  getSupportTickets(): Promise<any[]>;
  updateSupportTicket(id: number, data: any): Promise<any>;
  deleteSupportTicket(id: number): Promise<any>;
  getEarnings(userId: number): Promise<Earning[]>;
  addTicketResponse(responseData: any): Promise<any>;
  getUserById(id: number): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessageById(messageId: number): Promise<Message | undefined>;
  getPendingMessages(userId: number): Promise<Message[]>;
  getMessagesForJob(jobId: number): Promise<Message[]>;
  getConversation(userId1: number, userId2: number, jobId?: number): Promise<Message[]>;
  
  // User profile operations
  searchUsers(query: string, excludeUserId?: number): Promise<User[]>;
  getJobsForWorker(workerId: number, filter?: { status?: string }): Promise<Job[]>;
  getJobsForPoster(posterId: number): Promise<Job[]>;

  // Global notifications
  getAllGlobalNotifications(): Promise<{ id: number; title: string; body: string; isActive: boolean; createdAt: string }[]>;
  createGlobalNotification(data: { title: string; body: string; createdBy?: number }): Promise<any>;
  deleteGlobalNotification(id: number): Promise<boolean>;

  // Platform settings operations
  getPlatformSettings(): Promise<Record<string, any> | undefined>;
  updatePlatformSettings(settings: Record<string, any>): Promise<Record<string, any>>;
  getSettingsHistory(limit: number, offset: number): Promise<any[]>;
  createSettingsBackup(backup: any): Promise<number>;
  getSettingsBackup(backupId: number): Promise<any>;
  getSettingsBackups(): Promise<any[]>;

  // Support ticket operations
  getSupportTicketsByUserId(userId: number): Promise<any[]>;
  createSupportTicket(ticketData: any): Promise<any>;
  getSupportTicketById(id: number): Promise<any>;
  getSupportTicketMessages(ticketId: number): Promise<any[]>;
  assignSupportTicket(ticketId: number, adminId: number): Promise<any>;
  
  // Dispute operations
  createDispute(disputeData: any): Promise<any>;
  getDisputesByUserId(userId: number): Promise<any[]>;
  getDispute(id: number): Promise<any>;
  updateDispute(id: number, data: any): Promise<any>;
  
  // Refund operations
  createRefund(refundData: any): Promise<any>;
  getRefundsByUserId(userId: number): Promise<any[]>;
  getRefund(id: number): Promise<any>;
  updateRefund(id: number, data: any): Promise<any>;
  
  // Feedback operations
  createFeedback(feedbackData: any): Promise<any>;
  getFeedbackByUserId(userId: number): Promise<any[]>;
  getAllFeedback(): Promise<any[]>;
  updateFeedback(id: number, data: any): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private jobs: Map<number, Job>;
  private applications: Map<number, Application>;
  private reviews: Map<number, Review>;
  private tasks: Map<number, Task>;
  private earnings: Map<number, Earning>;
  private payments: Map<number, Payment>;
  private badges: Map<number, Badge>;
  private userBadges: Map<number, UserBadge>;
  private notifications: Map<number, Notification>;
  private messages: Map<number, Message>;
  private contacts: Map<string, any>;
  private supportTickets: Map<number, any>;
  
  private userIdCounter: number;
  private jobIdCounter: number;
  private applicationIdCounter: number;
  private reviewIdCounter: number;
  private taskIdCounter: number;
  private earningIdCounter: number;
  private paymentIdCounter: number;
  private badgeIdCounter: number;
  private userBadgeIdCounter: number;
  private notificationIdCounter: number;
  private messageIdCounter: number;

  constructor() {
    this.users = new Map();
    this.jobs = new Map();
    this.applications = new Map();
    this.reviews = new Map();
    this.tasks = new Map();
    this.earnings = new Map();
    this.payments = new Map();
    this.badges = new Map();
    this.userBadges = new Map();
    this.notifications = new Map();
    this.messages = new Map();    this.contacts = new Map();
    this.supportTickets = new Map();
    this.userBadges = new Map();
    this.notifications = new Map();
    
    this.userIdCounter = 1;
    this.jobIdCounter = 1;
    this.applicationIdCounter = 1;
    this.reviewIdCounter = 1;
    this.taskIdCounter = 1;
    this.earningIdCounter = 1;
    this.paymentIdCounter = 1;
    this.badgeIdCounter = 1;
    this.userBadgeIdCounter = 1;
    this.notificationIdCounter = 1;
    this.messageIdCounter = 1;
    this.userBadgeIdCounter = 1;
    this.notificationIdCounter = 1;
    
    // No sample data - never initialize any sample data
    
    // Initialize some sample support tickets for admin panel testing
    this.initializeSampleSupportTickets();
  }
  
  private initializeSampleSupportTickets() {
    const sampleTickets = [
      {
        id: 1,
        title: "Payment not received",
        userName: "John Doe",
        userEmail: "john@example.com",
        priority: "high",
        status: "open",
        description: "I completed a job but haven't received payment yet.",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: 2,
        title: "Account verification issue",
        userName: "Jane Smith",
        userEmail: "jane@example.com",
        priority: "medium",
        status: "in_progress",
        description: "Having trouble verifying my business account.",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: 3,
        title: "App crashes on job posting",
        userName: "Mike Johnson",
        userEmail: "mike@example.com",
        priority: "urgent",
        status: "open",
        description: "The mobile app crashes every time I try to post a new job.",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: 4,
        title: "Profile picture upload failed",
        userName: "Sarah Wilson",
        userEmail: "sarah@example.com",
        priority: "low",
        status: "resolved",
        description: "Cannot upload profile picture, getting error message.",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        resolvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        id: 5,
        title: "Dispute resolution needed",
        userName: "Tom Brown",
        userEmail: "tom@example.com",
        priority: "high",
        status: "closed",
        description: "Need help resolving a dispute with a client about job completion.",
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        resolvedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      }
    ];
    
    sampleTickets.forEach(ticket => {
      this.supportTickets.set(ticket.id, ticket);
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
  
  async getUserByUsernameInsensitive(username: string): Promise<User | undefined> {
    const lowerUsername = username.toLowerCase();
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === lowerUsername
    );
  }
  
  async getUserByUsernameAndType(username: string, accountType: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username && user.accountType === accountType
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const lastActive = new Date();
    const rating = null;
    const completedJobs = 0;
    const successRate = 0;
    const responseTime = 0;
    const skills = insertUser.skills || [];
    const skillsVerified = {};
    const badgeIds: string[] = [];
    const createdAt = new Date();
    const datePosted = new Date();
    
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
      accountType: insertUser.accountType || "worker", // Ensure accountType is always a string
      stripeCustomerId: null,
      stripeConnectAccountId: null,
      stripeConnectAccountStatus: null,
      stripeTermsAccepted: false,
      stripeTermsAcceptedAt: null,
      stripeRepresentativeName: null,
      stripeRepresentativeTitle: null,
      stripeRepresentativeRequirementsComplete: false,
      stripeBankingDetailsComplete: false,
      contactPreferences: {
        email: true,
        sms: false,
        push: true
      },
      availability: {
        weekdays: [true, true, true, true, true],
        weekend: [false, false],
        hourStart: 9,
        hourEnd: 17
      },
      emailVerified: false,
      phoneVerified: false,
      identityVerified: false,
      verificationToken: null,
      verificationTokenExpiry: null,
      phoneVerificationCode: null,
      phoneVerificationExpiry: null,
      createdAt,
      datePosted,
      isActive: true,
      isAdmin: false,
      googleId: null,
      facebookId: null,
      latitude: null,
      longitude: null,
      location: null,
      phone: insertUser.phone || null,
      bio: insertUser.bio || null,
      avatarUrl: insertUser.avatarUrl || null
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
    return jobList.sort((a, b) => {
      const dateA = a.datePosted ? new Date(a.datePosted).getTime() : 0;
      const dateB = b.datePosted ? new Date(b.datePosted).getTime() : 0;
      return dateB - dateA;
    });
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const id = this.jobIdCounter++;
    const datePosted = new Date();
    const workerId = null;
    const serviceFee = insertJob.paymentAmount * 0.05; // Service fee is 5% of payment amount
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
      equipmentProvided,
      completedAt: null,
      autoAccept: insertJob.autoAccept || false,
      startTime: null,
      clockInTime: null,
      completionTime: null,
      shiftStartTime: null,
      shiftEndTime: null,
      workerTrackingEnabled: insertJob.workerTrackingEnabled !== undefined ? insertJob.workerTrackingEnabled : true,
      verifyLocationToStart: insertJob.verifyLocationToStart !== undefined ? insertJob.verifyLocationToStart : true,
      markerColor: insertJob.markerColor || null,
      requiredSkills: insertJob.requiredSkills || []
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
      const serviceFee = paymentAmount * 0.05; // 5% service fee
      
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
      // Only include jobs that are 'open' (not assigned, not completed)
      if (job.status !== 'open') {
        return false;
      }
      
      // Check if job has valid coordinates
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
    return this.applications.get(id);
  }

  async getApplicationsForJob(jobId: number): Promise<Application[]> {
    return Array.from(this.applications.values())
      .filter(application => application.jobId === jobId);
  }

  async getApplicationsByJobId(jobId: number): Promise<Application[]> {
    return this.getApplicationsForJob(jobId);
  }

  async getApplicationsForWorker(workerId: number): Promise<Application[]> {
    return Array.from(this.applications.values())
      .filter(application => application.workerId === workerId);
  }

  async createApplication(insertApplication: InsertApplication): Promise<Application> {
    const id = this.applicationIdCounter++;
    const dateApplied = new Date();
    
    // Check if the job has auto-accept enabled
    const job = await this.getJob(insertApplication.jobId);
    const status = job && job.autoAccept ? "accepted" : "pending";
    
    // Ensure nullable fields are properly handled
    const message = insertApplication.message === undefined ? null : insertApplication.message;
    const hourlyRate = insertApplication.hourlyRate === undefined ? null : insertApplication.hourlyRate;
    const expectedDuration = insertApplication.expectedDuration === undefined ? null : insertApplication.expectedDuration;
    const coverLetter = insertApplication.coverLetter === undefined ? null : insertApplication.coverLetter;
    
    const application: Application = { 
      ...insertApplication, 
      id, 
      dateApplied, 
      status,
      message,
      hourlyRate,
      expectedDuration,
      coverLetter
    };
    this.applications.set(id, application);
      // If auto-accept is enabled, also update the job to assign this worker
    if (job && job.autoAccept && status === "accepted") {
      const updatedJob = { ...job, workerId: insertApplication.workerId, status: "assigned" };
      this.jobs.set(job.id, updatedJob);
      
      // Create a notification for the worker
      const notificationData: InsertNotification = {
        userId: insertApplication.workerId,
        title: "Application Accepted",
        message: `Your application for job "${job.title}" was automatically accepted.`,
        type: "application_accepted",
        sourceId: job.id,
        sourceType: "job",
        metadata: {}
      };
      
      try {
        await this.createNotification(notificationData);
      } catch (error) {
        console.error("Failed to create notification", error);
      }
    }
    
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
      .sort((a, b) => a.position - b.position);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = this.taskIdCounter++;
    const completedAt = null;
    const completedBy = null;
    
    // Get the max position for tasks in this job and add 1
    const tasksForJob = await this.getTasksForJob(task.jobId);
    const position = tasksForJob.length === 0 
      ? 0 
      : Math.max(...tasksForJob.map(t => t.position)) + 1;
      const newTask: Task = {
      ...task,
      id,
      completedAt,
      completedBy,
      isCompleted: false,
      position,
      latitude: task.latitude || null,
      longitude: task.longitude || null,
      location: task.location || null,
      isOptional: task.isOptional || false,
      dueTime: task.dueTime || null,
      estimatedDuration: task.estimatedDuration || null,
      bonusAmount: task.bonusAmount || null,
      notes: task.notes || null
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
    
    // Update positions
    const updatedTasks: Task[] = [];
    for (let i = 0; i < taskIds.length; i++) {
      const taskId = taskIds[i];
      const task = taskMap.get(taskId)!;
      const updatedTask = await this.updateTask(taskId, { position: i });
      updatedTasks.push(updatedTask!);
    }
    
    return updatedTasks.sort((a, b) => a.position - b.position);
  }
  
  // Earnings operations
  async getEarning(id: number): Promise<Earning | undefined> {
    return this.earnings.get(id);
  }
  async getEarningsForWorker(workerId: number): Promise<Earning[]> {
    return Array.from(this.earnings.values())
      .filter(earning => earning.workerId === workerId)
      .sort((a, b) => {
        const dateA = a.dateEarned ? new Date(a.dateEarned).getTime() : 0;
        const dateB = b.dateEarned ? new Date(b.dateEarned).getTime() : 0;
        return dateB - dateA;
      });
  }

  async getEarningsForJob(jobId: number): Promise<Earning[]> {
    return Array.from(this.earnings.values())
      .filter(earning => earning.jobId === jobId)
      .sort((a, b) => {
        const dateA = a.dateEarned ? new Date(a.dateEarned).getTime() : 0;
        const dateB = b.dateEarned ? new Date(b.dateEarned).getTime() : 0;
        return dateB - dateA;
      });
  }
  async createEarning(earning: InsertEarning): Promise<Earning> {
    const id = this.earningIdCounter++;
    const dateEarned = new Date();
    const datePaid = null;
    const status = "pending";  // Initial status is always "pending"
    const serviceFee = earning.serviceFee || (earning.amount * 0.05); // Default service fee is 5%
    
    const newEarning: Earning = {
      ...earning,
      id,
      dateEarned,
      datePaid,
      status,
      serviceFee,
      createdAt: new Date(),
      transactionId: null,
      paymentId: null,
      stripeAccountId: null,
      metadata: {},
      platformFee: earning.platformFee || 0,
      netAmount: earning.netAmount || (earning.amount - serviceFee),
      description: earning.description || null,
      jobId: earning.jobId || null
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
  
  async getPaymentByJobId(jobId: number): Promise<Payment | undefined> {
    // Find the most recent payment for this job (not a refund)
    return Array.from(this.payments.values())
      .filter(payment => payment.jobId === jobId && payment.type !== 'refund')
      .sort((a, b) => {
        // Sort by creation date, newest first
        const dateA = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        const dateB = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        return dateA - dateB;
      })[0]; // Get the first (most recent) payment
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
    const transactionId = null;      const newPayment: Payment = {
      ...payment,
      id,
      createdAt,
      status,
      transactionId,
      completedAt: null,
      stripeCustomerId: payment.stripeCustomerId || null,
      stripeConnectAccountId: payment.stripeConnectAccountId || null,
      description: payment.description || null,
      workerId: payment.workerId || null,
      jobId: payment.jobId || null,
      serviceFee: payment.serviceFee || null,
      currency: payment.currency || null,
      metadata: payment.metadata || null,
      paymentMethod: payment.paymentMethod || null,
      stripePaymentIntentId: payment.stripePaymentIntentId || null,
      stripeRefundId: payment.stripeRefundId || null
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
      createdAt,
      requirements: badge.requirements || {},
      tier: badge.tier || 1
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
      earnedAt,
      metadata: userBadge.metadata || {}
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
        const badgeIds = user.badgeIds.filter((id: string) => id !== badgeId.toString());
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
    notifications = notifications.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    
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
      isRead,
      metadata: notification.metadata || {},
      sourceId: notification.sourceId || null,
      sourceType: notification.sourceType || null
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

	// Contact operations
	async getUserContacts(userId: number): Promise<(User & { lastMessage?: string | null })[]> {
		// In-memory implementation - return all users except the current user as potential contacts
		return Array.from(this.users.values())
			.filter(user => user.id !== userId)
			.map(user => ({ ...user, lastMessage: null }));
	}

	async addUserContact(userId: number, contactId: number): Promise<{ userId: number, contactId: number }> {
		// Store the contact relationship
		const contactKey = `${userId}_${contactId}`;
		this.contacts.set(contactKey, { userId, contactId, createdAt: new Date() });
		return { userId, contactId };
	}

	async removeUserContact(userId: number, contactId: number): Promise<boolean> {
		const contactKey = `${userId}_${contactId}`;
		return this.contacts.delete(contactKey);
	}
	// Search functionality - fix the overloaded methods
	async searchUsers(query: string, currentUserId?: number): Promise<User[]> {
		const searchResults = Array.from(this.users.values())
			.filter(user => {
				// Exclude current user if provided
				if (currentUserId && user.id === currentUserId) return false;
				
				return user.fullName.toLowerCase().includes(query.toLowerCase()) ||
					user.email.toLowerCase().includes(query.toLowerCase()) ||
					user.username.toLowerCase().includes(query.toLowerCase());
			})
			.slice(0, 10);
		return searchResults;
	}
	// Message operations
	async getMessagesBetweenUsers(userId1: number, userId2: number): Promise<Message[]> {
		return Array.from(this.messages.values())
			.filter(message => 
				(message.senderId === userId1 && message.recipientId === userId2) ||
				(message.senderId === userId2 && message.recipientId === userId1)
			)
			.sort((a, b) => {
				const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
				const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
				return dateA - dateB;
			});
	}

	async markMessagesAsRead(recipientId: number, senderId: number): Promise<boolean> {
		let updated = false;
		for (const message of this.messages.values()) {
			if (message.recipientId === recipientId && message.senderId === senderId && !message.isRead) {
				message.isRead = true;
				message.readAt = new Date();
				updated = true;
			}
		}
		return updated;
	}

	async markMessageAsRead(messageId: number, userId: number): Promise<Message | undefined> {
		const message = this.messages.get(messageId);
		if (message && message.recipientId === userId) {
			const updatedMessage = { ...message, isRead: true, readAt: new Date() };
			this.messages.set(messageId, updatedMessage);
			return updatedMessage;
		}
		return undefined;
	}

	// Admin operations
	async getAllJobs(): Promise<any[]> {
		return Array.from(this.jobs.values());
	}

	async getAllPayments(): Promise<any[]> {
		return Array.from(this.payments.values());
	}

	async getAllEarnings(): Promise<any[]> {
		// Calculate earnings from payments
		const earnings = Array.from(this.payments.values())
			.filter(payment => payment.status === 'completed')
			.map(payment => ({
				id: payment.id,
				jobId: payment.jobId,
				amount: payment.amount,
				createdAt: payment.createdAt,
				type: 'job_payment'
			}));
		return earnings;
	}
	async getAllSupportTickets(): Promise<any[]> {
		return Array.from(this.supportTickets.values());
	}
	
	async getSupportTickets(): Promise<any[]> {
		return Array.from(this.supportTickets.values());
	}
	
	async updateSupportTicket(id: number, data: any): Promise<any> {
		const ticket = this.supportTickets.get(id);
		if (!ticket) {
			return null;
		}
		
		const updatedTicket = { ...ticket, ...data, updatedAt: new Date() };
		this.supportTickets.set(id, updatedTicket);
		return updatedTicket;
	}
	
	async deleteSupportTicket(id: number): Promise<any> {
		const ticket = this.supportTickets.get(id);
		if (!ticket) {
			return null;
		}
		
		this.supportTickets.delete(id);
		return ticket;
	}
	async getEarnings(userId: number): Promise<Earning[]> {
		return Array.from(this.earnings.values())
			.filter(earning => earning.userId === userId)
			.sort((a, b) => {
				const dateA = a.dateEarned ? new Date(a.dateEarned).getTime() : 0;
				const dateB = b.dateEarned ? new Date(b.dateEarned).getTime() : 0;
				return dateB - dateA;
			});
	}
	async addTicketResponse(responseData: any): Promise<any> {
		const ticketId = responseData.ticketId;
		const ticket = this.supportTickets.get(ticketId);
		if (!ticket) {
			throw new Error('Support ticket not found');
		}

		const responseId = Date.now();
		
		// Add response to ticket (assuming ticket has responses array)
		if (!ticket.responses) {
			ticket.responses = [];
		}
		
		const response = {
			id: responseId,
			...responseData,
			createdAt: new Date()
		};
		
		ticket.responses.push(response);
		ticket.updatedAt = new Date();
		ticket.status = 'responded';

		return response;
	}

	async getUserById(id: number): Promise<User | undefined> {
		return this.users.get(id);
	}

	async deleteUser(id: number): Promise<boolean> {
		const deleted = this.users.delete(id);
		
		// Also clean up related data
		for (const [jobId, job] of this.jobs.entries()) {
			if (job.posterId === id || job.workerId === id) {
				this.jobs.delete(jobId);
			}
		}
		
		for (const [messageId, message] of this.messages.entries()) {
			if (message.senderId === id || message.recipientId === id) {
				this.messages.delete(messageId);
			}
		}
		
		return deleted;
	}
	// Message CRUD operations
	async createMessage(message: InsertMessage): Promise<Message> {
		const id = this.messageIdCounter++;
		const sentAt = new Date();
		const isRead = false;
				const newMessage: Message = {
			...message,
			id,
			sentAt,
			isRead,
			readAt: null,
			attachmentUrl: message.attachmentUrl || null,
			attachmentType: message.attachmentType || null,
			isEdited: false,
			editedAt: null,
			jobId: message.jobId || null,
			messageType: message.messageType || null
		};
		
		this.messages.set(id, newMessage);
		return newMessage;
	}

	async getMessageById(messageId: number): Promise<Message | undefined> {
		return this.messages.get(messageId);
	}

	async getPendingMessages(userId: number): Promise<Message[]> {
		return Array.from(this.messages.values())
			.filter(message => message.recipientId === userId && !message.isRead)
			.sort((a, b) => {
				const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
				const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
				return dateB - dateA;
			});
	}

	async getMessagesForJob(jobId: number): Promise<Message[]> {
		return Array.from(this.messages.values())
			.filter(message => message.jobId === jobId)
			.sort((a, b) => {
				const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
				const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
				return dateA - dateB;
			});
	}

	async getConversation(userId1: number, userId2: number, jobId?: number): Promise<Message[]> {
		return Array.from(this.messages.values())
			.filter(message => {
				const isUserConversation = (
					(message.senderId === userId1 && message.recipientId === userId2) ||
					(message.senderId === userId2 && message.recipientId === userId1)
				);
				
				if (jobId) {
					return isUserConversation && message.jobId === jobId;
				}
				
				return isUserConversation;
			})
			.sort((a, b) => {
				const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
				const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
				return dateA - dateB;
			});
	}
	// Job operations
	async getJobsForWorker(workerId: number): Promise<any[]> {
		return Array.from(this.jobs.values())
			.filter(job => job.workerId === workerId)
			.sort((a, b) => new Date(b.datePosted || 0).getTime() - new Date(a.datePosted || 0).getTime());
	}

	async getJobsForPoster(posterId: number): Promise<any[]> {
		return Array.from(this.jobs.values())
			.filter(job => job.posterId === posterId)
			.sort((a, b) => new Date(b.datePosted || 0).getTime() - new Date(a.datePosted || 0).getTime());
	}

  // Global notifications
  async getAllGlobalNotifications(): Promise<{ id: number; title: string; body: string; isActive: boolean; createdAt: string }[]> {
    // Implementation needed
    throw new Error("Method not implemented");
  }

  async createGlobalNotification(data: { title: string; body: string; createdBy?: number }): Promise<any> {
    // Implementation needed
    throw new Error("Method not implemented");
  }

  async deleteGlobalNotification(id: number): Promise<boolean> {
    // Implementation needed
    throw new Error("Method not implemented");
  }

  // Platform settings operations
  private platformSettings: Map<string, any> = new Map();
  private settingsBackups: Map<number, any> = new Map();
  private settingsBackupIdCounter: number = 1;

  async getPlatformSettings(): Promise<Record<string, any> | undefined> {
    const settings: Record<string, any> = {};
    for (const [key, value] of this.platformSettings.entries()) {
      settings[key] = value;
    }
    return Object.keys(settings).length > 0 ? settings : undefined;
  }

  async updatePlatformSettings(settings: Record<string, any>): Promise<Record<string, any>> {
    // Clear existing settings
    this.platformSettings.clear();
    
    // Set new settings
    for (const [key, value] of Object.entries(settings)) {
      this.platformSettings.set(key, value);
    }
    
    return settings;
  }

  async getSettingsHistory(limit: number, offset: number): Promise<any[]> {
    // In a real implementation, this would fetch from an audit log table
    // For now, return empty array
    return [];
  }

  async createSettingsBackup(backup: any): Promise<number> {
    const backupId = this.settingsBackupIdCounter++;
    this.settingsBackups.set(backupId, {
      id: backupId,
      ...backup
    });
    return backupId;
  }

  async getSettingsBackup(backupId: number): Promise<any> {
    return this.settingsBackups.get(backupId);
  }

  async getSettingsBackups(): Promise<any[]> {
    return Array.from(this.settingsBackups.values());
  }

  // Support ticket operations
  async getSupportTicketsByUserId(userId: number): Promise<any[]> {
    return Array.from(this.supportTickets.values())
      .filter(ticket => ticket.userId === userId);
  }

  async createSupportTicket(ticketData: any): Promise<any> {
    const id = Date.now();
    const ticket = { id, ...ticketData, createdAt: new Date() };
    this.supportTickets.set(id, ticket);
    return ticket;
  }

  async getSupportTicketById(id: number): Promise<any> {
    return this.supportTickets.get(id) || null;
  }

  async getSupportTicketMessages(ticketId: number): Promise<any[]> {
    return [];
  }

  async assignSupportTicket(ticketId: number, adminId: number): Promise<any> {
    const ticket = this.supportTickets.get(ticketId);
    if (ticket) {
      ticket.assignedTo = adminId;
      ticket.updatedAt = new Date();
      this.supportTickets.set(ticketId, ticket);
      return ticket;
    }
    return null;
  }
  
  // Dispute operations - stubs for memory storage
  async createDispute(disputeData: any): Promise<any> {
    return { id: Date.now(), ...disputeData, createdAt: new Date() };
  }
  
  async getDisputesByUserId(userId: number): Promise<any[]> {
    return [];
  }
  
  async getDispute(id: number): Promise<any> {
    return null;
  }
  
  async updateDispute(id: number, data: any): Promise<any> {
    return null;
  }
  
  // Refund operations - stubs for memory storage
  async createRefund(refundData: any): Promise<any> {
    return { id: Date.now(), ...refundData, createdAt: new Date() };
  }
  
  async getRefundsByUserId(userId: number): Promise<any[]> {
    return [];
  }
  
  async getRefund(id: number): Promise<any> {
    return null;
  }
  
  async updateRefund(id: number, data: any): Promise<any> {
    return null;
  }
  
  // Feedback operations - stubs for memory storage
  async createFeedback(feedbackData: any): Promise<any> {
    return { id: Date.now(), ...feedbackData, createdAt: new Date() };
  }
  
  async getFeedbackByUserId(userId: number): Promise<any[]> {
    return [];
  }
  
  async getAllFeedback(): Promise<any[]> {
    return [];
  }
  
  async updateFeedback(id: number, data: any): Promise<any> {
    return null;
  }
}

// Import the fixed database storage implementation - don't rename the import
import { FixedDatabaseStorage } from './fixed-database-storage';

// Use the enhanced database storage implementation with better session handling
import { unifiedStorage } from "./unified-storage";

export const storage = unifiedStorage;
