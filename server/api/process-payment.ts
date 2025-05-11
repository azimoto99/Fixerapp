import { Request, Response } from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing Stripe secret key');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
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

  const { jobId, applicationId, workerId, paymentMethodId } = req.body;

  if (!jobId || !applicationId || !workerId || !paymentMethodId) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Get job and application details
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const application = await storage.getApplication(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Only job poster can process payment
    if (job.posterId !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to process this payment' });
    }

    // Calculate payment amount based on application hourlyRate and expectedDuration
    let amount = 0;
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
    const serviceFee = workerAmount * 0.1; // 10% service fee
    const totalAmount = workerAmount + serviceFee;

    // Convert to cents for Stripe
    const amountInCents = Math.round(totalAmount * 100);

    // Check if worker has a Stripe Connect account
    const worker = await storage.getUser(workerId);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    // Check if worker has a Stripe Connect account
    // Use stripeConnectAccountId from schema, with fallback to stripeConnectId virtual field
    if (!worker.stripeConnectAccountId) {
      return res.status(400).json({ 
        message: 'Worker does not have a Stripe Connect account set up'
      });
    }

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
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
        applicationId: applicationId.toString(),
        workerId: workerId.toString(),
        posterId: req.user.id.toString(),
      },
    });

    // Record the payment in our database
    await storage.createPayment({
      userId: req.user.id,
      workerId,
      amount: totalAmount,
      serviceFee,
      type: 'payment',
      status: paymentIntent.status,
      paymentMethod: 'card',
      transactionId: paymentIntent.id,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: req.user.stripeCustomerId || undefined,
      stripeConnectAccountId: worker.stripeConnectAccountId || undefined,
      jobId,
      description: `Payment for job "${job.title}"`,
    });

    // Update the application status
    await storage.updateApplication(applicationId, {
      status: 'accepted'
    });

    // Update the job status
    await storage.updateJob(jobId, {
      status: 'assigned',
      workerId: workerId
    });

    // Create a notification for the worker
    await storage.createNotification({
      userId: workerId,
      title: 'Application Accepted',
      message: `Your application for "${job.title}" has been accepted! You can now start working on this job.`,
      type: 'application_accepted',
      sourceId: jobId,
      sourceType: 'job',
      metadata: {
        jobId,
        applicationId,
        posterId: req.user.id,
        paymentId: paymentIntent.id
      }
    });

    return res.status(200).json({
      success: true,
      paymentId: paymentIntent.id,
      status: paymentIntent.status,
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to process payment',
    });
  }
}