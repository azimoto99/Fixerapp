import { Request, Response, Router } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { storage } from '../storage';
import { isAuthenticated } from '../auth';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required environment variable: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

const router = Router();

// Create a payment intent
router.post('/create-payment-intent', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Validate the request body
    const schema = z.object({
      amount: z.number().min(0.5, "Minimum amount is $0.50"),
      description: z.string().optional(),
      metadata: z.record(z.string()).optional(),
      return_url: z.string().url("Invalid return URL").optional()
    });
    
    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: "Invalid request data", 
        errors: validation.error.errors 
      });
    }
    
    const { amount, description, metadata = {}, return_url } = validation.data;
    
    // Get or create customer ID
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    let customerId = user.stripeCustomerId;
    
    if (!customerId) {
      // Create a customer for this user
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
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      metadata: {
        userId: req.user.id.toString(),
        ...metadata
      },
      description: description || 'Payment for services',
      automatic_payment_methods: {
        enabled: true
      },
      ...(return_url && { confirmation_method: 'automatic', return_url })
    });
    
    // Record the payment intent in our database for later reference
    const payment = await storage.createPayment({
      userId: req.user.id,
      amount,
      status: 'pending',
      type: 'payment',
      description: description || 'Payment for services',
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: customerId,
      metadata: metadata
    });
    
    // Return the client secret and payment ID
    return res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      paymentId: payment.id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return res.status(500).json({ 
      message: 'Failed to create payment intent', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;