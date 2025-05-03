import { eq, and, like, desc, or } from 'drizzle-orm';
import { db } from './db';
import { IStorage } from './storage';
import {
  users, jobs, applications, reviews,
  User, InsertUser,
  Job, InsertJob,
  Application, InsertApplication,
  Review, InsertReview
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
}