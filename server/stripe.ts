import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { storage } from './storage';
import { User } from '@shared/schema';

// Declare the user type extension for Express Request
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required environment variable: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Authentication middleware for Stripe routes
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized - Please login again" });
  }
  
  next();
};

export const setupStripeRoutes = (router: Router) => {
  // Basic authentication check for client-side Stripe operations
  router.get("/stripe/check-auth", async (req: Request, res: Response) => {
    if (req.isAuthenticated() && req.user) {
      return res.status(200).json({ authenticated: true, user: req.user.id });
    }
    
    // Check for backup user ID in session
    if (req.session?.userId) {
      try {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          req.login(user, (err) => {
            if (err) {
              console.error("Error restoring session:", err);
              return res.status(500).json({ message: "Session restoration failed" });
            }
            return res.status(200).json({ authenticated: true, user: user.id, restored: true });
          });
          return;
        }
      } catch (err) {
        console.error("Error checking backup userId:", err);
      }
    }
    
    return res.status(401).json({ authenticated: false, message: "Not authenticated" });
  });

  // Payment Intent creation for job payments
  router.post("/stripe/create-payment-intent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { jobId, amount } = req.body;
      
      if (!jobId) {
        return res.status(400).json({ message: "Job ID is required" });
      }

      // Get the job to check if it exists and get details
      const job = await storage.getJob(Number(jobId));
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Validate the user is authorized to make payment for this job
      if (job.posterId !== req.user.id) {
        return res.status(403).json({ 
          message: "You are not authorized to make payment for this job" 
        });
      }

      // Create or use existing customer
      let customerId = req.user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: req.user.email,
          name: req.user.fullName,
          metadata: {
            userId: req.user.id.toString()
          }
        });
        
        customerId = customer.id;
        
        // Update user with Stripe customer ID
        await storage.updateUser(req.user.id, { 
          stripeCustomerId: customerId 
        });
      }
      
      // Check if there's an existing payment for this job
      const payments = await storage.getPaymentsForUser(req.user.id);
      const existingPayment = payments.find(p => 
        p.jobId === job.id && 
        p.status !== 'failed' && 
        p.type === 'job_payment'
      );
      
      if (existingPayment && existingPayment.status === 'completed') {
        return res.status(400).json({ 
          message: "Payment for this job has already been completed" 
        });
      }
      
      // If there's a pending payment with a transaction ID, retrieve it
      let existingPaymentIntent;
      if (existingPayment && existingPayment.transactionId) {
        try {
          existingPaymentIntent = await stripe.paymentIntents.retrieve(existingPayment.transactionId);
          
          // If the payment intent is not in a terminal state, return it
          if (
            existingPaymentIntent.status !== 'succeeded' && 
            existingPaymentIntent.status !== 'canceled'
          ) {
            return res.json({ 
              clientSecret: existingPaymentIntent.client_secret,
              paymentId: existingPayment.id,
              existing: true
            });
          }
        } catch (err) {
          console.error('Error retrieving existing payment intent:', err);
          // Continue with creating a new payment intent if retrieval fails
        }
      }
      
      // Create a new payment intent
      const actualAmount = amount || job.totalAmount;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(actualAmount * 100), // Convert to cents
        currency: 'usd',
        customer: customerId,
        metadata: {
          jobId: job.id.toString(),
          userId: req.user.id.toString(),
          jobTitle: job.title
        }
      });
      
      // Create or update a payment record in our database
      let payment;
      if (existingPayment) {
        payment = await storage.updatePaymentStatus(
          existingPayment.id, 
          'pending', 
          paymentIntent.id
        );
      } else {
        payment = await storage.createPayment({
          userId: req.user.id,
          amount: actualAmount,
          type: 'job_payment',
          status: 'pending',
          paymentMethod: 'stripe',
          transactionId: paymentIntent.id,
          jobId: job.id,
          description: `Payment for job: ${job.title}`,
          metadata: { clientSecret: paymentIntent.client_secret }
        });
      }
      
      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentId: payment.id
      });
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Confirm payment after client-side confirmation
  router.post("/stripe/confirm-payment", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ message: "Payment intent ID is required" });
      }
      
      // Retrieve the payment intent to confirm it was successful
      const confirmedPaymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (confirmedPaymentIntent.status !== 'succeeded') {
        return res.status(400).json({ 
          message: "Payment has not been completed",
          status: confirmedPaymentIntent.status
        });
      }
      
      // Get our payment record
      const payment = await storage.getPaymentByTransactionId(paymentIntentId);
      
      if (!payment) {
        return res.status(404).json({ message: "Payment record not found" });
      }
      
      // Ensure the user owns this payment
      if (payment.userId !== req.user.id) {
        return res.status(403).json({ 
          message: "You are not authorized to confirm this payment" 
        });
      }
      
      // Update payment status in our database
      const updatedPayment = await storage.updatePaymentStatus(
        payment.id, 
        'completed'
      );
      
      // If job exists, update job status
      if (payment.jobId) {
        const job = await storage.getJob(payment.jobId);
        
        if (job) {
          // If job is not assigned yet, keep it as open
          // If job is assigned, update it to "in progress"
          if (job.status === 'assigned') {
            await storage.updateJob(job.id, { status: 'in_progress' });
          }
          
          // If worker is assigned, create an earning record for them
          if (job.workerId) {
            const serviceFee = job.serviceFee || 2.5;
            const netAmount = job.paymentAmount - serviceFee;
            
            await storage.createEarning({
              jobId: job.id,
              workerId: job.workerId,
              amount: job.paymentAmount,
              serviceFee: serviceFee,
              netAmount: netAmount,
              status: 'pending'
            });
          }
        }
      }
      
      res.json({ 
        success: true, 
        payment: updatedPayment 
      });
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get payment statistics for the dashboard
  router.get("/stripe/payment-stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get all payments for the user
      const payments = await storage.getPaymentsForUser(req.user.id);
      
      // Calculate total spent (outgoing payments)
      const totalSpent = payments
        .filter(p => p.type === 'job_payment' && p.status === 'completed')
        .reduce((sum, payment) => sum + payment.amount, 0);
      
      // For workers, calculate total earned and pending payouts
      let totalEarned = 0;
      let pendingPayouts = 0;
      
      if (req.user.accountType === 'worker') {
        const earnings = await storage.getEarningsForWorker(req.user.id);
        
        totalEarned = earnings
          .filter(e => e.status === 'paid')
          .reduce((sum, earning) => sum + earning.netAmount, 0);
        
        pendingPayouts = earnings
          .filter(e => e.status === 'pending')
          .reduce((sum, earning) => sum + earning.netAmount, 0);
      }
      
      // Calculate upcoming payments (pending outgoing payments)
      const upcomingPayments = payments
        .filter(p => p.type === 'job_payment' && p.status === 'pending')
        .reduce((sum, payment) => sum + payment.amount, 0);
      
      res.json({
        totalEarned,
        totalSpent,
        pendingPayouts,
        upcomingPayments
      });
    } catch (error: any) {
      console.error('Error fetching payment stats:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get recent payment activity
  router.get("/stripe/payment-activity", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      
      // Get all payments for the user
      const payments = await storage.getPaymentsForUser(userId);
      
      // For workers, also get earnings
      let earnings: any[] = [];
      if (req.user.accountType === 'worker') {
        earnings = await storage.getEarningsForWorker(userId);
      }
      
      // Format payments for display
      const formattedPayments = await Promise.all(payments.map(async (payment) => {
        let jobTitle = '';
        
        if (payment.jobId) {
          const job = await storage.getJob(payment.jobId);
          if (job) {
            jobTitle = job.title;
          }
        }
        
        return {
          id: payment.id,
          amount: payment.amount,
          type: payment.type,
          status: payment.status,
          description: payment.description,
          createdAt: payment.createdAt,
          jobId: payment.jobId,
          jobTitle
        };
      }));
      
      // Format earnings for display
      const formattedEarnings = await Promise.all(earnings.map(async (earning) => {
        let jobTitle = '';
        
        if (earning.jobId) {
          const job = await storage.getJob(earning.jobId);
          if (job) {
            jobTitle = job.title;
          }
        }
        
        return {
          id: `earning-${earning.id}`,
          amount: earning.netAmount,
          type: 'payout',
          status: earning.status === 'paid' ? 'completed' : earning.status,
          description: `Earnings for job #${earning.jobId}`,
          createdAt: earning.dateEarned,
          jobId: earning.jobId,
          jobTitle
        };
      }));
      
      // Combine and sort by date
      const activities = [...formattedPayments, ...formattedEarnings].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      // Limit to most recent 10 activities
      res.json(activities.slice(0, 10));
    } catch (error: any) {
      console.error('Error fetching payment activity:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Payment methods endpoints
  router.get("/stripe/payment-methods", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user.stripeCustomerId) {
        return res.json([]);
      }
      
      // Get customer's default payment method
      const customer = await stripe.customers.retrieve(req.user.stripeCustomerId, {
        expand: ['invoice_settings.default_payment_method']
      });
      
      const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;
      
      // Get all payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        customer: req.user.stripeCustomerId,
        type: 'card',
      });
      
      // Add isDefault flag to each payment method
      const result = paymentMethods.data.map(pm => ({
        ...pm,
        isDefault: pm.id === defaultPaymentMethodId
      }));
      
      res.json(result);
    } catch (error: any) {
      console.error('Error fetching payment methods:', error);
      res.status(500).json({ message: error.message });
    }
  });

  router.post("/stripe/payment-methods/setup", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { paymentMethodId } = req.body;
      
      if (!paymentMethodId) {
        return res.status(400).json({ message: "Payment method ID is required" });
      }
      
      // Get or create customer ID
      let customerId = req.user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: req.user.email,
          name: req.user.fullName,
          metadata: {
            userId: req.user.id.toString()
          }
        });
        
        customerId = customer.id;
        
        // Update user with Stripe customer ID
        await storage.updateUser(req.user.id, { 
          stripeCustomerId: customerId 
        });
      }
      
      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      
      // If this is the first payment method, set as default
      const methods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
      
      if (methods.data.length === 1) {
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error setting up payment method:', error);
      res.status(500).json({ message: error.message });
    }
  });

  router.post("/stripe/payment-methods/:id/set-default", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const paymentMethodId = req.params.id;
      
      if (!req.user.stripeCustomerId) {
        return res.status(400).json({ message: "No Stripe customer ID found" });
      }
      
      // Update the customer's default payment method
      await stripe.customers.update(req.user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error setting default payment method:', error);
      res.status(500).json({ message: error.message });
    }
  });

  router.delete("/stripe/payment-methods/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const paymentMethodId = req.params.id;
      
      if (!req.user.stripeCustomerId) {
        return res.status(400).json({ message: "No Stripe customer ID found" });
      }
      
      // Get customer's current default payment method
      const customer = await stripe.customers.retrieve(req.user.stripeCustomerId, {
        expand: ['invoice_settings.default_payment_method']
      });
      
      const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;
      
      // Don't allow deleting the default payment method
      if (paymentMethodId === defaultPaymentMethodId) {
        return res.status(400).json({ 
          message: "Cannot delete default payment method. Set a different default first." 
        });
      }
      
      // Detach the payment method from the customer
      await stripe.paymentMethods.detach(paymentMethodId);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting payment method:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Connect Account endpoints
  router.get("/stripe/connect/account-status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user.stripeConnectAccountId) {
        return res.json({
          accountId: null,
          status: null,
          detailsSubmitted: false,
          payoutsEnabled: false,
          chargesEnabled: false,
          requiresAction: false
        });
      }
      
      const account = await stripe.accounts.retrieve(req.user.stripeConnectAccountId);
      
      res.json({
        accountId: account.id,
        status: account.details_submitted ? (account.payouts_enabled ? 'active' : 'pending') : 'incomplete',
        detailsSubmitted: account.details_submitted,
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        termsAccepted: req.user.stripeTermsAccepted || false,
        bankingDetailsComplete: req.user.stripeBankingDetailsComplete || false,
        representativeDetailsComplete: req.user.stripeRepresentativeRequirementsComplete || false,
        requiresAction: account.requirements?.currently_due?.length > 0,
        actionUrl: account.requirements?.currently_due?.length > 0 ? `/api/stripe/connect/get-account-link` : undefined
      });
    } catch (error: any) {
      console.error('Error getting Connect account status:', error);
      
      if (error.code === 'account_invalid') {
        // Account no longer exists, clear it from our user record
        await storage.updateUser(req.user.id, { 
          stripeConnectAccountId: null,
          stripeConnectAccountStatus: null
        });
        
        return res.json({
          accountId: null,
          status: null,
          detailsSubmitted: false,
          payoutsEnabled: false,
          chargesEnabled: false,
          requiresAction: false
        });
      }
      
      res.status(500).json({ message: error.message });
    }
  });

  router.post("/stripe/connect/create-account", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Check if the user already has a Connect account
      if (req.user.stripeConnectAccountId) {
        return res.status(400).json({ 
          message: "You already have a Stripe Connect account" 
        });
      }
      
      // Create Connect account
      const account = await stripe.accounts.create({
        type: 'express',
        email: req.user.email,
        business_type: 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          userId: req.user.id.toString()
        }
      });
      
      // Update user record with the Connect account ID
      await storage.updateUser(req.user.id, {
        stripeConnectAccountId: account.id,
        stripeConnectAccountStatus: 'created'
      });
      
      res.json({ accountId: account.id });
    } catch (error: any) {
      console.error('Error creating Connect account:', error);
      res.status(500).json({ message: error.message });
    }
  });

  router.post("/stripe/connect/accept-terms", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { termsAccepted } = req.body;
      
      if (!termsAccepted) {
        return res.status(400).json({ message: "Terms must be accepted" });
      }
      
      // Update user record with terms acceptance
      await storage.updateUser(req.user.id, {
        stripeTermsAccepted: true,
        stripeTermsAcceptedAt: new Date()
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error accepting terms:', error);
      res.status(500).json({ message: error.message });
    }
  });

  router.post("/stripe/connect/update-representative", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { name, title } = req.body;
      
      if (!name || !title) {
        return res.status(400).json({ 
          message: "Representative name and title are required" 
        });
      }
      
      // Update user record with representative details
      await storage.updateUser(req.user.id, {
        stripeRepresentativeName: name,
        stripeRepresentativeTitle: title,
        stripeRepresentativeRequirementsComplete: true
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating representative details:', error);
      res.status(500).json({ message: error.message });
    }
  });

  router.post("/stripe/connect/get-account-link", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user.stripeConnectAccountId) {
        return res.status(400).json({ 
          message: "No Stripe Connect account found" 
        });
      }
      
      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: req.user.stripeConnectAccountId,
        refresh_url: `${process.env.APP_URL || req.headers.origin}/payments?refresh=true`,
        return_url: `${process.env.APP_URL || req.headers.origin}/payments?success=true`,
        type: 'account_onboarding',
      });
      
      // Update user record with banking details complete flag
      await storage.updateUser(req.user.id, {
        stripeBankingDetailsComplete: true
      });
      
      res.json({ url: accountLink.url });
    } catch (error: any) {
      console.error('Error getting account link:', error);
      res.status(500).json({ message: error.message });
    }
  });

  return router;
};