/**
 * Storage Extensions
 * 
 * This file adds additional methods to the storage interface
 * to support the Stripe payment integration features.
 */

import { storage } from '../storage';
import { 
  User, 
  Job, 
  Payment, 
  Earning,
  earnings as earningsTable,
  payments as paymentsTable, 
  users as usersTable,
  jobs as jobsTable 
} from '@shared/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { db } from '../db';

// Extend the storage interface with payment-related methods
// @ts-ignore - We're deliberately extending the prototype
if (storage.addVirtualFields) {
  // These methods may be already defined if using FixedDatabaseStorage
  console.log('Storage extension methods already loaded');
} else {
  console.log('Adding storage extension methods for payments');
  
  // @ts-ignore - We're deliberately extending the prototype
  storage.addVirtualFields = (user: User): User => {
    return {
      ...user,
      requiresStripeTerms: !user.stripeTermsAcceptedAt && (user.accountType === 'worker' || user.accountType === 'both'),
      requiresStripeRepresentative: user.stripeConnectAccountId && !user.stripeRepresentativeInfoProvided,
      requiresStripeBankingDetails: user.stripeConnectAccountId && !user.stripeBankingDetailsProvided,
    };
  };
  
  // Get users by Stripe customer ID
  // @ts-ignore - We're deliberately extending the prototype
  storage.getUsersByStripeCustomerId = async (stripeCustomerId: string): Promise<User[]> => {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.stripeCustomerId, stripeCustomerId));
    
    return users;
  };
  
  // Get users by Stripe Connect account ID
  // @ts-ignore - We're deliberately extending the prototype
  storage.getUsersByStripeConnectAccountId = async (stripeConnectAccountId: string): Promise<User[]> => {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.stripeConnectAccountId, stripeConnectAccountId));
    
    return users;
  };
  
  // Get payment by transaction ID
  // @ts-ignore - We're deliberately extending the prototype
  storage.getPaymentByTransactionId = async (transactionId: string): Promise<Payment | undefined> => {
    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.transactionId, transactionId));
    
    return payment || undefined;
  };
  
  // Get all payments for a user
  // @ts-ignore - We're deliberately extending the prototype
  storage.getPaymentsForUser = async (userId: number): Promise<Payment[]> => {
    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.userId, userId));
    
    return payments;
  };
  
  // Get all payments for a job
  // @ts-ignore - We're deliberately extending the prototype
  storage.getPaymentsForJob = async (jobId: number): Promise<Payment[]> => {
    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.jobId, jobId));
    
    return payments;
  };
  
  // Get all earnings for a worker
  // @ts-ignore - We're deliberately extending the prototype
  storage.getEarningsForWorker = async (workerId: number): Promise<Earning[]> => {
    const earnings = await db
      .select()
      .from(earningsTable)
      .where(eq(earningsTable.workerId, workerId));
    
    return earnings;
  };
  
  // Get all earnings for a job
  // @ts-ignore - We're deliberately extending the prototype
  storage.getEarningsForJob = async (jobId: number): Promise<Earning[]> => {
    const earnings = await db
      .select()
      .from(earningsTable)
      .where(eq(earningsTable.jobId, jobId));
    
    return earnings;
  };
  
  // Update user's Stripe customer ID
  // @ts-ignore - We're deliberately extending the prototype
  storage.updateStripeCustomerId = async (userId: number, stripeCustomerId: string): Promise<User> => {
    const [updatedUser] = await db
      .update(usersTable)
      .set({ stripeCustomerId })
      .where(eq(usersTable.id, userId))
      .returning();
    
    return updatedUser;
  };
  
  // Update user's Stripe Connect account ID
  // @ts-ignore - We're deliberately extending the prototype
  storage.updateStripeConnectAccountId = async (userId: number, stripeConnectAccountId: string): Promise<User> => {
    const [updatedUser] = await db
      .update(usersTable)
      .set({ stripeConnectAccountId })
      .where(eq(usersTable.id, userId))
      .returning();
    
    return updatedUser;
  };
  
  // Update payment status
  // @ts-ignore - We're deliberately extending the prototype
  storage.updatePaymentStatus = async (paymentId: number, status: string): Promise<Payment> => {
    const [updatedPayment] = await db
      .update(paymentsTable)
      .set({ status })
      .where(eq(paymentsTable.id, paymentId))
      .returning();
    
    return updatedPayment;
  };
  
  // Update payment transaction ID
  // @ts-ignore - We're deliberately extending the prototype
  storage.updatePaymentTransactionId = async (paymentId: number, transactionId: string): Promise<Payment> => {
    const [updatedPayment] = await db
      .update(paymentsTable)
      .set({ transactionId })
      .where(eq(paymentsTable.id, paymentId))
      .returning();
    
    return updatedPayment;
  };
  
  // Update earning status
  // @ts-ignore - We're deliberately extending the prototype
  storage.updateEarningStatus = async (earningId: number, status: string): Promise<Earning> => {
    const [updatedEarning] = await db
      .update(earningsTable)
      .set({ status })
      .where(eq(earningsTable.id, earningId))
      .returning();
    
    return updatedEarning;
  };
  
  // Update user's Stripe terms acceptance
  // @ts-ignore - We're deliberately extending the prototype
  storage.updateStripeTermsAcceptance = async (userId: number): Promise<User> => {
    const [updatedUser] = await db
      .update(usersTable)
      .set({ stripeTermsAcceptedAt: new Date() })
      .where(eq(usersTable.id, userId))
      .returning();
    
    return updatedUser;
  };
  
  // Update user's Stripe representative info status
  // @ts-ignore - We're deliberately extending the prototype
  storage.updateStripeRepresentativeInfo = async (userId: number, provided: boolean): Promise<User> => {
    const [updatedUser] = await db
      .update(usersTable)
      .set({ stripeRepresentativeInfoProvided: provided })
      .where(eq(usersTable.id, userId))
      .returning();
    
    return updatedUser;
  };
  
  // Update user's Stripe banking details status
  // @ts-ignore - We're deliberately extending the prototype
  storage.updateStripeBankingDetails = async (userId: number, provided: boolean): Promise<User> => {
    const [updatedUser] = await db
      .update(usersTable)
      .set({ stripeBankingDetailsProvided: provided })
      .where(eq(usersTable.id, userId))
      .returning();
    
    return updatedUser;
  };
  
  // Get job with the specified worker
  // @ts-ignore - We're deliberately extending the prototype
  storage.getJobWithWorker = async (jobId: number, workerId: number): Promise<Job | undefined> => {
    const [job] = await db
      .select()
      .from(jobsTable)
      .where(and(
        eq(jobsTable.id, jobId),
        eq(jobsTable.workerId, workerId)
      ));
    
    return job || undefined;
  };
  
  // Get all completed jobs for a worker
  // @ts-ignore - We're deliberately extending the prototype
  storage.getCompletedJobsForWorker = async (workerId: number): Promise<Job[]> => {
    const jobs = await db
      .select()
      .from(jobsTable)
      .where(and(
        eq(jobsTable.workerId, workerId),
        eq(jobsTable.status, 'completed')
      ));
    
    return jobs;
  };
}

export default storage;