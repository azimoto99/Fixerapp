/**
 * Extensions to the storage interface for admin functionality and enhanced payments
 */
// @ts-nocheck
import { storage } from './storage';
import { db } from './db';
import { users, jobs, applications, payments, earnings } from '@shared/schema';
import { sql, eq, and, gte, lte, desc, count, sum, avg } from 'drizzle-orm';
import { DatabaseStorage } from './database-storage';

// Add admin functions to the storage interface
const adminMethods = {
  // User-related functions
  getUserCount: async function(): Promise<number> {
    const result = await db.select({ count: count() }).from(users);
    return result[0].count;
  },

  getNewUserCount: async function({ days = 30 }: { days: number }): Promise<number> {
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    const result = await db.select({ count: count() })
      .from(users)
      .where(gte(users.lastActive, date));
    
    return result[0].count;
  },

  getAllUsers: async function(search?: string): Promise<any[]> {
    if (search) {
      return await db.select().from(users)
        .where(
          sql`LOWER(${users.username}) LIKE ${`%${search.toLowerCase()}%`} OR 
              LOWER(${users.fullName}) LIKE ${`%${search.toLowerCase()}%`} OR 
              LOWER(${users.email}) LIKE ${`%${search.toLowerCase()}%`}`
        );
    }
    return await db.select().from(users);
  },

  resetUserPassword: async function(userId: number, tempPassword: string): Promise<boolean> {
    // This would normally hash the password first
    const result = await db.update(users)
      .set({ password: tempPassword })
      .where(eq(users.id, userId));
    
    return true;
  },

  deleteUser: async function(userId: number): Promise<boolean> {
    // In a real application, this should be a soft delete or handle all cascading effects
    await db.delete(users).where(eq(users.id, userId));
    return true;
  },

  // Job-related functions
  getJobCount: async function({ status }: { status?: string }): Promise<number> {
    if (status) {
      const result = await db.select({ count: count() })
        .from(jobs)
        .where(eq(jobs.status, status));
      return result[0].count;
    }
    
    const result = await db.select({ count: count() }).from(jobs);
    return result[0].count;
  },

  updateJob: async function(jobId: number, data: any) {
    // Enhanced to handle feature flag
    const result = await db.update(jobs)
      .set(data)
      .where(eq(jobs.id, jobId));
    
    return this.getJob(jobId);
  },

  // Payment-related functions
  getTotalPaymentsAmount: async function(): Promise<number> {
    const result = await db.select({ total: sum(payments.amount) }).from(payments);
    return result[0].total || 0;
  },

  getTotalServiceFees: async function(): Promise<number> {
    const result = await db.select({ total: sum(payments.serviceFee) }).from(payments);
    return result[0].total || 0;
  },

  getAllPayments: async function(search?: string): Promise<any[]> {
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
  },

  deletePayment: async function(paymentId: number): Promise<boolean> {
    // This should be a soft delete in a real application
    await db.delete(payments).where(eq(payments.id, paymentId));
    return true;
  },

  // Analytics functions
  getJobCompletionRate: async function(): Promise<number> {
    const completedJobs = await db.select({ count: count() })
      .from(jobs)
      .where(eq(jobs.status, 'completed'));
    
    const allJobs = await db.select({ count: count() }).from(jobs);
    
    if (allJobs[0].count === 0) return 0;
    return completedJobs[0].count / allJobs[0].count;
  },

  getAverageJobValue: async function(): Promise<number> {
    const result = await db.select({ average: avg(jobs.paymentAmount) }).from(jobs);
    return result[0].average || 0;
  },

  getApplicationSuccessRate: async function(): Promise<number> {
    const acceptedApplications = await db.select({ count: count() })
      .from(applications)
      .where(eq(applications.status, 'accepted'));
    
    const allApplications = await db.select({ count: count() }).from(applications);
    
    if (allApplications[0].count === 0) return 0;
    return acceptedApplications[0].count / allApplications[0].count;
  },

  // Activity tracking
  getRecentActivity: async function(days: number = 30): Promise<any[]> {
    // This is a placeholder. In a real application, you'd have an activity log table
    // For now, we'll simulate it with recent jobs and payments
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    const recentJobs = await db.select({
      id: jobs.id,
      type: sql<string>`'job'`,
      description: sql<string>`CONCAT('New job posted: ', ${jobs.title})`,
      timestamp: jobs.datePosted
    })
    .from(jobs)
    .where(gte(jobs.datePosted, date))
    .limit(10);
    
    const recentPayments = await db.select({
      id: payments.id,
      type: sql<string>`'payment'`,
      description: sql<string>`CONCAT('Payment processed: $', ${payments.amount})`,
      timestamp: payments.createdAt
    })
    .from(payments)
    .where(gte(payments.createdAt, date))
    .limit(10);
    
    // Combine and sort
    return [...recentJobs, ...recentPayments]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);
  }
};

// Payment processing extensions
const paymentMethods = {
  // Process a payment from start to finish
  processFullPayment: async function(data: {
    userId: number;
    jobId?: number;
    amount: number;
    paymentMethodId: string;
    description: string;
  }): Promise<any> {
    try {
      // 1. Create a pending payment record
      const payment = await this.createPayment({
        userId: data.userId,
        jobId: data.jobId,
        amount: data.amount,
        serviceFee: data.amount * 0.05, // 5% service fee
        type: 'payment',
        status: 'pending',
        paymentMethod: 'card',
        description: data.description
      });
      
      // 2. Create a Stripe payment intent
      const stripeModule = await import('./api/stripe-api');
      const stripe = stripeModule.getStripeClient();
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(data.amount * 100), // Convert to cents
        currency: 'usd',
        payment_method: data.paymentMethodId,
        confirm: true,
        description: data.description,
        metadata: {
          paymentId: payment.id.toString(),
          userId: data.userId.toString(),
          jobId: data.jobId ? data.jobId.toString() : '',
        }
      });
      
      // 3. Update the payment record with Stripe details
      const updatedPayment = await this.updatePaymentStatus(
        payment.id,
        paymentIntent.status === 'succeeded' ? 'completed' : 'processing',
        paymentIntent.id
      );
      
      // 4. If job payment, link to the job
      if (data.jobId) {
        await this.updateJob(data.jobId, {
          paymentStatus: paymentIntent.status === 'succeeded' ? 'paid' : 'processing'
        });
      }
      
      return {
        payment: updatedPayment,
        paymentIntent
      };
    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  },
  
  // Process payment to a worker
  processWorkerPayment: async function(data: {
    jobId: number;
    workerId: number;
    amount: number;
    description: string;
  }): Promise<any> {
    try {
      const job = await this.getJob(data.jobId);
      if (!job) {
        throw new Error('Job not found');
      }
      
      const worker = await this.getUser(data.workerId);
      if (!worker) {
        throw new Error('Worker not found');
      }
      
      if (!worker.stripeConnectAccountId) {
        throw new Error('Worker does not have a Stripe Connect account');
      }
      
      // 1. Create an earning record
      const earning = await this.createEarning({
        workerId: data.workerId,
        jobId: data.jobId,
        amount: data.amount,
        serviceFee: data.amount * 0.05,
        netAmount: data.amount - (data.amount * 0.05),
        description: data.description,
        stripeAccountId: worker.stripeConnectAccountId
      });
      
      // 2. Create a Stripe transfer
      const stripeModule = await import('./api/stripe-api');
      const stripe = stripeModule.getStripeClient();
      
      const transfer = await stripe.transfers.create({
        amount: Math.round((data.amount - (data.amount * 0.05)) * 100), // Convert to cents, minus 5% fee
        currency: 'usd',
        destination: worker.stripeConnectAccountId,
        description: `Payment for job #${data.jobId}: ${data.description}`,
        metadata: {
          earningId: earning.id.toString(),
          workerId: data.workerId.toString(),
          jobId: data.jobId.toString()
        }
      });
      
      // 3. Update the earning record with transfer details
      const updatedEarning = await this.updateEarningStatus(
        earning.id,
        'paid',
        new Date()
      );
      
      // 4. Mark the job as paid to the worker
      await this.updateJob(data.jobId, {
        workerPaymentStatus: 'paid'
      });
      
      return {
        earning: updatedEarning,
        transfer
      };
    } catch (error) {
      console.error('Worker payment processing error:', error);
      throw error;
    }
  }
};

// Add extension methods to the storage interface
Object.assign(DatabaseStorage.prototype, adminMethods, paymentMethods);

// Ensure the extensions are recognized by TypeScript
declare module './database-storage' {
  interface DatabaseStorage {
    getUserCount(): Promise<number>;
    getNewUserCount(options: { days: number }): Promise<number>;
    getAllUsers(search?: string): Promise<any[]>;
    resetUserPassword(userId: number, tempPassword: string): Promise<boolean>;
    deleteUser(userId: number): Promise<boolean>;
    getJobCount(options: { status?: string }): Promise<number>;
    getTotalPaymentsAmount(): Promise<number>;
    getTotalServiceFees(): Promise<number>;
    getAllPayments(search?: string): Promise<any[]>;
    deletePayment(paymentId: number): Promise<boolean>;
    getJobCompletionRate(): Promise<number>;
    getAverageJobValue(): Promise<number>;
    getApplicationSuccessRate(): Promise<number>;
    getRecentActivity(days?: number): Promise<any[]>;
    processFullPayment(data: {
      userId: number;
      jobId?: number;
      amount: number;
      paymentMethodId: string;
      description: string;
    }): Promise<any>;
    processWorkerPayment(data: {
      jobId: number;
      workerId: number;
      amount: number;
      description: string;
    }): Promise<any>;
  }
}

console.log('Adding storage extension methods for payments and admin functionality');