/**
 * Stripe Transfers API
 * 
 * This file handles the creation and management of transfers between the platform
 * and connected accounts (workers) using Stripe Connect.
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';
import { z } from 'zod';

// Initialize Stripe with the secret key
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16" as any,
});

// Authentication middleware
function isStripeAuthenticated(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated for Stripe operations" });
  }
  
  // Only allow admin operations for job posters (for now)
  if (req.user.accountType !== 'poster' && !req.user.isAdmin) {
    return res.status(403).json({ message: "Not authorized for transfer operations" });
  }
  
  next();
}

// Create a router for transfers
const transfersRouter = Router();

/**
 * Create a transfer from the platform to a connected account
 * This is used to pay workers for completed jobs
 */
transfersRouter.post("/create", isStripeAuthenticated, async (req: Request, res: Response) => {
  try {
    // Validate request
    const schema = z.object({
      workerId: z.number(),
      jobId: z.number().optional(),
      amount: z.number().min(1, "Minimum transfer amount is $1"),
      description: z.string().optional(),
    });
    
    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: "Invalid request data", 
        errors: validation.error.errors 
      });
    }
    
    const { workerId, jobId, amount, description } = validation.data;
    
    // Get the worker to check if they have a Connect account
    const worker = await storage.getUser(workerId);
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }
    
    // Check if the worker has a Connect account
    if (!worker.stripeConnectAccountId) {
      return res.status(400).json({ 
        message: "Worker does not have a Stripe Connect account",
        requiresConnect: true
      });
    }
    
    // Check if the Connect account is active
    if (worker.stripeConnectAccountStatus !== 'active') {
      return res.status(400).json({ 
        message: "Worker's Stripe Connect account is not active",
        accountStatus: worker.stripeConnectAccountStatus
      });
    }
    
    // If a job ID is provided, get the job to verify it exists
    let job;
    if (jobId) {
      job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Check if the job is assigned to this worker
      if (job.workerId !== workerId) {
        return res.status(403).json({ 
          message: "This job is not assigned to the specified worker" 
        });
      }
      
      // Check if the job is in a status that allows payment
      if (job.status !== 'completed' && job.status !== 'in_progress') {
        return res.status(400).json({ 
          message: `Cannot transfer payment for a job with status: ${job.status}` 
        });
      }
    }
    
    // Convert amount to cents for Stripe
    const amountInCents = Math.round(amount * 100);
    
    // Create application fee amount (platform fee)
    // Default to 5% fee for the platform
    const feePercent = 0.05; // 5%
    const applicationFeeAmount = Math.round(amountInCents * feePercent);
    
    // Create a transfer to the connected account
    const transfer = await stripe.transfers.create({
      amount: amountInCents - applicationFeeAmount, // Transfer amount after fee
      currency: 'usd',
      destination: worker.stripeConnectAccountId,
      description: description || `Payment for ${jobId ? `job #${jobId}` : 'services'}`,
      metadata: {
        jobId: jobId ? jobId.toString() : '',
        workerId: workerId.toString(),
        platformFee: applicationFeeAmount.toString(),
        totalAmount: amountInCents.toString(),
      },
    });
    
    // Create a payment record in our database
    const payment = await storage.createPayment({
      userId: req.user.id, // The user making the transfer (job poster)
      workerId: workerId,
      jobId: jobId,
      amount: amount,
      serviceFee: (amountInCents * feePercent) / 100, // Convert back to dollars
      type: 'transfer',
      status: 'completed',
      paymentMethod: 'stripe',
      transactionId: transfer.id,
      description: description || `Payment for ${jobId ? `job #${jobId}` : 'services'}`,
      metadata: {
        transferId: transfer.id,
        platformFee: applicationFeeAmount / 100, // Convert back to dollars
      },
    });
    
    // Create an earning record for the worker
    const earning = await storage.createEarning({
      workerId: workerId,
      jobId: jobId,
      amount: amount,
      serviceFee: (amountInCents * feePercent) / 100, // Convert back to dollars
      netAmount: (amountInCents - applicationFeeAmount) / 100, // Convert back to dollars
      status: 'paid',
      transactionId: transfer.id,
    });
    
    // If this is for a job, update the job status to 'paid'
    if (jobId && job) {
      await storage.updateJob(jobId, { status: 'paid' });
    }
    
    // Create a notification for the worker
    await storage.createNotification({
      userId: workerId,
      title: 'Payment Received',
      message: `You have received a payment of ${formatCurrency(amount)}`,
      type: 'payment_received',
      sourceId: payment.id,
      sourceType: 'payment',
      metadata: {
        paymentId: payment.id,
        amount: amount,
        jobId: jobId,
      },
    });
    
    // Create a notification for the job poster
    await storage.createNotification({
      userId: req.user.id,
      title: 'Payment Sent',
      message: `Your payment of ${formatCurrency(amount)} has been sent to ${worker.fullName || worker.username}`,
      type: 'payment_sent',
      sourceId: payment.id,
      sourceType: 'payment',
      metadata: {
        paymentId: payment.id,
        amount: amount,
        jobId: jobId,
        workerId: workerId,
      },
    });
    
    // Return the transfer details
    return res.json({
      transferId: transfer.id,
      paymentId: payment.id,
      earningId: earning.id,
      amount: amount,
      fee: (amountInCents * feePercent) / 100,
      netAmount: (amountInCents - applicationFeeAmount) / 100,
      status: 'completed',
    });
  } catch (error) {
    console.error('Error creating transfer:', error);
    return res.status(500).json({ 
      message: 'Failed to create transfer', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get transfer details
 */
transfersRouter.get("/:id", isStripeAuthenticated, async (req: Request, res: Response) => {
  try {
    const transferId = req.params.id;
    
    if (!transferId) {
      return res.status(400).json({ message: "Transfer ID is required" });
    }
    
    // Get the transfer from Stripe
    const transfer = await stripe.transfers.retrieve(transferId);
    
    // Find the payment in our database
    const payment = await storage.getPaymentByTransactionId(transferId);
    
    // Return the combined data
    return res.json({
      transfer,
      payment,
    });
  } catch (error) {
    console.error('Error getting transfer details:', error);
    return res.status(500).json({ 
      message: 'Failed to get transfer details', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get all transfers for a connected account (worker)
 */
transfersRouter.get("/worker/:workerId", isStripeAuthenticated, async (req: Request, res: Response) => {
  try {
    const workerId = parseInt(req.params.workerId);
    
    if (isNaN(workerId)) {
      return res.status(400).json({ message: "Invalid worker ID" });
    }
    
    // Get the worker to check if they have a Connect account
    const worker = await storage.getUser(workerId);
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }
    
    // Check if the worker has a Connect account
    if (!worker.stripeConnectAccountId) {
      return res.status(400).json({ 
        message: "Worker does not have a Stripe Connect account" 
      });
    }
    
    // Get all transfers for this connected account from Stripe
    const transfers = await stripe.transfers.list({
      destination: worker.stripeConnectAccountId,
      limit: 100,
    });
    
    // Get all earnings for this worker from our database
    const earnings = await storage.getEarningsForWorker(workerId);
    
    // Return the combined data
    return res.json({
      transfers: transfers.data,
      earnings,
    });
  } catch (error) {
    console.error('Error getting worker transfers:', error);
    return res.status(500).json({ 
      message: 'Failed to get worker transfers', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get all transfers for a job
 */
transfersRouter.get("/job/:jobId", isStripeAuthenticated, async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.jobId);
    
    if (isNaN(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }
    
    // Get the job to verify it exists and check permissions
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    
    // Only allow the job poster or the assigned worker to see payments
    if (job.posterId !== req.user.id && job.workerId !== req.user.id) {
      return res.status(403).json({ 
        message: "You are not authorized to view payments for this job" 
      });
    }
    
    // Get all payments for this job from our database
    const payments = await storage.getPaymentsForJob(jobId);
    
    // Get all earnings for this job from our database
    const earnings = await storage.getEarningsForJob(jobId);
    
    // Return the combined data
    return res.json({
      payments,
      earnings,
    });
  } catch (error) {
    console.error('Error getting job transfers:', error);
    return res.status(500).json({ 
      message: 'Failed to get job transfers', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export default transfersRouter;