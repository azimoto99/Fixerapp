import express, { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { isAdmin } from '../auth-helpers';
import Stripe from 'stripe';
import * as os from 'os';
import { db } from '../db';
import { sql } from 'drizzle-orm';

// Init Stripe client
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16" as any,
});

const router = Router();

// Middleware to check if user is an admin
function adminAuthMiddleware(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Simple admin check - customize this based on your needs
  const user = req.user as any;
  if (user.role === 'admin' || user.email?.includes('admin')) {
    return next();
  }
  
  return res.status(403).json({ message: "Access denied: Admin privileges required" });
}

// Apply admin authentication middleware to all routes
router.use(adminAuthMiddleware);

// Get dashboard statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Get counts from database
    const [
      usersCount,
      activeJobs,
      completedJobs,
      totalPayments,
      newUsers
    ] = await Promise.all([
      storage.getUserCount(),
      storage.getJobCount({ status: 'open' }),
      storage.getJobCount({ status: 'completed' }),
      storage.getTotalPaymentsAmount(),
      storage.getNewUserCount({ days: 30 })
    ]);

    // Calculate revenue (total amount of service fees)
    const revenue = await storage.getTotalServiceFees();

    // Get recent activity
    const recentActivity = await storage.getRecentActivity(30);

    // Get analytics data
    const analytics = {
      jobCompletionRate: await storage.getJobCompletionRate(),
      averageJobValue: await storage.getAverageJobValue(),
      userRetentionRate: 0.75, // Placeholder - implement real logic
      averageResponseTime: 23, // in minutes - placeholder
      applicationSuccessRate: await storage.getApplicationSuccessRate(), 
      paymentSuccessRate: 0.98, // Placeholder - implement real logic
    };

    res.json({
      totalUsers: usersCount,
      activeJobs,
      completedJobs,
      revenue,
      revenueGrowth: revenue * 0.12, // Placeholder - implement real growth calculation
      newUsers,
      recentActivity,
      analytics
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ message: "Failed to fetch admin statistics" });
  }
});

// Get all users with optional search
router.get('/users', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const users = await storage.getAllUsers(search);
    
    // Remove sensitive data like passwords
    const sanitizedUsers = users.map(user => {
      const { password, ...userData } = user;
      return userData;
    });
    
    res.json(sanitizedUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// Get all jobs with optional search
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const jobs = await storage.getJobs(search ? { searchTerm: search } : undefined);
    
    // Add poster names for display
    const jobsWithDetails = await Promise.all(jobs.map(async (job) => {
      const poster = await storage.getUser(job.posterId);
      return {
        ...job,
        posterName: poster ? poster.fullName || poster.username : null
      };
    }));
    
    res.json(jobsWithDetails);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
});

// Get all payments with optional search
router.get('/payments', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const payments = await storage.getAllPayments(search);
    res.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ message: "Failed to fetch payments" });
  }
});

// Get system status and information
router.get('/system', async (req: Request, res: Response) => {
  try {
    // Check database connection
    let dbStatus = 'error';
    try {
      await db.execute(sql`SELECT 1`);
      dbStatus = 'ok';
    } catch (err) {
      console.error("Database health check failed:", err);
    }

    // Check Stripe API
    let stripeStatus = 'error';
    try {
      await stripe.balance.retrieve();
      stripeStatus = 'ok';
    } catch (err) {
      console.error("Stripe health check failed:", err);
    }

    // Memory usage stats
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();

    // Basic system info
    const systemInfo = {
      healthy: dbStatus === 'ok' && stripeStatus === 'ok',
      components: {
        database: { status: dbStatus },
        server: { status: 'ok' },
        stripe: { status: stripeStatus }
      },
      services: {
        stripe: { status: stripeStatus, version: stripe.getApiField('version') },
        database: { status: dbStatus, type: 'PostgreSQL' }
      },
      resources: {
        memory: {
          total: formatBytes(totalMemory),
          free: formatBytes(freeMemory),
          used: formatBytes(totalMemory - freeMemory),
          usage: Math.round(((totalMemory - freeMemory) / totalMemory) * 100)
        },
        process: {
          uptime: process.uptime(),
          memory: {
            rss: formatBytes(memoryUsage.rss),
            heapTotal: formatBytes(memoryUsage.heapTotal),
            heapUsed: formatBytes(memoryUsage.heapUsed)
          }
        }
      },
      config: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT || '5000',
        hostname: os.hostname(),
        platform: process.platform,
        nodeVersion: process.version
      }
    };

    res.json(systemInfo);
  } catch (error) {
    console.error("Error fetching system status:", error);
    res.status(500).json({ message: "Failed to fetch system status" });
  }
});

// Handle user actions
router.post('/users/action', async (req: Request, res: Response) => {
  try {
    const { userId, action } = z.object({
      userId: z.number(),
      action: z.string()
    }).parse(req.body);

    switch (action) {
      case 'activate':
        await storage.updateUser(userId, { isActive: true });
        break;
      case 'deactivate':
        await storage.updateUser(userId, { isActive: false });
        break;
      case 'verify':
        await storage.updateUser(userId, { identityVerified: true });
        break;
      case 'reset-password':
        // Generate a random temporary password
        const tempPassword = Math.random().toString(36).slice(-8);
        // Update the user with the new hashed password
        await storage.resetUserPassword(userId, tempPassword);
        // In a real system, you would email this password to the user
        break;
      case 'delete':
        await storage.deleteUser(userId);
        break;
      default:
        return res.status(400).json({ message: `Unknown action: ${action}` });
    }

    res.json({ success: true, message: `Action ${action} performed on user ${userId}` });
  } catch (error) {
    console.error(`Error performing user action:`, error);
    res.status(500).json({ message: "Failed to perform user action" });
  }
});

// Handle job actions
router.post('/jobs/action', async (req: Request, res: Response) => {
  try {
    const { jobId, action } = z.object({
      jobId: z.number(),
      action: z.string()
    }).parse(req.body);

    switch (action) {
      case 'feature':
        // Set job as featured - implementation depends on your schema
        await storage.updateJob(jobId, { featured: true });
        break;
      case 'close':
        await storage.updateJob(jobId, { status: 'canceled' });
        break;
      case 'reopen':
        await storage.updateJob(jobId, { status: 'open' });
        break;
      case 'delete':
        await storage.deleteJob(jobId);
        break;
      default:
        return res.status(400).json({ message: `Unknown action: ${action}` });
    }

    res.json({ success: true, message: `Action ${action} performed on job ${jobId}` });
  } catch (error) {
    console.error(`Error performing job action:`, error);
    res.status(500).json({ message: "Failed to perform job action" });
  }
});

// Handle payment actions
router.post('/payments/action', async (req: Request, res: Response) => {
  try {
    const { paymentId, action } = z.object({
      paymentId: z.number(),
      action: z.string()
    }).parse(req.body);

    // Get the payment details first
    const payment = await storage.getPayment(paymentId);
    
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    switch (action) {
      case 'view':
        // Just return the payment details
        return res.json(payment);
      case 'process':
        if (payment.status !== 'pending') {
          return res.status(400).json({ message: "Can only process pending payments" });
        }
        // Update payment status to processing
        await storage.updatePaymentStatus(paymentId, 'processing');
        break;
      case 'complete':
        if (payment.status !== 'processing') {
          return res.status(400).json({ message: "Can only complete processing payments" });
        }
        // Update payment status to completed
        await storage.updatePaymentStatus(paymentId, 'completed');
        break;
      case 'refund':
        if (!['completed', 'processing'].includes(payment.status)) {
          return res.status(400).json({ message: "Can only refund completed or processing payments" });
        }
        
        if (payment.stripePaymentIntentId) {
          // Create the refund in Stripe
          await stripe.refunds.create({
            payment_intent: payment.stripePaymentIntentId,
            reason: 'requested_by_customer'
          });
        }
        
        // Update payment status to refunded
        await storage.updatePaymentStatus(paymentId, 'refunded');
        break;
      case 'delete':
        // This should be a soft delete to preserve payment records
        await storage.deletePayment(paymentId);
        break;
      default:
        return res.status(400).json({ message: `Unknown action: ${action}` });
    }

    res.json({ success: true, message: `Action ${action} performed on payment ${paymentId}` });
  } catch (error) {
    console.error(`Error performing payment action:`, error);
    res.status(500).json({ message: "Failed to perform payment action" });
  }
});

// Utility function to format bytes to a human-readable format
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const adminRouter = router;