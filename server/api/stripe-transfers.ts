import express from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export const setupStripeTransfersRoutes = (app: express.Express) => {
  // Authentication middleware for Stripe routes
  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    next();
  };
  
  // Create a transfer to a connected account (worker)
  app.post('/api/stripe/transfers', requireAuth, async (req, res) => {
    try {
      const { workerId, jobId, amount, description } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID is missing' });
      }
      
      if (!workerId) {
        return res.status(400).json({ message: 'Worker ID is required' });
      }
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Valid amount is required' });
      }
      
      // Get the worker record to find their connected account ID
      const worker = await storage.getUser(workerId);
      
      if (!worker) {
        return res.status(404).json({ message: 'Worker not found' });
      }
      
      if (!worker.stripeConnectAccountId) {
        return res.status(400).json({
          message: 'Worker does not have a Stripe account connected',
        });
      }
      
      // Verify that the user is authorized to make this transfer
      // Only admin users or the job poster can transfer money to workers
      let authorized = false;
      
      // If the user is the admin, they can make transfers
      if (req.user?.isAdmin) {
        authorized = true;
      }
      
      // If there's a job ID, check if the user is the job poster
      if (jobId && !authorized) {
        const job = await storage.getJob(jobId);
        
        if (job && job.posterId === userId) {
          authorized = true;
        }
      }
      
      if (!authorized) {
        return res.status(403).json({
          message: 'You are not authorized to make transfers to this worker',
        });
      }
      
      // Create the transfer to the connected account
      const amountInCents = Math.round(amount * 100);
      const transfer = await stripe.transfers.create({
        amount: amountInCents,
        currency: 'usd',
        destination: worker.stripeConnectAccountId,
        description: description || `Payment for ${jobId ? `job #${jobId}` : 'services'}`,
        metadata: {
          workerId: workerId.toString(),
          jobId: jobId ? jobId.toString() : '',
          userId: userId.toString(),
        },
      });
      
      // Record the transfer in our database
      const earningData = {
        workerId,
        jobId: jobId || null,
        amount: amountInCents,
        description: description || `Payment for ${jobId ? `job #${jobId}` : 'services'}`,
        transactionId: transfer.id,
        status: 'paid',
        datePaid: new Date().toISOString(),
      };
      
      const earning = await storage.createEarning(earningData);
      
      // If this is a job payment, update the job status
      if (jobId) {
        await storage.updateJob(jobId, { paymentStatus: 'paid' });
      }
      
      // Notify the worker
      await storage.createNotification({
        userId: workerId,
        type: 'earnings',
        title: 'Payment Received',
        message: `You have received a payment of $${(amountInCents / 100).toFixed(2)} for ${jobId ? `job #${jobId}` : 'your services'}.`,
        isRead: false,
        relatedId: jobId || undefined,
        relatedType: jobId ? 'job' : 'earnings',
      });
      
      return res.status(200).json({
        message: 'Transfer successful',
        transferId: transfer.id,
        amount: amountInCents,
        earning,
      });
    } catch (error) {
      console.error('Error creating transfer:', error);
      return res.status(500).json({
        message: 'Failed to create transfer',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
  
  // Get transfer history for a worker
  app.get('/api/stripe/transfers/worker/:workerId', requireAuth, async (req, res) => {
    try {
      const { workerId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID is missing' });
      }
      
      // Only allow the worker themselves or admin to view their transfers
      if (parseInt(workerId) !== userId && !req.user?.role === 'admin') {
        return res.status(403).json({
          message: 'You are not authorized to view this worker\'s transfers',
        });
      }
      
      // Get the worker record to find their connected account ID
      const worker = await storage.getUser(parseInt(workerId));
      
      if (!worker) {
        return res.status(404).json({ message: 'Worker not found' });
      }
      
      if (!worker.stripeConnectAccountId) {
        return res.status(400).json({
          message: 'Worker does not have a Stripe account connected',
        });
      }
      
      // Fetch transfers from Stripe
      const transfers = await stripe.transfers.list({
        destination: worker.stripeConnectAccountId,
        limit: 100,
      });
      
      // Enrich the transfers with job information if available
      const enrichedTransfers = await Promise.all(
        transfers.data.map(async (transfer) => {
          const jobId = transfer.metadata?.jobId ? parseInt(transfer.metadata.jobId) : null;
          let jobTitle = null;
          
          if (jobId) {
            const job = await storage.getJob(jobId);
            jobTitle = job?.title || null;
          }
          
          return {
            ...transfer,
            jobTitle,
            jobId,
          };
        })
      );
      
      return res.status(200).json({
        data: enrichedTransfers,
        total: transfers.total_count || enrichedTransfers.length,
      });
    } catch (error) {
      console.error('Error fetching worker transfers:', error);
      return res.status(500).json({
        message: 'Failed to fetch transfers',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
  
  // Get transfer history for a job
  app.get('/api/stripe/transfers/job/:jobId', requireAuth, async (req, res) => {
    try {
      const { jobId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID is missing' });
      }
      
      // Get the job to verify permissions
      const job = await storage.getJob(parseInt(jobId));
      
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }
      
      // Only allow the job poster or admin to view job transfers
      if (job.posterId !== userId && !req.user?.role === 'admin') {
        return res.status(403).json({
          message: 'You are not authorized to view transfers for this job',
        });
      }
      
      // Get earnings for this job from our database
      const earnings = await storage.getEarningsForJob(parseInt(jobId));
      
      // If there are no earnings yet, return an empty array
      if (!earnings.length) {
        return res.status(200).json({
          data: [],
          total: 0,
        });
      }
      
      // Get transfer IDs from earnings
      const transferIds = earnings
        .filter(e => e.transactionId)
        .map(e => e.transactionId);
      
      // Fetch transfers from Stripe if there are any
      let transfersData = [];
      
      if (transferIds.length > 0) {
        // Stripe doesn't allow fetching multiple transfers by ID directly,
        // so we'll fetch them one by one
        const transfers = await Promise.all(
          transferIds.map(id => {
            if (!id) return null;
            return stripe.transfers.retrieve(id);
          })
        );
        
        // Filter out any null values and enrich with worker information
        transfersData = await Promise.all(
          transfers
            .filter(t => t !== null)
            .map(async (transfer) => {
              if (!transfer) return null;
              
              const workerId = transfer.metadata?.workerId 
                ? parseInt(transfer.metadata.workerId) 
                : null;
                
              let workerName = null;
              
              if (workerId) {
                const worker = await storage.getUser(workerId);
                workerName = worker ? worker.fullName || worker.username : null;
              }
              
              return {
                ...transfer,
                workerName,
                workerId,
                jobTitle: job.title,
                jobId: job.id,
              };
            })
        );
      }
      
      return res.status(200).json({
        data: transfersData.filter(t => t !== null),
        total: transfersData.filter(t => t !== null).length,
      });
    } catch (error) {
      console.error('Error fetching job transfers:', error);
      return res.status(500).json({
        message: 'Failed to fetch transfers',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
  
  // Get all transfers for the current user (as a job poster)
  app.get('/api/stripe/transfers', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { period = '30days', page = '1', limit = '10' } = req.query;
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID is missing' });
      }
      
      // Get jobs posted by the user
      const jobs = await storage.getJobs({ posterId: userId });
      
      if (!jobs.length) {
        return res.status(200).json({
          data: [],
          total: 0,
        });
      }
      
      // Get job IDs
      const jobIds = jobs.map(job => job.id);
      
      // Get all earnings for these jobs
      let allEarnings: any[] = [];
      
      for (const jobId of jobIds) {
        const jobEarnings = await storage.getEarningsForJob(jobId);
        allEarnings = [...allEarnings, ...jobEarnings];
      }
      
      // Filter by date if needed
      const now = new Date();
      let startDate: Date | null = null;
      
      switch (period) {
        case '7days':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case '30days':
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
        case '90days':
          startDate = new Date(now.setDate(now.getDate() - 90));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        case 'all':
        default:
          startDate = null;
          break;
      }
      
      if (startDate) {
        allEarnings = allEarnings.filter(e => {
          const earningDate = e.datePaid ? new Date(e.datePaid) : null;
          return earningDate && earningDate >= startDate!;
        });
      }
      
      // Sort by date, most recent first
      allEarnings.sort((a, b) => {
        const dateA = a.datePaid ? new Date(a.datePaid) : new Date(0);
        const dateB = b.datePaid ? new Date(b.datePaid) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      
      // Calculate pagination
      const pageNumber = parseInt(page as string) || 1;
      const limitNumber = parseInt(limit as string) || 10;
      const startIndex = (pageNumber - 1) * limitNumber;
      const endIndex = pageNumber * limitNumber;
      
      // Slice the array for pagination
      const paginatedEarnings = allEarnings.slice(startIndex, endIndex);
      
      // For each earning, try to fetch additional info
      const transfersData = await Promise.all(
        paginatedEarnings.map(async (earning) => {
          try {
            // Get worker info
            const worker = earning.workerId 
              ? await storage.getUser(earning.workerId) 
              : null;
              
            // Get job info
            const job = earning.jobId
              ? await storage.getJob(earning.jobId)
              : null;
              
            // Get transfer info from Stripe if available
            let transfer = null;
            if (earning.transactionId) {
              try {
                transfer = await stripe.transfers.retrieve(earning.transactionId);
              } catch (e) {
                // If transfer not found, just continue
                console.log(`Transfer not found: ${earning.transactionId}`);
              }
            }
            
            return {
              id: transfer?.id || earning.id.toString(),
              amount: earning.amount,
              created: earning.datePaid || earning.createdAt,
              description: earning.description,
              status: earning.status,
              workerId: earning.workerId,
              workerName: worker ? worker.fullName || worker.username : null,
              jobId: earning.jobId,
              jobTitle: job?.title || null,
              destination: worker?.stripeConnectAccountId || null,
              metadata: transfer?.metadata || {},
            };
          } catch (error) {
            console.error('Error enriching transfer data:', error);
            // Return basic earning data if there's an error
            return {
              id: earning.id.toString(),
              amount: earning.amount,
              created: earning.datePaid || earning.createdAt,
              description: earning.description,
              status: earning.status,
              workerId: earning.workerId,
              jobId: earning.jobId,
            };
          }
        })
      );
      
      return res.status(200).json({
        data: transfersData,
        total: allEarnings.length,
      });
    } catch (error) {
      console.error('Error fetching transfers:', error);
      return res.status(500).json({
        message: 'Failed to fetch transfers',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
};