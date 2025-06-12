import { Request, Response } from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing Stripe secret key');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16' as any
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
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const { jobId, applicationId, workerId, paymentMethodId, amount } = req.body;

  // Validate required fields
  if (!jobId || !paymentMethodId || amount === undefined) {
    return res.status(400).json({ message: 'Missing required fields for payment processing' });
  }

  try {
    // Get the job
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Verify job ownership
    if (job.posterId !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to process this payment' });
    }

    // Get the user (job poster)
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: user.fullName || user.username,
        email: user.email || undefined,
        metadata: {
          userId: user.id.toString()
        }
      });
      customerId = customer.id;
      await storage.updateUser(user.id, { stripeCustomerId: customerId });
    }

    let paymentIntent;
    const isWorkerPayment = !!applicationId && !!workerId;

    if (isWorkerPayment) {
      // Handle worker payment
      const worker = await storage.getUser(workerId);
      if (!worker) {
        return res.status(404).json({ message: 'Worker not found' });
      }

      if (!worker.stripeConnectAccountId) {
        return res.status(400).json({ message: 'Worker does not have a Stripe Connect account' });
      }

      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }

      // Calculate service fee (5%)
      const serviceFee = amount * 0.05;
      const workerAmount = amount - serviceFee;

      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        application_fee_amount: Math.round(serviceFee * 100),
        transfer_data: {
          destination: worker.stripeConnectAccountId
        },
        metadata: {
          jobId: jobId.toString(),
          applicationId: applicationId.toString(),
          workerId: workerId.toString(),
          posterId: req.user.id.toString(),
          paymentType: 'worker_payment'
        }
      });

      // Create payment record
      await storage.createPayment({
        userId: req.user.id,
        workerId,
        amount,
        serviceFee,
        type: 'worker_payment',
        status: paymentIntent.status,
        paymentMethod: 'card',
        transactionId: paymentIntent.id,
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: customerId,
        stripeConnectAccountId: worker.stripeConnectAccountId,
        jobId,
        description: `Worker payment for job "${job.title}"`
      });

      // Update application and job status
      await storage.updateApplication(applicationId, { status: 'accepted' });
      await storage.updateJob(jobId, { status: 'assigned', workerId });

      // Create notification for worker
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
    } else {
      // Handle job creation payment
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        metadata: {
          jobId: jobId.toString(),
          userId: req.user.id.toString(),
          paymentType: 'job_payment'
        }
      });

      // Create payment record
      await storage.createPayment({
        userId: req.user.id,
        amount,
        serviceFee: amount * 0.05, // 5% service fee
        type: 'job_payment',
        status: paymentIntent.status,
        paymentMethod: 'card',
        transactionId: paymentIntent.id,
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: customerId,
        jobId,
        description: `Payment for job "${job.title}"`
      });

      // Update job status
      await storage.updateJob(jobId, { status: 'open' });
    }

    return res.status(200).json({
      success: true,
      paymentId: paymentIntent.id,
      status: paymentIntent.status
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Payment processing failed',
      error: error
    });
  }
}