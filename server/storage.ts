import { 
  users, 
  jobs, 
  applications, 
  reviews,
  tasks,
  earnings,
  payments,
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
  type InsertPayment
} from "@shared/schema";

// Storage interface for all CRUD operations
export interface IStorage {
  // User operations
  getAllUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByUsernameAndType(username: string, accountType: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  
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
  getPaymentsForUser(userId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePaymentStatus(id: number, status: string, transactionId?: string): Promise<Payment | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private jobs: Map<number, Job>;
  private applications: Map<number, Application>;
  private reviews: Map<number, Review>;
  private tasks: Map<number, Task>;
  private earnings: Map<number, Earning>;
  private payments: Map<number, Payment>;
  
  private userIdCounter: number;
  private jobIdCounter: number;
  private applicationIdCounter: number;
  private reviewIdCounter: number;
  private taskIdCounter: number;
  private earningIdCounter: number;
  private paymentIdCounter: number;

  constructor() {
    this.users = new Map();
    this.jobs = new Map();
    this.applications = new Map();
    this.reviews = new Map();
    this.tasks = new Map();
    this.earnings = new Map();
    this.payments = new Map();
    
    this.userIdCounter = 1;
    this.jobIdCounter = 1;
    this.applicationIdCounter = 1;
    this.reviewIdCounter = 1;
    this.taskIdCounter = 1;
    this.earningIdCounter = 1;
    this.paymentIdCounter = 1;
    
    // Initialize with sample data
    this.initializeSampleData();
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

  // Initialize with sample data 
  private initializeSampleData() {
    // Sample users
    this.createUser({
      username: "worker1",
      password: "password123",
      fullName: "Worker One",
      email: "worker1@example.com",
      accountType: "worker",
      skills: ["Cleaning", "Organization", "Driving"],
      bio: "Experienced in cleaning and organization",
      avatarUrl: "https://randomuser.me/api/portraits/men/1.jpg",
      phone: "555-123-4567",
      isActive: true,
    });
    
    this.createUser({
      username: "poster1",
      password: "password123",
      fullName: "Job Poster One",
      email: "poster1@example.com",
      accountType: "poster",
      skills: [],
      bio: "Looking for help with various tasks",
      avatarUrl: "https://randomuser.me/api/portraits/women/1.jpg",
      phone: "555-987-6543",
      isActive: true,
    });

    // Sample jobs
    const sampleLocation = {
      latitude: 37.7749,
      longitude: -122.4194
    };

    this.createJob({
      title: "Lawn Mowing Service",
      description: "Need help mowing my large backyard lawn. Equipment provided.",
      category: "Home Maintenance",
      posterId: 2,
      status: "open",
      paymentType: "hourly",
      paymentAmount: 35,
      location: "123 Main St",
      latitude: sampleLocation.latitude + 0.01,
      longitude: sampleLocation.longitude - 0.01,
      dateNeeded: new Date(Date.now() + 86400000), // Tomorrow
      requiredSkills: ["Gardening"],
      equipmentProvided: true
    });
    
    this.createJob({
      title: "Package Delivery (5 items)",
      description: "Need help delivering 5 small packages to addresses in the neighborhood.",
      category: "Delivery",
      posterId: 2,
      status: "open",
      paymentType: "fixed",
      paymentAmount: 50,
      location: "456 Oak St",
      latitude: sampleLocation.latitude - 0.015,
      longitude: sampleLocation.longitude + 0.02,
      dateNeeded: new Date(Date.now() + 172800000), // 2 days from now
      requiredSkills: ["Driving"],
      equipmentProvided: false
    });

    this.createJob({
      title: "WiFi Setup Assistance",
      description: "Need help setting up a new WiFi router and connecting devices.",
      category: "Tech Support",
      posterId: 2,
      status: "open",
      paymentType: "fixed",
      paymentAmount: 75,
      location: "789 Pine St",
      latitude: sampleLocation.latitude + 0.02,
      longitude: sampleLocation.longitude + 0.01,
      dateNeeded: new Date(Date.now() + 259200000), // 3 days from now
      requiredSkills: ["Computer Repair"],
      equipmentProvided: false
    });

    this.createJob({
      title: "Birthday Party Setup",
      description: "Need help setting up decorations, arranging tables and chairs, and preparing party favors for a child's birthday. Should take about 3-4 hours.",
      category: "Event Help",
      posterId: 2,
      status: "open",
      paymentType: "fixed",
      paymentAmount: 120,
      location: "321 Elm St",
      latitude: sampleLocation.latitude - 0.005,
      longitude: sampleLocation.longitude - 0.008,
      dateNeeded: new Date(Date.now() + 432000000), // 5 days from now
      requiredSkills: ["Organization", "Decoration"],
      equipmentProvided: true
    });

    this.createJob({
      title: "Grocery Shopping & Delivery",
      description: "Need someone to do grocery shopping and deliver to my home. List will be provided.",
      category: "Shopping",
      posterId: 2,
      status: "open",
      paymentType: "hourly",
      paymentAmount: 25,
      location: "555 Maple St",
      latitude: sampleLocation.latitude + 0.018,
      longitude: sampleLocation.longitude - 0.023,
      dateNeeded: new Date(Date.now() + 345600000), // 4 days from now
      requiredSkills: ["Driving", "Organization"],
      equipmentProvided: false
    });
  }

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
    
    const user: User = { ...insertUser, id, lastActive, rating };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
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

  async getPaymentsForUser(userId: number): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.userId === userId)
      .sort((a, b) => new Date(b.dateInitiated).getTime() - new Date(a.dateInitiated).getTime());
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.paymentIdCounter++;
    const dateInitiated = new Date();
    const status = "pending";
    const transactionId = null;
    
    const newPayment: Payment = {
      ...payment,
      id,
      dateInitiated,
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
}

import { DatabaseStorage } from './database-storage';

// Use database storage instead of memory storage
export const storage = new DatabaseStorage();
