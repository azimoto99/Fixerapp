/**
 * Centralized Stripe API handlers
 * This file contains all Stripe related API endpoints, cleanly organized in one place
 */

import express, { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Type augmentation for express Request to include user property
declare global {
  namespace Express {
    interface User {
      id: number;
      username?: string;
      email?: string;
      fullName?: string;
      stripeConnectAccountId?: string;
      stripeConnectAccountStatus?: string;
      stripeCustomerId?: string;
      accountType?: string;
    }
  }
}

// Initialize Stripe with the secret key
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16" as any,
});

// Middleware to check if the user is authenticated for Stripe operations
function isStripeAuthenticated(req: Request, res: Response, next: Function) {
  console.log('Stripe route: User authenticated via Passport:', req.isAuthenticated() ? req.user?.id + (req.user?.username ? ` (${req.user.username})` : '') : 'false');
  
  if (!req.isAuthenticated()) {
    console.error("User not authenticated for Stripe operation");
    return res.status(401).json({ message: "Not authenticated for Stripe operations" });
  }
  
  next();
}

// Create a router for Stripe endpoints
const stripeRouter = Router();

// Authentication check for Stripe operations
stripeRouter.get("/check-auth", async (req: Request, res: Response) => {
  try {
    if (req.isAuthenticated() && req.user) {
      console.log("Checking auth status for Stripe operations");
      return res.json({ 
        authenticated: true,
        user: req.user.id
      });
    }
    
    return res.json({ authenticated: false });
  } catch (error) {
    console.error("Error checking authentication for Stripe:", error);
    return res.status(500).json({ message: "Server error checking authentication" });
  }
});

// Create a Stripe Connect Account
stripeRouter.post("/connect/create-account", isStripeAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      console.error("User not authenticated in stripe/connect/create-account");
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Get the user from the database with all fields
    const storedUser = await storage.getUser(req.user.id);
    if (!storedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if user already has a Stripe Connect account
    if (storedUser.stripeConnectAccountId) {
      console.log(`User ${req.user.id} already has Connect account: ${storedUser.stripeConnectAccountId}`);
      
      // Return existing account ID and status
      return res.status(200).json({
        message: "Connect account already exists",
        accountId: storedUser.stripeConnectAccountId,
        accountStatus: storedUser.stripeConnectAccountStatus || 'unknown'
      });
    }
    
    // Verify Stripe API is working
    try {
      await stripe.balance.retrieve();
    } catch (stripeError) {
      console.error("Stripe API connection test failed:", stripeError);
      return res.status(500).json({ message: "Stripe API connection failed" });
    }
    
    // Create a new Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      business_profile: {
        mcc: '5734', // Computer Software Stores
        url: 'https://example.com', // Replace with your platform URL
      },
      metadata: {
        userId: req.user.id.toString(),
        accountType: storedUser.accountType || 'worker',
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'manual',
          },
        },
      },
    });
    
    // Save the Connect account ID to the user
    await storage.updateUser(req.user.id, {
      stripeConnectAccountId: account.id,
      stripeConnectAccountStatus: 'pending'
    });
    
    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${req.headers.origin || process.env.APP_URL || 'http://localhost:5000'}/payment-settings?refresh=true`,
      return_url: `${req.headers.origin || process.env.APP_URL || 'http://localhost:5000'}/payment-settings?success=true`,
      type: 'account_onboarding',
    });
    
    // Return success with account link
    return res.json({
      success: true,
      accountId: account.id,
      accountStatus: 'pending',
      accountLinkUrl: accountLink.url
    });
    
  } catch (error) {
    console.error("Error creating Connect account:", error);
    return res.status(500).json({ message: "Failed to create Connect account", error: error.message });
  }
});

// Get Stripe Connect Account Status
stripeRouter.get("/connect/account-status", isStripeAuthenticated, async (req: Request, res: Response) => {
  try {
    // Check if user has a Connect account
    if (!req.user?.stripeConnectAccountId) {
      return res.status(404).json({ message: "User does not have a Connect account" });
    }
    
    // Retrieve account from Stripe
    const account = await stripe.accounts.retrieve(req.user.stripeConnectAccountId);
    
    // Generate a new account link if needed
    let accountLinkUrl;
    if (account.details_submitted === false) {
      try {
        const accountLink = await stripe.accountLinks.create({
          account: req.user.stripeConnectAccountId,
          refresh_url: `${req.headers.origin || process.env.APP_URL || 'http://localhost:5000'}/payment-settings?refresh=true`,
          return_url: `${req.headers.origin || process.env.APP_URL || 'http://localhost:5000'}/payment-settings?success=true`,
          type: 'account_onboarding',
        });
        accountLinkUrl = accountLink.url;
      } catch (err) {
        console.error("Error creating account link:", err);
      }
    }
    
    // Map Stripe account status to our internal status
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
    
    // Update user account status in database if different
    if (req.user.stripeConnectAccountStatus !== accountStatus) {
      await storage.updateUser(req.user.id, {
        stripeConnectAccountStatus: accountStatus
      });
    }
    
    // Extract and format requirements
    const requirements = account.requirements ? {
      currentlyDue: account.requirements.currently_due,
      eventuallyDue: account.requirements.eventually_due,
      pendingVerification: account.requirements.pending_verification,
    } : undefined;
    
    // Return account status
    return res.json({
      accountId: account.id,
      accountStatus,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements,
      accountLinkUrl,
    });
    
  } catch (error) {
    console.error("Error getting Connect account status:", error);
    return res.status(500).json({ message: "Failed to get Connect account status", error: error.message });
  }
});

// Create Login Link for existing Connect account
stripeRouter.post("/connect/create-login-link", isStripeAuthenticated, async (req: Request, res: Response) => {
  try {
    // Check if user has a Connect account
    if (!req.user?.stripeConnectAccountId) {
      return res.status(404).json({ message: "User does not have a Connect account" });
    }
    
    try {
      // Verify the account is valid
      const account = await stripe.accounts.retrieve(req.user.stripeConnectAccountId);
      
      // If account is not fully onboarded, create an account link instead
      if (!account.details_submitted) {
        const accountLink = await stripe.accountLinks.create({
          account: req.user.stripeConnectAccountId,
          refresh_url: `${req.headers.origin || process.env.APP_URL || 'http://localhost:5000'}/payment-settings?refresh=true`,
          return_url: `${req.headers.origin || process.env.APP_URL || 'http://localhost:5000'}/payment-settings?success=true`,
          type: 'account_onboarding',
        });
        
        return res.json({
          accountLinkUrl: accountLink.url,
          needsOnboarding: true
        });
      }
    } catch (error) {
      console.error("Error retrieving account before creating login link:", error);
      
      // If the account doesn't exist or is deleted, create a new one
      if (error.type === 'StripeInvalidRequestError' && error.param === 'account') {
        // Remove the invalid Connect account ID
        await storage.updateUser(req.user.id, {
          stripeConnectAccountId: null,
          stripeConnectAccountStatus: null
        });
        
        return res.status(404).json({
          message: "Connect account not found. Please create a new one.",
          createNew: true
        });
      }
      
      throw error; // Re-throw if it's another type of error
    }
    
    // Create a login link for the existing account
    try {
      const loginLink = await stripe.accounts.createLoginLink(
        req.user.stripeConnectAccountId
      );
      
      return res.json({
        url: loginLink.url
      });
    } catch (error) {
      console.error("Error creating login link:", error);
      
      // If we can't create a login link, try an account link as fallback
      if (error.type === 'StripeInvalidRequestError') {
        try {
          const accountLink = await stripe.accountLinks.create({
            account: req.user.stripeConnectAccountId,
            refresh_url: `${req.headers.origin || process.env.APP_URL || 'http://localhost:5000'}/payment-settings?refresh=true`,
            return_url: `${req.headers.origin || process.env.APP_URL || 'http://localhost:5000'}/payment-settings?success=true`,
            type: 'account_onboarding',
          });
          
          return res.json({
            accountLinkUrl: accountLink.url,
            fallback: true
          });
        } catch (err) {
          throw err;
        }
      }
      
      throw error;
    }
  } catch (error) {
    console.error("Error creating login link:", error);
    return res.status(500).json({ message: "Failed to create login link", error: error.message });
  }
});

// List saved payment methods for the current user
stripeRouter.get("/payment-methods", isStripeAuthenticated, async (req: Request, res: Response) => {
  try {
    // Check if user has a Stripe customer ID
    if (!req.user.stripeCustomerId) {
      return res.status(200).json([]);
    }
    
    // Get payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: req.user.stripeCustomerId,
      type: 'card',
    });
    
    return res.json(paymentMethods.data);
  } catch (error) {
    console.error("Error listing payment methods:", error);
    return res.status(500).json({ message: "Failed to list payment methods", error: error.message });
  }
});

// Set default payment method for user
stripeRouter.post("/payment-methods/:id/set-default", isStripeAuthenticated, async (req: Request, res: Response) => {
  try {
    // Check if user has a Stripe customer ID
    if (!req.user.stripeCustomerId) {
      return res.status(404).json({ message: "User does not have a Stripe customer account" });
    }
    
    // Get payment method ID from URL
    const { id } = req.params;
    
    // Update customer default payment method
    const customer = await stripe.customers.update({
      id: req.user.stripeCustomerId,
      invoice_settings: {
        default_payment_method: id,
      },
    });
    
    return res.json({ success: true });
  } catch (error) {
    console.error("Error setting default payment method:", error);
    return res.status(500).json({ message: "Failed to set default payment method", error: error.message });
  }
});

// Delete a payment method
stripeRouter.delete("/payment-methods/:id", isStripeAuthenticated, async (req: Request, res: Response) => {
  try {
    // Get payment method ID from URL
    const { id } = req.params;
    
    // Detach the payment method from the customer
    const paymentMethod = await stripe.paymentMethods.detach(id);
    
    return res.json(paymentMethod);
  } catch (error) {
    console.error("Error deleting payment method:", error);
    return res.status(500).json({ message: "Failed to delete payment method", error: error.message });
  }
});

// Create a setup intent for adding a new payment method
stripeRouter.post("/create-setup-intent", isStripeAuthenticated, async (req: Request, res: Response) => {
  try {
    // Check if user already has a Stripe customer ID
    let customerId = req.user.stripeCustomerId;
    
    // If not, create a new customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.fullName || req.user.username,
        metadata: {
          userId: req.user.id.toString(),
        },
      });
      
      customerId = customer.id;
      
      // Save the customer ID to the user
      await storage.updateUser(req.user.id, { stripeCustomerId: customerId });
    }
    
    // Create a setup intent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session', // Allow using the payment method without the customer present
    });
    
    return res.json({
      clientSecret: setupIntent.client_secret,
    });
  } catch (error) {
    console.error("Error creating setup intent:", error);
    return res.status(500).json({ message: "Failed to create setup intent", error: error.message });
  }
});

// Create a payment intent for processing a payment
stripeRouter.post("/create-payment-intent", isStripeAuthenticated, async (req: Request, res: Response) => {
  try {
    // Validate request
    const schema = z.object({
      amount: z.number().min(0.5, "Minimum amount is $0.50"),
      jobId: z.number().optional(),
      workerId: z.number().optional(),
      description: z.string().optional(),
      paymentMethodId: z.string().optional(),
      savePaymentMethod: z.boolean().optional().default(false),
    });
    
    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: "Invalid request data", 
        errors: validation.error.errors 
      });
    }
    
    const { 
      amount, 
      jobId, 
      workerId, 
      description, 
      paymentMethodId, 
      savePaymentMethod 
    } = validation.data;
    
    // Check if user already has a Stripe customer ID
    let customerId = req.user.stripeCustomerId;
    
    // If not, create a new customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.fullName || req.user.username,
        metadata: {
          userId: req.user.id.toString(),
        },
      });
      
      customerId = customer.id;
      
      // Save the customer ID to the user
      await storage.updateUser(req.user.id, { stripeCustomerId: customerId });
    }
    
    // Create payment intent options
    const paymentIntentOptions: any = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      metadata: {
        userId: req.user.id.toString(),
        jobId: jobId?.toString(),
        workerId: workerId?.toString(),
        description: description || '',
        savePaymentMethod: savePaymentMethod ? 'true' : 'false',
      },
      description: description || `Payment for ${jobId ? `job #${jobId}` : 'service'}`,
    };
    
    // If a payment method ID is provided, attach it to the payment intent
    if (paymentMethodId) {
      paymentIntentOptions.payment_method = paymentMethodId;
    }
    
    // If we should save the payment method for future use
    if (savePaymentMethod) {
      paymentIntentOptions.setup_future_usage = 'off_session';
    }
    
    // Create the payment intent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);
    
    // Create a payment record in our database
    const payment = await storage.createPayment({
      userId: req.user.id,
      amount,
      jobId,
      workerId,
      description: description || `Payment for ${jobId ? `job #${jobId}` : 'service'}`,
      status: 'pending',
      type: 'payment',
      paymentMethod: 'stripe',
      stripePaymentIntentId: paymentIntent.id,
      metadata: {
        paymentIntentId: paymentIntent.id,
        savePaymentMethod: savePaymentMethod ? 'true' : 'false',
      }
    });
    
    return res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return res.status(500).json({ message: "Failed to create payment intent", error: error.message });
  }
});

// Confirm a payment was successful and update our records
stripeRouter.post("/confirm-payment", isStripeAuthenticated, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      paymentIntentId: z.string(),
    });
    
    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: "Invalid request data", 
        errors: validation.error.errors 
      });
    }
    
    const { paymentIntentId } = validation.data;
    
    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // Check if the payment intent belongs to this user
    if (paymentIntent.metadata.userId !== req.user.id.toString()) {
      return res.status(403).json({ message: "You do not have permission to access this payment" });
    }
    
    // Check if payment was successful
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        message: "Payment has not succeeded", 
        status: paymentIntent.status 
      });
    }
    
    // Find our internal payment record
    const payment = await storage.getPaymentByTransactionId(paymentIntentId);
    
    if (!payment) {
      return res.status(404).json({ message: "Payment record not found" });
    }
    
    // Update our payment record if needed
    if (payment.status !== 'completed') {
      await storage.updatePaymentStatus(payment.id, 'completed', paymentIntentId);
      
      // If this payment is associated with a job, update the job status
      if (payment.jobId) {
        // Update job payment status
        // Implementation depends on your job model
      }
      
      // If this payment is for a worker, create an earning record
      if (payment.workerId) {
        // Create earning record for the worker
        // Implementation depends on your earning model
      }
    }
    
    return res.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        status: 'completed',
        description: payment.description,
      }
    });
  } catch (error) {
    console.error("Error confirming payment:", error);
    return res.status(500).json({ message: "Failed to confirm payment", error: error.message });
  }
});

// Export the router
// Helper functions to centralize Stripe customer creation and updates
export async function getOrCreateStripeCustomer(userId: number): Promise<string> {
  try {
    // Get user from database
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }
    
    // If user already has a Stripe customer ID, return it
    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }
    
    // Create a new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.fullName || user.username,
      metadata: {
        userId: userId.toString(),
        platform: "Fixer"
      }
    });
    
    // Save customer ID to user record
    await storage.updateUser(userId, {
      stripeCustomerId: customer.id
    });
    
    return customer.id;
  } catch (error) {
    console.error("Error creating Stripe customer:", error);
    throw error;
  }
}

export async function updateUserStripeInfo(userId: number, data: {
  stripeCustomerId?: string;
  stripeConnectAccountId?: string;
  stripeConnectAccountStatus?: string;
}): Promise<typeof import("@shared/schema").users.$inferSelect | undefined> {
  return storage.updateUser(userId, data);
}

export default stripeRouter;