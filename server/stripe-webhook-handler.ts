import { Request, Response } from 'express';
import Stripe from 'stripe';
import { IStorage } from './storage';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

/**
 * Helper to handle Stripe webhook events
 * This ensures proper signature verification and event handling
 */
export async function handleStripeWebhook(
  req: Request,
  res: Response,
  storage: IStorage
) {
  const sig = req.headers['stripe-signature'];
  
  if (!sig) {
    console.error('Stripe webhook error: No signature header');
    return res.status(400).send('Webhook Error: No Stripe signature header');
  }
  
  // Get the webhook secret from environment variables
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Stripe webhook error: Webhook secret not configured');
    return res.status(500).send('Webhook Error: Webhook secret not configured');
  }
  
  let event: Stripe.Event;
  
  try {
    // Verify the event came from Stripe
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err: any) {
    console.error(`Stripe webhook error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle different event types
  try {
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        
        // Update user's Stripe account status
        if (account.id) {
          // Find the user with this Stripe account ID
          // Update their account status accordingly
          console.log(`Stripe Connect account ${account.id} updated:`, 
            account.payouts_enabled ? 'Payouts enabled' : 'Payouts disabled');
            
          // You would update user record here
          // await storage.updateStripeAccountStatus(account.id, account.payouts_enabled);
        }
        break;
      }
        
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Process successful payment
        console.log(`Payment succeeded: ${paymentIntent.id}`);
        
        // Find the payment record and update status
        const payment = await storage.getPaymentByTransactionId(paymentIntent.id);
        if (payment) {
          await storage.updatePaymentStatus(payment.id, 'completed', paymentIntent.id);
          
          // For job payments, update job status
          if (payment.jobId) {
            // Update job payment status
            // Notify relevant users
          }
        }
        break;
      }
        
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Handle failed payment
        console.log(`Payment failed: ${paymentIntent.id}`);
        
        // Update payment status and notify user
        const payment = await storage.getPaymentByTransactionId(paymentIntent.id);
        if (payment) {
          await storage.updatePaymentStatus(payment.id, 'failed', paymentIntent.id);
          
          // Notify user of failed payment
          // Create notification for payment failure
        }
        break;
      }
        
      // Handle other event types as needed
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    // Return success response
    return res.json({ received: true });
  } catch (err: any) {
    console.error(`Error processing webhook: ${err.message}`);
    return res.status(500).send(`Webhook processing error: ${err.message}`);
  }
}