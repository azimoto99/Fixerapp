import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';
import helmet from 'helmet';
import { pool } from '../db';
import { isAuthenticated } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('[FATAL] STRIPE_SECRET_KEY is missing. Set it in your environment variables.');
  throw new Error('STRIPE_SECRET_KEY must be set in environment variables');
}
if (!process.env.STRIPE_CONNECT_WEBHOOK_SECRET) {
  console.error('[FATAL] STRIPE_CONNECT_WEBHOOK_SECRET is missing. Set it in your environment variables.');
  throw new Error('STRIPE_CONNECT_WEBHOOK_SECRET must be set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil'
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

// Add a health check endpoint for debugging
stripeConnectRouter.get('/health', (req, res) => {
  console.log('[STRIPE CONNECT] Health check request received');
  return res.status(200).json({ status: 'ok', message: 'Stripe Connect router is working' });
});

// Add type definitions
interface StripeTransferWithMetadata extends Stripe.Transfer {
  metadata: {
    jobId: string;
    applicationId: string;
    workerId: string;
    posterId: string;
  };
}

// Create a Connect account for a worker
stripeConnectRouter.post('/create-account', isAuthenticated, async (req: Request, res: Response) => {
  console.log('[STRIPE CONNECT] Create account request received');
  
  try {
    if (!req.user) {
      console.log('[STRIPE CONNECT] No user in request');
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    console.log(`[STRIPE CONNECT] User authenticated: ${req.user.id}`);
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.email) {
      console.error('[STRIPE CONNECT] User email is missing, which is required for Stripe Express account creation.');
      return res.status(400).json({ message: 'User email is required for Stripe Connect setup.' });
    }

    let accountId = user.stripeConnectAccountId;

    if (accountId) {
      try {
        const existingAccount = await stripe.accounts.retrieve(accountId);
        // You might want to check existingAccount.details_submitted or existingAccount.charges_enabled
        // to decide if re-onboarding is necessary or if you should redirect to a dashboard.
        // For now, we allow re-triggering onboarding.
        console.log(`[STRIPE CONNECT] User ${user.id} already has Stripe account: ${accountId}. Proceeding to create new link.`);
      } catch (retrieveError: any) {
        if (retrieveError.code === 'account_invalid' || retrieveError.code === 'resource_missing') { // More specific error codes
          console.warn(`[STRIPE CONNECT] Stripe account ${accountId} for user ${user.id} is invalid or not found in Stripe. Clearing from DB and creating a new one.`, retrieveError.message);
          await storage.updateUser(user.id, { stripeConnectAccountId: undefined });
          accountId = null;
        } else {
          console.error(`[STRIPE CONNECT] Error retrieving Stripe account ${accountId}:`, retrieveError.message);
          throw retrieveError; // Re-throw if it's an unexpected error
        }
      }
    }
    
    if (!accountId) {
        console.log(`[STRIPE CONNECT] Creating new Stripe Express account for user ${user.id}`);
        const account = await stripe.accounts.create({
          type: 'express',
          email: user.email,
          business_type: 'individual',
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: {
            userId: user.id.toString(),
          },
        });
        accountId = account.id;
        console.log(`[STRIPE CONNECT] Created Stripe account ${accountId} for user ${user.id}`);

        await storage.updateUser(user.id, { 
          stripeConnectAccountId: accountId 
        });
    }

    // Define your application's specific paths for Stripe return/refresh
    // These should ideally lead to pages in your frontend that can handle the Stripe redirect
    const defaultReturnPath = '/wallet?stripe_return=true&status=success';
    const defaultRefreshPath = '/wallet?stripe_return=true&status=refresh';

    let refreshUrl: string;
    let returnUrl: string;
    const isProduction = process.env.NODE_ENV === 'production';

    // 1. Try to use URLs from stripeURLMiddleware (if it exists and populates req.stripeURLs)
    if ((req as any).stripeURLs?.refresh && (req as any).stripeURLs?.return) {
      refreshUrl = (req as any).stripeURLs.refresh;
      returnUrl = (req as any).stripeURLs.return;
      console.log('[STRIPE CONNECT] Using URLs from stripeURLMiddleware');

      if (isProduction) {
        if (!refreshUrl.startsWith('https://')) {
            console.warn(`[STRIPE CONNECT] Middleware refreshUrl ${refreshUrl} is not HTTPS in production. Attempting to override to HTTPS. Please check stripeURLMiddleware.`);
            refreshUrl = refreshUrl.replace(/^http:/, 'https:');
        }
        if (!returnUrl.startsWith('https://')) {
            console.warn(`[STRIPE CONNECT] Middleware returnUrl ${returnUrl} is not HTTPS in production. Attempting to override to HTTPS. Please check stripeURLMiddleware.`);
            returnUrl = returnUrl.replace(/^http:/, 'https:');
        }
      }
    }
    // 2. Fallback to APP_URL environment variable
    else if (process.env.APP_URL) {
      let baseUrl = process.env.APP_URL.replace(/\/$/, ''); // Remove trailing slash if any
      
      // Force HTTPS in production
      if (isProduction && !baseUrl.startsWith('https://')) {
        console.warn(`[STRIPE CONNECT] APP_URL (${baseUrl}) is not HTTPS in production. Forcing to HTTPS.`);
        baseUrl = baseUrl.replace(/^http:/, 'https:');
      }
      
      refreshUrl = `${baseUrl}${defaultRefreshPath}`;
      returnUrl = `${baseUrl}${defaultReturnPath}`;
      console.log('[STRIPE CONNECT] Using URLs from APP_URL environment variable:', { baseUrl, refreshUrl, returnUrl });
    }
    // 3. Fallback to dynamically constructing from request headers
    else {
      let protocol = req.protocol || 'http'; // Default if not behind a proxy or if proxy doesn't set header
      const forwardedProto = req.headers['x-forwarded-proto'] as string;

      if (forwardedProto) {
        // If x-forwarded-proto is set (e.g., by a load balancer), use its value
        protocol = forwardedProto.split(',')[0].trim(); // Take the first value if multiple
      }

      // If in production, ensure protocol is https for Stripe URLs
      if (isProduction && protocol !== 'https') {
        console.warn(`[STRIPE CONNECT] In production, determined protocol was '${protocol}'. Forcing to 'https' for Stripe URLs. Original req.protocol: '${req.protocol}', X-Forwarded-Proto: '${req.headers['x-forwarded-proto']}'`);
        protocol = 'https';
      }

      // Use x-forwarded-host if available, otherwise fall back to req.get('host')
      const hostHeader = req.headers['x-forwarded-host'] as string || req.get('host');
      if (!hostHeader) {
        console.error('[STRIPE CONNECT] Request host is undefined (and APP_URL not set), cannot construct callback URLs dynamically.');
        return res.status(500).json({ message: 'Server configuration error: Cannot determine application host for Stripe callbacks.' });
      }
      const host = hostHeader.split(',')[0].trim(); // Take the first value if multiple

      const baseUrl = `${protocol}://${host}`;
      refreshUrl = `${baseUrl}${defaultRefreshPath}`;
      returnUrl = `${baseUrl}${defaultReturnPath}`;
      console.log(`[STRIPE CONNECT] Using dynamically constructed URLs (Base: ${baseUrl}) from request headers`);
    }

    console.log(`[STRIPE CONNECT] Using refresh_url: ${refreshUrl}, return_url: ${returnUrl} for account ${accountId}`);

    // Ensure HTTPS in production for all determined URLs
    if (process.env.NODE_ENV === 'production') {
      if (refreshUrl && !refreshUrl.startsWith('https://')) {
        console.warn(`[STRIPE CONNECT] Forcing HTTPS for refreshUrl in production. Original: ${refreshUrl}`);
        refreshUrl = refreshUrl.replace(/^http:/, 'https:');
      }
      if (returnUrl && !returnUrl.startsWith('https://')) {
        console.warn(`[STRIPE CONNECT] Forcing HTTPS for returnUrl in production. Original: ${returnUrl}`);
        returnUrl = returnUrl.replace(/^http:/, 'https:');
      }

      // Log if APP_URL was the source and was misconfigured (though URLs are now fixed)
      // This checks if stripeURLs were not used (meaning APP_URL or dynamic was the source)
      // and if APP_URL is set but is not HTTPS.
      if (process.env.APP_URL && !process.env.APP_URL.startsWith('https://') && !((req as any).stripeURLs?.refresh && (req as any).stripeURLs?.return)) {
        console.error('[STRIPE CONNECT CRITICAL] APP_URL is configured as HTTP in a production environment. This is a misconfiguration. URLs derived from it have been forced to HTTPS, but APP_URL should be updated.');
      }
    }

    // Log the final URLs being sent to Stripe
    console.log(`[STRIPE CONNECT] Final URLs for Stripe. Account: ${accountId}, Refresh URL: ${refreshUrl}, Return URL: ${returnUrl}`);

    const accountLink = await stripe.accountLinks.create({
      account: accountId!,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
      // Removed deprecated 'collect' parameter - modern Stripe API handles collection automatically
    });

    console.log(`[STRIPE CONNECT] Generated onboarding URL for account ${accountId}: ${accountLink.url}`);
    return res.status(200).json({
      accountId: accountId,
      onboardingUrl: accountLink.url, // Send this URL to the client to redirect the user
    });

  } catch (error: any) {
    let errorMessage = 'Unknown error during Stripe Connect account creation.';
    let stripeErrorCode = undefined;

    if (error.raw?.message) { // Stripe-specific error
      errorMessage = error.raw.message;
      stripeErrorCode = error.code;
      console.error(`[STRIPE CONNECT] Stripe API Error for user ${req.user?.id} (${stripeErrorCode}): ${errorMessage}`, error.raw);
    } else if (error instanceof Error) {
      errorMessage = error.message;
      console.error(`[STRIPE CONNECT] Generic Error for user ${req.user?.id}: ${errorMessage}`, error.stack);
    } else {
      console.error(`[STRIPE CONNECT] Unknown error object for user ${req.user?.id}:`, error);
    }
    
    return res.status(500).json({ 
      message: 'Failed to create Stripe Connect account link.',
      error: errorMessage,
      stripeErrorCode: stripeErrorCode
    });
  }
});

// Get the account status for a worker
stripeConnectRouter.get('/account-status', isAuthenticated, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
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
stripeConnectRouter.post('/create-link', isAuthenticated, async (req, res) => {
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
      } catch (dashboardError: any) {
        console.error('Error creating dashboard link:', dashboardError);
        res.status(500).json({ message: `Error creating dashboard link: ${dashboardError.message}` });
      }
    } else {
      res.status(400).json({ message: 'Invalid link type' });
    }
  } catch (error: any) {
    console.error('Error creating Stripe Connect link:', error);
    res.status(500).json({ message: `Error creating link: ${error.message}` });
  }
});

// Transfer funds to a worker's Connect account
stripeConnectRouter.post('/transfer', isAuthenticated, async (req: Request, res: Response) => {
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
    }) as unknown as StripeTransferWithMetadata;
    
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
        status: 'paid'
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
    stripeApiVersion: '2025-05-28.basil',
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
      const account = event.data.object as Stripe.Account;
      
      const users = await storage.getAllUsers();
      const user = users.find(u => u.stripeConnectAccountId === account.id);
      
      if (user) {
        let status = 'pending';
        
        if (account.details_submitted) {
          if (account.payouts_enabled) {
            status = 'active';
          } else if (account.requirements?.currently_due && account.requirements.currently_due.length > 0) {
            status = 'restricted';
          } else {
            status = 'limited';
          }
        }
        
        await storage.updateUser(user.id, {
          stripeConnectAccountStatus: status
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
    case 'transfer.updated': {
      const transfer = event.data.object as StripeTransferWithMetadata;
      
      const jobId = transfer.metadata.jobId;
      const workerId = transfer.metadata.workerId;
      const posterId = transfer.metadata.posterId;
      
      if (jobId && workerId) {
        const payments = await storage.getPaymentsForUser(parseInt(workerId));
        const payment = payments.find(p => p.transactionId === transfer.id);
        
        if (payment) {
          const newStatus = 'completed'; // Simplified status handling
          await storage.updatePaymentStatus(payment.id, newStatus, transfer.id);
          
          const job = await storage.getJob(parseInt(jobId));
          
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

// Helper function to generate transfer-related notifications
function getTransferNotification(transfer: Stripe.Transfer, jobTitle?: string): {
  worker: { title: string; message: string; type: string };
  poster: { title: string; message: string; type: string };
} {
  const amount = (transfer.amount / 100).toFixed(2);
  const jobContext = jobTitle ? ` for job "${jobTitle}"` : '';

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
if (pool) {
  pool.on('error', async (err: any) => {
    console.error('Unexpected database pool error:', err);
    
    if (err.code === 'XX000' && err.message.includes('db_termination')) {
      console.log('Database connection terminated, attempting to reconnect...');
      
      let retries = 5;
      const retryDelay = 5000; // 5 seconds
      
      while (retries > 0) {
        try {
          // Test connection by querying
          await pool?.query('SELECT 1');
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
}

// IMPORTANT: Ensure this router is mounted at /api/stripe/connect in your main server file, e.g.:
//   app.use('/api/stripe/connect', stripeConnectRouter);
// If not, frontend requests will 404 or fail.

// Periodic connection check
setInterval(async () => {
  try {
    if (pool) {
      await pool.query('SELECT 1');
    }
  } catch (error) {
    console.error('Periodic connection check failed:', error);
  }
}, 30000); // Check every 30 seconds

// Get the onboarding page route
stripeConnectRouter.get('/onboarding', isAuthenticated, async (req, res) => {
  console.log('[STRIPE CONNECT] Onboarding page request received');
  
  try {
    if (!req.user) {
      console.log('[STRIPE CONNECT] No user in onboarding request');
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Since this is a client-side route, redirect to the frontend
    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/stripe-connect/onboarding`);
  } catch (error) {
    console.error('Stripe Connect onboarding page error:', error);
    return res.status(500).json({ 
      message: 'Failed to load onboarding page',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Serve the onboarding page route (for direct API access)
stripeConnectRouter.get('/onboarding-info', isAuthenticated, async (req, res) => {
  console.log('[STRIPE CONNECT] Onboarding info request received');
  
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return onboarding information and user data
    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        hasStripeAccount: !!user.stripeConnectAccountId
      },
      requirements: {
        personalInfo: [
          'Full legal name',
          'Date of birth',
          'Social Security Number (SSN) or Tax ID',
          'Phone number',
          'Email address'
        ],
        addressInfo: [
          'Home address',
          'Mailing address (if different)',
          'Country of residence'
        ],
        bankingInfo: [
          'Bank account number',
          'Routing number',
          'Bank name and address'
        ],
        businessInfo: [
          'Business type (if applicable)',
          'Business address',
          'Tax information',
          'Business registration documents'
        ]
      },
      process: {
        estimatedTime: '5-10 minutes',
        verificationTime: '1-2 business days',
        steps: [
          'Complete account information',
          'Verify identity documents',
          'Add banking details',
          'Review and submit'
        ]
      }
    });
  } catch (error) {
    console.error('Stripe Connect onboarding info error:', error);
    return res.status(500).json({ 
      message: 'Failed to get onboarding information',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add a simple index route that shows available endpoints
stripeConnectRouter.get('/', (req, res) => {
  console.log('[STRIPE CONNECT] Index request received');
  
  res.json({
    message: 'Stripe Connect API',
    endpoints: [
      'GET /health - Health check',
      'POST /create-account - Create new Stripe Connect account',
      'GET /account-status - Get account status',
      'POST /create-link - Create onboarding or dashboard link',
      'GET /onboarding - Redirect to onboarding page',
      'GET /onboarding-info - Get onboarding information',
      'POST /transfer - Transfer funds to worker'
    ],
    documentation: 'Contact support for API documentation'
  });
});

export default stripeConnectRouter;