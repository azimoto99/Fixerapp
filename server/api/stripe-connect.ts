import { Router } from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY must be set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export const stripeConnectRouter = Router();

// Create a Connect account for a worker
stripeConnectRouter.post('/create-account', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get user details
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
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
        }
        
        // If account exists but onboarding is incomplete, create a new onboarding link
        const accountLink = await stripe.accountLinks.create({
          account: user.stripeConnectAccountId,
          refresh_url: `${req.headers.origin || process.env.APP_URL || 'https://fixer.com'}/settings/payments`,
          return_url: `${req.headers.origin || process.env.APP_URL || 'https://fixer.com'}/settings/payments/success`,
          type: 'account_onboarding'
        });
        
        console.log(`Created account link for incomplete account: ${accountLink.url}`);
        return res.json({ url: accountLink.url, accountId: user.stripeConnectAccountId });
      } catch (error) {
        // If account doesn't exist in Stripe, create a new one
        console.log(`Error retrieving Connect account: ${error.message}`);
      }
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
        username: user.username
      }
    });

    // Store the account ID in the user record
    await storage.updateUser(user.id, { 
      stripeConnectAccountId: account.id,
      stripeConnectAccountStatus: 'pending'
    });

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${req.headers.origin || process.env.APP_URL || 'https://fixer.com'}/settings/payments`,
      return_url: `${req.headers.origin || process.env.APP_URL || 'https://fixer.com'}/settings/payments/success`,
      type: 'account_onboarding'
    });

    console.log(`Created new Connect account: ${account.id} with onboarding link: ${accountLink.url}`);
    res.json({ url: accountLink.url, accountId: account.id });
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    res.status(500).json({ message: `Error creating Stripe Connect account: ${error.message}` });
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
    
    if (type === 'account_onboarding') {
      // Create an onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: user.stripeConnectAccountId,
        refresh_url: `${req.headers.origin || process.env.APP_URL || 'https://fixer.com'}/settings/payments`,
        return_url: `${req.headers.origin || process.env.APP_URL || 'https://fixer.com'}/settings/payments/success`,
        type: 'account_onboarding'
      });
      
      res.json({ url: accountLink.url });
    } else if (type === 'dashboard') {
      // Create a login link to the Express dashboard
      const loginLink = await stripe.accounts.createLoginLink(user.stripeConnectAccountId);
      res.json({ url: loginLink.url });
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
    return res.status(500).json({ message: 'Webhook secret not configured' });
  }
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (error) {
    console.error(`Webhook error: ${error.message}`);
    return res.status(400).json({ message: `Webhook error: ${error.message}` });
  }
  
  // Handle specific webhook events
  switch (event.type) {
    case 'account.updated': {
      const account = event.data.object;
      
      // Find user with this Connect account
      const users = await storage.getAllUsers();
      const user = users.find(u => u.stripeConnectAccountId === account.id);
      
      if (user) {
        // Update the user's account status
        await storage.updateUser(user.id, {
          stripeConnectAccountStatus: account.details_submitted ? 'active' : 'pending'
        });
        
        console.log(`Updated Connect account status for user ${user.id} to ${account.details_submitted ? 'active' : 'pending'}`);
      }
      break;
    }
    
    case 'transfer.created':
    case 'transfer.updated': {
      const transfer = event.data.object;
      
      // Find payment with this transfer ID
      const jobId = transfer.metadata.jobId;
      const workerId = transfer.metadata.workerId;
      
      if (jobId && workerId) {
        // Update payment status
        const payments = await storage.getPaymentsForUser(parseInt(workerId));
        const payment = payments.find(p => p.transactionId === transfer.id);
        
        if (payment) {
          await storage.updatePaymentStatus(payment.id, transfer.status === 'paid' ? 'completed' : transfer.status);
          console.log(`Updated payment status for payment ${payment.id} to ${transfer.status}`);
        }
      }
      break;
    }
  }
  
  res.json({ received: true });
});