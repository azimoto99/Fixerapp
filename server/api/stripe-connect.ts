import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';
import helmet from 'helmet';
import { pool } from '../db';
import { isAuthenticated } from '../middleware/auth';
import { AuthenticatedRequest, StripeTransfer, StripeAccount } from '../types';

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('[FATAL] STRIPE_SECRET_KEY is missing. Set it in your environment variables.');
  throw new Error('STRIPE_SECRET_KEY must be set in environment variables');
}
if (!process.env.STRIPE_CONNECT_WEBHOOK_SECRET) {
  console.error('[FATAL] STRIPE_CONNECT_WEBHOOK_SECRET is missing. Set it in your environment variables.');
  throw new Error('STRIPE_CONNECT_WEBHOOK_SECRET must be set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
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

// Add type definitions
interface StripeTransfer extends Stripe.Transfer {
  status: 'paid' | 'pending' | 'failed' | 'reversed';
  metadata: {
    jobId: string;
    applicationId: string;
    workerId: string;
    posterId: string;
  };
}

interface StripeAccount extends Stripe.Account {
  requirements?: {
    currently_due?: string[];
  };
}

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
  };
}

// Create a Connect account for a worker
stripeConnectRouter.post('/create-account', isAuthenticated, async (req, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already has a Stripe Connect account
    if (user.stripeConnectAccountId) {
      const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
      if (account.payouts_enabled) {
        return res.status(400).json({ 
          message: 'Stripe Connect account already exists and is active',
          accountStatus: 'active'
        });
      }
    }

    // Create a new Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      metadata: {
        userId: user.id.toString()
      }
    });

    // Update user with Stripe Connect account ID
    await storage.updateUser(user.id, { 
      stripeConnectAccountId: account.id 
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.APP_URL || 'http://localhost:5000'}/profile?refresh=true`,
      return_url: `${process.env.APP_URL || 'http://localhost:5000'}/profile?success=true`,
      type: 'account_onboarding'
    });

    return res.status(200).json({
      accountId: account.id,
      accountLinkUrl: accountLink.url
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Stripe Connect account creation error:', error.message, error.stack);
    } else {
      console.error('Stripe Connect account creation error:', error);
    }
    return res.status(500).json({ 
      message: 'Failed to create Stripe Connect account',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get the account status for a worker
stripeConnectRouter.get('/account-status', isAuthenticated, async (req, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.stripeConnectAccountId) {
      return res.status(404).json({ 
        message: 'No Stripe Connect account found',
        exists: false
      });
    }

    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
    
    return res.status(200).json({
      exists: true,
      accountStatus: account.payouts_enabled ? 'active' : 'pending',
      accountId: account.id,
      payoutsEnabled: account.payouts_enabled,
      chargesEnabled: account.charges_enabled
    });
  } catch (error) {
    console.error('Stripe Connect account status check error:', error);
    return res.status(500).json({ 
      message: 'Failed to check Stripe Connect account status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
      } catch (dashboardError) {
        console.error('Error creating dashboard link:', dashboardError);
        res.status(500).json({ message: `Error creating dashboard link: ${dashboardError.message}` });
      }
    } else {
      res.status(400).json({ message: 'Invalid link type' });
    }
  } catch (error) {
    console.error('Error creating Stripe Connect link:', error);
    res.status(500).json({ message: `Error creating link: ${error.message}` });
  }
});

// Transfer funds to a worker's Connect account
stripeConnectRouter.post('/transfer', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { jobId, applicationId, amount } = req.body;
    
    if (!jobId || !applicationId || !amount) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }
    
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    if (job.posterId !== req.user.id) {
      return res.status(403).json({ message: 'Only the job poster can release funds' });
    }
    
    const application = await storage.getApplication(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    if (application.jobId !== job.id) {
      return res.status(400).json({ message: 'Application is not for this job' });
    }
    
    const worker = await storage.getUser(application.workerId);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    
    if (!worker.stripeConnectAccountId) {
      return res.status(400).json({ message: 'Worker does not have a payment account' });
    }
    
    const serviceFee = Math.round(amount * 0.1);
    const transferAmount = amount - serviceFee;
    
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
    }) as unknown as StripeTransfer;
    
    const payment = await storage.createPayment({
      userId: req.user.id,
      workerId: worker.id,
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
    
    await storage.updatePaymentStatus(payment.id, 'completed', transfer.id);
    
    if (job.status !== 'completed') {
      await storage.updateJob(job.id, { status: 'completed', workerId: worker.id });
    }
    
    if (application.status !== 'completed') {
      await storage.updateApplication(application.id, { status: 'completed' });
    }
    
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
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Error transferring funds'
    });
  }
});

// Health check endpoint for Stripe config and connectivity
stripeConnectRouter.get('/health', (req, res) => {
  const stripeKeySet = !!process.env.STRIPE_SECRET_KEY;
  const webhookKeySet = !!process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  res.json({
    stripeKeySet,
    webhookKeySet,
    stripeApiVersion: stripe.getApiField('version'),
    env: process.env.NODE_ENV || 'development'
  });
});

// Webhook handler for Stripe Connect events
stripeConnectRouter.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('Stripe Connect webhook secret not configured');
    return res.status(500).json({ message: 'Webhook configuration error' });
  }
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      webhookSecret
    );
    
    console.log('Received Stripe Connect webhook event:', event.type);
  } catch (error) {
    console.error(`Webhook signature verification failed:`, error);
    return res.status(400).json({ message: 'Webhook signature verification failed' });
  }

  // Handle specific webhook events
  switch (event.type) {
    case 'account.updated': {
      const account = event.data.object as StripeAccount;
      
      const users = await storage.getAllUsers();
      const user = users.find(u => u.stripeConnectAccountId === account.id);
      
      if (user) {
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
        
        await storage.updateUser(user.id, {
          stripeConnectAccountStatus: status,
          stripeConnectAccountUpdatedAt: new Date()
        });
        
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
      }
      break;
    }
    case 'transfer.created':
    case 'transfer.updated':
    case 'transfer.failed':
    case 'transfer.reversed': {
      const transfer = event.data.object as StripeTransfer;
      
      const jobId = transfer.metadata.jobId;
      const workerId = transfer.metadata.workerId;
      const posterId = transfer.metadata.posterId;
      
      if (jobId && workerId) {
        const payments = await storage.getPaymentsForUser(parseInt(workerId));
        const payment = payments.find(p => p.transactionId === transfer.id);
        
        if (payment) {
          const newStatus = getPaymentStatusFromTransfer(transfer);
          await storage.updatePaymentStatus(payment.id, newStatus, transfer.id);
          
          const job = await storage.getJob(parseInt(jobId));
          if (job && transfer.status === 'failed') {
            await storage.updateJob(job.id, { status: 'payment_failed' });
          }
          
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

// IMPORTANT: Ensure this router is mounted at /api/stripe/connect in your main server file, e.g.:
//   app.use('/api/stripe/connect', stripeConnectRouter);
// If not, frontend requests will 404 or fail.

// Periodic connection check
setInterval(async () => {
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    console.error('Periodic connection check failed:', error);
  }
}, 30000); // Check every 30 seconds

export default stripeConnectRouter;

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY must be set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
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

// Add type definitions
interface StripeTransfer extends Stripe.Transfer {
  status: 'paid' | 'pending' | 'failed' | 'reversed';
  metadata: {
    jobId: string;
    applicationId: string;
    workerId: string;
    posterId: string;
  };
}

interface StripeAccount extends Stripe.Account {
  requirements?: {
    currently_due?: string[];
  };
}

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
  };
}

// Create a Connect account for a worker
stripeConnectRouter.post('/create-account', isAuthenticated, async (req, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already has a Stripe Connect account
    if (user.stripeConnectAccountId) {
      const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
      if (account.payouts_enabled) {
        return res.status(400).json({ 
          message: 'Stripe Connect account already exists and is active',
          accountStatus: 'active'
        });
      }
    }

    // Create a new Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      metadata: {
        userId: user.id.toString()
      }
    });

    // Update user with Stripe Connect account ID
    await storage.updateUser(user.id, { 
      stripeConnectAccountId: account.id 
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.APP_URL || 'http://localhost:5000'}/profile?refresh=true`,
      return_url: `${process.env.APP_URL || 'http://localhost:5000'}/profile?success=true`,
      type: 'account_onboarding'
    });

    return res.status(200).json({
      accountId: account.id,
      accountLinkUrl: accountLink.url
    });
  } catch (error) {
    console.error('Stripe Connect account creation error:', error);
    return res.status(500).json({ 
      message: 'Failed to create Stripe Connect account',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get the account status for a worker
stripeConnectRouter.get('/account-status', isAuthenticated, async (req, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.stripeConnectAccountId) {
      return res.status(404).json({ 
        message: 'No Stripe Connect account found',
        exists: false
      });
    }

    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
    
    return res.status(200).json({
      exists: true,
      accountStatus: account.payouts_enabled ? 'active' : 'pending',
      accountId: account.id,
      payoutsEnabled: account.payouts_enabled,
      chargesEnabled: account.charges_enabled
    });
  } catch (error) {
    console.error('Stripe Connect account status check error:', error);
    return res.status(500).json({ 
      message: 'Failed to check Stripe Connect account status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Transfer funds to a worker's Connect account
stripeConnectRouter.post('/transfer', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const { jobId, applicationId, amount } = req.body;
    
    if (!jobId || !applicationId || !amount) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }
    
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    if (job.posterId !== req.user.id) {
      return res.status(403).json({ message: 'Only the job poster can release funds' });
    }
    
    const application = await storage.getApplication(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    if (application.jobId !== job.id) {
      return res.status(400).json({ message: 'Application is not for this job' });
    }
    
    const worker = await storage.getUser(application.workerId);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    
    if (!worker.stripeConnectAccountId) {
      return res.status(400).json({ message: 'Worker does not have a payment account' });
    }
    
    const serviceFee = Math.round(amount * 0.1);
    const transferAmount = amount - serviceFee;
    
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
    }) as StripeTransfer;
    
    const payment = await storage.createPayment({
      userId: req.user.id,
      workerId: worker.id,
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
    
    await storage.updatePaymentStatus(payment.id, 'completed', transfer.id);
    
    if (job.status !== 'completed') {
      await storage.updateJob(job.id, { status: 'completed', workerId: worker.id });
    }
    
    if (application.status !== 'completed') {
      await storage.updateApplication(application.id, { status: 'completed' });
    }
    
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
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Error transferring funds'
    });
  }
});

// Webhook handler for Stripe Connect events
stripeConnectRouter.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('Stripe Connect webhook secret not configured');
    return res.status(500).json({ message: 'Webhook configuration error' });
  }
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      webhookSecret
    );
    
    console.log('Received Stripe Connect webhook event:', event.type);
  } catch (error) {
    console.error(`Webhook signature verification failed:`, error);
    return res.status(400).json({ message: 'Webhook signature verification failed' });
  }

  // Handle specific webhook events
  switch (event.type) {
    case 'account.updated': {
      const account = event.data.object as StripeAccount;
      
      const users = await storage.getAllUsers();
      const user = users.find(u => u.stripeConnectAccountId === account.id);
      
      if (user) {
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
        
        await storage.updateUser(user.id, {
          stripeConnectAccountStatus: status,
          stripeConnectAccountUpdatedAt: new Date()
        });
        
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
      }
      break;
    }
    case 'transfer.created':
    case 'transfer.updated':
    case 'transfer.failed':
    case 'transfer.reversed': {
      const transfer = event.data.object as StripeTransfer;
      
      const jobId = transfer.metadata.jobId;
      const workerId = transfer.metadata.workerId;
      const posterId = transfer.metadata.posterId;
      
      if (jobId && workerId) {
        const payments = await storage.getPaymentsForUser(parseInt(workerId));
        const payment = payments.find(p => p.transactionId === transfer.id);
        
        if (payment) {
          const newStatus = getPaymentStatusFromTransfer(transfer);
          await storage.updatePaymentStatus(payment.id, newStatus, transfer.id);
          
          const job = await storage.getJob(parseInt(jobId));
          if (job && transfer.status === 'failed') {
            await storage.updateJob(job.id, { status: 'payment_failed' });
          }
          
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

export default stripeConnectRouter;