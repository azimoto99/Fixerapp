import { Request, Response } from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing Stripe secret key');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16' as any // using the same version as in routes.ts for consistency
});

/**
 * Pre-authorize a payment without capturing funds
 * This is used to validate the payment method before creating a job
 */
export async function preauthorizePayment(req: Request, res: Response) {
  // Check authentication
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const { paymentMethodId, amount, paymentType } = req.body;

  if (!paymentMethodId || !amount) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  // Log the payment type for debugging
  console.log(`Preauthorizing payment for ${paymentType} job with amount ${amount}`);

  try {
    // Get the user to check for stripe customer ID
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // First we need to verify if we need to create a Stripe customer for this user
    let customerId = user.stripeCustomerId;
    
    if (!customerId) {
      // Create a new Stripe customer for this user
      const customer = await stripe.customers.create({
        name: user.fullName || user.username,
        email: user.email || undefined,
        metadata: {
          userId: user.id.toString()
        }
      });
      
      customerId = customer.id;
      
      // Update the user with their new Stripe customer ID
      await storage.updateUser(user.id, { stripeCustomerId: customerId });
      console.log(`Created new Stripe customer for user ${user.id}: ${customerId}`);
    }

    // Get payment method details to verify it belongs to this customer
    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      
      // If the payment method is already attached to our customer, use it
      if (paymentMethod.customer === customerId) {
        console.log(`Payment method ${paymentMethodId} already attached to customer ${customerId}`);
      } 
      // If the payment method isn't attached to any customer, attach it now
      else if (!paymentMethod.customer) {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId
        });
        console.log(`Attached payment method ${paymentMethodId} to customer ${customerId}`);
      } 
      // If it's attached to a different customer, that's an error
      else {
        console.log(`Payment method ${paymentMethodId} is attached to a different customer: ${paymentMethod.customer}`);
        
        // For security, don't expose that the payment method belongs to another customer
        return res.status(400).json({ 
          message: 'This payment method cannot be used. Please select another payment method or add a new one.'
        });
      }
    } catch (err) {
      console.error('Error retrieving or attaching payment method:', err);
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    // Create a payment intent with the verified payment method
    const paymentIntentOptions: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: false,
      capture_method: 'manual', // Don't capture funds yet
      metadata: {
        userId: req.user.id.toString(),
        preauthorization: 'true',
        paymentType: paymentType || 'fixed',
      },
    };
    
    // Create the payment intent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);
    console.log(`Created payment intent ${paymentIntent.id} for customer ${customerId}`);

    // Return success since the payment method was valid
    return res.status(200).json({
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      customer: customerId
    });
  } catch (error) {
    console.error('Payment preauthorization error:', error);
    return res.status(400).json({
      message: error instanceof Error ? error.message : 'Failed to preauthorize payment',
      error: error,
    });
  }
}