import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { storage } from './storage';
import { createHmac } from 'crypto';
import { getNotificationService } from './notification-service';

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required environment variable: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16", // This should match the version in stripe.ts
});

// Webhook secret for verifying signatures
// In production, this should be set as an environment variable
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Create webhook router to handle Stripe webhook events
 */
export function createWebhookRouter(): Router {
  const webhookRouter = Router();

  // Handle raw body for webhook signature verification
  const verifyStripeSignature = (req: Request, res: Response, rawBody: Buffer) => {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      return res.status(400).json({ message: 'Missing stripe-signature header' });
    }
    
    try {
      return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      res.status(400).json({ message: err.message });
      return null;
    }
  };

  // Webhook handler endpoint
  webhookRouter.post('/', async (req: Request, res: Response) => {
    // Get raw body if present
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body));
    
    // If webhook secret is set, verify the signature
    let event: Stripe.Event;
    if (webhookSecret) {
      const constructedEvent = verifyStripeSignature(req, res, rawBody);
      if (!constructedEvent) return; // Response already sent in verifyStripeSignature
      event = constructedEvent;
    } else {
      // For development without webhook signing
      event = req.body as Stripe.Event;
    }

    try {
      // Handle different event types
      switch (event.type) {
        // Payment events
        case 'payment_intent.succeeded':
          await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        
        case 'payment_intent.payment_failed':
          await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;
          
        // Transfer events (for worker payouts)
        case 'transfer.created':
          await handleTransferCreated(event.data.object as Stripe.Transfer);
          break;
          
        case 'transfer.paid':
          await handleTransferPaid(event.data.object as Stripe.Transfer);
          break;
          
        case 'transfer.failed':
          await handleTransferFailed(event.data.object as Stripe.Transfer);
          break;
          
        // Account events (for Stripe Connect)
        case 'account.updated':
          await handleAccountUpdated(event.data.object as Stripe.Account);
          break;
          
        // Additional events can be handled here
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error(`Error handling webhook event: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  return webhookRouter;
}

/**
 * Handle payment_intent.succeeded event
 * Updates our payment record and triggers any necessary actions
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Get our payment record
    const payment = await storage.getPaymentByTransactionId(paymentIntent.id);
    
    if (!payment) {
      console.error(`Payment record not found for PaymentIntent: ${paymentIntent.id}`);
      return;
    }
    
    // Update payment status in our database
    const updatedPayment = await storage.updatePaymentStatus(
      payment.id, 
      'completed'
    );
    
    // If job exists, update job status
    if (payment.jobId) {
      const job = await storage.getJob(payment.jobId);
      
      if (job) {
        // If job is not assigned yet, keep it as open
        // If job is assigned, update it to "in progress"
        if (job.status === 'assigned') {
          await storage.updateJob(job.id, { status: 'in_progress' });
        }
        
        // If worker is assigned, create an earning record for them
        if (job.workerId) {
          // Calculate the worker's earnings after service fee
          const serviceFee = job.serviceFee || 2.5;
          const netAmount = payment.amount - serviceFee;
          
          await storage.createEarning({
            jobId: job.id,
            workerId: job.workerId,
            amount: payment.amount,
            serviceFee: serviceFee,
            netAmount: netAmount,
            status: 'pending'
          });
        }
        
        // Create a notification for the job poster
        await storage.createNotification({
          userId: job.posterId,
          type: 'payment',
          title: 'Payment Successful',
          message: `Your payment for job "${job.title}" has been processed successfully.`,
          isRead: false,
          linkType: 'job',
          linkId: job.id
        });
        
        // If worker exists, create a notification for them too
        if (job.workerId) {
          await storage.createNotification({
            userId: job.workerId,
            type: 'payment',
            title: 'Payment Received',
            message: `The client has made a payment for job "${job.title}". Funds will be available after completion.`,
            isRead: false,
            linkType: 'job',
            linkId: job.id
          });
        }
      }
    }
    
    // Send real-time notification if notification service is available
    const notificationService = getNotificationService();
    if (notificationService) {
      // Send notification to the job poster
      if (payment.jobId) {
        const job = await storage.getJob(payment.jobId);
        if (job) {
          notificationService.sendPaymentNotification(
            payment.jobId,
            'completed',
            payment.amount,
            job.posterId,
            'payment'
          );
          
          // If worker exists, send notification to them too
          if (job.workerId) {
            notificationService.sendPaymentNotification(
              payment.jobId,
              'completed',
              payment.amount,
              job.workerId,
              'payment'
            );
          }
        }
      }
    }
    
    console.log(`Successfully processed payment_intent.succeeded for payment ${payment.id}`);
  } catch (error: any) {
    console.error('Error handling payment_intent.succeeded:', error);
  }
}

/**
 * Handle payment_intent.payment_failed event
 * Updates our payment record and notifies relevant users
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Get our payment record
    const payment = await storage.getPaymentByTransactionId(paymentIntent.id);
    
    if (!payment) {
      console.error(`Payment record not found for PaymentIntent: ${paymentIntent.id}`);
      return;
    }
    
    // Update payment status in our database
    const updatedPayment = await storage.updatePaymentStatus(
      payment.id, 
      'failed'
    );
    
    // If job exists, notify the job poster
    if (payment.jobId) {
      const job = await storage.getJob(payment.jobId);
      
      if (job) {
        // Create a notification for the job poster
        await storage.createNotification({
          userId: job.posterId,
          type: 'payment',
          title: 'Payment Failed',
          message: `Your payment for job "${job.title}" has failed. Please update your payment information and try again.`,
          isRead: false,
          linkType: 'payment',
          linkId: payment.id
        });
      }
    }
    
    // Send real-time notification if notification service is available
    const notificationService = getNotificationService();
    if (notificationService && payment.jobId) {
      const job = await storage.getJob(payment.jobId);
      if (job) {
        notificationService.sendPaymentNotification(
          payment.jobId,
          'failed',
          payment.amount,
          job.posterId,
          'payment'
        );
      }
    }
    
    console.log(`Successfully processed payment_intent.payment_failed for payment ${payment.id}`);
  } catch (error: any) {
    console.error('Error handling payment_intent.payment_failed:', error);
  }
}

/**
 * Handle transfer.created event
 * Updates our earning record when a transfer is initiated
 */
async function handleTransferCreated(transfer: Stripe.Transfer) {
  try {
    // Get the earning ID from the transfer metadata
    const earningId = transfer.metadata?.earningId;
    
    if (!earningId) {
      console.error(`No earning ID found in transfer metadata: ${transfer.id}`);
      return;
    }
    
    // Get the earning record
    const earning = await storage.getEarning(parseInt(earningId));
    
    if (!earning) {
      console.error(`Earning record not found for ID: ${earningId}`);
      return;
    }
    
    // Update the earning with the transfer ID and status
    const updatedEarning = await storage.updateEarningStatus(
      earning.id, 
      'processing',
      undefined // Keep datePaid as is
    );
    
    // Add the transferId to the earning's metadata
    // This may require a separate method in storage
    await storage.updateUser(earning.workerId, {
      // This is just a placeholder, you'll need to implement the actual update
      // in your storage implementation
      metadata: { ...earning.metadata, transferId: transfer.id }
    });
    
    // Create a notification for the worker
    await storage.createNotification({
      userId: earning.workerId,
      type: 'payout',
      title: 'Payout Initiated',
      message: `A payout of ${formatCurrency(earning.netAmount)} has been initiated to your account.`,
      isRead: false,
      linkType: 'earning',
      linkId: earning.id
    });
    
    // Send real-time notification if notification service is available
    const notificationService = getNotificationService();
    if (notificationService) {
      const job = await storage.getJob(earning.jobId);
      notificationService.sendPaymentNotification(
        earning.jobId,
        'processing',
        earning.netAmount,
        earning.workerId,
        'payout' // This is a payout notification
      );
    }
    
    console.log(`Successfully processed transfer.created for earning ${earning.id}`);
  } catch (error: any) {
    console.error('Error handling transfer.created:', error);
  }
}

/**
 * Handle transfer.paid event
 * Updates earning record when a transfer is successfully paid out
 */
async function handleTransferPaid(transfer: Stripe.Transfer) {
  try {
    // Get the earning ID from the transfer metadata
    const earningId = transfer.metadata?.earningId;
    
    if (!earningId) {
      console.error(`No earning ID found in transfer metadata: ${transfer.id}`);
      return;
    }
    
    // Get the earning record
    const earning = await storage.getEarning(parseInt(earningId));
    
    if (!earning) {
      console.error(`Earning record not found for ID: ${earningId}`);
      return;
    }
    
    // Update the earning status to paid and set the datePaid
    const updatedEarning = await storage.updateEarningStatus(
      earning.id, 
      'paid',
      new Date()
    );
    
    // Get the job to include in the notification
    const job = await storage.getJob(earning.jobId);
    const jobTitle = job ? job.title : `Job #${earning.jobId}`;
    
    // Create a notification for the worker
    await storage.createNotification({
      userId: earning.workerId,
      type: 'payout',
      title: 'Payout Completed',
      message: `A payout of ${formatCurrency(earning.netAmount)} for "${jobTitle}" has been deposited to your account.`,
      isRead: false,
      linkType: 'earning',
      linkId: earning.id
    });
    
    // Send real-time notification if notification service is available
    const notificationService = getNotificationService();
    if (notificationService) {
      notificationService.sendPaymentNotification(
        earning.jobId,
        'paid',
        earning.netAmount,
        earning.workerId,
        'payout' // This is a payout notification
      );
    }
    
    console.log(`Successfully processed transfer.paid for earning ${earning.id}`);
  } catch (error: any) {
    console.error('Error handling transfer.paid:', error);
  }
}

/**
 * Handle transfer.failed event
 * Updates earning record when a transfer fails
 */
async function handleTransferFailed(transfer: Stripe.Transfer) {
  try {
    // Get the earning ID from the transfer metadata
    const earningId = transfer.metadata?.earningId;
    
    if (!earningId) {
      console.error(`No earning ID found in transfer metadata: ${transfer.id}`);
      return;
    }
    
    // Get the earning record
    const earning = await storage.getEarning(parseInt(earningId));
    
    if (!earning) {
      console.error(`Earning record not found for ID: ${earningId}`);
      return;
    }
    
    // Update the earning status to failed
    const updatedEarning = await storage.updateEarningStatus(
      earning.id, 
      'failed'
    );
    
    // Create a notification for the worker
    await storage.createNotification({
      userId: earning.workerId,
      type: 'payout',
      title: 'Payout Failed',
      message: `Your payout of ${formatCurrency(earning.netAmount)} could not be processed. Please check your account details.`,
      isRead: false,
      linkType: 'earning',
      linkId: earning.id
    });
    
    // Also notify an admin if available
    // This would require implementing an admin notification system
    
    // Send real-time notification if notification service is available
    const notificationService = getNotificationService();
    if (notificationService) {
      notificationService.sendPaymentNotification(
        earning.jobId,
        'failed',
        earning.netAmount,
        earning.workerId,
        'payout' // This is a payout notification
      );
    }
    
    console.log(`Successfully processed transfer.failed for earning ${earning.id}`);
  } catch (error: any) {
    console.error('Error handling transfer.failed:', error);
  }
}

/**
 * Handle account.updated event
 * Updates our user record when their Stripe Connect account is updated
 */
async function handleAccountUpdated(account: Stripe.Account) {
  try {
    // Find the user with this Connect account ID
    const users = await storage.getAllUsers();
    const user = users.find(u => u.stripeConnectAccountId === account.id);
    
    if (!user) {
      console.error(`User not found for Stripe Connect account: ${account.id}`);
      return;
    }
    
    // Check if the account capabilities or requirements have changed
    const updateData: any = {
      stripeAccountUpdatedAt: new Date()
    };
    
    // Check if transfers are now enabled
    if (account.capabilities?.transfers === 'active' && !user.stripeTransfersEnabled) {
      updateData.stripeTransfersEnabled = true;
      
      // Create a notification for the worker
      await storage.createNotification({
        userId: user.id,
        type: 'account',
        title: 'Payouts Enabled',
        message: 'Your account has been approved for payouts! You can now receive payments for completed jobs.',
        isRead: false,
        linkType: 'profile',
        linkId: user.id
      });
    }
    
    // Update the user record
    await storage.updateUser(user.id, updateData);
    
    // Send real-time notification if notification service is available
    const notificationService = getNotificationService();
    if (notificationService && account.capabilities?.transfers === 'active') {
      notificationService.sendAccountUpdateNotification(
        user.id,
        'verified'
      );
    } else if (notificationService && account.requirements?.currently_due?.length) {
      notificationService.sendAccountUpdateNotification(
        user.id,
        'requires_information'
      );
    }
    
    console.log(`Successfully processed account.updated for user ${user.id}`);
  } catch (error: any) {
    console.error('Error handling account.updated:', error);
  }
}

// Helper function to format currency amounts
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}