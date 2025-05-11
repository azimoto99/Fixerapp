/**
 * Stripe Payment Methods API
 * 
 * This file handles the management of Stripe payment methods
 * including listing, creating, deleting, and setting default payment methods.
 */

import { Router, Request, Response } from 'express';
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

// Authentication middleware
function isStripeAuthenticated(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated for Stripe operations" });
  }
  next();
}

// Create a router for payment methods
const paymentMethodsRouter = Router();

/**
 * Get all payment methods for the authenticated user
 */
paymentMethodsRouter.get("/", isStripeAuthenticated, async (req: Request, res: Response) => {
  try {
    // Check if user has a Stripe customer ID
    if (!req.user?.stripeCustomerId) {
      // No customer ID means no payment methods yet
      return res.json({ paymentMethods: [] });
    }
    
    // Retrieve all payment methods for the customer from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: req.user.stripeCustomerId,
      type: 'card',
    });
    
    // Get the customer to find the default payment method
    const customer = await stripe.customers.retrieve(req.user.stripeCustomerId);
    let defaultPaymentMethodId = null;
    
    if (customer && !customer.deleted && 'invoice_settings' in customer) {
      defaultPaymentMethodId = customer.invoice_settings?.default_payment_method || null;
    }
    
    // Return the payment methods with the default marked
    return res.json({
      paymentMethods: paymentMethods.data.map(pm => ({
        ...pm,
        isDefault: pm.id === defaultPaymentMethodId,
      })),
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return res.status(500).json({
      message: 'Failed to fetch payment methods',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Delete a payment method
 */
paymentMethodsRouter.delete("/:id", isStripeAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: "Payment method ID is required" });
    }
    
    // Check if user has a Stripe customer ID
    if (!req.user?.stripeCustomerId) {
      return res.status(400).json({ message: "No customer profile found" });
    }
    
    // Retrieve the payment method to verify it belongs to the customer
    const paymentMethod = await stripe.paymentMethods.retrieve(id);
    
    if (paymentMethod.customer !== req.user.stripeCustomerId) {
      return res.status(403).json({ message: "Payment method does not belong to this customer" });
    }
    
    // Detach the payment method from the customer
    await stripe.paymentMethods.detach(id);
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return res.status(500).json({
      message: 'Failed to delete payment method',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Set a payment method as default
 */
paymentMethodsRouter.post("/:id/set-default", isStripeAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: "Payment method ID is required" });
    }
    
    // Check if user has a Stripe customer ID
    if (!req.user?.stripeCustomerId) {
      return res.status(400).json({ message: "No customer profile found" });
    }
    
    // Retrieve the payment method to verify it belongs to the customer
    const paymentMethod = await stripe.paymentMethods.retrieve(id);
    
    if (paymentMethod.customer !== req.user.stripeCustomerId) {
      return res.status(403).json({ message: "Payment method does not belong to this customer" });
    }
    
    // Update the customer's default payment method
    await stripe.customers.update(req.user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: id,
      },
    });
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error setting default payment method:', error);
    return res.status(500).json({
      message: 'Failed to set default payment method',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Create a SetupIntent for adding a new payment method
 * This route is already implemented in the main Stripe API router
 * but it's good to keep it here for clarity
 */
paymentMethodsRouter.post("/create-setup-intent", isStripeAuthenticated, async (req: Request, res: Response) => {
  try {
    // Get or create a Stripe customer
    const customerId = await getOrCreateStripeCustomer(req.user!.id);
    
    // Create a setup intent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
    });
    
    return res.json({
      clientSecret: setupIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating setup intent:', error);
    return res.status(500).json({
      message: 'Failed to create setup intent',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default paymentMethodsRouter;