import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import Stripe from "stripe";
import { 
  insertUserSchema, 
  insertJobSchema, 
  insertApplicationSchema, 
  insertReviewSchema,
  insertTaskSchema,
  insertEarningSchema,
  insertPaymentSchema,
  JOB_CATEGORIES,
  SKILLS
} from "@shared/schema";
import { setupAuth } from "./auth";

// Initialize Stripe with the secret key
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-04-30.basil", // Using the latest API version
});

// Helper function to validate location parameters
const locationParamsSchema = z.object({
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  radius: z.coerce.number().default(2)
});

// Check if user is authenticated middleware
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Create API router
  const apiRouter = express.Router();

  // Handle account type selection
  apiRouter.post("/set-account-type", async (req: Request, res: Response) => {
    const schema = z.object({
      userId: z.number(),
      accountType: z.enum(["worker", "poster"]),
      provider: z.string()
    });

    try {
      const { userId, accountType, provider } = schema.parse(req.body);
      
      // Get the user
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update the user with the selected account type
      const updatedUser = await storage.updateUser(userId, { accountType });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }
      
      // If a user is not currently logged in, log them in
      if (!req.isAuthenticated()) {
        // Log the user in
        req.login(updatedUser, (err) => {
          if (err) {
            return res.status(500).json({ message: "Failed to log in user" });
          }
          return res.status(200).json(updatedUser);
        });
      } else {
        return res.status(200).json(updatedUser);
      }
    } catch (error) {
      console.error("Error setting account type:", error);
      return res.status(400).json({ message: "Invalid input data" });
    }
  });

  // Categories and skills endpoints
  apiRouter.get("/categories", (_req: Request, res: Response) => {
    res.json(JOB_CATEGORIES);
  });

  apiRouter.get("/skills", (_req: Request, res: Response) => {
    res.json(SKILLS);
  });

  // User endpoints
  apiRouter.get("/users", async (_req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      
      // Don't return passwords in response
      const safeUsers = users.map(user => {
        const { password, ...userData } = user;
        return userData;
      });
      
      res.json(safeUsers);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.get("/users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password in response
      const { password, ...userData } = user;
      res.json(userData);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.patch("/users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Only enforce authentication check if user is not completing their profile from social login
      if (req.isAuthenticated()) {
        // Ensure authenticated users can only update their own profile
        if (req.user.id !== id) {
          return res.status(403).json({ message: "Forbidden: You can only update your own profile" });
        }
      }
      
      // Parse the user data, but allow the requiresProfileCompletion flag
      const { requiresProfileCompletion, ...standardFields } = req.body;
      const userData = insertUserSchema.partial().parse(standardFields);
      
      // Merge back the profileCompletion flag if it exists
      const dataToUpdate = requiresProfileCompletion !== undefined 
        ? { ...userData, requiresProfileCompletion } 
        : userData;
      
      const updatedUser = await storage.updateUser(id, dataToUpdate);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password in response
      const { password, ...updatedUserData } = updatedUser;
      res.json(updatedUserData);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Add extended schema for job with payment method
  const jobWithPaymentSchema = insertJobSchema.extend({
    paymentMethodId: z.string().optional()
  });

  // Job endpoints
  apiRouter.post("/jobs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Parse the request with the extended schema that includes paymentMethodId
      const { paymentMethodId, ...jobData } = jobWithPaymentSchema.parse(req.body);
      
      // Ensure the job poster ID matches the authenticated user
      if (jobData.posterId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only create jobs with your own user ID" 
        });
      }
      
      // Allow any user to post jobs regardless of their account type (both workers and posters)
      // Service fee and total amount are calculated in storage.createJob
      const newJob = await storage.createJob(jobData);
      
      // For fixed price jobs with payment method ID, process payment upfront
      if (jobData.paymentType === 'fixed' && paymentMethodId) {
        try {
          // Calculate the total amount including the service fee
          const amountInCents = Math.round((jobData.paymentAmount + 2.50) * 100);
          
          // Create a payment intent with the payment method
          const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: "usd",
            payment_method: paymentMethodId,
            confirm: true, // Confirm the payment immediately
            confirmation_method: 'manual',
            metadata: {
              jobId: newJob.id.toString(),
              posterId: newJob.posterId.toString(),
              jobTitle: newJob.title,
              paymentAmount: newJob.paymentAmount.toString(),
              serviceFee: newJob.serviceFee.toString(),
              platform: "The Job"
            },
            receipt_email: req.user.email,
            description: `Upfront payment for job: ${newJob.title}`
          });
          
          // Create a payment record
          await storage.createPayment({
            type: "job_payment_upfront",
            status: paymentIntent.status === "succeeded" ? "completed" : "pending",
            description: `Upfront payment for job: ${newJob.title}`,
            jobId: newJob.id,
            amount: newJob.totalAmount,
            userId: req.user.id,
            paymentMethod: "stripe",
            transactionId: paymentIntent.id,
            metadata: {
              clientSecret: paymentIntent.client_secret
            }
          });
          
          // Update the job with payment status if payment succeeded
          if (paymentIntent.status === "succeeded") {
            await storage.updateJob(newJob.id, { 
              paymentStatus: "paid"
            });
          }
        } catch (paymentError) {
          console.error("Error processing job payment:", paymentError);
          // We still return the created job even if payment processing fails
          // The payment can be handled separately later
        }
      }
      
      res.status(201).json(newJob);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.get("/jobs", async (req: Request, res: Response) => {
    try {
      const { category, status, posterId, workerId, search } = req.query;
      
      const filters: {
        category?: string;
        status?: string;
        posterId?: number;
        workerId?: number;
        search?: string;
      } = {};
      
      if (category) filters.category = category.toString();
      if (status) filters.status = status.toString();
      if (posterId) filters.posterId = parseInt(posterId.toString());
      if (workerId) filters.workerId = parseInt(workerId.toString());
      if (search) filters.search = search.toString();
      
      const jobs = await storage.getJobs(filters);
      res.json(jobs);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.get("/jobs/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const job = await storage.getJob(id);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      res.json(job);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.patch("/jobs/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the job first to check ownership
      const job = await storage.getJob(id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Ensure the authenticated user is the job poster
      if (job.posterId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only update jobs you posted" 
        });
      }
      
      const jobData = insertJobSchema.partial().parse(req.body);
      
      // Service fee and total amount are recalculated in storage.updateJob
      const updatedJob = await storage.updateJob(id, jobData);
      
      res.json(updatedJob);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.delete("/jobs/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the job first to check ownership
      const job = await storage.getJob(id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Ensure the authenticated user is the job poster
      if (job.posterId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only delete jobs you posted" 
        });
      }
      
      const success = await storage.deleteJob(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Nearby jobs endpoint
  apiRouter.get("/jobs/nearby/location", async (req: Request, res: Response) => {
    try {
      const { latitude, longitude, radius } = locationParamsSchema.parse(req.query);
      const jobs = await storage.getJobsNearLocation(latitude, longitude, radius);
      res.json(jobs);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Application endpoints
  apiRouter.post("/applications", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const applicationData = insertApplicationSchema.parse(req.body);
      
      // Ensure the worker ID matches the authenticated user
      if (applicationData.workerId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only apply with your own user ID" 
        });
      }
      
      const newApplication = await storage.createApplication(applicationData);
      res.status(201).json(newApplication);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.get("/applications/job/:jobId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.jobId);
      
      // Get the job to check if the user is the poster
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Only job posters can see applications for their jobs
      if (job.posterId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only view applications for jobs you posted" 
        });
      }
      
      const applications = await storage.getApplicationsForJob(jobId);
      res.json(applications);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.get("/applications/worker/:workerId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const workerId = parseInt(req.params.workerId);
      
      // Users can only see their own applications
      if (workerId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only view your own applications" 
        });
      }
      
      const applications = await storage.getApplicationsForWorker(workerId);
      res.json(applications);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.patch("/applications/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const application = await storage.getApplication(id);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Get the related job
      const job = await storage.getJob(application.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Check if the user is either the worker who applied or the job poster
      const isWorker = application.workerId === req.user.id;
      const isJobPoster = job.posterId === req.user.id;
      
      if (!isWorker && !isJobPoster) {
        return res.status(403).json({ 
          message: "Forbidden: You can only update applications you created or received" 
        });
      }
      
      const applicationData = insertApplicationSchema.partial().parse(req.body);
      
      // Only job posters can change the status
      if (applicationData.status && !isJobPoster) {
        return res.status(403).json({ 
          message: "Forbidden: Only job posters can change application status" 
        });
      }
      
      const updatedApplication = await storage.updateApplication(id, applicationData);
      res.json(updatedApplication);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Review endpoints
  apiRouter.post("/reviews", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const reviewData = insertReviewSchema.parse(req.body);
      
      // Ensure the reviewer ID matches the authenticated user
      if (reviewData.reviewerId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only create reviews with your own user ID" 
        });
      }
      
      const newReview = await storage.createReview(reviewData);
      res.status(201).json(newReview);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.get("/reviews/user/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const reviews = await storage.getReviewsForUser(userId);
      res.json(reviews);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.get("/reviews/job/:jobId", async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const reviews = await storage.getReviewsForJob(jobId);
      res.json(reviews);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Task endpoints
  apiRouter.get("/tasks/job/:jobId", async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const tasks = await storage.getTasksForJob(jobId);
      res.json(tasks);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.post("/tasks", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      
      // Get the job to verify that the user is the job poster
      const job = await storage.getJob(taskData.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Only job posters can add tasks
      if (job.posterId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: Only job posters can add tasks" 
        });
      }
      
      const newTask = await storage.createTask(taskData);
      res.status(201).json(newTask);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.patch("/tasks/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Get the related job
      const job = await storage.getJob(task.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Check if user is the job poster or worker
      const isPoster = job.posterId === req.user.id;
      const isWorker = job.workerId === req.user.id;
      
      if (!isPoster && !isWorker) {
        return res.status(403).json({ 
          message: "Forbidden: Only the job poster or worker can update tasks" 
        });
      }
      
      // Handle the update based on the user's role
      if (isPoster) {
        // Job posters can update any task details
        const taskData = insertTaskSchema.partial().parse(req.body);
        const updatedTask = await storage.updateTask(id, taskData);
        return res.json(updatedTask);
      } else {
        // Workers can only mark tasks as complete
        if (req.body.isCompleted === true) {
          const completedTask = await storage.completeTask(id, req.user.id);
          return res.json(completedTask);
        } else {
          return res.status(403).json({ 
            message: "Forbidden: Workers can only mark tasks as complete" 
          });
        }
      }
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.post("/tasks/reorder", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { jobId, taskIds } = req.body;
      
      if (!jobId || !Array.isArray(taskIds)) {
        return res.status(400).json({ message: "Invalid request data" });
      }
      
      // Get the job to verify that the user is the job poster
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Only job posters can reorder tasks
      if (job.posterId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: Only job posters can reorder tasks" 
        });
      }
      
      const reorderedTasks = await storage.reorderTasks(jobId, taskIds);
      res.json(reorderedTasks);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Earnings endpoints
  apiRouter.get("/earnings/worker/:workerId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const workerId = parseInt(req.params.workerId);
      
      // Users can only access their own earnings
      if (workerId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only view your own earnings" 
        });
      }
      
      const earnings = await storage.getEarningsForWorker(workerId);
      res.json(earnings);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.get("/earnings/job/:jobId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.jobId);
      
      // Get the job to check if the user is related to this job
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Only job posters or the assigned worker can see job earnings
      const isJobPoster = job.posterId === req.user.id;
      const isWorker = job.workerId === req.user.id;
      
      if (!isJobPoster && !isWorker) {
        return res.status(403).json({ 
          message: "Forbidden: Only the job poster or assigned worker can view job earnings" 
        });
      }
      
      const earnings = await storage.getEarningsForJob(jobId);
      res.json(earnings);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.post("/earnings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const earningData = insertEarningSchema.parse(req.body);
      
      // Get the job to check permission
      const job = await storage.getJob(earningData.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Only the job poster can create an earning record
      if (job.posterId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: Only the job poster can create earnings" 
        });
      }
      
      // Ensure the correct worker ID is used
      if (earningData.workerId !== job.workerId) {
        return res.status(400).json({ 
          message: "Worker ID does not match the worker assigned to this job" 
        });
      }
      
      const newEarning = await storage.createEarning(earningData);
      res.status(201).json(newEarning);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.patch("/earnings/:id/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !['pending', 'paid', 'cancelled'].includes(status)) {
        return res.status(400).json({ 
          message: "Invalid status. Must be 'pending', 'paid', or 'cancelled'." 
        });
      }
      
      // Only admin can update earning status (for future implementation)
      // For now, assume job poster can update status
      const earning = await storage.getEarning(id);
      if (!earning) {
        return res.status(404).json({ message: "Earning not found" });
      }
      
      const job = await storage.getJob(earning.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Only the job poster can update earning status
      if (job.posterId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: Only the job poster can update earning status" 
        });
      }
      
      let datePaid = undefined;
      if (status === 'paid') {
        datePaid = new Date();
      }
      
      const updatedEarning = await storage.updateEarningStatus(id, status, datePaid);
      res.json(updatedEarning);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Payment endpoints
  apiRouter.get("/payments/user/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only view their own payments
      if (userId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only view your own payments" 
        });
      }
      
      const payments = await storage.getPaymentsForUser(userId);
      res.json(payments);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // Get individual payment details
  apiRouter.get("/payments/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const payment = await storage.getPayment(id);
      
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // Users can only view payments they've made or received
      if (payment.userId !== req.user.id) {
        // Check if the payment is for a job and the user is the worker for that job
        if (payment.jobId) {
          const job = await storage.getJob(payment.jobId);
          if (!job || job.workerId !== req.user.id) {
            return res.status(403).json({
              message: "Forbidden: You can only view payments you made or received"
            });
          }
        } else {
          return res.status(403).json({
            message: "Forbidden: You can only view payments you made or received"
          });
        }
      }
      
      res.json(payment);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.post("/payments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const paymentData = insertPaymentSchema.parse(req.body);
      
      // Ensure the user ID matches the authenticated user
      if (paymentData.userId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only create payments with your own user ID" 
        });
      }
      
      // If job-related payment, validate permissions
      if (paymentData.jobId) {
        const job = await storage.getJob(paymentData.jobId);
        if (!job) {
          return res.status(404).json({ message: "Job not found" });
        }
        
        // Check if user is related to the job
        const isJobPoster = job.posterId === req.user.id;
        const isWorker = job.workerId === req.user.id;
        
        if (!isJobPoster && !isWorker) {
          return res.status(403).json({ 
            message: "Forbidden: You must be related to the job to create this payment" 
          });
        }
      }
      
      const newPayment = await storage.createPayment(paymentData);
      res.status(201).json(newPayment);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.patch("/payments/:id/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status, transactionId } = req.body;
      
      if (!status || !['pending', 'completed', 'failed'].includes(status)) {
        return res.status(400).json({ 
          message: "Invalid status. Must be 'pending', 'completed', or 'failed'." 
        });
      }
      
      // Get the payment to check ownership
      const payment = await storage.getPayment(id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // Users can only update their own payments
      if (payment.userId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only update your own payments" 
        });
      }
      
      const updatedPayment = await storage.updatePaymentStatus(id, status, transactionId);
      res.json(updatedPayment);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Stripe payment processing endpoints
  apiRouter.post("/stripe/create-payment-intent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { jobId } = req.body;
      
      if (!jobId) {
        return res.status(400).json({ message: "Job ID is required" });
      }
      
      // Get the job to calculate payment amount
      const job = await storage.getJob(parseInt(jobId));
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Only job posters can create payment intents
      if (job.posterId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: Only job posters can create payment intents" 
        });
      }
      
      // Check if there's an existing pending payment for this job
      const existingPayments = await storage.getPaymentsForUser(req.user.id);
      const existingPayment = existingPayments.find(p => 
        p.jobId === job.id && 
        (p.status === 'pending' || p.status === 'processing')
      );
      
      // If there's an existing pending payment, check if we can reuse the payment intent
      if (existingPayment && existingPayment.transactionId) {
        try {
          // Attempt to retrieve the payment intent
          const existingIntent = await stripe.paymentIntents.retrieve(existingPayment.transactionId);
          
          // Only reuse if it's in a usable state
          if (existingIntent && 
              (existingIntent.status === 'requires_payment_method' || 
               existingIntent.status === 'requires_confirmation' ||
               existingIntent.status === 'requires_action')) {
            
            return res.json({ 
              clientSecret: existingIntent.client_secret,
              paymentId: existingPayment.id,
              existing: true 
            });
          }
        } catch (err) {
          // If we can't retrieve the intent, create a new one
          console.log("Error retrieving existing payment intent, creating new one:", err);
        }
      }
      
      // Calculate the total amount including the service fee
      // Amount must be in cents for Stripe
      const amountInCents = Math.round(job.totalAmount * 100);
      
      // Get worker info for metadata if available
      let workerName = 'N/A';
      if (job.workerId) {
        const worker = await storage.getUser(job.workerId);
        if (worker) workerName = worker.fullName;
      }
      
      // Create a payment intent with enhanced metadata
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "usd",
        metadata: {
          jobId: job.id.toString(),
          posterId: job.posterId.toString(),
          workerId: job.workerId ? job.workerId.toString() : null,
          jobTitle: job.title,
          workerName: workerName,
          paymentAmount: job.paymentAmount.toString(),
          serviceFee: job.serviceFee.toString(),
          platform: "The Job"
        },
        // Add receipt email if available
        receipt_email: req.user.email,
        description: `Payment for job: ${job.title}`
      });
      
      // Create a pending payment record or update existing one
      let payment;
      if (existingPayment) {
        payment = await storage.updatePaymentStatus(
          existingPayment.id, 
          'pending', 
          paymentIntent.id
        );
      } else {
        payment = await storage.createPayment({
          type: "job_payment",
          status: "pending",
          description: `Payment for job: ${job.title}`,
          jobId: job.id,
          amount: job.totalAmount,
          userId: req.user.id,
          paymentMethod: "stripe",
          transactionId: paymentIntent.id,
          metadata: {
            clientSecret: paymentIntent.client_secret
          }
        });
      }
      
      // Return the client secret to the frontend
      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentId: payment.id,
        existing: false
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.post("/stripe/confirm-payment", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { paymentId, paymentIntentId } = req.body;
      
      if (!paymentId || !paymentIntentId) {
        return res.status(400).json({ 
          message: "Payment ID and payment intent ID are required" 
        });
      }
      
      // Retrieve the payment from our database
      const payment = await storage.getPayment(parseInt(paymentId));
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // Check if the user is authorized to confirm this payment
      if (payment.userId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only confirm your own payments" 
        });
      }
      
      // Verify the payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === "succeeded") {
        // Update our payment record to completed
        const updatedPayment = await storage.updatePaymentStatus(
          payment.id, 
          "completed", 
          paymentIntent.id
        );
        
        // If this is a job payment, also create an earning record for the worker
        if (payment.jobId) {
          const job = await storage.getJob(payment.jobId);
          if (job && job.workerId) {
            // Create an earning record for the worker
            // Calculate the net amount (payment amount minus service fee)
            const netAmount = job.paymentAmount - job.serviceFee;
            
            await storage.createEarning({
              jobId: job.id,
              workerId: job.workerId,
              amount: job.paymentAmount, // Base amount without service fee
              serviceFee: job.serviceFee, // Service fee amount
              netAmount: netAmount, // Net amount after service fee
              description: `Payment for job: ${job.title}`
            });
          }
        }
        
        res.json({ success: true, payment: updatedPayment });
      } else {
        // Payment intent is not succeeded
        res.status(400).json({ 
          message: `Payment not successful. Status: ${paymentIntent.status}` 
        });
      }
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Webhook endpoint to handle Stripe events
  app.post("/webhook/stripe", express.raw({type: 'application/json'}), async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    
    try {
      // Parse the event - with or without webhook secret
      let event;
      if (process.env.STRIPE_WEBHOOK_SECRET) {
        // If we have a webhook secret, verify the signature
        event = stripe.webhooks.constructEvent(
          req.body, 
          sig as string, 
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } else {
        // Without webhook secret, just parse the event
        event = JSON.parse(req.body.toString());
      }
      
      // Handle different payment events
      if (event.type === 'payment_intent.succeeded') {
        await handleSuccessfulPayment(event.data.object);
      } 
      else if (event.type === 'payment_intent.payment_failed') {
        await handleFailedPayment(event.data.object);
      }
      else if (event.type === 'payment_intent.canceled') {
        await handleCanceledPayment(event.data.object);
      }
      
      // Return success response
      res.json({received: true});
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).send(`Webhook Error: ${(error as Error).message}`);
    }
  });
  
  // Helper function to handle successful payments
  async function handleSuccessfulPayment(paymentIntent: Stripe.PaymentIntent) {
    const { id: paymentIntentId, metadata } = paymentIntent;
    
    try {
      // Find the payment in our database by transaction ID
      const payment = await storage.getPaymentByTransactionId(paymentIntentId);
      
      if (payment) {
        // Payment record exists, update its status
        await storage.updatePaymentStatus(payment.id, 'completed', paymentIntentId);
        console.log(`Payment ${payment.id} marked as completed via webhook`);
        
        // If this is a job payment, also create an earning record for the worker
        if (payment.jobId) {
          const job = await storage.getJob(payment.jobId);
          if (job && job.workerId) {
            // Check if we already have an earning record
            const existingEarnings = await storage.getEarningsForJob(job.id);
            const hasEarning = existingEarnings.some(e => e.workerId === job.workerId);
            
            if (!hasEarning) {
              // Calculate the net amount (payment amount minus service fee)
              const netAmount = job.paymentAmount - job.serviceFee;
              
              await storage.createEarning({
                jobId: job.id,
                workerId: job.workerId,
                amount: job.paymentAmount,
                serviceFee: job.serviceFee,
                netAmount: netAmount
              });
              
              console.log(`Earning created for worker ${job.workerId} for job ${job.id}`);
            }
          }
        }
      } else if (metadata && metadata.jobId) {
        // Payment record doesn't exist yet, but we have job info
        // This could happen if the client closed before the payment was confirmed
        const jobId = parseInt(metadata.jobId);
        const job = await storage.getJob(jobId);
        
        if (job) {
          // Create a payment record
          const createdPayment = await storage.createPayment({
            type: "job_payment",
            status: "completed",
            description: `Payment for job: ${job.title}`,
            jobId: job.id,
            amount: job.totalAmount,
            userId: job.posterId,
            paymentMethod: "stripe",
            transactionId: paymentIntentId,
            metadata: {
              clientSecret: paymentIntent.client_secret
            }
          });
          
          console.log(`Created payment record ${createdPayment.id} from webhook`);
          
          // Create earning for worker if assigned
          if (job.workerId) {
            const netAmount = job.paymentAmount - job.serviceFee;
            
            await storage.createEarning({
              jobId: job.id,
              workerId: job.workerId,
              amount: job.paymentAmount,
              serviceFee: job.serviceFee,
              netAmount: netAmount
            });
            
            console.log(`Earning created for worker ${job.workerId} for job ${job.id}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error handling successful payment: ${(error as Error).message}`);
    }
  }
  
  // Helper function to handle failed payments
  async function handleFailedPayment(paymentIntent: Stripe.PaymentIntent) {
    const { id: paymentIntentId } = paymentIntent;
    
    try {
      // Find the payment in our database
      const payment = await storage.getPaymentByTransactionId(paymentIntentId);
      
      if (payment) {
        // Update the payment status to failed
        await storage.updatePaymentStatus(payment.id, 'failed', paymentIntentId);
        console.log(`Payment ${payment.id} marked as failed via webhook`);
      }
    } catch (error) {
      console.error(`Error handling failed payment: ${(error as Error).message}`);
    }
  }
  
  // Helper function to handle canceled payments
  async function handleCanceledPayment(paymentIntent: Stripe.PaymentIntent) {
    const { id: paymentIntentId } = paymentIntent;
    
    try {
      // Find the payment in our database
      const payment = await storage.getPaymentByTransactionId(paymentIntentId);
      
      if (payment) {
        // Update the payment status to canceled
        await storage.updatePaymentStatus(payment.id, 'canceled', paymentIntentId);
        console.log(`Payment ${payment.id} marked as canceled via webhook`);
      }
    } catch (error) {
      console.error(`Error handling canceled payment: ${(error as Error).message}`);
    }
  }

  // Mount the API router under /api prefix
  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  return httpServer;
}
