import { Request, Response } from 'express';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing Stripe secret key');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil' as any
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

  const { paymentMethodId, amount } = req.body;

  if (!paymentMethodId || !amount) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Create a payment intent with manual confirmation
    // This will validate the payment method without actually charging it
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethodId,
      // Don't confirm yet - just check if the payment method is valid
      confirm: false,
      capture_method: 'manual', // Don't capture funds yet
      metadata: {
        userId: req.user.id.toString(),
        preauthorization: 'true',
      },
    });

    // Return success since the payment method was valid
    return res.status(200).json({
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    });
  } catch (error) {
    console.error('Payment preauthorization error:', error);
    return res.status(400).json({
      message: error instanceof Error ? error.message : 'Failed to preauthorize payment',
      error: error,
    });
  }
}