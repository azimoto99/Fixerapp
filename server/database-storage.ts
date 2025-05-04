import { eq, and, like, desc, or, asc } from 'drizzle-orm';
import { db } from './db';
import { IStorage } from './storage';
import {
  users, jobs, applications, reviews, tasks, earnings, payments,
  User, InsertUser,
  Job, InsertJob,
  Application, InsertApplication,
  Review, InsertReview,
  Task, InsertTask,
  Earning, InsertEarning,
  Payment, InsertPayment
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
  
  // User operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByUsernameAndType(username: string, accountType: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(
        eq(users.username, username),
        eq(users.accountType, accountType)
      )
    );
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [createdUser] = await db.insert(users).values(user).returning();
    return createdUser;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
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
      datePosted: new Date()
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
    const allJobs = await db.select().from(jobs);
    
    return allJobs.filter(job => {
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
}