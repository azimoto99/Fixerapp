/**
 * Stripe Webhooks Router
 * 
 * This file handles all Stripe webhook events,
 * processing payment intents, transfers, accounts,
 * and other Stripe events.
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';
import express from 'express';
import { z } from 'zod';

// Initialize Stripe with the secret key
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16" as any,
});

// Define the webhook secret
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

const webhooksRouter = Router();

// This endpoint receives webhook events from Stripe
// This should be raw body for signature verification
webhooksRouter.post('/webhooks', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      return res.status(400).send('No signature provided');
    }
    
    // Skip signature verification in development without webhook secret
    let event: Stripe.Event;
    
    try {
      if (webhookSecret) {
        // Verify the event came from Stripe using the webhook secret
        event = stripe.webhooks.constructEvent(
          req.body, // raw body
          sig,
          webhookSecret
        );
      } else {
        // In development without a webhook secret, parse the event without verification
        // This should ONLY be used in development
        event = JSON.parse(req.body.toString());
        console.warn('WARNING: Webhook signature verification skipped. This should only be done in development.');
      }
    } catch (err) {
      console.error('Error verifying webhook signature', err);
      return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    
    // Handle different event types
    try {
      switch (event.type) {
        // Payment Intent Events
        case 'payment_intent.succeeded':
          await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.canceled':
          await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
          break;
          
        // Transfer Events
        case 'transfer.created':
          await handleTransferCreated(event.data.object as Stripe.Transfer);
          break;
        case 'transfer.paid':
          await handleTransferPaid(event.data.object as Stripe.Transfer);
          break;
        case 'transfer.failed':
          await handleTransferFailed(event.data.object as Stripe.Transfer);
          break;
        case 'transfer.reversed':
          await handleTransferReversed(event.data.object as Stripe.Transfer);
          break;
          
        // Account Events
        case 'account.updated':
          await handleAccountUpdated(event.data.object as Stripe.Account);
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
        
        // Checkout Events  
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
          
        // Invoice Events
        case 'invoice.paid':
          await handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
          
        default:
          // Log unhandled event types for debugging
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      console.error(`Error handling webhook event ${event.type}:`, err);
      // We still return 200 to acknowledge receipt of the webhook
      // otherwise Stripe will retry sending it
    }
    
    // Return a 200 to acknowledge receipt of the event
    res.send({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(400).send('Webhook Error');
  }
});

// Handler functions for various webhook events

// Payment Intent Handlers
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment succeeded: ${paymentIntent.id}`);
  
  // Check if we have a payment record for this payment intent
  const payment = await storage.getPaymentByTransactionId(paymentIntent.id);
  
  if (payment) {
    // Update the payment status to succeeded
    await storage.updatePaymentStatus(payment.id, 'succeeded');
    
    // If there's a job ID and worker ID, create an earning record
    if (payment.jobId && payment.workerId) {
      // Calculate platform fee (e.g., 10%)
      const serviceFeePercent = 0.1;
      const serviceFee = payment.amount * serviceFeePercent;
      const netAmount = payment.amount - serviceFee;
      
      // Create an earning record for the worker
      try {
        await storage.createEarning({
          workerId: payment.workerId,
          jobId: payment.jobId,
          amount: payment.amount,
          netAmount: netAmount,
          serviceFee: serviceFee,
          status: 'pending_transfer',
          dateEarned: new Date(),
          transferId: null,
          description: payment.description || 'Payment from job',
        });
      } catch (err) {
        console.error('Error creating earning record:', err);
      }
    }
  } else {
    console.log(`No payment record found for payment intent: ${paymentIntent.id}`);
    
    // If needed, we could create a payment record here based on metadata
    if (paymentIntent.metadata && paymentIntent.metadata.jobId && paymentIntent.metadata.userId) {
      try {
        // Create a payment record
        const newPayment = await storage.createPayment({
          userId: parseInt(paymentIntent.metadata.userId as string),
          workerId: paymentIntent.metadata.workerId ? parseInt(paymentIntent.metadata.workerId as string) : null,
          jobId: parseInt(paymentIntent.metadata.jobId as string),
          amount: paymentIntent.amount / 100, // Stripe amounts are in cents
          status: 'succeeded',
          type: 'payment',
          transactionId: paymentIntent.id,
          description: paymentIntent.description || 'Payment',
          metadata: paymentIntent.metadata,
          serviceFee: null,
          stripeCustomerId: paymentIntent.customer as string,
          stripeConnectAccountId: null,
          paymentMethod: paymentIntent.payment_method as string,
        });
        
        console.log(`Created payment record: ${newPayment.id}`);
      } catch (err) {
        console.error('Error creating payment record:', err);
      }
    }
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment failed: ${paymentIntent.id}`);
  
  // Update payment record
  const payment = await storage.getPaymentByTransactionId(paymentIntent.id);
  
  if (payment) {
    await storage.updatePaymentStatus(payment.id, 'failed');
  }
}

async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment canceled: ${paymentIntent.id}`);
  
  // Update payment record
  const payment = await storage.getPaymentByTransactionId(paymentIntent.id);
  
  if (payment) {
    await storage.updatePaymentStatus(payment.id, 'canceled');
  }
}

// Transfer Handlers
async function handleTransferCreated(transfer: Stripe.Transfer) {
  console.log(`Transfer created: ${transfer.id}`);
  
  // Find the connected account and associated user
  if (transfer.destination) {
    const connectedAccountId = transfer.destination;
    const users = await storage.getUsersByStripeConnectAccountId(connectedAccountId);
    
    if (users.length > 0) {
      const worker = users[0];
      
      // If there's metadata with a job ID, update the corresponding earning record
      if (transfer.metadata && transfer.metadata.jobId) {
        const jobId = parseInt(transfer.metadata.jobId as string);
        const earnings = await storage.getEarningsForJob(jobId);
        
        // Find the earning for this worker and job
        const earning = earnings.find(e => e.workerId === worker.id);
        
        if (earning) {
          // Update the earning with the transfer ID and status
          await storage.updateEarningStatus(earning.id, 'transferred');
          // TODO: Add a field for transferId and update it here
        }
      }
      
      // Create a payment record for the transfer if it doesn't exist
      const existingPayment = await storage.getPaymentByTransactionId(transfer.id);
      
      if (!existingPayment) {
        try {
          await storage.createPayment({
            userId: worker.id,
            workerId: worker.id,
            jobId: transfer.metadata?.jobId ? parseInt(transfer.metadata.jobId as string) : null,
            amount: transfer.amount / 100, // Stripe amounts are in cents
            status: 'pending',
            type: 'transfer',
            transactionId: transfer.id,
            description: transfer.description || 'Transfer to connected account',
            metadata: transfer.metadata || {},
            serviceFee: null,
            stripeCustomerId: null,
            stripeConnectAccountId: connectedAccountId,
            paymentMethod: null,
          });
        } catch (err) {
          console.error('Error creating transfer payment record:', err);
        }
      }
    }
  }
}

async function handleTransferPaid(transfer: Stripe.Transfer) {
  console.log(`Transfer paid: ${transfer.id}`);
  
  // Find the connected account and associated user
  if (transfer.destination) {
    const connectedAccountId = transfer.destination;
    const users = await storage.getUsersByStripeConnectAccountId(connectedAccountId);
    
    if (users.length > 0) {
      // Update the payment record for this transfer
      const payment = await storage.getPaymentByTransactionId(transfer.id);
      
      if (payment) {
        await storage.updatePaymentStatus(payment.id, 'paid');
      }
    }
  }
}

async function handleTransferFailed(transfer: Stripe.Transfer) {
  console.log(`Transfer failed: ${transfer.id}`);
  
  // Find the connected account and associated user
  if (transfer.destination) {
    const connectedAccountId = transfer.destination;
    const users = await storage.getUsersByStripeConnectAccountId(connectedAccountId);
    
    if (users.length > 0) {
      // Update the payment record for this transfer
      const payment = await storage.getPaymentByTransactionId(transfer.id);
      
      if (payment) {
        await storage.updatePaymentStatus(payment.id, 'failed');
      }
      
      // If there's a job ID, update the earning record
      if (transfer.metadata && transfer.metadata.jobId) {
        const jobId = parseInt(transfer.metadata.jobId as string);
        const earnings = await storage.getEarningsForJob(jobId);
        
        // Find the earning for this worker and job
        const worker = users[0];
        const earning = earnings.find(e => e.workerId === worker.id);
        
        if (earning) {
          // Update the earning status back to pending_transfer
          await storage.updateEarningStatus(earning.id, 'pending_transfer');
        }
      }
    }
  }
}

async function handleTransferReversed(transfer: Stripe.Transfer) {
  console.log(`Transfer reversed: ${transfer.id}`);
  
  // Similar logic to failed transfers
  if (transfer.destination) {
    const connectedAccountId = transfer.destination;
    const users = await storage.getUsersByStripeConnectAccountId(connectedAccountId);
    
    if (users.length > 0) {
      // Update the payment record for this transfer
      const payment = await storage.getPaymentByTransactionId(transfer.id);
      
      if (payment) {
        await storage.updatePaymentStatus(payment.id, 'reversed');
      }
    }
  }
}

// Account Handlers
async function handleAccountUpdated(account: Stripe.Account) {
  console.log(`Account updated: ${account.id}`);
  
  // Find users with this connected account
  const users = await storage.getUsersByStripeConnectAccountId(account.id);
  
  if (users.length > 0) {
    const user = users[0];
    
    // Check if the account now has representative info provided
    const hasRepresentative = account.company?.directors_provided || 
                            account.company?.executives_provided || 
                            account.company?.owners_provided || 
                            account.individual !== null;
                            
    if (hasRepresentative) {
      await storage.updateStripeRepresentativeInfo(user.id, true);
    }
    
    // Check if bank account is provided
    const hasBankingDetails = account.external_accounts?.data?.length > 0;
    
    if (hasBankingDetails) {
      await storage.updateStripeBankingDetails(user.id, true);
    }
  }
}

// Subscription Handlers
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log(`Subscription created: ${subscription.id}`);
  
  if (subscription.customer) {
    const customerId = typeof subscription.customer === 'string' 
      ? subscription.customer 
      : subscription.customer.id;
      
    const users = await storage.getUsersByStripeCustomerId(customerId);
    
    if (users.length > 0) {
      const user = users[0];
      
      // TODO: Add a field for subscriptionId and update it here
      // await storage.updateUserSubscription(user.id, subscription.id, subscription.status);
      
      // Create a payment record for the subscription
      if (subscription.latest_invoice) {
        const invoice = typeof subscription.latest_invoice === 'string'
          ? await stripe.invoices.retrieve(subscription.latest_invoice)
          : subscription.latest_invoice;
          
        if (invoice.payment_intent) {
          const paymentIntent = typeof invoice.payment_intent === 'string'
            ? await stripe.paymentIntents.retrieve(invoice.payment_intent)
            : invoice.payment_intent;
            
          try {
            await storage.createPayment({
              userId: user.id,
              workerId: null,
              jobId: null,
              amount: subscription.items.total_usage / 100, // Stripe amounts are in cents
              status: subscription.status,
              type: 'subscription',
              transactionId: paymentIntent.id,
              description: `Subscription: ${subscription.id}`,
              metadata: subscription.metadata || {},
              serviceFee: null,
              stripeCustomerId: customerId,
              stripeConnectAccountId: null,
              paymentMethod: paymentIntent.payment_method as string,
            });
          } catch (err) {
            console.error('Error creating subscription payment record:', err);
          }
        }
      }
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`Subscription updated: ${subscription.id}`);
  
  // Similar to subscription created, but update existing records
  if (subscription.customer) {
    const customerId = typeof subscription.customer === 'string' 
      ? subscription.customer 
      : subscription.customer.id;
      
    const users = await storage.getUsersByStripeCustomerId(customerId);
    
    if (users.length > 0) {
      const user = users[0];
      
      // TODO: Update user's subscription status
      // await storage.updateUserSubscription(user.id, subscription.id, subscription.status);
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`Subscription deleted: ${subscription.id}`);
  
  if (subscription.customer) {
    const customerId = typeof subscription.customer === 'string' 
      ? subscription.customer 
      : subscription.customer.id;
      
    const users = await storage.getUsersByStripeCustomerId(customerId);
    
    if (users.length > 0) {
      const user = users[0];
      
      // TODO: Update user's subscription status to canceled
      // await storage.updateUserSubscription(user.id, subscription.id, 'canceled');
    }
  }
}

// Checkout Session Handlers
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log(`Checkout session completed: ${session.id}`);
  
  // Process the checkout session based on what was purchased
  if (session.customer) {
    const customerId = typeof session.customer === 'string' 
      ? session.customer 
      : session.customer.id;
      
    const users = await storage.getUsersByStripeCustomerId(customerId);
    
    if (users.length > 0) {
      const user = users[0];
      
      // Check what was purchased and handle accordingly
      if (session.mode === 'payment' && session.payment_intent) {
        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent.id;
          
        // A one-time payment was made
        try {
          await storage.createPayment({
            userId: user.id,
            workerId: null,
            jobId: session.metadata?.jobId ? parseInt(session.metadata.jobId) : null,
            amount: session.amount_total ? session.amount_total / 100 : 0, // Stripe amounts are in cents
            status: 'succeeded',
            type: 'payment',
            transactionId: paymentIntentId,
            description: session.metadata?.description || 'Checkout payment',
            metadata: session.metadata || {},
            serviceFee: null,
            stripeCustomerId: customerId,
            stripeConnectAccountId: null,
            paymentMethod: null, // We don't get the payment method in the session
          });
        } catch (err) {
          console.error('Error creating checkout payment record:', err);
        }
      } else if (session.mode === 'subscription' && session.subscription) {
        // A subscription was created - this will be handled by the subscription events
        console.log(`Subscription ${session.subscription} created via checkout`);
      }
    }
  }
}

// Invoice Handlers
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log(`Invoice paid: ${invoice.id}`);
  
  if (invoice.customer) {
    const customerId = typeof invoice.customer === 'string' 
      ? invoice.customer 
      : invoice.customer.id;
      
    const users = await storage.getUsersByStripeCustomerId(customerId);
    
    if (users.length > 0 && invoice.payment_intent) {
      const user = users[0];
      const paymentIntentId = typeof invoice.payment_intent === 'string'
        ? invoice.payment_intent
        : invoice.payment_intent.id;
        
      // Check if we already have a payment record
      const existingPayment = await storage.getPaymentByTransactionId(paymentIntentId);
      
      if (!existingPayment) {
        // Create a payment record
        try {
          await storage.createPayment({
            userId: user.id,
            workerId: null,
            jobId: null,
            amount: invoice.amount_paid / 100, // Stripe amounts are in cents
            status: 'succeeded',
            type: invoice.subscription ? 'subscription' : 'payment',
            transactionId: paymentIntentId,
            description: `Invoice: ${invoice.id}`,
            metadata: invoice.metadata || {},
            serviceFee: null,
            stripeCustomerId: customerId,
            stripeConnectAccountId: null,
            paymentMethod: null, // We don't get the payment method in the invoice
          });
        } catch (err) {
          console.error('Error creating invoice payment record:', err);
        }
      }
    }
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`Invoice payment failed: ${invoice.id}`);
  
  if (invoice.customer && invoice.payment_intent) {
    const customerId = typeof invoice.customer === 'string' 
      ? invoice.customer 
      : invoice.customer.id;
      
    const users = await storage.getUsersByStripeCustomerId(customerId);
    
    if (users.length > 0) {
      const user = users[0];
      const paymentIntentId = typeof invoice.payment_intent === 'string'
        ? invoice.payment_intent
        : invoice.payment_intent.id;
        
      // Update payment record if it exists
      const payment = await storage.getPaymentByTransactionId(paymentIntentId);
      
      if (payment) {
        await storage.updatePaymentStatus(payment.id, 'failed');
      }
      
      // If it's a subscription, we might want to notify the user
      if (invoice.subscription) {
        // TODO: Send notification to user about failed subscription payment
      }
    }
  }
}

export default webhooksRouter;