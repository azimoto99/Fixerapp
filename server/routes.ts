import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
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

  // Categories and skills endpoints
  apiRouter.get("/categories", (_req: Request, res: Response) => {
    res.json(JOB_CATEGORIES);
  });

  apiRouter.get("/skills", (_req: Request, res: Response) => {
    res.json(SKILLS);
  });

  // User endpoints
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

  apiRouter.patch("/users/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Ensure users can only update their own profile
      if (req.user.id !== id) {
        return res.status(403).json({ message: "Forbidden: You can only update your own profile" });
      }
      
      const userData = insertUserSchema.partial().parse(req.body);
      
      const updatedUser = await storage.updateUser(id, userData);
      
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

  // Job endpoints
  apiRouter.post("/jobs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const jobData = insertJobSchema.parse(req.body);
      
      // Ensure the job poster ID matches the authenticated user
      if (jobData.posterId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only create jobs with your own user ID" 
        });
      }
      
      // Service fee and total amount are calculated in storage.createJob
      const newJob = await storage.createJob(jobData);
      
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

  // Mount the API router under /api prefix
  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  return httpServer;
}
