import { Router } from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';
import helmet from 'helmet';
import { pool } from '../db';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY must be set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export const stripeConnectRouter = Router();

import { stripeURLMiddleware } from '../middleware/stripe-connect-url';

// Apply URL middleware to all routes in this router
stripeConnectRouter.use(stripeURLMiddleware());

// Add CSP configuration
const stripeCSP = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-eval'",
        "'unsafe-inline'",
        "https://js.stripe.com",
        "https://api.stripe.com",
        "https://api.mapbox.com"
      ],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
      connectSrc: [
        "'self'",
        "https://api.stripe.com",
        "https://api.mapbox.com",
        "ws://localhost:*"
      ],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      fontSrc: ["'self'", "data:", "https:"]
    }
  }
});

// Apply CSP middleware
stripeConnectRouter.use(stripeCSP);

// Create a Connect account for a worker
stripeConnectRouter.post('/create-account', async (req, res) => {
  try {
    // Enhanced authentication check with session validation
    if (!req.session || !req.isAuthenticated() || !req.user) {
      console.error('Authentication check failed:', {
        hasSession: !!req.session,
        isAuthenticated: req.isAuthenticated(),
        hasUser: !!req.user
      });
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Get user details with validation
    const user = await storage.getUser(req.user.id);
    if (!user) {
      console.error(`User not found in database: ${req.user.id}`);
      return res.status(404).json({ 
        message: 'User account not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Validate user email
    if (!user.email) {
      return res.status(400).json({ 
        message: 'Email address required for Stripe account creation',
        code: 'EMAIL_REQUIRED'
      });
    }

    // Check if user already has a Connect account
    if (user.stripeConnectAccountId) {
      // Check if the account exists and is active
      try {
        const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
        
        if (account.details_submitted) {
          return res.status(409).json({ 
            message: 'You already have a Stripe Connect account',
            accountId: user.stripeConnectAccountId,
            detailsSubmitted: true
          });
        }          // If account exists but onboarding is incomplete, create a new onboarding link
        const accountLink = await stripe.accountLinks.create({
          account: user.stripeConnectAccountId,
          refresh_url: (req as any).stripeURLs.refresh,
          return_url: (req as any).stripeURLs.return,
          type: 'account_onboarding'
        });
        
        console.log(`Created account link for incomplete account: ${accountLink.url}`);
        return res.json({ accountLinkUrl: accountLink.url, accountId: user.stripeConnectAccountId });
      } catch (error) {
        // If account doesn't exist in Stripe, create a new one
        console.log(`Error retrieving Connect account: ${error.message}`);
      }
    }    // Validate required fields
    if (!user.email) {
      return res.status(400).json({ message: 'User must have an email address to create a Stripe Connect account' });
    }

    // Test Stripe API connectivity before proceeding
    try {
      await stripe.balance.retrieve();
    } catch (stripeError) {
      console.error("Stripe API connection test failed:", stripeError);
      return res.status(500).json({ 
        message: "Could not connect to Stripe API. Please check your credentials." 
      });
    }

    // Create a new Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      metadata: {
        userId: user.id.toString(),
        username: user.username,
        platform: "Fixer"
      },
      business_profile: {
        url: `${req.headers.origin || process.env.APP_URL}/profile/${user.username}`,
        product_description: 'Services provided through the Fixer platform'
      }
    });

    // Store the account ID in the user record
    await storage.updateUser(user.id, { 
      stripeConnectAccountId: account.id,
      stripeConnectAccountStatus: 'pending'
    });    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: (req as any).stripeURLs.refresh,
      return_url: (req as any).stripeURLs.return,
      type: 'account_onboarding',
    });

    console.log(`Created new Connect account: ${account.id} with onboarding link: ${accountLink.url}`);
    res.json({ accountLinkUrl: accountLink.url, accountId: account.id });    } catch (error) {
      console.error('Error creating Stripe Connect account:', error);
      
      // Handle specific Stripe errors
      if (error.type === 'StripeError') {
        let statusCode = 500;
        let message = 'An error occurred with Stripe';
        let code = 'STRIPE_ERROR';

        switch (error.code) {
          case 'account_invalid':
            statusCode = 400;
            message = 'Invalid account details provided';
            code = 'INVALID_ACCOUNT';
            break;
          case 'account_number_invalid':
            statusCode = 400;
            message = 'Invalid bank account number';
            code = 'INVALID_BANK_ACCOUNT';
            break;
          case 'amount_too_small':
            statusCode = 400;
            message = 'Amount is below minimum requirement';
            code = 'AMOUNT_TOO_LOW';
            break;
          case 'routing_number_invalid':
            statusCode = 400;
            message = 'Invalid routing number';
            code = 'INVALID_ROUTING';
            break;
          default:
            if (error.message.includes('db_termination')) {
              message = 'Database connection error, please try again';
              code = 'DB_ERROR';
            }
        }

        return res.status(statusCode).json({
          message,
          code,
          detail: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }

      // Handle database errors
      if (error.code === 'XX000') {
        return res.status(503).json({
          message: 'Database service temporarily unavailable',
          code: 'DB_ERROR',
          retry: true
        });
      }

      // Generic error response
      res.status(500).json({ 
        message: 'Failed to create Stripe Connect account',
        code: 'INTERNAL_ERROR',
        detail: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

// Get the account status for a worker
stripeConnectRouter.get('/account-status', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user doesn't have a Connect account
    if (!user.stripeConnectAccountId) {
      return res.json({ exists: false, message: 'No Stripe Connect account' });
    }

    // Retrieve account details from Stripe
    try {
      const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
      
      // Update the user's account status if needed
      if (user.stripeConnectAccountStatus !== account.details_submitted ? 'active' : 'pending') {
        await storage.updateUser(user.id, { 
          stripeConnectAccountStatus: account.details_submitted ? 'active' : 'pending' 
        });
      }
      
      return res.json({
        exists: true,
        accountId: account.id,
        details: {
          detailsSubmitted: account.details_submitted,
          payoutsEnabled: account.payouts_enabled,
          chargesEnabled: account.charges_enabled,
          requirements: account.requirements,
          status: account.details_submitted ? 'active' : 'pending'
        }
      });
    } catch (error) {
      // If the account doesn't exist in Stripe anymore
      await storage.updateUser(user.id, { stripeConnectAccountId: null, stripeConnectAccountStatus: null });
      return res.json({ exists: false, message: 'Account not found in Stripe' });
    }
  } catch (error) {
    console.error('Error checking Stripe Connect account status:', error);
    res.status(500).json({ message: `Error checking account status: ${error.message}` });
  }
});

// Create a new onboarding or dashboard link for an existing account
stripeConnectRouter.post('/create-link', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure user has a Connect account
    if (!user.stripeConnectAccountId) {
      return res.status(404).json({ message: 'No Stripe Connect account found' });
    }

    const { type = 'account_onboarding' } = req.body;
    
    if (type === 'account_onboarding') {      // Create an onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: user.stripeConnectAccountId,
        refresh_url: (req as any).stripeURLs.refresh,
        return_url: (req as any).stripeURLs.return,
        type: 'account_onboarding'
      });
      
      res.json({ 
        accountLinkUrl: accountLink.url,
        accountId: user.stripeConnectAccountId,
        type: 'onboarding'
      });
    } else if (type === 'dashboard') {
      try {
        // First check if the account is fully setup
        const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
        
        if (!account.details_submitted || !account.payouts_enabled) {
          // Create an onboarding link instead since account setup is incomplete
          const accountLink = await stripe.accountLinks.create({
            account: user.stripeConnectAccountId,
            refresh_url: (req as any).stripeURLs.refresh,
            return_url: (req as any).stripeURLs.return,
            type: 'account_onboarding'
          });
          
          return res.json({
            accountLinkUrl: accountLink.url,
            accountId: user.stripeConnectAccountId,
            type: 'onboarding',
            message: 'Account setup needs to be completed before accessing the dashboard'
          });
        }
        
        // Account is properly setup, create dashboard login link
        const loginLink = await stripe.accounts.createLoginLink(user.stripeConnectAccountId);
        res.json({ 
          accountLinkUrl: loginLink.url,
          accountId: user.stripeConnectAccountId,
          type: 'dashboard'
        });
    } else {
      res.status(400).json({ message: 'Invalid link type' });
    }
  } catch (error) {
    console.error('Error creating Stripe Connect link:', error);
    res.status(500).json({ message: `Error creating link: ${error.message}` });
  }
});

// Transfer funds to a worker's Connect account
stripeConnectRouter.post('/transfer', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const { jobId, applicationId, amount } = req.body;
    
    if (!jobId || !applicationId || !amount) {
      return res.status(400).json({ message: 'Missing required parameters: jobId, applicationId, amount' });
    }
    
    // Get the job and application to verify the transfer
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    // Only job poster can release funds
    if (job.posterId !== req.user.id) {
      return res.status(403).json({ message: 'Only the job poster can release funds' });
    }
    
    const application = await storage.getApplication(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    // The application must be for this job
    if (application.jobId !== job.id) {
      return res.status(400).json({ message: 'Application is not for this job' });
    }
    
    // Get the worker
    const worker = await storage.getUser(application.workerId);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    
    // Ensure worker has a Connect account
    if (!worker.stripeConnectAccountId) {
      return res.status(400).json({ message: 'Worker does not have a payment account' });
    }
    
    // Calculate service fee (10%)
    const serviceFee = Math.round(amount * 0.1);
    const transferAmount = amount - serviceFee;
    
    // Create a transfer to the worker's Connect account
    const transfer = await stripe.transfers.create({
      amount: transferAmount,
      currency: 'usd',
      destination: worker.stripeConnectAccountId,
      description: `Payment for job #${job.id}: ${job.title}`,
      metadata: {
        jobId: job.id.toString(),
        applicationId: application.id.toString(),
        workerId: worker.id.toString(),
        posterId: req.user.id.toString()
      }
    });
    
    // Create payment record
    const payment = await storage.createPayment({
      userId: req.user.id,
      workerId: worker.workerId,
      amount: amount,
      serviceFee: serviceFee,
      type: 'transfer',
      status: 'completed',
      paymentMethod: 'stripe',
      transactionId: transfer.id,
      stripePaymentIntentId: null,
      stripeCustomerId: null,
      stripeConnectAccountId: worker.stripeConnectAccountId,
      jobId: job.id,
      description: `Payment for job: ${job.title}`,
    });
    
    // Create earning record for worker
    const earning = await storage.createEarning({
      workerId: worker.id,
      jobId: job.id,
      amount: amount,
      serviceFee: serviceFee,
      netAmount: transferAmount,
      status: 'paid',
      transactionId: transfer.id,
      stripeAccountId: worker.stripeConnectAccountId,
      description: `Payment for job: ${job.title}`,
    });
    
    // Update payment record with completedAt
    await storage.updatePaymentStatus(payment.id, 'completed', transfer.id);
    
    // Update job status to completed if not already
    if (job.status !== 'completed') {
      await storage.updateJob(job.id, { status: 'completed', workerId: worker.id });
    }
    
    // Update application status if not already
    if (application.status !== 'completed') {
      await storage.updateApplication(application.id, { status: 'completed' });
    }
    
    // Send notification to worker about payment
    await storage.createNotification({
      userId: worker.id,
      title: 'Payment Received',
      message: `You've received a payment of $${(transferAmount / 100).toFixed(2)} for job: ${job.title}`,
      type: 'payment',
      sourceId: job.id,
      sourceType: 'job'
    });
    
    res.json({ 
      success: true, 
      payment, 
      earning,
      transfer: {
        id: transfer.id,
        amount: transferAmount,
        serviceFee,
        status: transfer.status
      }
    });
  } catch (error) {
    console.error('Error transferring funds:', error);
    res.status(500).json({ message: `Error transferring funds: ${error.message}` });
  }
});

// Webhook handler for Stripe Connect events
stripeConnectRouter.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('Stripe Connect webhook secret not configured');
    return res.status(500).json({ message: 'Webhook configuration error' });
  }
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
    
    console.log('Received Stripe Connect webhook event:', event.type);
  } catch (error) {
    console.error(`Webhook signature verification failed: ${error.message}`);
    return res.status(400).json({ message: 'Webhook signature verification failed' });
  }
    // Handle specific webhook events
  switch (event.type) {
    case 'account.updated': {
      const account = event.data.object;
      
      // Find user with this Connect account
      const users = await storage.getAllUsers();
      const user = users.find(u => u.stripeConnectAccountId === account.id);
      
      if (user) {
        // Determine detailed account status
        let status = 'pending';
        
        if (account.details_submitted) {
          if (account.payouts_enabled) {
            status = 'active';
          } else if (account.requirements?.currently_due?.length > 0) {
            status = 'restricted';
          } else {
            status = 'limited';
          }
        }
        
        // Update the user's account status
        await storage.updateUser(user.id, {
          stripeConnectAccountStatus: status,
          stripeConnectAccountUpdatedAt: new Date()
        });
        
        // Create a notification for the user if status changed
        if (status !== user.stripeConnectAccountStatus) {
          await storage.createNotification({
            userId: user.id,
            title: 'Stripe Connect Account Update',
            message: getConnectStatusMessage(status),
            type: 'stripe_connect_update',
            metadata: {
              accountId: account.id,
              status,
              requiresAction: status !== 'active'
            }
          });
        }
        
        console.log(`Updated Connect account status for user ${user.id} to ${status}`);
      }
      break;
    }
      case 'transfer.created':
    case 'transfer.updated':
    case 'transfer.failed':
    case 'transfer.reversed': {
      const transfer = event.data.object;
      
      // Find payment with this transfer ID
      const jobId = transfer.metadata.jobId;
      const workerId = transfer.metadata.workerId;
      const posterId = transfer.metadata.posterId;
      
      if (jobId && workerId) {
        // Update payment status
        const payments = await storage.getPaymentsForUser(parseInt(workerId));
        const payment = payments.find(p => p.transactionId === transfer.id);
        
        if (payment) {
          const newStatus = getPaymentStatusFromTransfer(transfer);
          await storage.updatePaymentStatus(payment.id, newStatus, transfer.id);
          
          // Update the job status if needed
          const job = await storage.getJob(parseInt(jobId));
          if (job && transfer.status === 'failed') {
            await storage.updateJob(job.id, { status: 'payment_failed' });
          }
          
          // Create notifications for relevant users
          const notificationData = getTransferNotification(transfer, job?.title);
          
          if (workerId) {
            await storage.createNotification({
              userId: parseInt(workerId),
              ...notificationData.worker
            });
          }
          
          if (posterId) {
            await storage.createNotification({
              userId: parseInt(posterId),
              ...notificationData.poster
            });
          }
          
          console.log(`Updated payment status for payment ${payment.id} to ${newStatus}`);
        }
      }
      break;
    }
  }
  
  res.json({ received: true });
});

// Helper function to determine payment status from transfer
function getPaymentStatusFromTransfer(transfer: Stripe.Transfer): string {
  switch (transfer.status) {
    case 'paid':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'pending':
      return 'pending';
    case 'reversed':
      return 'reversed';
    default:
      return transfer.status;
  }
}

// Helper function to generate transfer-related notifications
function getTransferNotification(transfer: Stripe.Transfer, jobTitle?: string): {
  worker: { title: string; message: string; type: string };
  poster: { title: string; message: string; type: string };
} {
  const amount = (transfer.amount / 100).toFixed(2);
  const jobContext = jobTitle ? ` for job "${jobTitle}"` : '';

  switch (transfer.status) {
    case 'paid':
      return {
        worker: {
          title: 'Payment Received',
          message: `You've received $${amount}${jobContext}. The payment has been sent to your account.`,
          type: 'payment_received'
        },
        poster: {
          title: 'Payment Sent',
          message: `Your payment of $${amount}${jobContext} has been successfully sent to the worker.`,
          type: 'payment_sent'
        }
      };
    case 'failed':
      return {
        worker: {
          title: 'Payment Failed',
          message: `The payment of $${amount}${jobContext} has failed. Please check your account setup.`,
          type: 'payment_failed'
        },
        poster: {
          title: 'Payment Failed',
          message: `The payment of $${amount}${jobContext} could not be sent to the worker. We'll retry automatically.`,
          type: 'payment_failed'
        }
      };
    case 'reversed':
      return {
        worker: {
          title: 'Payment Reversed',
          message: `A payment of $${amount}${jobContext} has been reversed.`,
          type: 'payment_reversed'
        },
        poster: {
          title: 'Payment Reversed',
          message: `Your payment of $${amount}${jobContext} has been reversed.`,
          type: 'payment_reversed'
        }
      };
    default:
      return {
        worker: {
          title: 'Payment Update',
          message: `There's an update to your payment of $${amount}${jobContext}.`,
          type: 'payment_update'
        },
        poster: {
          title: 'Payment Update',
          message: `There's an update to your payment of $${amount}${jobContext}.`,
          type: 'payment_update'
        }
      };
  }
}

// Helper function to generate user-friendly status messages
function getConnectStatusMessage(status: string): string {
  switch (status) {
    case 'active':
      return 'Your payment account is now fully activated and ready to receive payments.';
    case 'restricted':
      return 'Your payment account needs attention. Please complete the required information to continue receiving payments.';
    case 'limited':
      return 'Your payment account has limited functionality. Additional verification may be required.';
    case 'pending':
      return 'Your payment account setup is incomplete. Please complete the onboarding process.';
    case 'deauthorized':
      return 'Your payment account has been disconnected. Please reconnect to continue receiving payments.';
    default:
      return 'Your payment account status has been updated.';
  }
}

// Add database connection error handling
pool.on('error', async (err) => {
  console.error('Unexpected database pool error:', err);
  
  if (err.code === 'XX000' && err.message.includes('db_termination')) {
    console.log('Database connection terminated, attempting to reconnect...');
    
    let retries = 5;
    const retryDelay = 5000; // 5 seconds
    
    while (retries > 0) {
      try {
        // Test connection by querying
        await pool.query('SELECT 1');
        console.log('Database connection restored successfully');
        return;
      } catch (error) {
        console.error(`Reconnection attempt failed (${retries} remaining):`, error);
        retries--;
        
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    console.error('Failed to reconnect to database after multiple attempts');
    process.exit(1); // Force process restart if connection cannot be restored
  }
});

// Periodic connection check
setInterval(async () => {
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    console.error('Periodic connection check failed:', error);
  }
}, 30000); // Check every 30 seconds