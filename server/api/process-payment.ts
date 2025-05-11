import { Request, Response } from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing Stripe secret key');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil' as any
});

async function processWorkerPayout(workerId: number, amount: number, jobId: number) {
  try {
    const worker = await storage.getUser(workerId);
    if (!worker?.stripeConnectAccountId) {
      throw new Error("Worker does not have a connected Stripe account");
    }

    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "usd",
      destination: worker.stripeConnectAccountId,
      transfer_group: `job-${jobId}`,
      metadata: {
        jobId: jobId.toString(),
        workerId: workerId.toString(),
      }
    });

    await storage.updateEarningStatus(jobId, "paid", new Date());
    return transfer;
  } catch (error) {
    console.error("Error processing worker payout:", error);
    throw error;
  }
}

export async function processPayment(req: Request, res: Response) {
  // Check authentication
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const { jobId, applicationId, workerId, paymentMethodId, amount } = req.body;

  // Handle different payment scenarios:
  // 1. Fixed-price job payment during creation: requires jobId, paymentMethodId, amount
  // 2. Hourly job payment to worker: requires jobId, applicationId, workerId, paymentMethodId
  
  const isFixedPricePayment = !!jobId && !!paymentMethodId && !!amount && !applicationId && !workerId;
  const isWorkerPayment = !!jobId && !!applicationId && !!workerId && !!paymentMethodId;
  
  if (!isFixedPricePayment && !isWorkerPayment) {
    return res.status(400).json({ message: 'Missing required fields for payment processing' });
  }

  try {
    // Get job details
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Only job poster can process payment
    if (job.posterId !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to process this payment' });
    }
    
    // For worker payments, get and validate the application
    let application;
    if (isWorkerPayment) {
      application = await storage.getApplication(applicationId!);
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }
    }

    let paymentIntent;
    let totalAmount = 0;
    let serviceFee = 0;
    
    // Handle fixed-price job payment during creation
    if (isFixedPricePayment) {
      totalAmount = amount;
      serviceFee = totalAmount * 0.1; // 10% service fee
      
      // Convert to cents for Stripe
      const amountInCents = Math.round(totalAmount * 100);
      
      try {
        // Create a payment intent for the fixed-price job
        paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: 'usd',
          payment_method: paymentMethodId,
          confirm: true,
          description: `Payment for fixed-price job: ${job.title}`,
          return_url: `${req.protocol}://${req.get('host')}/jobs/${jobId}`,
          metadata: {
            jobId: jobId.toString(),
            posterId: req.user.id.toString(),
            paymentType: 'fixed-price',
          },
        });
        
        // Record the payment in our database
        await storage.createPayment({
          userId: req.user.id,
          amount: totalAmount,
          serviceFee,
          type: 'job_payment',
          status: paymentIntent.status,
          paymentMethod: 'card',
          transactionId: paymentIntent.id,
          stripePaymentIntentId: paymentIntent.id,
          stripeCustomerId: req.user.stripeCustomerId || undefined,
          jobId,
          description: `Fixed-price payment for job "${job.title}"`,
        });
      } catch (err) {
        console.error('Stripe payment processing error:', err);
        return res.status(400).json({ 
          message: err instanceof Error ? err.message : 'Payment processing failed',
          error: err
        });
      }
    }
    // Handle worker payment
    else if (isWorkerPayment && application) {
      // Calculate payment amount based on application hourlyRate and expectedDuration
      let hours = 0;

      if (!application.hourlyRate || !application.expectedDuration) {
        return res.status(400).json({ message: 'Application does not have rate or duration information' });
      }

      const duration = application.expectedDuration;

      if (duration.includes('Less than 1 hour')) {
        hours = 0.5;
      } else if (duration.includes('1-2 hours')) {
        hours = 1.5;
      } else if (duration.includes('2-4 hours')) {
        hours = 3;
      } else if (duration.includes('Half day')) {
        hours = 5;
      } else if (duration.includes('Full day')) {
        hours = 7;
      } else if (duration.includes('Multiple days')) {
        hours = 16;
      }

      const workerAmount = application.hourlyRate * hours;
      serviceFee = workerAmount * 0.1; // 10% service fee
      totalAmount = workerAmount + serviceFee;

      // Convert to cents for Stripe
      const amountInCents = Math.round(totalAmount * 100);

      // Check if worker has a Stripe Connect account
      const worker = await storage.getUser(workerId!);
      if (!worker) {
        return res.status(404).json({ message: 'Worker not found' });
      }

      // Check if worker has a Stripe Connect account
      if (!worker.stripeConnectAccountId) {
        return res.status(400).json({ 
          message: 'Worker does not have a Stripe Connect account set up'
        });
      }

      try {
        // Create a payment intent
        paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: 'usd',
          payment_method: paymentMethodId,
          confirm: true,
          return_url: `${req.protocol}://${req.get('host')}/jobs/${jobId}`,
          application_fee_amount: Math.round(serviceFee * 100),
          transfer_data: {
            destination: worker.stripeConnectAccountId || '',
          },
          metadata: {
            jobId: jobId.toString(),
            applicationId: applicationId!.toString(),
            workerId: workerId!.toString(),
            posterId: req.user.id.toString(),
            paymentType: 'worker_payment',
          },
        });

        // Record the payment in our database
        await storage.createPayment({
          userId: req.user.id,
          workerId: workerId!,
          amount: totalAmount,
          serviceFee,
          type: 'worker_payment',
          status: paymentIntent.status,
          paymentMethod: 'card',
          transactionId: paymentIntent.id,
          stripePaymentIntentId: paymentIntent.id,
          stripeCustomerId: req.user.stripeCustomerId || undefined,
          stripeConnectAccountId: worker.stripeConnectAccountId || undefined,
          jobId,
          description: `Worker payment for job "${job.title}"`,
        });

        // Update the application status
        await storage.updateApplication(applicationId!, {
          status: 'accepted'
        });

        // Update the job status
        await storage.updateJob(jobId, {
          status: 'assigned',
          workerId: workerId!
        });

        // Create a notification for the worker
        await storage.createNotification({
          userId: workerId!,
          title: 'Application Accepted',
          message: `Your application for "${job.title}" has been accepted! You can now start working on this job.`,
          type: 'application_accepted',
          sourceId: jobId,
          sourceType: 'job',
          metadata: {
            jobId,
            applicationId: applicationId!,
            posterId: req.user.id,
            paymentId: paymentIntent.id
          }
        });
      } catch (err) {
        console.error('Stripe payment processing error:', err);
        return res.status(400).json({ 
          message: err instanceof Error ? err.message : 'Payment processing failed',
          error: err
        });
      }
    }

    // Return success response
    return res.status(200).json({
      success: true,
      paymentId: paymentIntent?.id || 'no_payment_processed',
      status: paymentIntent?.status || 'unknown',
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to process payment',
    });
  }
}