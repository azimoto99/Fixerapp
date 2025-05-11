/**
 * Stripe Webhooks API
 * 
 * This file handles all incoming Stripe webhook events for both payment processing
 * and Connect accounts. It processes events for payment success/failures, 
 * account updates, and payouts.
 */

import express, { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';
import { updateUserStripeInfo } from './stripe-api';

// Initialize Stripe with the secret key
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16" as any,
});

// Create a router for webhook endpoints
const webhooksRouter = Router();

// Stripe webhook endpoint (no authentication since Stripe sends signed requests)
webhooksRouter.post("/webhook", express.raw({type: 'application/json'}), async (req: Request, res: Response) => {
  let event: Stripe.Event;
  
  try {
    // Get the webhook secret from environment variables
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    // Verify the webhook signature
    if (endpointSecret) {
      // Get the signature from the headers
      const signature = req.headers['stripe-signature'];
      
      if (!signature) {
        console.error('Webhook Error: No Stripe signature header');
        return res.status(400).send('No signature header');
      }

      try {
        // Verify the event with the signature
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          endpointSecret
        );
      } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
      }
    } else {
      // If no webhook secret is configured, trust the incoming event
      // NOTE: This is not recommended for production, but useful for testing
      console.warn('No webhook secret configured, proceeding without verification');
      event = req.body;
    }
    
    // Handle different event types
    console.log(`Received webhook event: ${event.type}`);
    
    switch (event.type) {
      // Payment Intent Events
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
        
      // Connect Account Events
      case 'account.updated':
        await handleConnectAccountUpdated(event.data.object as Stripe.Account);
        break;
        
      case 'account.application.deauthorized':
        await handleConnectAccountDeauthorized(event.data.object as any);
        break;
        
      // Payout Events
      case 'payout.created':
        await handlePayoutCreated(event.data.object as Stripe.Payout);
        break;
        
      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout);
        break;
        
      case 'payout.failed':
        await handlePayoutFailed(event.data.object as Stripe.Payout);
        break;
        
      // Setup Intent Events
      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent);
        break;
        
      case 'setup_intent.setup_failed':
        await handleSetupIntentFailed(event.data.object as Stripe.SetupIntent);
        break;
        
      // Customer Events
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
        
      // Default response for other events
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    // Return a 200 response to acknowledge receipt of the event
    res.json({received: true});
  } catch (err) {
    console.error(`Webhook error: ${err.message}`);
    res.status(500).send(`Webhook error: ${err.message}`);
  }
});

// Handler functions for different event types

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log(`Payment succeeded for payment intent: ${paymentIntent.id}`);
    
    // Get the metadata to find our payment record
    const { userId, jobId, workerId } = paymentIntent.metadata;
    
    // Find the payment in our database by transaction ID (payment_intent.id)
    const payment = await storage.getPaymentByTransactionId(paymentIntent.id);
    
    if (payment) {
      // Update the payment status to 'completed'
      await storage.updatePaymentStatus(payment.id, 'completed', paymentIntent.id);
      
      // If this is for a job, update the job status
      if (jobId && parseInt(jobId)) {
        const job = await storage.getJob(parseInt(jobId));
        
        if (job) {
          // If the job is in 'pending_payment' status, update it to 'paid'
          if (job.status === 'pending_payment') {
            await storage.updateJob(job.id, { status: 'paid' });
          }
        }
      }
      
      // If this is a payment to a worker, create an earning record
      if (workerId && parseInt(workerId)) {
        // Create an earning record for the worker
        await storage.createEarning({
          workerId: parseInt(workerId),
          jobId: jobId ? parseInt(jobId) : null,
          amount: payment.amount,
          serviceFee: payment.amount * 0.05, // 5% service fee
          netAmount: payment.amount * 0.95, // 95% to the worker
          status: 'pending', // Will be marked as paid when transferred to their bank
        });
        
        // Create a notification for the worker
        await storage.createNotification({
          userId: parseInt(workerId),
          title: 'Payment Received',
          message: `You have received a payment of ${formatCurrency(payment.amount)}`,
          type: 'payment_received',
          sourceId: payment.id,
          sourceType: 'payment',
          metadata: {
            paymentId: payment.id,
            amount: payment.amount,
          },
        });
      }
      
      // Create a notification for the payer
      if (userId && parseInt(userId)) {
        await storage.createNotification({
          userId: parseInt(userId),
          title: 'Payment Successful',
          message: `Your payment of ${formatCurrency(payment.amount)} has been processed successfully`,
          type: 'payment_sent',
          sourceId: payment.id,
          sourceType: 'payment',
          metadata: {
            paymentId: payment.id,
            amount: payment.amount,
          },
        });
      }
    } else {
      console.warn(`Payment record not found for payment intent: ${paymentIntent.id}`);
    }
  } catch (error) {
    console.error('Error handling payment succeeded webhook:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log(`Payment failed for payment intent: ${paymentIntent.id}`);
    
    // Find the payment in our database by transaction ID (payment_intent.id)
    const payment = await storage.getPaymentByTransactionId(paymentIntent.id);
    
    if (payment) {
      // Update the payment status to 'failed'
      await storage.updatePaymentStatus(payment.id, 'failed', paymentIntent.id);
      
      // Create a notification for the payer
      if (payment.userId) {
        await storage.createNotification({
          userId: payment.userId,
          title: 'Payment Failed',
          message: `Your payment of ${formatCurrency(payment.amount)} could not be processed`,
          type: 'payment_failed',
          sourceId: payment.id,
          sourceType: 'payment',
          metadata: {
            paymentId: payment.id,
            amount: payment.amount,
            error: paymentIntent.last_payment_error?.message || 'Unknown error',
          },
        });
      }
    } else {
      console.warn(`Payment record not found for payment intent: ${paymentIntent.id}`);
    }
  } catch (error) {
    console.error('Error handling payment failed webhook:', error);
  }
}

async function handleConnectAccountUpdated(account: Stripe.Account) {
  try {
    console.log(`Connect account updated: ${account.id}`);
    
    // Find users with this Connect account ID
    const users = await storage.getUsersByStripeConnectAccountId(account.id);
    
    if (users && users.length > 0) {
      for (const user of users) {
        // Determine account status
        let accountStatus = 'pending';
        if (account.details_submitted) {
          if (account.charges_enabled && account.payouts_enabled) {
            accountStatus = 'active';
          } else if (account.requirements?.disabled_reason) {
            accountStatus = 'restricted';
          } else {
            accountStatus = 'incomplete';
          }
        }
        
        // Update user's Stripe Connect account status
        await updateUserStripeInfo(user.id, {
          stripeConnectAccountStatus: accountStatus,
        });
        
        // Create a notification for the user
        await storage.createNotification({
          userId: user.id,
          title: 'Stripe Account Updated',
          message: `Your Stripe Connect account status is now: ${accountStatus}`,
          type: 'system_message',
          sourceType: 'stripe',
          metadata: {
            accountId: account.id,
            status: accountStatus,
          },
        });
      }
    } else {
      console.warn(`No users found with Connect account ID: ${account.id}`);
    }
  } catch (error) {
    console.error('Error handling Connect account updated webhook:', error);
  }
}

async function handleConnectAccountDeauthorized(object: any) {
  try {
    console.log(`Connect account deauthorized: ${object.id}`);
    
    // Find users with this Connect account ID
    const users = await storage.getUsersByStripeConnectAccountId(object.id);
    
    if (users && users.length > 0) {
      for (const user of users) {
        // Update user to remove Connect account ID and set status to 'disconnected'
        await updateUserStripeInfo(user.id, {
          stripeConnectAccountStatus: 'disconnected',
        });
        
        // Create a notification for the user
        await storage.createNotification({
          userId: user.id,
          title: 'Stripe Account Disconnected',
          message: 'Your Stripe Connect account has been disconnected',
          type: 'system_message',
          sourceType: 'stripe',
          metadata: {
            accountId: object.id,
          },
        });
      }
    } else {
      console.warn(`No users found with Connect account ID: ${object.id}`);
    }
  } catch (error) {
    console.error('Error handling Connect account deauthorized webhook:', error);
  }
}

async function handlePayoutCreated(payout: Stripe.Payout) {
  try {
    console.log(`Payout created: ${payout.id}`);
    
    // Handle payout creation logic (e.g., create a record in our database)
    // This is relevant for Connect accounts receiving money
    
    // Get the Connect account ID from the payout
    const accountId = payout.destination;
    
    // Find users with this Connect account ID
    const users = await storage.getUsersByStripeConnectAccountId(accountId);
    
    if (users && users.length > 0) {
      for (const user of users) {
        // Create a notification for the user
        await storage.createNotification({
          userId: user.id,
          title: 'Payout Initiated',
          message: `A payout of ${formatCurrency(payout.amount / 100)} has been initiated to your bank account`,
          type: 'system_message',
          sourceType: 'stripe',
          metadata: {
            payoutId: payout.id,
            amount: payout.amount / 100,
          },
        });
      }
    } else {
      console.warn(`No users found with Connect account ID: ${accountId}`);
    }
  } catch (error) {
    console.error('Error handling payout created webhook:', error);
  }
}

async function handlePayoutPaid(payout: Stripe.Payout) {
  try {
    console.log(`Payout paid: ${payout.id}`);
    
    // Handle payout paid logic (e.g., update records in our database)
    
    // Get the Connect account ID from the payout
    const accountId = payout.destination;
    
    // Find users with this Connect account ID
    const users = await storage.getUsersByStripeConnectAccountId(accountId);
    
    if (users && users.length > 0) {
      for (const user of users) {
        // Create a notification for the user
        await storage.createNotification({
          userId: user.id,
          title: 'Payout Completed',
          message: `A payout of ${formatCurrency(payout.amount / 100)} has been deposited to your bank account`,
          type: 'system_message',
          sourceType: 'stripe',
          metadata: {
            payoutId: payout.id,
            amount: payout.amount / 100,
          },
        });
      }
    } else {
      console.warn(`No users found with Connect account ID: ${accountId}`);
    }
  } catch (error) {
    console.error('Error handling payout paid webhook:', error);
  }
}

async function handlePayoutFailed(payout: Stripe.Payout) {
  try {
    console.log(`Payout failed: ${payout.id}`);
    
    // Handle payout failure logic
    
    // Get the Connect account ID from the payout
    const accountId = payout.destination;
    
    // Find users with this Connect account ID
    const users = await storage.getUsersByStripeConnectAccountId(accountId);
    
    if (users && users.length > 0) {
      for (const user of users) {
        // Create a notification for the user
        await storage.createNotification({
          userId: user.id,
          title: 'Payout Failed',
          message: `A payout of ${formatCurrency(payout.amount / 100)} to your bank account has failed`,
          type: 'system_message',
          sourceType: 'stripe',
          metadata: {
            payoutId: payout.id,
            amount: payout.amount / 100,
            failure_code: payout.failure_code,
            failure_message: payout.failure_message,
          },
        });
      }
    } else {
      console.warn(`No users found with Connect account ID: ${accountId}`);
    }
  } catch (error) {
    console.error('Error handling payout failed webhook:', error);
  }
}

async function handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent) {
  try {
    console.log(`Setup intent succeeded: ${setupIntent.id}`);
    
    // Handle setup intent success (e.g., payment method attached to customer)
    
    // Get the customer ID from the setup intent
    const customerId = setupIntent.customer as string;
    
    if (customerId) {
      // Find the user with this customer ID
      const users = await storage.getUsersByStripeCustomerId(customerId);
      
      if (users && users.length > 0) {
        for (const user of users) {
          // Create a notification for the user
          await storage.createNotification({
            userId: user.id,
            title: 'Payment Method Added',
            message: 'A new payment method has been added to your account',
            type: 'system_message',
            sourceType: 'stripe',
            metadata: {
              setupIntentId: setupIntent.id,
            },
          });
        }
      } else {
        console.warn(`No users found with Stripe customer ID: ${customerId}`);
      }
    }
  } catch (error) {
    console.error('Error handling setup intent succeeded webhook:', error);
  }
}

async function handleSetupIntentFailed(setupIntent: Stripe.SetupIntent) {
  try {
    console.log(`Setup intent failed: ${setupIntent.id}`);
    
    // Handle setup intent failure
    
    // Get the customer ID from the setup intent
    const customerId = setupIntent.customer as string;
    
    if (customerId) {
      // Find the user with this customer ID
      const users = await storage.getUsersByStripeCustomerId(customerId);
      
      if (users && users.length > 0) {
        for (const user of users) {
          // Create a notification for the user
          await storage.createNotification({
            userId: user.id,
            title: 'Payment Method Failed',
            message: 'Failed to add a new payment method to your account',
            type: 'system_message',
            sourceType: 'stripe',
            metadata: {
              setupIntentId: setupIntent.id,
              error: setupIntent.last_setup_error?.message || 'Unknown error',
            },
          });
        }
      } else {
        console.warn(`No users found with Stripe customer ID: ${customerId}`);
      }
    }
  } catch (error) {
    console.error('Error handling setup intent failed webhook:', error);
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    console.log(`Subscription created: ${subscription.id}`);
    
    // Handle subscription creation logic
    const customerId = subscription.customer as string;
    
    if (customerId) {
      // Find the user with this customer ID
      const users = await storage.getUsersByStripeCustomerId(customerId);
      
      if (users && users.length > 0) {
        // Update user's subscription status if needed
        
        // Create a notification
        for (const user of users) {
          await storage.createNotification({
            userId: user.id,
            title: 'Subscription Started',
            message: 'Your subscription has been activated',
            type: 'system_message',
            sourceType: 'stripe',
            metadata: {
              subscriptionId: subscription.id,
            },
          });
        }
      } else {
        console.warn(`No users found with Stripe customer ID: ${customerId}`);
      }
    }
  } catch (error) {
    console.error('Error handling subscription created webhook:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    console.log(`Subscription updated: ${subscription.id}`);
    
    // Handle subscription update logic
    const customerId = subscription.customer as string;
    
    if (customerId) {
      // Find the user with this customer ID
      const users = await storage.getUsersByStripeCustomerId(customerId);
      
      if (users && users.length > 0) {
        // Update user's subscription status if needed
        
        // Create a notification only if status changed
        if (subscription.status === 'active' || subscription.status === 'past_due' || 
            subscription.status === 'canceled' || subscription.status === 'unpaid') {
          for (const user of users) {
            await storage.createNotification({
              userId: user.id,
              title: 'Subscription Updated',
              message: `Your subscription status is now: ${formatSubscriptionStatus(subscription.status)}`,
              type: 'system_message',
              sourceType: 'stripe',
              metadata: {
                subscriptionId: subscription.id,
                status: subscription.status,
              },
            });
          }
        }
      } else {
        console.warn(`No users found with Stripe customer ID: ${customerId}`);
      }
    }
  } catch (error) {
    console.error('Error handling subscription updated webhook:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    console.log(`Subscription deleted: ${subscription.id}`);
    
    // Handle subscription deletion logic
    const customerId = subscription.customer as string;
    
    if (customerId) {
      // Find the user with this customer ID
      const users = await storage.getUsersByStripeCustomerId(customerId);
      
      if (users && users.length > 0) {
        // Update user's subscription status
        
        // Create a notification
        for (const user of users) {
          await storage.createNotification({
            userId: user.id,
            title: 'Subscription Ended',
            message: 'Your subscription has been canceled',
            type: 'system_message',
            sourceType: 'stripe',
            metadata: {
              subscriptionId: subscription.id,
            },
          });
        }
      } else {
        console.warn(`No users found with Stripe customer ID: ${customerId}`);
      }
    }
  } catch (error) {
    console.error('Error handling subscription deleted webhook:', error);
  }
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Helper function to format subscription status
function formatSubscriptionStatus(status: string): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'past_due':
      return 'Past Due';
    case 'unpaid':
      return 'Unpaid';
    case 'canceled':
      return 'Canceled';
    case 'incomplete':
      return 'Incomplete';
    case 'incomplete_expired':
      return 'Expired';
    case 'trialing':
      return 'Trial';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export default webhooksRouter;