// @ts-nocheck
import express from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';
import { payments, insertPaymentSchema } from '@shared/schema';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Webhooks endpoint must be configured in Stripe dashboard to receive events
// List of Stripe webhook event types: https://stripe.com/docs/api/events/types
export const setupStripeWebhooks = (app: express.Express) => {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  
  app.post('/api/stripe/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
    let event: Stripe.Event;
    const sig = req.headers['stripe-signature'];
    
    try {
      // Verify webhook signature
      if (endpointSecret && sig) {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } else {
        // For testing without the webhook secret
        event = req.body as Stripe.Event;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Webhook Error: ${errorMessage}`);
      return res.status(400).send(`Webhook Error: ${errorMessage}`);
    }
    
    // Handle different event types
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
          
        case 'payment_intent.payment_failed':
          await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;
          
        case 'charge.succeeded':
          await handleChargeSucceeded(event.data.object as Stripe.Charge);
          break;
          
        case 'charge.failed':
          await handleChargeFailed(event.data.object as Stripe.Charge);
          break;
          
        case 'charge.refunded':
          await handleChargeRefunded(event.data.object as Stripe.Charge);
          break;
          
        case 'transfer.created':
          await handleTransferCreated(event.data.object as Stripe.Transfer);
          break;
          
        case 'transfer.failed':
          await handleTransferFailed(event.data.object as Stripe.Transfer);
          break;
          
        case 'payout.created':
          await handlePayoutCreated(event.data.object as Stripe.Payout);
          break;
          
        case 'payout.failed':
          await handlePayoutFailed(event.data.object as Stripe.Payout);
          break;
          
        case 'account.updated':
          await handleAccountUpdated(event.data.object as Stripe.Account);
          break;
          
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
      
      res.status(200).json({ received: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error processing webhook: ${errorMessage}`);
      res.status(500).send(`Error processing webhook: ${errorMessage}`);
    }
  });
};

// Helper function to extract metadata from payment intent
const extractPaymentMetadata = (paymentIntent: Stripe.PaymentIntent) => {
  let userId = null;
  let jobId = null;
  let workerId = null;

  if (paymentIntent.metadata) {
    // Handle different metadata key formats
    userId = paymentIntent.metadata.userId ? parseInt(paymentIntent.metadata.userId) :
             paymentIntent.metadata.user_id ? parseInt(paymentIntent.metadata.user_id) : null;

    jobId = paymentIntent.metadata.jobId ? parseInt(paymentIntent.metadata.jobId) :
            paymentIntent.metadata.job_id ? parseInt(paymentIntent.metadata.job_id) : null;

    workerId = paymentIntent.metadata.workerId ? parseInt(paymentIntent.metadata.workerId) :
               paymentIntent.metadata.worker_id ? parseInt(paymentIntent.metadata.worker_id) : null;
  }

  return { userId, jobId, workerId };
};

// Handler for payment_intent.succeeded event
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { userId, jobId, workerId } = extractPaymentMetadata(paymentIntent);

  console.log(`PaymentIntent succeeded: ${paymentIntent.id}, metadata:`, paymentIntent.metadata);

  // Record the successful payment in our database
  try {
    // Check if this payment was already recorded (to avoid duplicates)
    const existingPayment = await storage.getPaymentByTransactionId(paymentIntent.id);

    if (existingPayment) {
      // Update existing payment if status has changed
      if (existingPayment.status !== 'completed' && existingPayment.status !== 'succeeded') {
        await storage.updatePaymentStatus(existingPayment.id, 'completed', paymentIntent.id);
        console.log(`Updated existing payment ${existingPayment.id} to completed`);
      }

      // Handle job posting payments specifically
      if (existingPayment.type === 'job_posting_fee' && existingPayment.jobId) {
        const job = await storage.getJob(existingPayment.jobId);
        if (job && job.status === 'pending') {
          await storage.updateJob(existingPayment.jobId, { status: 'open' });
          console.log(`Job ${existingPayment.jobId} activated after payment confirmation`);
        }
      }
      return;
    }

    // Determine payment type from metadata
    const paymentType = paymentIntent.metadata?.purpose || 'job_payment';

    // Create new payment record
    const paymentData = {
      userId: userId,
      jobId: jobId,
      workerId: workerId,
      amount: paymentIntent.amount / 100, // Convert from cents to dollars
      type: paymentType,
      description: paymentIntent.description || 'Payment from webhook',
      transactionId: paymentIntent.id,
      paymentMethod: paymentIntent.payment_method_types[0] || 'card',
      status: 'completed',
      stripePaymentIntentId: paymentIntent.id,
      metadata: paymentIntent.metadata || {},
    };

    const newPayment = await storage.createPayment(paymentData);
    console.log(`Created payment record ${newPayment.id} from webhook`);

    // Handle different payment types
    if (paymentType === 'job_posting_fee' && jobId) {
      // For job posting payments, activate the job
      const job = await storage.getJob(jobId);
      if (job && job.status === 'pending') {
        await storage.updateJob(jobId, { status: 'open' });
        console.log(`Job ${jobId} activated after job posting payment`);
      }
    } else if (jobId) {
      // For regular job payments, update payment status
      await storage.updateJob(jobId, { paymentStatus: 'paid' });

      // Create notification for the worker if assigned
      if (workerId) {
        await storage.createNotification({
          userId: workerId,
          type: 'payment',
          title: 'Payment Received',
          message: `Payment for job #${jobId} has been processed successfully.`,
          isRead: false,
          relatedId: jobId,
          relatedType: 'job',
        });
      }
    }
  } catch (error) {
    console.error('Error recording successful payment:', error);
    throw error;
  }
}

// Handler for payment_intent.payment_failed event
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { userId, jobId, workerId } = extractPaymentMetadata(paymentIntent);
  
  console.log(`PaymentIntent failed: ${paymentIntent.id}`);
  
  try {
    // Check if this payment was already recorded
    const existingPayment = await storage.getPaymentByTransactionId(paymentIntent.id);
    
    if (existingPayment) {
      // Update existing payment status
      await storage.updatePaymentStatus(existingPayment.id, 'failed', paymentIntent.id);
    } else {
      // Create new payment record with failed status
      const paymentData = {
        userId: userId,
        jobId: jobId,
        workerId: workerId,
        amount: paymentIntent.amount,
        description: paymentIntent.description || 'Failed payment',
        transactionId: paymentIntent.id,
        paymentMethod: paymentIntent.payment_method_types[0] || 'card',
        status: 'failed',
        metadata: JSON.stringify(paymentIntent.metadata || {}),
      };
      
      await storage.createPayment(paymentData);
    }
    
    // If this is a job payment, update the job status
    if (jobId) {
      await storage.updateJob(jobId, { paymentStatus: 'failed' });
      
      // Notify the job poster about the failed payment
      if (userId) {
        await storage.createNotification({
          userId,
          type: 'payment_failed',
          title: 'Payment Failed',
          message: `Payment for job #${jobId} has failed. Please update your payment information.`,
          isRead: false,
          relatedId: jobId,
          relatedType: 'job',
        });
      }
    }
  } catch (error) {
    console.error('Error recording failed payment:', error);
    throw error;
  }
}

// Handler for charge.succeeded event
async function handleChargeSucceeded(charge: Stripe.Charge) {
  console.log(`Charge succeeded: ${charge.id}`);
  
  // Additional handling for charges if needed
  // Most payment flows will use the payment_intent events instead
}

// Handler for charge.failed event
async function handleChargeFailed(charge: Stripe.Charge) {
  console.log(`Charge failed: ${charge.id}`);
  
  // Additional handling for failed charges if needed
}

// Handler for charge.refunded event
async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log(`Charge refunded: ${charge.id}`);
  
  try {
    if (charge.payment_intent && typeof charge.payment_intent === 'string') {
      const existingPayment = await storage.getPaymentByTransactionId(charge.payment_intent);
      
      if (existingPayment) {
        // Update payment status based on refund amount
        const status = charge.amount_refunded === charge.amount ? 'refunded' : 'partial_refunded';
        await storage.updatePaymentStatus(existingPayment.id, status);
        
        // If this is a job payment, update the job payment status
        if (existingPayment.jobId) {
          await storage.updateJob(existingPayment.jobId, { paymentStatus: status });
        }
        
        // Notify the users involved
        if (existingPayment.userId) {
          await storage.createNotification({
            userId: existingPayment.userId,
            type: 'refund',
            title: 'Payment Refunded',
            message: `Your payment of ${(charge.amount_refunded / 100).toFixed(2)} USD for job #${existingPayment.jobId} has been refunded.`,
            isRead: false,
            relatedId: existingPayment.jobId || undefined,
            relatedType: 'job',
          });
        }
      }
    }
  } catch (error) {
    console.error('Error processing refund:', error);
    throw error;
  }
}

// Handler for transfer.created event
async function handleTransferCreated(transfer: Stripe.Transfer) {
  console.log(`Transfer created: ${transfer.id}`);
  
  // Record transfers to workers in our database
  try {
    const metadata = transfer.metadata || {};
    const jobId = metadata.jobId ? parseInt(metadata.jobId) : null;
    const workerId = metadata.workerId ? parseInt(metadata.workerId) : null;
    const userId = metadata.userId ? parseInt(metadata.userId) : null;
    
    if (workerId) {
      // Record the transfer in earnings table
      const earningData = {
        workerId,
        jobId,
        amount: transfer.amount,
        description: transfer.description || 'Transfer payment',
        transactionId: transfer.id,
        status: 'paid',
        datePaid: new Date().toISOString(),
      };
      
      const earning = await storage.createEarning(earningData);
      
      // Notify the worker
      await storage.createNotification({
        userId: workerId,
        type: 'earnings',
        title: 'Payment Received',
        message: `You have received a payment of ${(transfer.amount / 100).toFixed(2)} USD for ${jobId ? `job #${jobId}` : 'your services'}.`,
        isRead: false,
        relatedId: jobId || undefined,
        relatedType: jobId ? 'job' : 'earnings',
      });
    }
  } catch (error) {
    console.error('Error recording transfer:', error);
    throw error;
  }
}

// Handler for transfer.failed event
async function handleTransferFailed(transfer: Stripe.Transfer) {
  console.log(`Transfer failed: ${transfer.id}`);
  
  try {
    const metadata = transfer.metadata || {};
    const jobId = metadata.jobId ? parseInt(metadata.jobId) : null;
    const workerId = metadata.workerId ? parseInt(metadata.workerId) : null;
    const userId = metadata.userId ? parseInt(metadata.userId) : null;
    
    if (workerId) {
      // Record the failed transfer
      const earningData = {
        workerId,
        jobId,
        amount: transfer.amount,
        description: transfer.description || 'Failed transfer',
        transactionId: transfer.id,
        status: 'failed',
      };
      
      await storage.createEarning(earningData);
      
      // Notify the admin/job poster about the failed transfer
      if (userId) {
        await storage.createNotification({
          userId,
          type: 'transfer_failed',
          title: 'Worker Payment Failed',
          message: `The payment transfer to worker #${workerId} for ${jobId ? `job #${jobId}` : 'services'} has failed.`,
          isRead: false,
          relatedId: jobId || undefined,
          relatedType: jobId ? 'job' : 'earnings',
        });
      }
    }
  } catch (error) {
    console.error('Error recording failed transfer:', error);
    throw error;
  }
}

// Handler for payout.created event
async function handlePayoutCreated(payout: Stripe.Payout) {
  console.log(`Payout created: ${payout.id}`);
  
  // Additional handling for payouts (when workers withdraw funds)
}

// Handler for payout.failed event
async function handlePayoutFailed(payout: Stripe.Payout) {
  console.log(`Payout failed: ${payout.id}`);
  
  // Handling for failed payouts
}

// Handler for account.updated event
async function handleAccountUpdated(account: Stripe.Account) {
  console.log(`Account updated: ${account.id}`);
  
  try {
    // Find the user with this Stripe account
    const users = await storage.getAllUsers();
    const user = users.find(u => u.stripeConnectAccountId === account.id);
    
    if (user) {
      // Update the user's Stripe account verification status
      const isVerified = account.charges_enabled && account.payouts_enabled;
      const verificationStatus = isVerified ? 'verified' : 'pending';
      
      await storage.updateUser(user.id, {
        stripeVerificationStatus: verificationStatus,
      });
      
      // Notify the user about verification changes
      if (isVerified) {
        await storage.createNotification({
          userId: user.id,
          type: 'account',
          title: 'Account Verified',
          message: 'Your Stripe account has been verified. You can now receive payments for your work.',
          isRead: false,
        });
      } else if (account.requirements?.currently_due?.length) {
        await storage.createNotification({
          userId: user.id,
          type: 'account',
          title: 'Action Required',
          message: 'Your Stripe account requires additional information. Please complete the verification process.',
          isRead: false,
        });
      }
    }
  } catch (error) {
    console.error('Error updating user account verification:', error);
    throw error;
  }
}