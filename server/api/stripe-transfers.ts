/**
 * Stripe Transfers API
 * 
 * This file handles transfers to worker Connect accounts,
 * allowing job posters to pay workers for completed jobs.
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';
import { z } from 'zod';
import { getOrCreateStripeCustomer } from './stripe-api';

// Initialize Stripe with the secret key
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16" as any,
});

// Authentication middleware
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

// Authorization middleware for transfers
// Only the job poster, worker, or admins can access transfer endpoints
function isAuthorizedForTransfer(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  // Allow admins to access all transfers
  if (req.user?.isAdmin) {
    return next();
  }
  
  // For routes with jobId parameter
  const jobId = req.params.jobId 
    ? parseInt(req.params.jobId) 
    : req.body.jobId 
      ? parseInt(req.body.jobId) 
      : null;
      
  // For routes with workerId parameter
  const workerId = req.params.workerId 
    ? parseInt(req.params.workerId) 
    : req.body.workerId 
      ? parseInt(req.body.workerId) 
      : null;
  
  // If this is the worker whose account is being transferred to
  if (workerId && req.user?.id === workerId) {
    return next();
  }
  
  // If jobId is provided, check if this user is the job poster
  if (jobId) {
    storage.getJob(jobId)
      .then(job => {
        if (!job) {
          return res.status(404).json({ message: "Job not found" });
        }
        
        if (job.userId === req.user?.id) {
          // This is the job poster
          return next();
        }
        
        // If this request is also specifying a worker, make sure it's the worker on the job
        if (workerId && job.workerId === workerId) {
          return next();
        }
        
        return res.status(403).json({ message: "Not authorized to access this transfer" });
      })
      .catch(error => {
        console.error("Error checking job ownership:", error);
        return res.status(500).json({ message: "Error checking authorization" });
      });
  } else {
    // If no jobId, only allow if this is the worker or an admin
    if (workerId && req.user?.id === workerId) {
      return next();
    }
    
    return res.status(403).json({ message: "Not authorized to access this transfer" });
  }
}

const transfersRouter = Router();

// Transfer schema for input validation
const transferSchema = z.object({
  workerId: z.number().int().positive("Worker ID is required"),
  jobId: z.number().int().positive("Job ID is required").optional(),
  amount: z.number().min(1, "Amount must be at least $1"),
  description: z.string().min(3, "Description is required").max(255),
});

/**
 * Create a transfer to a worker's Connect account
 */
transfersRouter.post('/create', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = transferSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid input",
        errors: validationResult.error.errors 
      });
    }
    
    const { workerId, jobId, amount, description } = validationResult.data;
    
    // Get the worker
    const worker = await storage.getUser(workerId);
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }
    
    // Check if the worker has a connected account
    if (!worker.stripeConnectAccountId) {
      return res.status(400).json({ 
        message: "Worker does not have a Stripe Connect account set up" 
      });
    }
    
    // If jobId is provided, verify job exists and worker is assigned
    let job = null;
    if (jobId) {
      job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // If job has a workerId, make sure it matches the requested worker
      if (job.workerId && job.workerId !== workerId) {
        return res.status(400).json({ 
          message: "Worker is not assigned to this job" 
        });
      }
    }
    
    // Create or get a payment method for the job poster
    const customerId = await getOrCreateStripeCustomer(req.user!.id);
    
    // Prepare metadata for the transfer
    const metadata: Record<string, string> = {
      userId: req.user!.id.toString(),
      workerId: workerId.toString(),
    };
    
    if (jobId) {
      metadata.jobId = jobId.toString();
    }
    
    // Create a payment intent for the charge
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      payment_method_types: ['card'],
      confirm: false, // Don't confirm yet, just create the intent
      description: description,
      metadata: metadata,
    });
    
    // Create a payment record for tracking
    const payment = await storage.createPayment({
      userId: req.user!.id,
      workerId: workerId,
      jobId: jobId || null,
      amount: amount,
      serviceFee: null, // We'll calculate this after payment is confirmed
      type: 'payment',
      status: 'pending',
      paymentMethod: null, // Will be filled in after payment is confirmed
      transactionId: paymentIntent.id,
      description: description,
      metadata: metadata,
      stripeCustomerId: customerId,
      stripeConnectAccountId: worker.stripeConnectAccountId,
    });
    
    // Return the client secret for confirming the payment
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error('Error creating transfer:', error);
    res.status(500).json({ 
      message: 'Failed to create transfer',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Transfer funds directly to a worker's Connect account
 * This is an admin function or for job posters with a funded account balance
 */
transfersRouter.post('/direct', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = transferSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid input",
        errors: validationResult.error.errors 
      });
    }
    
    const { workerId, jobId, amount, description } = validationResult.data;
    
    // Get the worker
    const worker = await storage.getUser(workerId);
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }
    
    // Check if the worker has a connected account
    if (!worker.stripeConnectAccountId) {
      return res.status(400).json({ 
        message: "Worker does not have a Stripe Connect account set up" 
      });
    }
    
    // Authorization check: only admins or the job poster can do direct transfers
    const isAdmin = req.user!.role === 'admin';
    let isJobPoster = false;
    
    if (jobId) {
      const job = await storage.getJob(jobId);
      if (job && job.userId === req.user!.id) {
        isJobPoster = true;
      }
    }
    
    if (!isAdmin && !isJobPoster) {
      return res.status(403).json({ message: "Not authorized to perform direct transfers" });
    }
    
    // Create metadata for the transfer
    const metadata: Record<string, string> = {
      userId: req.user!.id.toString(),
      workerId: workerId.toString(),
    };
    
    if (jobId) {
      metadata.jobId = jobId.toString();
    }
    
    // Perform the transfer
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      destination: worker.stripeConnectAccountId,
      description: description,
      metadata: metadata,
    });
    
    // Create a payment record for tracking
    const payment = await storage.createPayment({
      userId: req.user!.id,
      workerId: workerId,
      jobId: jobId || null,
      amount: amount,
      serviceFee: null,
      type: 'transfer',
      status: 'pending',
      paymentMethod: null,
      transactionId: transfer.id,
      description: description,
      metadata: metadata,
      stripeCustomerId: null,
      stripeConnectAccountId: worker.stripeConnectAccountId,
    });
    
    // If this is for a job, also create an earning record
    if (jobId) {
      try {
        await storage.createEarning({
          workerId: workerId,
          jobId: jobId,
          amount: amount,
          netAmount: amount, // Direct transfers don't have fees
          serviceFee: 0,
          status: 'transferred',
          dateEarned: new Date(),
          transferId: transfer.id,
          description: description,
        });
      } catch (err) {
        console.error('Error creating earning record:', err);
        // Don't fail the whole request if creating earning fails
      }
    }
    
    res.json({
      success: true,
      transfer: transfer,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error('Error performing direct transfer:', error);
    res.status(500).json({ 
      message: 'Failed to perform transfer',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get transfers for a worker
 */
transfersRouter.get('/worker/:workerId', isAuthorizedForTransfer, async (req: Request, res: Response) => {
  try {
    const workerId = parseInt(req.params.workerId);
    
    // Get the worker
    const worker = await storage.getUser(workerId);
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }
    
    // Check if the worker has a connected account
    if (!worker.stripeConnectAccountId) {
      return res.json({ transfers: [], payments: [], earnings: [] });
    }
    
    // Get transfers from Stripe
    const transfers = await stripe.transfers.list({
      destination: worker.stripeConnectAccountId,
      limit: 100,
    });
    
    // Get payment records from our database
    const payments = await storage.getPaymentsForUser(workerId);
    
    // Get earnings records from our database
    const earnings = await storage.getEarningsForWorker(workerId);
    
    res.json({
      transfers: transfers.data,
      payments: payments,
      earnings: earnings,
    });
  } catch (error) {
    console.error('Error getting worker transfers:', error);
    res.status(500).json({ 
      message: 'Failed to get transfers',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get transfers for a job
 */
transfersRouter.get('/job/:jobId', isAuthorizedForTransfer, async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.jobId);
    
    // Get the job
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    
    // Check if the job has a worker assigned
    if (!job.workerId) {
      return res.json({ transfers: [], payments: [], earnings: [] });
    }
    
    // Get the worker
    const worker = await storage.getUser(job.workerId);
    if (!worker || !worker.stripeConnectAccountId) {
      return res.json({ transfers: [], payments: [], earnings: [] });
    }
    
    // Get payments for this job
    const payments = await storage.getPaymentsForJob(jobId);
    
    // Get earnings for this job
    const earnings = await storage.getEarningsForJob(jobId);
    
    // Get transfer IDs from the payment records
    const transferIds = payments
      .filter(p => p.type === 'transfer' && p.transactionId)
      .map(p => p.transactionId as string);
    
    // Get transfers from Stripe
    let transfers: Stripe.Transfer[] = [];
    
    if (transferIds.length > 0) {
      // Unfortunately Stripe doesn't support querying by multiple IDs,
      // so we need to get them one by one
      const transferPromises = transferIds.map(id => 
        stripe.transfers.retrieve(id)
          .catch(err => {
            console.error(`Error retrieving transfer ${id}:`, err);
            return null;
          })
      );
      
      transfers = (await Promise.all(transferPromises)).filter(t => t !== null) as Stripe.Transfer[];
    }
    
    res.json({
      transfers: transfers,
      payments: payments,
      earnings: earnings,
    });
  } catch (error) {
    console.error('Error getting job transfers:', error);
    res.status(500).json({ 
      message: 'Failed to get transfers',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default transfersRouter;