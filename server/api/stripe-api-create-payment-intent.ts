/**
 * This file contains the improved implementation of the create-payment-intent endpoint
 * using centralized helper functions.
 */

import express, { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';
import { z } from 'zod';
import { getOrCreateStripeCustomer } from './stripe-api';

// Initialize Stripe with the secret key
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16" as any,
});

// Middleware to check if the user is authenticated for Stripe operations
function isStripeAuthenticated(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated for Stripe operations" });
  }
  next();
}

// Create a router for the create-payment-intent endpoint
const createPaymentIntentRouter = Router();

// Create a payment intent for a new transaction
createPaymentIntentRouter.post("/create-payment-intent", isStripeAuthenticated, async (req: Request, res: Response) => {
  try {
    // Validate request
    const schema = z.object({
      amount: z.number().min(0.5, "Minimum amount is $0.50"),
      jobId: z.number().optional(),
      workerId: z.number().optional(),
      description: z.string().optional(),
      paymentMethodId: z.string().optional(),
    });
    
    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: "Invalid request data", 
        errors: validation.error.errors 
      });
    }
    
    const { amount, jobId, workerId, description, paymentMethodId } = validation.data;
    
    // Make sure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    // Get or create the Stripe customer using our helper function
    const customerId = await getOrCreateStripeCustomer(req.user.id);
    
    // Create a payment intent with automatic payment methods
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      setup_future_usage: 'off_session',
      metadata: {
        userId: req.user.id.toString(),
        jobId: jobId ? jobId.toString() : '',
        workerId: workerId ? workerId.toString() : '',
        description: description || 'Payment for services',
      },
      confirm: Boolean(paymentMethodId),
      ...(paymentMethodId ? {} : { automatic_payment_methods: { enabled: true } })
    });
    
    // Create a payment record in our database
    const payment = await storage.createPayment({
      userId: req.user.id,
      amount: amount,
      type: 'charge',
      status: 'pending',
      jobId: jobId || null,
      description: description || null,
      paymentMethod: paymentMethodId ? 'card' : null,
      transactionId: paymentIntent.id,
      metadata: {
        workerId: workerId || null
      }
    });
    
    // Return the client secret and payment ID
    return res.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
      status: paymentIntent.status
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return res.status(500).json({ 
      message: 'Failed to create payment intent', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default createPaymentIntentRouter;