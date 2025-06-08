import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { storage } from "../storage";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Helper function to get or create a Stripe customer
export async function getOrCreateStripeCustomer(userId: number): Promise<string> {
  try {
    const user = await storage.getUser(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    // If user already has a Stripe customer ID, return it
    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    // Create a new customer
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      name: user.fullName || user.username,
      metadata: {
        userId: user.id.toString(),
      },
    });

    // Save the customer ID to the user record
    await storage.updateUser(user.id, { stripeCustomerId: customer.id });
    
    return customer.id;
  } catch (error) {
    console.error('Error in getOrCreateStripeCustomer:', error);
    throw error;
  }
}

export const stripeRouter = Router();

// Middleware to check if user is authenticated for Stripe operations
stripeRouter.use((req, res, next) => {
  if (req.isAuthenticated()) {
    console.log('Stripe route: User authenticated via Passport:', req.user?.id);
    next();
  } else {
    res.status(401).json({ message: 'Authentication required for Stripe operations' });
  }
});

// Check auth status
stripeRouter.get('/check-auth', (req, res) => {
  res.json({ authenticated: true, user: req.user?.id });
});

// Create a payment intent
stripeRouter.post('/create-payment-intent', async (req, res) => {
  try {
    // Accept `amount` or fallback to `payAmount` for backward compatibility
    const { jobId, useExistingCard = false, paymentMethodId } = req.body;
    const payAmount = typeof req.body.amount === 'number' ? req.body.amount : req.body.payAmount;
    if (!jobId || payAmount === undefined) {
      return res.status(400).json({ message: 'Missing required parameters: jobId and amount' });
    }

    // Get job details
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if user is the job poster
    if (job.posterId !== req.user?.id) {
      return res.status(403).json({ message: 'Only the job poster can make payments' });
    }

    // Create a customer if this is their first payment and they don't have one
    let customerId: string | undefined;
    const user = await storage.getUser(req.user?.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.stripeCustomerId) {
      // Create a new customer
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.fullName || user.username,
        metadata: {
          userId: user.id.toString(),
        },
      });

      // Save the customer ID to the user record
      await storage.updateUser(user.id, { stripeCustomerId: customer.id });
      customerId = customer.id;
    } else {
      customerId = user.stripeCustomerId;
    }

    // Create the payment intent with appropriate options
    const paymentIntentOptions: any = {
      amount: Math.round(payAmount * 100), // Convert dollars to cents
      currency: 'usd',
      customer: customerId,
      metadata: {
        jobId: jobId.toString(),
        userId: req.user?.id.toString(),
        paymentType: 'job_payment',
      }
    };
    
    // If using an existing card
    if (useExistingCard && paymentMethodId) {
      paymentIntentOptions.payment_method = paymentMethodId;
      paymentIntentOptions.confirm = true;
      paymentIntentOptions.off_session = true;
    } else {
      paymentIntentOptions.automatic_payment_methods = { enabled: true };
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);

    // Create a payment record in the database
    await storage.createPayment({
      userId: req.user?.id,
      amount: payAmount,
      status: 'pending',
      jobId,
      transactionId: paymentIntent.id,
      paymentMethod: 'credit_card',
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ message: 'Failed to create payment intent', error: error.message });
  }
});

// Setup intent for saving a card
stripeRouter.post('/create-setup-intent', async (req, res) => {
  try {
    const user = await storage.getUser(req.user?.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create or retrieve a customer
    let customerId: string;
    
    if (!user.stripeCustomerId) {
      // Create a new customer
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.fullName || user.username,
        metadata: {
          userId: user.id.toString(),
        },
      });

      // Save the customer ID to the user record
      await storage.updateUser(user.id, { stripeCustomerId: customer.id });
      customerId = customer.id;
    } else {
      customerId = user.stripeCustomerId;
    }

    // Create a setup intent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session', // Allow future usage
    });

    res.json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    });
  } catch (error: any) {
    console.error('Error creating setup intent:', error);
    res.status(500).json({ message: 'Failed to create setup intent', error: error.message });
  }
});

// Get all payment methods for a user
stripeRouter.get('/payment-methods', async (req, res) => {
  try {
    const user = await storage.getUser(req.user?.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.stripeCustomerId) {
      return res.json([]);
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    });

    res.json(paymentMethods.data);
  } catch (error: any) {
    console.error('Error retrieving payment methods:', error);
    res.status(500).json({ message: 'Failed to retrieve payment methods', error: error.message });
  }
});

// Delete a payment method
stripeRouter.delete('/payment-methods/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await storage.getUser(req.user?.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.stripeCustomerId) {
      return res.status(404).json({ message: 'No customer record found' });
    }

    // Verify the payment method belongs to the user
    const paymentMethod = await stripe.paymentMethods.retrieve(id);
    
    if (paymentMethod.customer !== user.stripeCustomerId) {
      return res.status(403).json({ message: 'Payment method does not belong to this user' });
    }

    // Check if this is the default payment method
    const customer = await stripe.customers.retrieve(user.stripeCustomerId);
    
    if (customer && 'invoice_settings' in customer && 
        customer.invoice_settings.default_payment_method === id) {
      // Detach first, then update customer to avoid errors
      await stripe.paymentMethods.detach(id);
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: '',
        },
      });
    } else {
      // Just detach the payment method
      await stripe.paymentMethods.detach(id);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({ message: 'Failed to delete payment method', error: error.message });
  }
});

// Set default payment method
stripeRouter.post('/payment-methods/:id/set-default', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await storage.getUser(req.user?.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.stripeCustomerId) {
      return res.status(404).json({ message: 'No customer record found' });
    }

    // Verify the payment method belongs to the user
    const paymentMethod = await stripe.paymentMethods.retrieve(id);
    
    if (paymentMethod.customer !== user.stripeCustomerId) {
      return res.status(403).json({ message: 'Payment method does not belong to this user' });
    }

    // Update the customer's default payment method
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: id,
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error setting default payment method:', error);
    res.status(500).json({ message: 'Failed to set default payment method', error: error.message });
  }
});

// Connect account API endpoints - status, create, and update
stripeRouter.get('/connect/account-status', async (req, res) => {
  try {
    const user = await storage.getUser(req.user?.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has a Connect account
    if (!user.stripeConnectAccountId) {
      return res.json({ exists: false, message: 'No Connect account found for this user' });
    }

    try {
      // Get account details
      const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
      
      // Create account link URL for incomplete accounts
      let accountLinkUrl = null;
      if (!account.details_submitted || !account.payouts_enabled) {
        const accountLink = await stripe.accountLinks.create({
          account: user.stripeConnectAccountId,
          refresh_url: `${req.protocol}://${req.get('host')}/stripe-connect-refresh`,
          return_url: `${req.protocol}://${req.get('host')}/stripe-connect-return`,
          type: 'account_onboarding',
        });
        accountLinkUrl = accountLink.url;
      }

      return res.json({
        exists: true,
        accountId: account.id,
        accountStatus: account.details_submitted 
          ? account.payouts_enabled 
            ? 'active' 
            : 'pending' 
          : 'incomplete',
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        accountLinkUrl,
        requirements: {
          currentlyDue: account.requirements?.currently_due || [],
          eventuallyDue: account.requirements?.eventually_due || [],
          pendingVerification: account.requirements?.pending_verification || [],
        }
      });
    } catch (accountError: any) {
      // Handle the case where the account was deleted in Stripe but not in our DB
      if (accountError.code === 'resource_missing') {
        return res.json({ 
          exists: false, 
          message: 'Connect account not found in Stripe. Please create a new account.' 
        });
      }
      throw accountError;
    }
  } catch (error: any) {
    console.error('Error checking Connect account status:', error);
    res.status(500).json({ message: 'Failed to check Connect account status', error: error.message });
  }
});

// Create a Connect account
stripeRouter.post('/connect/create-account', async (req, res) => {
  try {
    const user = await storage.getUser(req.user?.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already has a Connect account
    if (user.stripeConnectAccountId) {
      // If they have an account, just return the account link
      try {
        const accountLink = await stripe.accountLinks.create({
          account: user.stripeConnectAccountId,
          refresh_url: `${req.protocol}://${req.get('host')}/stripe-connect-refresh`,
          return_url: `${req.protocol}://${req.get('host')}/stripe-connect-return`,
          type: 'account_onboarding',
        });
        
        return res.json({ 
          accountId: user.stripeConnectAccountId,
          accountLinkUrl: accountLink.url 
        });
      } catch (accountError: any) {
        // If the account doesn't exist in Stripe (but does in our DB), create a new one
        if (accountError.code !== 'resource_missing') {
          throw accountError;
        }
        // Continue with account creation if account is missing
      }
    }

    // Create a Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: user.email || undefined,
      business_type: 'individual',
      business_profile: {
        url: `${req.protocol}://${req.get('host')}/profile/${user.username}`,
      },
      metadata: {
        userId: user.id.toString(),
      },
      capabilities: {
        transfers: {
          requested: true,
        },
        card_payments: {
          requested: true,
        },
      },
    });

    // Save the account ID to the user record
    await storage.updateUser(user.id, { stripeConnectAccountId: account.id });

    // Create an account link to onboard the user
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${req.protocol}://${req.get('host')}/stripe-connect-refresh`,
      return_url: `${req.protocol}://${req.get('host')}/stripe-connect-return`,
      type: 'account_onboarding',
    });

    res.json({ 
      accountId: account.id,
      accountLinkUrl: accountLink.url 
    });
  } catch (error: any) {
    console.error('Error creating Connect account:', error);
    res.status(500).json({ message: 'Failed to create Connect account', error: error.message });
  }
});

// Create login link for existing Connect account
stripeRouter.post('/connect/create-login-link', async (req, res) => {
  try {
    const user = await storage.getUser(req.user?.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.stripeConnectAccountId) {
      return res.status(404).json({ message: 'No Connect account found for this user' });
    }

    try {
      // Create a login link
      const loginLink = await stripe.accounts.createLoginLink(user.stripeConnectAccountId);
      res.json({ url: loginLink.url });
    } catch (loginError: any) {
      // If we can't create a login link (e.g., account not fully onboarded),
      // create an account link instead
      if (loginError.code === 'account_not_external_account' || 
          loginError.code === 'account_not_onboarded' ||
          loginError.code === 'resource_missing') {
        const accountLink = await stripe.accountLinks.create({
          account: user.stripeConnectAccountId,
          refresh_url: `${req.protocol}://${req.get('host')}/stripe-connect-refresh`,
          return_url: `${req.protocol}://${req.get('host')}/stripe-connect-return`,
          type: 'account_onboarding',
        });
        
        return res.json({ accountLinkUrl: accountLink.url });
      }
      throw loginError;
    }
  } catch (error: any) {
    console.error('Error creating login link:', error);
    res.status(500).json({ message: 'Failed to create login link', error: error.message });
  }
});

// Webhook endpoint for Stripe events
stripeRouter.post('/webhook', async (req: Request, res: Response) => {
  let event;
  
  try {
    // Verify the webhook signature
    const signature = req.headers['stripe-signature'] as string;
    
    // Note: for production, use a proper webhook secret
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).json({ message: 'Webhook secret not configured' });
    }
    
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await handleSuccessfulPayment(paymentIntent);
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        await handleFailedPayment(failedPayment);
        break;
        
      // Add more event handlers as needed
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook event:', error);
    res.status(500).json({ message: 'Error processing webhook event', error: error.message });
  }
});

// Helper functions for webhook handlers
async function handleSuccessfulPayment(paymentIntent: Stripe.PaymentIntent) {
  const { jobId, paymentType } = paymentIntent.metadata;
  
  if (paymentType === 'job_payment' && jobId) {
    // Get the payment record
    const payment = await storage.getPaymentByTransactionId(paymentIntent.id);
    
    if (!payment) {
      console.error('Payment not found in database:', paymentIntent.id);
      return;
    }
    
    // Update payment status
    await storage.updatePaymentStatus(payment.id, 'completed', paymentIntent.id);
    
    // Update job status
    await storage.updateJob(parseInt(jobId), { status: 'paid' });
    
    // Create earnings record for worker
    const job = await storage.getJob(parseInt(jobId));
    
    if (job && job.workerId) {
      await storage.createEarning({
        workerId: job.workerId,
        jobId: job.id,
        amount: payment.amount,
        status: 'pending',
        createdAt: new Date(),
      });
      
      // Create notification for worker
      await storage.createNotification({
        userId: job.workerId,
        type: 'payment',
        title: 'Payment Received',
        message: `You've received payment of $${payment.amount.toFixed(2)} for job: ${job.title}`,
        isRead: false,
        createdAt: new Date(),
      });
    }
  }
}

async function handleFailedPayment(paymentIntent: Stripe.PaymentIntent) {
  const { jobId } = paymentIntent.metadata;
  
  if (jobId) {
    // Get the payment record
    const payment = await storage.getPaymentByTransactionId(paymentIntent.id);
    
    if (!payment) {
      console.error('Payment not found in database:', paymentIntent.id);
      return;
    }
    
    // Update payment status
    await storage.updatePaymentStatus(payment.id, 'failed', paymentIntent.id);
    
    // Create notification for job poster
    const job = await storage.getJob(parseInt(jobId));
    
    if (job) {
      await storage.createNotification({
        userId: job.posterId,
        type: 'payment_failed',
        title: 'Payment Failed',
        message: `Your payment of $${payment.amount.toFixed(2)} for job: ${job.title} failed. Please try again.`,
        isRead: false,
        createdAt: new Date(),
      });
    }
  }
}