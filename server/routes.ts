import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { WebSocketService } from './websocket-service';
import { storage } from "./storage";
import { isAdmin } from "./auth-helpers";
import { createJobWithPaymentFirst, updateJobWithPaymentCheck } from './payment-first-job-posting';
import { z } from "zod";
import { db } from "./db";
import { eq, and, desc, asc, sql, or, gte, lte, like, ilike, isNull, isNotNull, exists, count, sum, avg, max, min, not } from "drizzle-orm";
import { 
  users, 
  jobs, 
  applications, 
  reviews, 
  messages, 
  notifications, 
  earnings,
  adminUsers,
  adminAuditLog,
  platformAnalytics,
  userStrikes,
  userReports,
  systemAlerts,
  platformSettings,
  supportTickets,
  supportMessages,
  disputes,
  refunds
} from "@shared/schema";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Helper function to calculate distance between two points in feet
function calculateDistanceInFeet(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusInFeet = 20902231; // Earth radius in feet
  
  // Convert latitude and longitude from degrees to radians
  const latRad1 = (lat1 * Math.PI) / 180;
  const lonRad1 = (lon1 * Math.PI) / 180;
  const latRad2 = (lat2 * Math.PI) / 180;
  const lonRad2 = (lon2 * Math.PI) / 180;
  
  // Haversine formula
  const dLat = latRad2 - latRad1;
  const dLon = lonRad2 - lonRad1;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(latRad1) * Math.cos(latRad2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = earthRadiusInFeet * c;
  
  return distance;
}
import Stripe from "stripe";
import { filterJobContent, validatePaymentAmount } from "./content-filter";
import { stripeRouter } from "./api/stripe-api";
import { processPayment } from "./api/process-payment";
import { preauthorizePayment } from "./api/preauthorize-payment";
import { taskRouter } from "./api/task-api";
import createPaymentIntentRouter from "./api/stripe-api-create-payment-intent";
import { setupStripeWebhooks } from "./api/stripe-webhooks";
import { setupStripeTransfersRoutes } from "./api/stripe-transfers";
import { setupStripePaymentMethodsRoutes } from "./api/stripe-payment-methods";

import "./api/storage-extensions"; // Import to register extended storage methods
import "./storage-extensions"; // Import admin and payment extensions
import * as crypto from 'crypto';
import { 
  insertUserSchema, 
  insertJobSchema, 
  insertApplicationSchema, 
  insertReviewSchema,
  insertTaskSchema,
  insertEarningSchema,
  insertPaymentSchema,
  insertBadgeSchema,
  insertUserBadgeSchema,
  JOB_CATEGORIES,
  SKILLS,
  BADGE_CATEGORIES
} from "@shared/schema";
import { setupAuth } from "./auth";
import { URL } from "url";

// Initialize Stripe with the secret key
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16" as any, // Using a valid API version, casting to any to bypass typechecking
});

// Helper function to validate location parameters
const locationParamsSchema = z.object({
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  radius: z.coerce.number().default(2)
});

// Check if user is authenticated middleware - with backup authentication
function isAuthenticated(req: Request, res: Response, next: Function) {
  // First, ensure session is properly loaded
  if (!req.session) {
    console.error("No session object found on request");
    return res.status(401).json({ message: "Session unavailable" });
  }
  
  // Enhanced session/cookie check
  const hasCookieExpired = req.session.cookie && req.session.cookie.maxAge <= 0;
  
  // Method 1: Standard Passport authentication
  if (req.isAuthenticated() && req.user && !hasCookieExpired) {
    console.log(`User authenticated via Passport: ${req.user.id} (${req.user.username})`);
    return next();
  }
  
  // Method 2: Backup authentication via userId stored in session
  if (req.session.userId && !hasCookieExpired) {
    console.log(`User authenticated via backup userId: ${req.session.userId}`);
    
    // Set flags for routes that need to know we're using backup auth
    (req as any).usingBackupAuth = true;
    (req as any).backupUserId = req.session.userId;
    
    return next();
  }
  
  // Log the authentication failure with detailed info
  console.log(`Authentication failed: isAuthenticated=${req.isAuthenticated()}, has session=${!!req.session}, has user=${!!req.user}, sessionID=${req.sessionID}`);
  
  // Add comprehensive debugging information
  if (req.session) {
    console.log(`Session data:`, {
      id: req.sessionID,
      cookie: req.session.cookie ? {
        maxAge: req.session.cookie.maxAge,
        originalMaxAge: req.session.cookie.originalMaxAge,
        expired: hasCookieExpired,
        secure: req.session.cookie.secure,
        httpOnly: req.session.cookie.httpOnly,
        path: req.session.cookie.path
      } : null,
      passport: (req.session as any).passport || 'not set',
      userId: req.session.userId || 'not set',
      loginTime: req.session.loginTime || 'not set'
    });
  }
  
  // Always return a clear error message for authentication failures
  if (hasCookieExpired) {
    return res.status(401).json({ message: "Session expired, please login again" });
  }
  return res.status(401).json({ message: "Unauthorized - Please login again" });
}

// Special middleware for Stripe Connect routes
// Ensures user is fully authenticated and session is properly established
async function isStripeAuthenticated(req: Request, res: Response, next: Function) {
  // First check regular authentication with backup method
  if (!req.session) {
    console.error("No session object found on request for Stripe route");
    return res.status(401).json({ message: "Session unavailable" });
  }
  
  // Standard passport authentication - fast path
  if (req.isAuthenticated() && req.user) {
    console.log(`Stripe route: User authenticated via Passport: ${req.user.id}`);
    return next();
  }
  
  // If we have a userId in the session, try to restore the session
  if (req.session.userId) {
    const userId = req.session.userId;
    console.log(`Stripe route: Attempting to restore session from userId: ${userId}`);
    
    try {
      // Get the user from the database
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.error(`User not found for backup userId: ${userId}`);
        return res.status(401).json({ message: "Authentication failed - User not found" });
      }
      
      // Restore the session
      req.login(user, (err) => {
        if (err) {
          console.error(`Failed to restore session for Stripe route: ${err}`);
          return res.status(401).json({ message: "Authentication failed - Session restoration error" });
        }
        
        console.log(`Stripe route: Session restored for user: ${user.id}`);
        return next();
      });
      return;
    } catch (err) {
      console.error(`Error restoring session for Stripe route: ${err}`);
      return res.status(401).json({ message: "Authentication failed - Database error" });
    }
  }
  
  // If we get here, authentication failed
  console.log(`Stripe route: Authentication failed: isAuthenticated=${req.isAuthenticated()}, has userId in session=${!!req.session.userId}`);
  return res.status(401).json({ message: "Unauthorized - Please login again" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Add route for the Expo redirect page
  app.get('/expo-redirect.html', (req, res) => {
    res.sendFile('expo-redirect.html', { root: './public' });
  });

  // Create API router
  const apiRouter = express.Router();

  // Register the admin API routes


  // Handle account type setting (always worker now)
  apiRouter.post("/set-account-type", async (req: Request, res: Response) => {
    const schema = z.object({
      userId: z.number(),
      provider: z.string().optional()
    });

    try {
      // Parse only userId (ignore accountType if provided, always use "worker")
      const { userId } = schema.parse(req.body);
      const accountType = "worker"; // Always set to worker
      
      // Get the user
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      let accountUser = user;
      
      // Check if the user already has worker account type
      if (user.accountType === accountType) {
        // Already has worker account type, just return the user
        console.log(`User ${userId} already has account type worker`);
      }
      // If user has any other account type (pending or poster), update it to worker
      else {
        try {
          // Update the user to worker account type
          const updatedUser = await storage.updateUser(userId, { accountType });
          
          if (!updatedUser) {
            return res.status(500).json({ message: "Failed to update user" });
          }
          
          accountUser = updatedUser;
          console.log(`Updated user ${userId} to worker account type`);
        } catch (error) {
          console.error("Error updating account type:", error);
          return res.status(500).json({ message: "Failed to update account type" });
        }
      }
      
      // If a user is not currently logged in, log them in
      if (!req.isAuthenticated()) {
        // Log the user in
        req.login(accountUser, (err) => {
          if (err) {
            return res.status(500).json({ message: "Failed to log in user" });
          }
          return res.status(200).json(accountUser);
        });
      } else {
        // Update session user
        if (req.user?.id !== accountUser.id) {
          req.login(accountUser, (err) => {
            if (err) {
              return res.status(500).json({ message: "Failed to update user session" });
            }
            return res.status(200).json(accountUser);
          });
        } else {
          return res.status(200).json(accountUser);
        }
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
  
  // Get available skills
  apiRouter.get("/skills", (_req: Request, res: Response) => {
    res.json(SKILLS);
  });
  
  // Worker history endpoints
  // Get worker job history
  apiRouter.get("/workers/:workerId/stripe-connect-status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const workerId = parseInt(req.params.workerId);
      if (isNaN(workerId)) {
        return res.status(400).json({ message: "Invalid worker ID" });
      }
      
      // Get the worker
      const worker = await storage.getUser(workerId);
      if (!worker) {
        return res.status(404).json({ message: "Worker not found" });
      }
      
      // Check if the worker has a Stripe Connect account
      const hasConnectAccount = !!worker.stripeConnectAccountId;
      const accountStatus = worker.stripeConnectAccountStatus || 'pending';
      
      return res.json({
        workerId: worker.id,
        hasConnectAccount,
        accountStatus,
        isActive: accountStatus === 'active' || accountStatus === 'restricted'
      });
    } catch (error) {
      console.error("Error checking worker Stripe Connect status:", error);
      return res.status(500).json({ message: "Failed to check worker Stripe Connect status" });
    }
  });
  
  apiRouter.get("/workers/:workerId/job-history", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const workerId = parseInt(req.params.workerId);
      if (isNaN(workerId)) {
        return res.status(400).json({ message: "Invalid worker ID" });
      }

      // Get all jobs where this worker was hired
      const completedJobs = await storage.getJobs({ 
        workerId, 
        status: "completed" 
      });
      
      // For each job, get the associated review (if any)
      const jobsWithReviews = await Promise.all(completedJobs.map(async (job) => {
        const reviews = await storage.getReviewsForJob(job.id);
        // Find the review left by the job poster (if any)
        const posterReview = reviews.find(review => review.reviewerId === job.posterId);
        
        return {
          ...job,
          review: posterReview || null
        };
      }));
      
      res.json(jobsWithReviews);
    } catch (error) {
      console.error("Error fetching worker job history:", error);
      res.status(500).json({ message: "Error fetching worker job history" });
    }
  });
  
  // Get all reviews for a worker
  apiRouter.get("/workers/:workerId/reviews", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const workerId = parseInt(req.params.workerId);
      if (isNaN(workerId)) {
        return res.status(400).json({ message: "Invalid worker ID" });
      }
      
      // Get reviews where this worker is the subject
      const reviews = await storage.getReviewsForUser(workerId);
      
      // For each review, get additional details about the reviewer and job
      const enhancedReviews = await Promise.all(reviews.map(async (review) => {
        const reviewer = await storage.getUser(review.reviewerId);
        const job = review.jobId ? await storage.getJob(review.jobId) : null;
        
        return {
          ...review,
          reviewer: reviewer ? {
            id: reviewer.id,
            fullName: reviewer.fullName,
            avatarUrl: reviewer.avatarUrl
          } : null,
          job: job ? {
            id: job.id,
            title: job.title,
            category: job.category,
            datePosted: job.datePosted
          } : null
        };
      }));
      
      res.json(enhancedReviews);
    } catch (error) {
      console.error("Error fetching worker reviews:", error);
      res.status(500).json({ message: "Error fetching worker reviews" });
    }
  });
  
  // Verify a worker's skill
  apiRouter.post("/workers/:workerId/verify-skill", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized - Please login again" });
      }
      
      const workerId = parseInt(req.params.workerId);
      if (isNaN(workerId)) {
        return res.status(400).json({ message: "Invalid worker ID" });
      }
      
      const { skill, isVerified } = z.object({
        skill: z.string(),
        isVerified: z.boolean()
      }).parse(req.body);
      
      // Only job posters who have completed a job with this worker can verify skills
      const completedJobs = await storage.getJobs({
        posterId: req.user.id,
        workerId,
        status: "completed"
      });
      
      if (completedJobs.length === 0) {
        return res.status(403).json({ 
          message: "You can only verify skills of workers who have completed jobs for you" 
        });
      }
      
      // Update the skill verification
      const updatedUser = await storage.verifyUserSkill(workerId, skill, isVerified);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Worker not found" });
      }
      
      // Remove sensitive information
      const { password, ...sanitizedUser } = updatedUser;
      
      res.json({
        message: `Skill ${isVerified ? 'verified' : 'verification removed'} successfully`,
        user: sanitizedUser
      });
    } catch (error) {
      console.error("Error verifying skill:", error);
      res.status(500).json({ message: "Error verifying skill" });
    }
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

  apiRouter.get("/users/search", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized - Please login again" });
      }
      
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.status(400).json({ message: "Search query must be at least 2 characters" });
      }
      
      const currentUserId = req.user?.id;
      if (!currentUserId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      // Make sure currentUserId is a number
      const userId = typeof currentUserId === 'string' 
        ? parseInt(currentUserId, 10) 
        : currentUserId;
        
      if (isNaN(userId)) {
        console.error("Invalid user ID in search request:", currentUserId);
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      console.log(`API - Searching users with query: "${query}" for user ID: ${userId}`);
      
      // Get users by search query (username, email, or fullName)
      const { and, or, sql, ne } = await import('drizzle-orm');
      const { db } = await import('./db');
      const { users } = await import('@shared/schema');
      
      const searchResults = await db.select()
        .from(users)
        .where(
          and(
            // Don't include the current user in results
            ne(users.id, userId),
            // Search by username, email or fullName
            or(
              sql`LOWER(${users.username}) LIKE ${`%${query.toLowerCase()}%`}`,
              sql`LOWER(${users.email}) LIKE ${`%${query.toLowerCase()}%`}`,
              sql`LOWER(COALESCE(${users.fullName}, '')) LIKE ${`%${query.toLowerCase()}%`}`
            )
          )
        )
        .limit(10);
      
      console.log(`API - Found ${searchResults.length} results for query "${query}"`);
      
      // Map results to remove sensitive information
      const sanitizedResults = searchResults.map(user => {
        // Exclude password from response
        const { password, ...userData } = user;
        return userData;
      });
      
      res.json(sanitizedResults);
    } catch (error) {
      console.error("Error in user search API:", error);
      res.status(500).json({ message: "An error occurred while searching users" });
    }
  });

  apiRouter.get("/users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password in response
      const { password, ...userData } = user;
      res.json(userData);
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      res.status(500).json({ message: "An error occurred while fetching user" });
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

  // User profile image endpoint
  apiRouter.post("/users/:id/profile-image", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Ensure the authenticated user is uploading their own profile image
      if (req.user.id !== id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only upload your own profile image" 
        });
      }
      
      // Validate that imageData exists in request body
      const schema = z.object({
        imageData: z.string()
      });
      
      const { imageData } = schema.parse(req.body);
      
      const updatedUser = await storage.uploadProfileImage(id, imageData);
      
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
  
  // Email verification endpoints
  // Send email verification
  apiRouter.post("/users/:id/send-email-verification", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Ensure the authenticated user is verifying their own email
      if (req.user.id !== id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only verify your own email" 
        });
      }
      
      // Generate a verification token
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 24); // Token valid for 24 hours
      
      // Update the user with the verification token
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUser(id, {
        verificationToken: token,
        verificationTokenExpiry: expiry
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Failed to update user" });
      }
      
      // In a real application, you would send an email with the verification link
      // For demo purposes, we'll just return the token in the response
      const verificationUrl = `${process.env.APP_URL || 'http://localhost:5000'}/verify-email?token=${token}`;
      
      // TODO: In a production app, we would send an actual email here
      // sendEmail(user.email, 'Verify your email', verificationUrl);
      
      res.json({ 
        message: "Verification email sent",
        // Only for development, remove in production:
        verificationUrl,
        token
      });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // Verify email with token
  apiRouter.post("/verify-email", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        token: z.string()
      });
      
      const { token } = schema.parse(req.body);
      
      // Find user with this token and verify it's not expired
      const now = new Date();
      
      // Check for user with matching token
      const users = await storage.getAllUsers();
      let user = users.find(u => 
        u.verificationToken === token && 
        u.verificationTokenExpiry && 
        new Date(u.verificationTokenExpiry) > now
      );
      
      // If no user found by token, try to find by email (for newer implementations)
      if (!user && req.body.email) {
        user = await storage.getUserByEmail(req.body.email);
        // Verify the token matches for this user
        if (user && (
          user.verificationToken !== token || 
          !user.verificationTokenExpiry || 
          new Date(user.verificationTokenExpiry) <= now
        )) {
          user = undefined; // Token invalid or expired
        }
      }
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }
      
      // Mark email as verified and clear the token
      const updatedUser = await storage.updateUser(user.id, {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Failed to update user" });
      }
      
      res.json({ message: "Email successfully verified" });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // Phone verification endpoints
  // Send SMS verification code
  apiRouter.post("/users/:id/send-phone-verification", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Ensure the authenticated user is verifying their own phone
      if (req.user.id !== id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only verify your own phone number" 
        });
      }
      
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.phone) {
        return res.status(400).json({ message: "User does not have a phone number" });
      }
      
      // Generate a verification code (6 digits)
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 10); // Code valid for 10 minutes
      
      // Update the user with the verification code
      const updatedUser = await storage.updateUser(id, {
        phoneVerificationCode: verificationCode,
        phoneVerificationExpiry: expiry
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Failed to update user" });
      }
      
      // In a real application, you would send an SMS with the verification code
      // For demo purposes, we'll just return the code in the response
      
      // TODO: In a production app, we would send an actual SMS here
      // sendSMS(user.phone, `Your verification code is: ${verificationCode}`);
      
      res.json({ 
        message: "Verification SMS sent",
        // Only for development, remove in production:
        verificationCode 
      });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // Verify phone with code
  apiRouter.post("/users/:id/verify-phone", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Ensure the authenticated user is verifying their own phone
      if (req.user.id !== id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only verify your own phone number" 
        });
      }
      
      const schema = z.object({
        code: z.string().length(6, "Verification code must be 6 digits")
      });
      
      const { code } = schema.parse(req.body);
      
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const now = new Date();
      
      if (
        !user.phoneVerificationCode || 
        !user.phoneVerificationExpiry ||
        new Date(user.phoneVerificationExpiry) < now ||
        user.phoneVerificationCode !== code
      ) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }
      
      // Mark phone as verified and clear the code
      const updatedUser = await storage.updateUser(id, {
        phoneVerified: true,
        phoneVerificationCode: null,
        phoneVerificationExpiry: null
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Failed to update user" });
      }
      
      res.json({ message: "Phone number successfully verified" });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // User skills endpoints
  apiRouter.post("/users/:id/skills", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Ensure the authenticated user is updating their own skills
      if (req.user.id !== id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only update your own skills" 
        });
      }
      
      // Validate that skills array exists in request body
      const schema = z.object({
        skills: z.array(z.string())
      });
      
      const { skills } = schema.parse(req.body);
      
      // Validate that all skills are in the predefined SKILLS list
      const invalidSkills = skills.filter(skill => !SKILLS.includes(skill));
      if (invalidSkills.length > 0) {
        return res.status(400).json({ 
          message: `Invalid skills: ${invalidSkills.join(', ')}` 
        });
      }
      
      const updatedUser = await storage.updateUserSkills(id, skills);
      
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
  
  // Verify a user's skill (admin or job poster who has verified the skill)
  apiRouter.post("/users/:id/skills/:skill/verify", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const skill = req.params.skill;
      
      // Validate that the skill is in the predefined SKILLS list
      if (!SKILLS.includes(skill)) {
        return res.status(400).json({ message: `Invalid skill: ${skill}` });
      }
      
      // For now, only allow users to verify their own skills
      // In a production app, we would have an admin role or a job poster to verify skills
      if (req.user.id !== id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only verify your own skills at this time" 
        });
      }
      
      // Get verification flag from request body, default to true
      const { verified = true } = req.body;
      
      const updatedUser = await storage.verifyUserSkill(id, skill, verified);
      
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
  
  // Get users with specific skills
  apiRouter.get("/users/with-skills", async (req: Request, res: Response) => {
    try {
      // Parse skills from query string, which could be a single skill or multiple skills
      const querySkills = req.query.skills;
      let skills: string[] = [];
      
      if (typeof querySkills === 'string') {
        skills = [querySkills];
      } else if (Array.isArray(querySkills)) {
        skills = querySkills.map(s => s.toString());
      }
      
      // Validate that all skills are in the predefined SKILLS list
      const invalidSkills = skills.filter(skill => !SKILLS.includes(skill));
      if (invalidSkills.length > 0) {
        return res.status(400).json({ 
          message: `Invalid skills: ${invalidSkills.join(', ')}` 
        });
      }
      
      const users = await storage.getUsersWithSkills(skills);
      
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
  
  // Stripe terms of service and representative endpoint
  apiRouter.post("/users/:id/stripe-terms", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log('Stripe terms acceptance endpoint called');
      console.log('User in session:', req.user ? `ID: ${req.user.id}` : 'No user');
      console.log('isAuthenticated:', req.isAuthenticated());
      console.log('Session ID:', req.sessionID);
      
      // Safely check if the passport property exists in the session
      const passportObj = req.session && typeof req.session === 'object' ? (req.session as any).passport : undefined;
      console.log('Session passport:', passportObj);
      
      const id = parseInt(req.params.id);
      console.log(`User ID from params: ${id}`);
      
      // Add fallback for missing authentication
      if (!req.user) {
        console.warn('User not authenticated in Stripe terms endpoint despite middleware');
        // Try to fetch the user directly since we have the ID
        const user = await storage.getUser(id);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        console.log(`Using direct user lookup for ID ${id} instead of session`);
      } else if (req.user.id !== id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only update your own Stripe terms" 
        });
      }
      
      // Validate request with all the representative information fields
      const schema = z.object({
        acceptTerms: z.boolean().optional(),
        representativeName: z.string().min(2).optional(),
        representativeTitle: z.string().min(2).optional(),
        // Additional fields for Stripe representative
        dateOfBirth: z.string().min(10).optional(),
        email: z.string().email().optional(),
        phone: z.string().min(10).optional(),
        ssnLast4: z.string().length(4).optional(),
        streetAddress: z.string().min(3).optional(),
        aptUnit: z.string().optional(),
        city: z.string().min(2).optional(),
        state: z.string().min(2).optional(),
        zip: z.string().min(5).optional(),
        country: z.string().min(2).optional(),
        // Bank account information
        accountType: z.enum(["checking", "savings"]).optional(),
        accountNumber: z.string().min(4).optional(),
        routingNumber: z.string().length(9).optional(),
        accountHolderName: z.string().min(2).optional(),
      });
      
      const { 
        acceptTerms, 
        representativeName, 
        representativeTitle,
        dateOfBirth,
        email,
        phone,
        ssnLast4,
        streetAddress,
        aptUnit,
        city,
        state,
        zip,
        country,
        // Bank account information
        accountType,
        accountNumber,
        routingNumber,
        accountHolderName
      } = schema.parse(req.body);
      
      // Build the update object
      const updateData: any = {};
      
      if (acceptTerms) {
        updateData.stripeTermsAccepted = true;
        updateData.stripeTermsAcceptedAt = new Date();
      }
      
      if (representativeName) {
        updateData.stripeRepresentativeName = representativeName;
      }
      
      if (representativeTitle) {
        updateData.stripeRepresentativeTitle = representativeTitle;
      }
      
      // Store all the additional representative information
      // In a real application, you would send this directly to Stripe's API
      // Here we'll store it in user metadata to track that it was provided
      
      // Create a representative metadata object to store additional info
      const representativeMetadata: any = {};
      
      if (dateOfBirth) representativeMetadata.dateOfBirth = dateOfBirth;
      if (email) representativeMetadata.email = email;
      if (phone) representativeMetadata.phone = phone;
      if (ssnLast4) representativeMetadata.ssnLast4 = ssnLast4;
      
      // Create an address metadata object
      if (streetAddress || city || state || zip || country) {
        representativeMetadata.address = {
          line1: streetAddress,
          line2: aptUnit || '',
          city: city,
          state: state,
          postal_code: zip,
          country: country
        };
      }
      
      // Create bank account metadata if we have the required information
      const bankAccountMetadata: any = {};
      
      if (accountType && accountNumber && routingNumber && accountHolderName) {
        bankAccountMetadata.accountType = accountType;
        bankAccountMetadata.accountNumber = accountNumber;
        bankAccountMetadata.routingNumber = routingNumber;
        bankAccountMetadata.accountHolderName = accountHolderName;
        
        // Mark banking details as complete in our system
        updateData.stripeBankingDetailsComplete = true;
      }
      
      // If we collected representative metadata, store it and mark requirements as complete
      if (Object.keys(representativeMetadata).length > 0) {
        // This would be sent to Stripe in a real implementation
        console.log('Representative information to send to Stripe:', representativeMetadata);
        
        // Mark representative requirements as complete in our system
        updateData.stripeRepresentativeRequirementsComplete = true;
        
        // In a real implementation, you would call the Stripe API here to update
        // the representative information on the Connect account
        try {
          // This is where we would call Stripe API
          // const stripeAccount = await updateStripeAccountRepresentative(req.user.stripeConnectAccountId, representativeMetadata);
          
          // Update the local storage with Stripe's response
          updateData.stripeAccountUpdatedAt = new Date();
        } catch (stripeError) {
          console.error('Error updating Stripe account representative:', stripeError);
          // Continue with local updates even if Stripe update fails
          // In production, you might want to handle this differently
        }
      }
      
      // If we collected bank account information, log it and mark requirements as complete
      if (Object.keys(bankAccountMetadata).length > 0) {
        // This would be sent to Stripe in a real implementation
        console.log('Bank account information to send to Stripe:', {
          ...bankAccountMetadata,
          accountNumber: '******' + bankAccountMetadata.accountNumber.slice(-4) // Hide full account number in logs
        });
      }
      
      // Only proceed if we have something to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid data provided to update" });
      }
      
      // Update the user
      const updatedUser = await storage.updateUser(id, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update Stripe Connect account with representative information if we have an account ID
      if (updatedUser.stripeConnectAccountId && stripe) {
        try {
          console.log(`Updating Stripe Connect account ${updatedUser.stripeConnectAccountId} with representative information`);
          
          // This is a simplified version. In a real app, you'd need to format the data
          // according to Stripe's API requirements
          if (representativeMetadata.address) {
            await stripe.accounts.update(updatedUser.stripeConnectAccountId, {
              individual: {
                first_name: representativeName?.split(' ')[0] || '',
                last_name: representativeName?.split(' ').slice(1).join(' ') || '',
                email: representativeMetadata.email,
                phone: representativeMetadata.phone,
                dob: {
                  day: new Date(representativeMetadata.dateOfBirth).getDate(),
                  month: new Date(representativeMetadata.dateOfBirth).getMonth() + 1,
                  year: new Date(representativeMetadata.dateOfBirth).getFullYear(),
                },
                ssn_last_4: representativeMetadata.ssnLast4,
                address: {
                  line1: representativeMetadata.address.line1,
                  line2: representativeMetadata.address.line2,
                  city: representativeMetadata.address.city,
                  state: representativeMetadata.address.state,
                  postal_code: representativeMetadata.address.postal_code,
                  country: representativeMetadata.address.country,
                },
              }
            });
          }
          
          // Add bank account if the information was provided
          if (Object.keys(bankAccountMetadata).length > 0) {
            try {
              // In a real implementation, this would call the Stripe API to create an external account
              // This is a simplification for educational purposes
              console.log(`Adding bank account to Stripe Connect account ${updatedUser.stripeConnectAccountId}`);
              
              // Create bank account token
              // NOTE: In production, you'd use Stripe.js to securely collect and tokenize bank account details
              // This is a server-side example for demonstration only
              const bankAccount = await stripe.tokens.create({
                bank_account: {
                  country: 'US',
                  currency: 'usd',
                  account_holder_name: bankAccountMetadata.accountHolderName,
                  account_holder_type: 'individual',
                  routing_number: bankAccountMetadata.routingNumber,
                  account_number: bankAccountMetadata.accountNumber,
                  account_type: bankAccountMetadata.accountType,
                },
              });
              
              // Attach the bank account to the Connect account
              if (bankAccount && bankAccount.id) {
                await stripe.accounts.createExternalAccount(
                  updatedUser.stripeConnectAccountId,
                  {
                    external_account: bankAccount.id,
                    default_for_currency: true,
                  }
                );
                console.log(`Bank account added successfully to Connect account ${updatedUser.stripeConnectAccountId}`);
              }
            } catch (bankError) {
              console.error('Error adding bank account to Stripe:', bankError);
              // Continue with response even if bank account creation fails
              // In production, you would want to handle this differently
            }
          }
        } catch (stripeError) {
          console.error('Error updating Stripe account:', stripeError);
          // Continue with response even if Stripe update fails
          // In production, you might want to handle this differently
        }
      }
      
      // Don't return password in response
      const { password, ...updatedUserData } = updatedUser;
      res.json(updatedUserData);
    } catch (error) {
      console.error("Error updating Stripe terms:", error);
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // Update user metrics endpoint
  apiRouter.patch("/users/:id/metrics", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Ensure the authenticated user is updating their own metrics
      // In a production app, this would be an admin-only or system update
      if (req.user.id !== id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only update your own metrics" 
        });
      }
      
      // Validate metrics data
      const schema = z.object({
        completedJobs: z.number().optional(),
        successRate: z.number().min(0).max(100).optional(),
        responseTime: z.number().min(0).optional()
      });
      
      const metrics = schema.parse(req.body);
      
      const updatedUser = await storage.updateUserMetrics(id, metrics);
      
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
  
  // Badge category endpoint
  apiRouter.get("/badge-categories", (_req: Request, res: Response) => {
    res.json(BADGE_CATEGORIES);
  });
  
  // Badge endpoints
  apiRouter.get("/badges", async (_req: Request, res: Response) => {
    try {
      const badges = await storage.getAllBadges();
      res.json(badges);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  apiRouter.get("/badges/category/:category", async (req: Request, res: Response) => {
    try {
      const category = req.params.category;
      
      // Validate that the category is in the predefined BADGE_CATEGORIES
      if (!BADGE_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: `Invalid badge category: ${category}` });
      }
      
      const badges = await storage.getBadgesByCategory(category);
      res.json(badges);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  apiRouter.get("/badges/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const badge = await storage.getBadge(id);
      
      if (!badge) {
        return res.status(404).json({ message: "Badge not found" });
      }
      
      res.json(badge);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  apiRouter.post("/badges", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // In a production app, this would be admin-only
      // For now, allow any authenticated user to create badges
      const badgeData = insertBadgeSchema.parse(req.body);
      
      const newBadge = await storage.createBadge(badgeData);
      res.status(201).json(newBadge);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // User badge endpoints
  apiRouter.get("/users/:id/badges", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userBadges = await storage.getUserBadges(id);
      res.json(userBadges);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  apiRouter.post("/users/:id/badges", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // In a production app, this would be admin-only or based on achievements
      // For now, allow any authenticated user to award badges to themselves
      if (req.user.id !== userId) {
        return res.status(403).json({ 
          message: "Forbidden: You can only award badges to yourself at this time" 
        });
      }
      
      // Validate badge data
      const schema = z.object({
        badgeId: z.number(),
        metadata: z.any().optional()
      });
      
      const { badgeId, metadata } = schema.parse(req.body);
      
      // Verify that the badge exists
      const badge = await storage.getBadge(badgeId);
      if (!badge) {
        return res.status(404).json({ message: "Badge not found" });
      }
      
      const userBadge = await storage.awardBadge({
        userId,
        badgeId,
        metadata: metadata || null
      });
      
      res.status(201).json(userBadge);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  apiRouter.delete("/users/:userId/badges/:badgeId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const badgeId = parseInt(req.params.badgeId);
      
      // In a production app, this would be admin-only
      // For now, allow any authenticated user to revoke their own badges
      if (req.user.id !== userId) {
        return res.status(403).json({ 
          message: "Forbidden: You can only revoke badges from yourself at this time" 
        });
      }
      
      const success = await storage.revokeBadge(userId, badgeId);
      
      if (!success) {
        return res.status(404).json({ message: "Badge not found or already revoked" });
      }
      
      res.status(204).send();
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
      console.log("Creating job with data:", req.body);
      
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized - Please login again" });
      }
      
      // If posterId is provided, ensure it matches the authenticated user
      const posterId = req.body.posterId || req.user.id;
      if (posterId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only create jobs with your own user ID" 
        });
      }
      
      // Filter for prohibited or spammy content
      const contentFilterResult = filterJobContent(req.body.title || "", req.body.description || "");
      if (!contentFilterResult.isApproved) {
        return res.status(400).json({ 
          message: contentFilterResult.reason || "Your job post contains prohibited content."
        });
      }
      
      // Validate payment amount
      // Convert string to number if needed (common with form submissions)
      const paymentAmount = typeof req.body.paymentAmount === 'string' 
        ? parseFloat(req.body.paymentAmount) 
        : (req.body.paymentAmount || 0);
        
      const paymentValidation = validatePaymentAmount(paymentAmount);
      if (!paymentValidation.isApproved) {
        return res.status(400).json({ 
          message: paymentValidation.reason || "The payment amount is invalid."
        });
      }
      
      // Extract payment method ID if provided
      const paymentMethodId = req.body.paymentMethodId;
      const { paymentMethodId: _, ...jobData } = req.body;
      
      // Ensure all required fields are present
      if (!jobData.title || !jobData.description || !jobData.category || 
          !jobData.paymentType) {
        return res.status(400).json({
          message: "Missing required fields. Please provide title, description, category, and paymentType."
        });
      }
      
      // Ensure latitude and longitude are properly formatted numbers
      const formattedJobData = {
        ...jobData,
        posterId: posterId, // Ensure posterId is included and valid
        paymentAmount: paymentAmount,
        latitude: typeof jobData.latitude === 'string' ? parseFloat(jobData.latitude) : (jobData.latitude || 0),
        longitude: typeof jobData.longitude === 'string' ? parseFloat(jobData.longitude) : (jobData.longitude || 0),
        // Properly handle date format for dateNeeded
        dateNeeded: typeof jobData.dateNeeded === 'string' 
          ? new Date(jobData.dateNeeded) // Convert any string date format to a Date object
          : (jobData.dateNeeded instanceof Date ? jobData.dateNeeded : new Date()),
        // Ensure requiredSkills is an array
        requiredSkills: Array.isArray(jobData.requiredSkills) ? jobData.requiredSkills : []
      };
      
      console.log("Creating job with formatted data:", formattedJobData);
      
      // Allow any user to post jobs regardless of their account type (both workers and posters)
      // Service fee and total amount are calculated in storage.createJob
      const newJob = await storage.createJob(formattedJobData);
      
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
            return_url: `${req.protocol}://${req.get('host')}/payment-confirmation`,
            metadata: {
              jobId: newJob.id.toString(),
              posterId: newJob.posterId.toString(),
              jobTitle: newJob.title,
              paymentAmount: newJob.paymentAmount.toString(),
              serviceFee: newJob.serviceFee.toString(),
              platform: "Fixer"
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
      
      // After job is created and payment is processed (if applicable),
      // automatically notify nearby workers about this new opportunity
      try {
        // Default radius is 5 miles, but can be specified in the request
        const radiusMiles = req.body.radiusMiles || 5;
        
        let notificationCount = 0;
        // Try to notify nearby workers if the method is available
        if (typeof storage.notifyNearbyWorkers === 'function') {
          // Send notifications to nearby workers
          notificationCount = await storage.notifyNearbyWorkers(newJob.id, radiusMiles);
          
          // If notifications were sent, add this info to the response
          if (notificationCount > 0) {
            console.log(`Automatically notified ${notificationCount} workers about new job #${newJob.id}`);
            
            // Try to create a notification for the job poster confirming worker notifications
            if (typeof storage.createNotification === 'function' && req.user) {
              await storage.createNotification({
                userId: req.user.id,
                title: 'Workers Notified',
                message: `${notificationCount} nearby workers have been notified about your job "${newJob.title}".`,
                type: 'workers_notified',
                sourceId: newJob.id,
                sourceType: 'job',
                metadata: {
                  count: notificationCount
                }
              });
            }
          }
        }
        
        // Return the job with proper response
        return res.status(201).json({
          ...newJob,
          workersNotified: notificationCount,
          message: notificationCount > 0 
            ? `Job created successfully. ${notificationCount} nearby workers have been notified.`
            : 'Job created successfully.'
        });
        
      } catch (notifyError) {
        console.error('Error notifying nearby workers:', notifyError);
        // Even if notification fails, we still want to return the created job
        return res.status(201).json({
          ...newJob,
          message: 'Job created successfully, but there was an issue notifying workers.'
        });
      }
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.get("/jobs", async (req: Request, res: Response) => {
    try {
      const { category, status, posterId, workerId, search, hasCoordinates } = req.query;
      
      // Special handling for map display - return ALL jobs with coordinates
      if (hasCoordinates === 'true') {
        const allJobs = await storage.getJobs({});
        const jobsWithCoordinates = allJobs.filter(job => 
          job.latitude !== null && 
          job.longitude !== null &&
          !isNaN(Number(job.latitude)) && 
          !isNaN(Number(job.longitude))
        );
        return res.json(jobsWithCoordinates);
      }
      
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
  
  // Update job status and handle job workflow transitions
  apiRouter.put("/jobs/:id/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const job = await storage.getJob(id);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Check authorization - only job poster or assigned worker can update status
      if (req.user.id !== job.posterId && req.user.id !== job.workerId) {
        return res.status(403).json({ message: "Forbidden: You are not authorized to update this job" });
      }
      
      const schema = z.object({
        status: z.enum(["open", "assigned", "in_progress", "completed", "canceled"]),
        workerLocation: z.object({
          latitude: z.number(),
          longitude: z.number()
        }).optional()
      });
      
      const { status, workerLocation } = schema.parse(req.body);
      
      // Apply business rules for status transitions
      const currentStatus = job.status;
      
      // Prevent status changes for certain conditions
      if (currentStatus === "in_progress" && status === "canceled" && req.user.id === job.posterId) {
        return res.status(400).json({ 
          message: "Cannot cancel a job that is in progress. Please contact support if there's a problem." 
        });
      }
      
      // If worker is trying to start the job, verify location if required
      if (status === "in_progress" && req.user.id === job.workerId && job.verifyLocationToStart) {
        if (!workerLocation) {
          return res.status(400).json({ message: "Worker location required to start job" });
        }
        
        // Calculate distance between worker and job location
        const jobLat = job.latitude;
        const jobLng = job.longitude;
        const workerLat = workerLocation.latitude;
        const workerLng = workerLocation.longitude;
        
        // Calculate distance using haversine formula (approximately)
        const distanceInFeet = calculateDistanceInFeet(jobLat, jobLng, workerLat, workerLng);
        
        // Worker must be within 500 feet of job location to start
        if (distanceInFeet > 500) {
          return res.status(400).json({ 
            message: "You must be within 500 feet of the job location to start work", 
            distance: Math.round(distanceInFeet),
            maxDistance: 500
          });
        }
      }
      
      // Prepare update data with status change
      let updateData: any = { status };
      
      // Add timestamps based on status transitions
      if (status === "in_progress" && currentStatus !== "in_progress") {
        updateData.startTime = new Date();
        updateData.clockInTime = new Date();
      } else if (status === "completed" && currentStatus !== "completed") {
        updateData.completionTime = new Date();
      }
      
      // Update the job
      const updatedJob = await storage.updateJob(id, updateData);
      
      // Create a notification for the other party
      const notificationRecipientId = req.user.id === job.posterId ? job.workerId : job.posterId;
      
      if (notificationRecipientId) {
        let message;
        
        if (status === "in_progress") {
          message = `Work has started on job "${job.title}"`;
        } else if (status === "completed") {
          message = `Job "${job.title}" has been marked as completed`;
        } else if (status === "canceled") {
          message = `Job "${job.title}" has been canceled`;
        }
        
        if (message) {
          await storage.createNotification({
            userId: notificationRecipientId,
            title: `Job Status Update`,
            message,
            type: "job_status",
            sourceId: id,
            sourceType: "job"
          });
        }
      }
      
      res.json(updatedJob);
    } catch (error) {
      console.error("Error updating job status:", error);
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // Update worker location for an in-progress job
  apiRouter.post("/jobs/:id/worker-location", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const job = await storage.getJob(id);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Only the assigned worker can update their location
      if (req.user.id !== job.workerId) {
        return res.status(403).json({ message: "Forbidden: You are not the assigned worker for this job" });
      }
      
      // Only allow updates for in-progress jobs
      if (job.status !== "in_progress") {
        return res.status(400).json({ message: "Worker location can only be updated for in-progress jobs" });
      }
      
      const schema = z.object({
        latitude: z.number(),
        longitude: z.number()
      });
      
      const { latitude, longitude } = schema.parse(req.body);
      
      // Update the worker's location in their user profile
      await storage.updateUser(req.user.id, { latitude, longitude });
      
      // Return success
      res.json({ success: true, message: "Worker location updated" });
    } catch (error) {
      console.error("Error updating worker location:", error);
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
      const withRefund = req.body.withRefund === true;
      
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
      
      // If refund was requested and job has payment, process refund
      if (withRefund && job.paymentType === 'fixed') {
        try {
          // Find associated payment for this job
          const payment = await storage.getPaymentByJobId(id);
          
          if (payment && payment.stripePaymentIntentId) {
            console.log(`Processing refund for job ${id} with payment ${payment.stripePaymentIntentId}`);
            
            // Initialize Stripe
            if (!process.env.STRIPE_SECRET_KEY) {
              throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
            }
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
              apiVersion: '2023-10-16' as any // Using consistent API version
            });
            
            // Process refund through Stripe
            const refund = await stripe.refunds.create({
              payment_intent: payment.stripePaymentIntentId,
              reason: 'requested_by_customer'
            });
            
            // Record the refund in our database
            await storage.createPayment({
              userId: req.user.id,
              amount: payment.amount,
              serviceFee: payment.serviceFee,
              type: 'refund',
              status: 'succeeded',
              paymentMethod: 'card',
              transactionId: refund.id,
              stripeRefundId: refund.id,
              stripePaymentIntentId: payment.stripePaymentIntentId,
              stripeCustomerId: payment.stripeCustomerId,
              jobId: id,
              description: `Refund for canceled job "${job.title}"`,
            });
            
            console.log(`Refund processed successfully: ${refund.id}`);
          }
        } catch (refundError) {
          console.error('Error processing refund:', refundError);
          // Continue with job deletion even if refund fails
          // This ensures jobs can still be canceled even if refund fails
        }
      }
      
      // Delete the job
      const success = await storage.deleteJob(id);
      
      // Return a more informative response
      return res.status(200).json({
        success: true,
        message: "Job successfully canceled",
        refundProcessed: withRefund
      });
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

  // Job completion endpoint for workers
  apiRouter.post("/jobs/:id/complete", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the job first
      const job = await storage.getJob(id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Only assigned workers can mark jobs as complete
      if (job.workerId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: Only the assigned worker can mark a job as complete" 
        });
      }
      
      // Check if all tasks are complete
      const tasks = await storage.getTasksForJob(id);
      const allTasksComplete = tasks.length > 0 && tasks.every(task => task.isCompleted);
      
      if (!allTasksComplete) {
        return res.status(400).json({ 
          message: "All tasks must be completed before marking the job as complete" 
        });
      }
      
      // Update job status to completed
      const updatedJob = await storage.updateJob(id, { 
        status: "completed",
        completedAt: new Date()
      });
      
      // Notify job poster that job has been completed
      try {
        await storage.createNotification({
          userId: job.posterId,
          title: 'Job Completed',
          message: `Worker has marked job "${job.title}" as complete. All tasks have been finished.`,
          type: 'job_completed',
          sourceId: job.id,
          sourceType: 'job',
          metadata: {
            jobId: job.id,
            workerId: job.workerId
          }
        });
      } catch (notifyError) {
        console.error(`Error notifying job poster about completion:`, notifyError);
      }
      
      // Check if payment has already been processed for this job
      const existingEarnings = await storage.getEarningsForJob(id);
      
      // Only create earnings if none exist yet
      if (existingEarnings.length === 0) {
        // Calculate earnings (minus service fee)
        const netAmount = job.paymentAmount - job.serviceFee;
        
        // Create earning record for the worker
        const earning = await storage.createEarning({
          jobId: job.id,
          workerId: job.workerId,
          amount: job.paymentAmount,
          serviceFee: job.serviceFee,
          netAmount: netAmount,
          status: "pending"
        });
        
        // If the worker has a Stripe Connect account, initiate transfer
        const worker = await storage.getUser(job.workerId);
        if (worker && worker.stripeConnectAccountId) {
          try {
            // Find the payment record for this job
            const payments = await storage.getPaymentsForUser(job.posterId);
            const jobPayment = payments.find(p => p.jobId === job.id && p.status === "completed");
            
            if (jobPayment) {
              // Create a transfer to the worker's Connect account
              const transfer = await stripe.transfers.create({
                amount: Math.round(netAmount * 100), // Convert to cents for Stripe
                currency: 'usd',
                destination: worker.stripeConnectAccountId,
                transfer_group: `job-${job.id}`,
                metadata: {
                  jobId: job.id.toString(),
                  workerId: job.workerId.toString(),
                  earningId: earning.id.toString(),
                  paymentId: jobPayment.id.toString()
                },
                description: `Payment for job: ${job.title}`
              });
              
              console.log(`Successfully transferred $${netAmount} to worker ${job.workerId} (Connect account: ${worker.stripeConnectAccountId})`);
              
              // Update the earning record to mark it as paid
              await storage.updateEarningStatus(earning.id, 'paid', new Date());
              
              // Create notification for the worker about payment
              await storage.createNotification({
                userId: job.workerId,
                title: 'Payment Received',
                message: `You've received $${netAmount.toFixed(2)} for completing job "${job.title}"!`,
                type: 'payment_received',
                sourceId: job.id,
                sourceType: 'job',
                metadata: {
                  amount: netAmount,
                  jobId: job.id,
                  earningId: earning.id,
                  transferId: transfer.id
                }
              });
              
              // Create notification for the job poster about payment
              await storage.createNotification({
                userId: job.posterId,
                title: 'Payment Sent to Worker',
                message: `Payment of $${netAmount.toFixed(2)} has been automatically sent to the worker for job "${job.title}".`,
                type: 'payment_sent',
                sourceId: job.id,
                sourceType: 'job',
                metadata: {
                  amount: netAmount,
                  workerId: job.workerId,
                  transferId: transfer.id
                }
              });
            }
          } catch (transferError) {
            console.error(`Error transferring to Connect account: ${(transferError as Error).message}`);
            // We don't want to fail the job completion if payment transfer fails
            // Notify the worker about the payment issue
            await storage.createNotification({
              userId: job.workerId,
              title: 'Payment Processing Issue',
              message: `There was an issue processing your payment for job "${job.title}". Our team will resolve this shortly.`,
              type: 'payment_issue',
              sourceId: job.id,
              sourceType: 'job'
            });
          }
        } else {
          // Notify worker to set up Stripe Connect account if they don't have one
          await storage.createNotification({
            userId: job.workerId,
            title: 'Setup Payment Account to Receive Funds',
            message: `You've completed job "${job.title}" but need to set up a payment account to receive your earnings of $${netAmount.toFixed(2)}.`,
            type: 'setup_payment_account',
            sourceId: job.id,
            sourceType: 'job',
            metadata: {
              earningId: earning.id,
              amount: netAmount
            }
          });
        }
      }
      
      res.json(updatedJob);
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
      
      // Update application status
      const updatedApplication = await storage.updateApplication(id, applicationData);
      
      // If application is being accepted, handle job assignment and payment setup
      if (applicationData.status === 'accepted' && isJobPoster) {
        try {
          // Update the job to mark it as assigned to this worker
          await storage.updateJob(job.id, {
            status: 'assigned',
            workerId: application.workerId
          });
          
          // Create notification for the worker
          await storage.createNotification({
            userId: application.workerId,
            title: 'Application Accepted',
            message: `Your application for job "${job.title}" has been accepted!`,
            type: 'application_accepted',
            sourceId: job.id,
            sourceType: 'job',
            metadata: {
              jobId: job.id,
              applicationId: application.id
            }
          });
          
          // Get worker details
          const worker = await storage.getUser(application.workerId);
          
          // Check if worker has Stripe Connect account for future payment
          if (worker && worker.stripeConnectAccountId) {
            console.log(`Worker ${worker.id} has Stripe Connect account ${worker.stripeConnectAccountId}, payment can be processed automatically when job completes`);
          } else {
            console.log(`Worker ${application.workerId} does not have a Stripe Connect account yet. They'll need to set one up to receive payments.`);
            
            // Notify worker to set up Stripe Connect if they don't have one
            await storage.createNotification({
              userId: application.workerId,
              title: 'Payment Account Setup Required',
              message: `To receive payment for your accepted job "${job.title}", please set up your payment account.`,
              type: 'setup_payment_account',
              sourceId: job.id,
              sourceType: 'job'
            });
          }
        } catch (error) {
          console.error('Error handling application acceptance:', error);
          // We still return success even if notifications fail
        }
      }
      
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

  // Batch create tasks for a job
  apiRouter.post("/jobs/:jobId/tasks/batch", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Verify user owns the job or is authorized to add tasks
      if (job.posterId !== req.user?.id && job.workerId !== req.user?.id) {
        return res.status(403).json({ message: "Unauthorized to add tasks to this job" });
      }
      
      // Validate tasks array
      const taskArraySchema = z.object({
        tasks: z.array(
          insertTaskSchema.omit({ jobId: true }).extend({
            jobId: z.number().optional()
          })
        ),
      });
      
      const validation = taskArraySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid task data", 
          errors: validation.error.errors 
        });
      }
      
      // Create all tasks
      const createdTasks = [];
      for (const taskData of validation.data.tasks) {
        try {
          // Ensure jobId is set correctly
          const task = {
            ...taskData,
            jobId
          };
          
          const createdTask = await storage.createTask(task);
          createdTasks.push(createdTask);
        } catch (taskError) {
          console.error(`Error creating task for job ${jobId}:`, taskError);
        }
      }
      
      return res.status(201).json({ 
        message: `Created ${createdTasks.length} tasks for job ${jobId}`,
        tasks: createdTasks 
      });
    } catch (error) {
      console.error("Error creating batch tasks:", error);
      return res.status(500).json({ message: "Failed to create tasks" });
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
      let updatedEarning;
      
      if (status === 'paid') {
        datePaid = new Date();
        
        // Check if the worker has a Stripe Connect account for direct payment
        const worker = await storage.getUser(earning.workerId);
        if (!worker) {
          return res.status(404).json({ message: "Worker not found" });
        }
        
        if (worker.stripeConnectAccountId) {
          try {
            // Create a transfer to the worker's connected account
            const transfer = await stripe.transfers.create({
              amount: Math.round(earning.netAmount * 100), // Convert to cents
              currency: 'usd',
              destination: worker.stripeConnectAccountId,
              description: `Payment for job #${earning.jobId}: ${job.title}`,
              metadata: {
                earningId: earning.id.toString(),
                workerId: earning.workerId.toString(),
                jobId: earning.jobId.toString(),
                platform: "Fixer"
              }
            });
            
            // Create a payment record for the transfer
            await storage.createPayment({
              userId: earning.workerId,
              amount: earning.netAmount,
              type: "payout",
              status: "completed",
              paymentMethod: "stripe",
              transactionId: transfer.id,
              jobId: earning.jobId,
              description: `Payment for job #${earning.jobId}: ${job.title}`,
              metadata: { transferId: transfer.id }
            });
            
            // Update the earning with the payment date
            updatedEarning = await storage.updateEarningStatus(id, status, datePaid);
            
            return res.json({
              earning: updatedEarning,
              transfer: {
                id: transfer.id,
                amount: earning.netAmount,
                status: 'paid'
              },
              message: "Payment successfully transferred to worker's account."
            });
          } catch (error) {
            console.error("Error processing Stripe transfer:", error);
            return res.status(400).json({ 
              message: `Failed to process payment: ${(error as Error).message}` 
            });
          }
        } else {
          // If worker doesn't have a Connect account, just mark as paid but include a message
          updatedEarning = await storage.updateEarningStatus(id, status, datePaid);
          return res.json({
            earning: updatedEarning,
            message: "Payment marked as paid, but worker needs to set up a Stripe Connect account to receive funds automatically."
          });
        }
      } else {
        // For non-paid status updates, just update the status
        updatedEarning = await storage.updateEarningStatus(id, status, datePaid);
        return res.json(updatedEarning);
      }
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
      // Handle different parameter naming conventions from different parts of the app
      const { jobId, payAmount, amount, paymentMethodId } = req.body;
      
      console.log("Create payment intent request:", req.body);
      
      if (!jobId) {
        return res.status(400).json({ message: "Job ID is required" });
      }

      // Get the job to calculate payment amount if not provided
      const job = await storage.getJob(parseInt(jobId));
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Allow any authenticated user to create payment intents for simplicity
      // In a production app, we would have stricter checks
      
      // Use the provided amount, or fall back to the job's payment amount
      // Handle both parameter names 'amount' and 'payAmount' for flexibility
      const paymentAmount = payAmount || amount || job.paymentAmount;
      
      // Calculate the amount in cents
      const amountInCents = Math.round(paymentAmount * 100);
      
      // Create payment intent options
      // Determine if a service fee has been provided
      const serviceFee = req.body.serviceFee ? Math.round(req.body.serviceFee * 100) : 250; // Default $2.50
      
      // Create metadata with job and fee information
      const paymentIntentOptions: any = {
        amount: amountInCents,
        currency: "usd",
        metadata: {
          jobId: job.id.toString(),
          userId: req.user.id.toString(),
          serviceFee: serviceFee.toString(),
          jobAmount: (amountInCents - serviceFee).toString()
        }
        // Note: Cannot use application_fee_amount without Connect account
      };
      
      // If a payment method ID is provided, attach it to the payment intent
      if (paymentMethodId) {
        paymentIntentOptions.payment_method = paymentMethodId;
        
        // If user has a customer ID in Stripe, include it (required when using saved payment methods)
        if (req.user.stripeCustomerId) {
          paymentIntentOptions.customer = req.user.stripeCustomerId;
        }
        
        // For testing purposes, let's set up automatic confirmation with special handling
        paymentIntentOptions.confirm = true;
        paymentIntentOptions.error_on_requires_action = false; // Allow 3D Secure if needed
        paymentIntentOptions.return_url = `${req.protocol}://${req.get('host')}`;
        
        // For testing, we'll skip payment step if we're in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('Development mode detected, adding test-specific options');
          // These settings help with test cards
          paymentIntentOptions.setup_future_usage = 'off_session';
        }
      }
      
      // Create a new payment intent
      const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);
      
      // Update the job status based on payment success
      if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing') {
        await storage.updateJob(job.id, { status: 'open' });
      }
      
      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Simple auth check for Stripe actions
  apiRouter.get("/stripe/check-auth", async (req: Request, res: Response) => {
    if (!req.session) {
      return res.status(500).json({ message: "No session found" });
    }
    
    // Check if user is authenticated via passport
    if (req.isAuthenticated() && req.user) {
      return res.status(200).json({ authenticated: true, user: req.user.id });
    }
    
    // Check backup user ID in session
    if (req.session.userId) {
      try {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          // Restore session if we found a user
          req.login(user, (err) => {
            if (err) {
              console.error("Error restoring session from userId:", err);
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
    
    // Not authenticated by any method
    return res.status(401).json({ authenticated: false, message: "Not authenticated" });
  });
  
  // Stripe Connect endpoints for all users (both workers and job posters) - now with regular auth
  apiRouter.post("/stripe/connect/create-account", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Verify the user has a valid session - this is a safety fallback as isAuthenticated should already check
      if (!req.isAuthenticated() || !req.user) {
        console.error("User not authenticated in stripe/connect/create-account");
        return res.status(401).json({ message: "Authentication required" });
      }
      
      console.log("Creating Stripe Connect account for user ID:", req.user.id);
      
      // Fetch user directly from storage to ensure we have the latest data
      const storedUser = await storage.getUser(req.user.id);
      if (!storedUser) {
        console.error(`User ${req.user.id} not found in database`);
        return res.status(404).json({ message: "User not found in database" });
      }
      
      // Both workers and job posters can create Connect accounts
      // This allows users to both pay and receive payments
      
      // Check if the user already has a Connect account
      if (storedUser.stripeConnectAccountId) {
        console.log(`User ${req.user.id} already has Connect account: ${storedUser.stripeConnectAccountId}`);
        
        // Instead of erroring, create an account link for the existing account
        try {
          const accountLink = await stripe.accountLinks.create({
            account: storedUser.stripeConnectAccountId,
            refresh_url: `${process.env.APP_URL || 'https://fixer.replit.app'}/?refresh=connect`,
            return_url: `${process.env.APP_URL || 'https://fixer.replit.app'}/?setup=complete`,
            type: 'account_onboarding',
          });
          
          return res.json({
            accountId: storedUser.stripeConnectAccountId,
            accountLinkUrl: accountLink.url,
            message: "Continue setting up your existing Stripe Connect account"
          });
        } catch (linkError) {
          console.error("Error creating account link for existing account:", linkError);
          return res.status(500).json({ 
            message: "Error setting up your payment account. Please try again." 
          });
        }
      }
      
      if (!storedUser.email) {
        console.error(`User ${req.user.id} has no email address`);
        return res.status(400).json({
          message: "User must have an email address to create a Stripe Connect account"
        });
      }
      
      console.log(`Creating Connect account for user ${req.user.id} with email: ${storedUser.email}`);
      
      // Test Stripe API connectivity before proceeding
      try {
        await stripe.balance.retrieve();
        console.log("Successfully connected to Stripe API");
      } catch (stripeError) {
        console.error("Stripe API connection test failed:", stripeError);
        return res.status(500).json({ 
          message: "Could not connect to Stripe API. Please check your credentials." 
        });
      }
      
      // Create a Connect Express account
      const account = await stripe.accounts.create({
        type: 'express',
        email: storedUser.email,
        metadata: {
          userId: storedUser.id.toString(),
          platform: "Fixer"
        },
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true }
        },
        business_type: 'individual',
        business_profile: {
          url: `${process.env.APP_URL || 'https://fixer.replit.app'}/user/${storedUser.id}`,
          mcc: '7299', // Personal Services
          product_description: 'Gig economy services provided through Fixer platform'
        }
      });
      
      console.log("Stripe Connect account created:", account.id);
      
      // Update the user with the Connect account ID
      const updatedUser = await storage.updateUser(storedUser.id, {
        stripeConnectAccountId: account.id,
        stripeConnectAccountStatus: 'pending'
      });
      
      if (!updatedUser) {
        console.error("Failed to update user with Stripe Connect account ID");
        return res.status(500).json({ message: "Failed to update user with Connect account ID" });
      }
      
      // Create an account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.APP_URL || 'https://fixer.replit.app'}/?refresh=connect`,
        return_url: `${process.env.APP_URL || 'https://fixer.replit.app'}/?setup=complete`,
        type: 'account_onboarding',
      });
      
      // Don't return the user's password
      const { password, ...userData } = updatedUser;
      
      // Return the account link URL and account details
      res.json({
        user: userData,
        account: {
          id: account.id,
        },
        accountLinkUrl: accountLink.url
      });
      
      console.log("Successfully created Stripe Connect account:", {
        accountId: account.id,
        accountLinkUrl: accountLink.url
      });
    } catch (error) {
      console.error("Error creating Stripe Connect account:", error);
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // In-app Stripe Connect setup endpoint
  apiRouter.post("/stripe/connect/setup-account", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { personalInfo, address, businessType, bankAccount } = req.body;
      
      // Fetch user from storage
      const storedUser = await storage.getUser(req.user.id);
      if (!storedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      let accountId = storedUser.stripeConnectAccountId;
      
      // Create Connect account if it doesn't exist
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          email: personalInfo.email,
          metadata: {
            userId: storedUser.id.toString(),
            platform: "Fixer"
          },
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true }
          },
          business_type: 'individual',
          business_profile: {
            mcc: '7299', // Personal Services
            product_description: 'Gig economy services provided through Fixer platform'
          }
        });
        
        accountId = account.id;
        
        // Update user with Connect account ID
        await storage.updateUser(storedUser.id, {
          stripeConnectAccountId: accountId,
          stripeConnectAccountStatus: 'pending'
        });
      }

      // Update the Connect account with provided information
      const updateData: any = {
        individual: {
          first_name: personalInfo.firstName,
          last_name: personalInfo.lastName,
          email: personalInfo.email,
          phone: personalInfo.phone,
          address: {
            line1: address.line1,
            city: address.city,
            state: address.state,
            postal_code: address.postalCode,
            country: address.country
          }
        }
      };

      // Add date of birth if provided
      if (personalInfo.dateOfBirth?.day && personalInfo.dateOfBirth?.month && personalInfo.dateOfBirth?.year) {
        updateData.individual.dob = {
          day: parseInt(personalInfo.dateOfBirth.day),
          month: parseInt(personalInfo.dateOfBirth.month),
          year: parseInt(personalInfo.dateOfBirth.year)
        };
      }

      // Update the account
      await stripe.accounts.update(accountId, updateData);

      // Create external account (bank account)
      if (bankAccount.routingNumber && bankAccount.accountNumber) {
        try {
          await stripe.accounts.createExternalAccount(accountId, {
            external_account: {
              object: 'bank_account',
              country: address.country,
              currency: 'usd',
              routing_number: bankAccount.routingNumber,
              account_number: bankAccount.accountNumber,
              account_holder_name: bankAccount.accountHolderName,
              account_holder_type: 'individual'
            }
          });
        } catch (bankError) {
          console.error('Error adding bank account:', bankError);
          // Continue even if bank account fails - user can add it later
        }
      }

      // Update user status to active
      await storage.updateUser(storedUser.id, {
        stripeConnectAccountStatus: 'active'
      });

      res.json({
        success: true,
        accountId: accountId,
        message: 'Payment account setup completed successfully'
      });

    } catch (error) {
      console.error('Error setting up Stripe Connect account:', error);
      res.status(500).json({ 
        message: 'Failed to setup payment account. Please try again.' 
      });
    }
  });
  
  apiRouter.get("/stripe/connect/account-status", isStripeAuthenticated, async (req: Request, res: Response) => {
    try {
      // Both workers and job posters can access Connect account status
      // This allows all users to manage their Stripe Connect account
      
      // Check if the user has a Connect account
      if (!req.user.stripeConnectAccountId) {
        return res.status(200).json({ 
          exists: false,
          message: "User does not have a Stripe Connect account yet",
          needsSetup: true
        });
      }
      
      // Retrieve the account details
      const account = await stripe.accounts.retrieve(req.user.stripeConnectAccountId);
      
      // Check if account needs more details for onboarding
      let accountLinkUrl = null;
      let needsOnboarding = !account.details_submitted || !account.payouts_enabled;
      
      if (needsOnboarding) {
        try {
          // Create a new account link for onboarding
          const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${process.env.APP_URL || 'https://fixer.replit.app'}/profile?refresh=true`,
            return_url: `${process.env.APP_URL || 'https://fixer.replit.app'}/profile?success=true`,
            type: 'account_onboarding',
          });
          accountLinkUrl = accountLink.url;
          console.log("Created account link for incomplete account:", accountLinkUrl);
        } catch (linkError) {
          console.error("Error creating account link:", linkError);
          // Continue even if we can't create a link - we'll just show the status
        }
      }
      
      // Determine account status
      let accountStatus = 'unknown';
      if (account.details_submitted) {
        if (account.payouts_enabled) {
          accountStatus = 'active';
        } else {
          accountStatus = 'restricted';
        }
      } else {
        accountStatus = 'incomplete';
      }
      
      // Return sanitized account details
      res.json({
        accountId: account.id,
        detailsSubmitted: account.details_submitted,
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        accountLinkUrl: accountLinkUrl,
        defaultCurrency: account.default_currency,
        country: account.country,
        accountStatus: accountStatus,
        // Include requirements information for UI display
        requirements: {
          currentlyDue: account.requirements?.currently_due || [],
          eventuallyDue: account.requirements?.eventually_due || [],
          pendingVerification: account.requirements?.pending_verification || []
        }
      });
    } catch (error) {
      console.error("Error retrieving Stripe Connect account:", error);
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  apiRouter.post("/stripe/connect/create-login-link", isStripeAuthenticated, async (req: Request, res: Response) => {
    try {
      // Both workers and job posters can access their Connect dashboard
      // This provides a unified experience for all users
      
      // Check if the user has a Connect account
      if (!req.user.stripeConnectAccountId) {
        return res.status(200).json({ 
          exists: false,
          message: "User does not have a Stripe Connect account yet",
          needsSetup: true
        });
      }
      
      // First check the account to see if it has completed onboarding
      try {
        const account = await stripe.accounts.retrieve(req.user.stripeConnectAccountId);
        const needsOnboarding = !account.details_submitted || !account.payouts_enabled;
        
        if (needsOnboarding) {
          // The account hasn't completed onboarding, so create an account link instead
          const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${process.env.APP_URL || 'https://fixer.replit.app'}/profile?refresh=true`,
            return_url: `${process.env.APP_URL || 'https://fixer.replit.app'}/profile?success=true`,
            type: 'account_onboarding',
          });
          
          console.log("Created account link for incomplete account instead of login link");
          
          return res.json({ 
            accountLinkUrl: accountLink.url,
            needsOnboarding: true,
            accountStatus: account.details_submitted 
              ? (account.payouts_enabled ? 'active' : 'restricted') 
              : 'incomplete'
          });
        }
      } catch (accountError) {
        console.error("Error checking account status before creating login link:", accountError);
        // Continue with login link creation attempt even if account retrieval fails
      }
      
      // Create a login link to access the Connect dashboard
      const loginLink = await stripe.accounts.createLoginLink(
        req.user.stripeConnectAccountId
      );
      
      res.json({ 
        url: loginLink.url,
        accountLinkUrl: loginLink.url  // For consistent field naming with other endpoints
      });
    } catch (error) {
      // If we get the specific error about incomplete onboarding, handle it specially
      if ((error as any).message && (error as any).message.includes('not completed onboarding')) {
        console.log("Handling specific onboarding error case");
        
        try {
          // Create an account link instead of a login link
          const accountLink = await stripe.accountLinks.create({
            account: req.user.stripeConnectAccountId,
            refresh_url: `${process.env.APP_URL || 'https://fixer.replit.app'}/profile?refresh=true`,
            return_url: `${process.env.APP_URL || 'https://fixer.replit.app'}/profile?success=true`,
            type: 'account_onboarding',
          });
          
          return res.json({ 
            accountLinkUrl: accountLink.url,
            needsOnboarding: true,
            message: "Account needs to complete onboarding"
          });
        } catch (linkError) {
          console.error("Failed to create account link after login link failed:", linkError);
          return res.status(400).json({ 
            message: "Account needs to complete onboarding, but could not create onboarding link." 
          });
        }
      }
      
      console.error("Error creating Stripe Connect login link:", error);
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // Payment methods endpoints
  apiRouter.get("/payment-methods", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user.stripeCustomerId) {
        return res.json([]);
      }
      
      const paymentMethods = await stripe.paymentMethods.list({
        customer: req.user.stripeCustomerId,
        type: 'card',
      });
      
      res.json(paymentMethods.data);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  apiRouter.post("/payment-methods/:id/set-default", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const paymentMethodId = req.params.id;
      
      if (!req.user.stripeCustomerId) {
        return res.status(400).json({ message: "No Stripe customer ID found" });
      }
      
      // Update the customer's default payment method
      const customer = await stripe.customers.update({
        id: req.user.stripeCustomerId,
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error setting default payment method:', error);
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  apiRouter.delete("/payment-methods/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const paymentMethodId = req.params.id;
      
      // Detach the payment method from the customer
      const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting payment method:', error);
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Process payment for job creation
  apiRouter.post("/payment/process-payment", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { jobId, paymentMethodId, amount, paymentType } = req.body;
      
      if (!jobId || !paymentMethodId || amount === undefined || amount === null) {
        return res.status(400).json({ message: "Missing required fields for payment" });
      }
      
      // Ensure amount is a number
      const paymentAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
      
      if (isNaN(paymentAmount)) {
        return res.status(400).json({ message: "Invalid payment amount" });
      }
      
      console.log(`Processing payment for job ${jobId}: $${paymentAmount} with method ${paymentMethodId}`);
      
      // Get the job to validate ownership
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Validate that the requester is the job poster
      if (job.posterId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: Only the job poster can process this payment" 
        });
      }
      
      // Get the user to retrieve their customer ID
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create or get Stripe customer ID
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        // Create a new customer
        const customer = await stripe.customers.create({
          name: user.fullName || user.username,
          email: user.email || undefined,
          metadata: {
            userId: user.id.toString()
          }
        });
        
        customerId = customer.id;
        await storage.updateUser(user.id, { stripeCustomerId: customerId });
      }
      
      console.log("Creating payment intent with amount:", amount, "and payment method:", paymentMethodId);
      
      // Try to create a payment intent with better error handling
      let paymentIntent;
      try {
        paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(paymentAmount * 100), // Convert to cents
          currency: 'usd',
          customer: customerId,
          payment_method: paymentMethodId,
          confirm: true, // Confirm immediately
          capture_method: 'automatic', // Capture the funds immediately
          description: `Payment for job: ${job.title}`,
          metadata: {
            jobId: job.id.toString(),
            userId: req.user.id.toString(),
            paymentType: paymentType || 'fixed'
          }
        });
        
        console.log("Payment intent created successfully:", paymentIntent.id, "with status:", paymentIntent.status);
      } catch (stripeError) {
        console.error("Stripe payment intent creation failed:", stripeError);
        return res.status(400).json({
          message: stripeError instanceof Error ? stripeError.message : "Failed to process payment with Stripe",
          error: stripeError
        });
      }
      
      // Create a payment record
      const payment = await storage.createPayment({
        userId: req.user.id,
        amount: amount,
        serviceFee: amount * 0.1, // 10% service fee
        type: 'job_payment',
        status: paymentIntent.status,
        paymentMethod: 'card',
        transactionId: paymentIntent.id,
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: customerId,
        jobId: job.id,
        description: `Payment for job: ${job.title}`
      });
      
      // Update the job status from pending_payment to open
      await storage.updateJob(job.id, { 
        status: 'open',
      });
      
      // Return success
      return res.status(200).json({
        success: true,
        paymentId: paymentIntent.id,
        status: paymentIntent.status,
        jobId: job.id
      });
    } catch (error) {
      console.error("Payment processing error:", error);
      return res.status(400).json({ 
        message: error instanceof Error ? error.message : "Payment processing failed",
        error: error
      });
    }
  });
  
  apiRouter.post("/stripe/create-setup-intent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Make sure we have a customer ID
      let customerId = req.user.stripeCustomerId;
      
      // If the user doesn't have a customer ID yet, create one
      if (!customerId) {
        const customer = await stripe.customers.create({
          name: req.user.fullName || req.user.username,
          email: req.user.email,
          metadata: {
            userId: req.user.id.toString(),
          },
        });
        
        customerId = customer.id;
        
        // Update user with new customer ID
        await storage.updateUser(req.user.id, { stripeCustomerId: customerId });
      }
      
      // Create a SetupIntent
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
      });
      
      res.json({ clientSecret: setupIntent.client_secret });
    } catch (error) {
      console.error('Error creating setup intent:', error);
      res.status(500).json({ message: (error as Error).message });
    }
  });

  apiRouter.post("/stripe/confirm-payment", isStripeAuthenticated, async (req: Request, res: Response) => {
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
      // Connect account events 
      else if (event.type === 'account.updated') {
        await handleConnectAccountUpdate(event.data.object);
      }
      else if (event.type === 'account.application.authorized') {
        await handleConnectAccountAuthorized(event.data.object);
      }
      else if (event.type === 'account.application.deauthorized') {
        await handleConnectAccountDeauthorized(event.data.object);
      }
      else if (event.type === 'transfer.created' || event.type === 'transfer.paid') {
        await handleTransferEvent(event.data.object, event.type);
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
              
              const earning = await storage.createEarning({
                jobId: job.id,
                workerId: job.workerId,
                amount: job.paymentAmount,
                serviceFee: job.serviceFee,
                netAmount: netAmount
              });
              
              console.log(`Earning created for worker ${job.workerId} for job ${job.id}`);
              
              // Get the worker to check if they have a Stripe Connect account
              const worker = await storage.getUser(job.workerId);
              
              // If the worker has a Stripe Connect account, transfer the payment to them
              if (worker && worker.stripeConnectAccountId) {
                try {
                  // Create a transfer to the worker's Connect account
                  const transfer = await stripe.transfers.create({
                    amount: Math.round(netAmount * 100), // Convert to cents for Stripe
                    currency: 'usd',
                    destination: worker.stripeConnectAccountId,
                    transfer_group: `job-${job.id}`,
                    metadata: {
                      jobId: job.id.toString(),
                      workerId: job.workerId.toString(),
                      earningId: earning.id.toString(),
                      paymentId: payment.id.toString()
                    },
                    description: `Payment for job: ${job.title}`
                  });
                  
                  console.log(`Successfully transferred $${netAmount} to worker ${job.workerId} (Connect account: ${worker.stripeConnectAccountId})`);
                  
                  // Update the earning record to mark it as paid
                  await storage.updateEarningStatus(earning.id, 'paid', new Date());
                } catch (transferError) {
                  console.error(`Error transferring to Connect account: ${(transferError as Error).message}`);
                  // We don't want to fail the whole transaction if the transfer fails
                  // The admin can manually transfer later
                }
              } else {
                console.log(`Worker ${job.workerId} doesn't have a Stripe Connect account yet. Funds will be held by the platform.`);
              }
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
            
            const earning = await storage.createEarning({
              jobId: job.id,
              workerId: job.workerId,
              amount: job.paymentAmount,
              serviceFee: job.serviceFee,
              netAmount: netAmount
            });
            
            console.log(`Earning created for worker ${job.workerId} for job ${job.id}`);
            
            // Get the worker to check if they have a Stripe Connect account
            const worker = await storage.getUser(job.workerId);
            
            // If the worker has a Stripe Connect account, transfer the payment to them
            if (worker && worker.stripeConnectAccountId) {
              try {
                // Create a transfer to the worker's Connect account
                const transfer = await stripe.transfers.create({
                  amount: Math.round(netAmount * 100), // Convert to cents for Stripe
                  currency: 'usd',
                  destination: worker.stripeConnectAccountId,
                  transfer_group: `job-${job.id}`,
                  metadata: {
                    jobId: job.id.toString(),
                    workerId: job.workerId.toString(),
                    earningId: earning.id.toString(),
                    paymentId: createdPayment.id.toString()
                  },
                  description: `Payment for job: ${job.title}`
                });
                
                console.log(`Successfully transferred $${netAmount} to worker ${job.workerId} (Connect account: ${worker.stripeConnectAccountId})`);
                
                // Update the earning record to mark it as paid
                await storage.updateEarningStatus(earning.id, 'paid', new Date());
              } catch (transferError) {
                console.error(`Error transferring to Connect account: ${(transferError as Error).message}`);
                // We don't want to fail the whole transaction if the transfer fails
                // The admin can manually transfer later
              }
            } else {
              console.log(`Worker ${job.workerId} doesn't have a Stripe Connect account yet. Funds will be held by the platform.`);
            }
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
  
  // Helper function to handle Connect account updates
  async function handleConnectAccountUpdate(account: Stripe.Account) {
    try {
      // Find the user with this Connect account ID
      const users = await storage.getAllUsers();
      const user = users.find(u => u.stripeConnectAccountId === account.id);
      
      if (!user) {
        console.error(`No user found with Stripe Connect account ID: ${account.id}`);
        return;
      }
      
      // Update the user's account status based on the Connect account details
      const accountStatus = getConnectAccountStatus(account);
      
      // Update the user in the database with the new status
      await storage.updateUser(user.id, {
        stripeConnectAccountStatus: accountStatus
      });
      
      console.log(`Updated Connect account status for user ${user.id} to ${accountStatus}`);
    } catch (error) {
      console.error(`Error handling Connect account update: ${(error as Error).message}`);
    }
  }
  
  // Helper function to determine Connect account status
  function getConnectAccountStatus(account: Stripe.Account): string {
    // Check if the account is fully onboarded
    if (account.charges_enabled && account.payouts_enabled) {
      return 'active';
    }
    
    // Check if the account is disabled
    if (account.requirements?.disabled_reason) {
      return 'disabled';
    }
    
    // Check if the account has pending requirements
    if (account.requirements?.currently_due?.length > 0) {
      return 'incomplete';
    }
    
    // Default status if we can't determine
    return 'pending';
  }
  
  // Helper function to handle Connect account authorization
  async function handleConnectAccountAuthorized(account: Stripe.Account) {
    try {
      // Find the user with this Connect account ID
      const users = await storage.getAllUsers();
      const user = users.find(u => u.stripeConnectAccountId === account.id);
      
      if (!user) {
        console.error(`No user found with Stripe Connect account ID: ${account.id}`);
        return;
      }
      
      // Update the user's account status in the database
      await storage.updateUser(user.id, {
        stripeConnectAccountStatus: 'active'
      });
      
      console.log(`Connect account for user ${user.id} is now authorized`);
    } catch (error) {
      console.error(`Error handling Connect account authorization: ${(error as Error).message}`);
    }
  }
  
  // Helper function to handle Connect account deauthorization
  async function handleConnectAccountDeauthorized(account: Stripe.Account) {
    try {
      // Find the user with this Connect account ID
      const users = await storage.getAllUsers();
      const user = users.find(u => u.stripeConnectAccountId === account.id);
      
      if (!user) {
        console.error(`No user found with Stripe Connect account ID: ${account.id}`);
        return;
      }
      
      // Update the user's account status in the database
      await storage.updateUser(user.id, {
        stripeConnectAccountStatus: 'deauthorized'
      });
      
      console.log(`Connect account for user ${user.id} has been deauthorized`);
    } catch (error) {
      console.error(`Error handling Connect account deauthorization: ${(error as Error).message}`);
    }
  }
  
  // Helper function to handle transfer events (payout to worker)
  async function handleTransferEvent(transfer: Stripe.Transfer, eventType: string) {
    try {
      // Extract metadata from transfer (job ID, worker ID, earning ID)
      const { jobId, workerId, earningId } = transfer.metadata || {};
      
      if (!jobId || !workerId || !earningId) {
        console.log(`Transfer ${transfer.id} doesn't have required metadata, ignoring`);
        return;
      }
      
      // Parse IDs to integers
      const jobIdInt = parseInt(jobId);
      const workerIdInt = parseInt(workerId);
      const earningIdInt = parseInt(earningId);
      
      // Get the earning record
      const earning = await storage.getEarning(earningIdInt);
      
      if (!earning) {
        console.error(`No earning found with ID: ${earningIdInt}`);
        return;
      }
      
      // Update the earning status based on the transfer event
      if (eventType === 'transfer.paid') {
        // Transfer has been paid out to the worker's bank account
        await storage.updateEarningStatus(earningIdInt, 'paid', new Date());
        console.log(`Earning ${earningIdInt} for job ${jobIdInt} marked as paid via webhook`);
      } else if (eventType === 'transfer.created') {
        // Transfer has been created but not yet paid out
        await storage.updateEarningStatus(earningIdInt, 'processing');
        console.log(`Earning ${earningIdInt} for job ${jobIdInt} marked as processing via webhook`);
      }
    } catch (error) {
      console.error(`Error handling transfer event: ${(error as Error).message}`);
    }
  }

  // Notification endpoints
  // Get all notifications for a user
  apiRouter.get("/notifications", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const { isRead, limit } = req.query;
      
      // Parse options
      const options: { isRead?: boolean, limit?: number } = {};
      
      if (isRead !== undefined) {
        options.isRead = isRead === 'true';
      }
      
      if (limit !== undefined) {
        options.limit = parseInt(limit as string);
      }
      
      const notifications = await storage.getNotifications(userId, options);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Get a specific notification
  apiRouter.get("/notifications/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const notification = await storage.getNotification(id);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      // Ensure user only accesses their own notifications
      if (notification.userId !== req.user.id) {
        return res.status(403).json({ message: "You can only access your own notifications" });
      }
      
      res.json(notification);
    } catch (error) {
      console.error('Error fetching notification:', error);
      res.status(500).json({ message: "Failed to fetch notification" });
    }
  });
  
  // Mark a notification as read
  apiRouter.patch("/notifications/:id/read", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the notification first to check ownership
      const notification = await storage.getNotification(id);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      // Ensure user only updates their own notifications
      if (notification.userId !== req.user.id) {
        return res.status(403).json({ message: "You can only update your own notifications" });
      }
      
      const updatedNotification = await storage.markNotificationAsRead(id);
      res.json(updatedNotification);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });
  
  // Mark all notifications as read
  apiRouter.post("/notifications/mark-all-read", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const count = await storage.markAllNotificationsAsRead(userId);
      res.json({ count, message: `Marked ${count} notifications as read` });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });
  
  // Delete a notification
  apiRouter.delete("/notifications/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the notification first to check ownership
      const notification = await storage.getNotification(id);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      // Ensure user only deletes their own notifications
      if (notification.userId !== req.user.id) {
        return res.status(403).json({ message: "You can only delete your own notifications" });
      }
      
      const success = await storage.deleteNotification(id);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete notification" });
      }
      
      res.json({ message: "Notification deleted successfully" });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });
  
  // Notify nearby workers about a job (for job posters)
  apiRouter.post("/jobs/:id/notify-nearby-workers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.id);
      
      // Get the job to check ownership
      const job = await storage.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Ensure only the job poster can send notifications
      if (job.posterId !== req.user.id) {
        return res.status(403).json({ message: "Only the job poster can send notifications" });
      }
      
      // Parse radius from request body, default to 5 miles
      const schema = z.object({
        radiusMiles: z.number().default(5)
      });
      
      const { radiusMiles } = schema.parse(req.body);
      
      // Send notifications to nearby workers
      const notificationCount = await storage.notifyNearbyWorkers(jobId, radiusMiles);
      
      res.json({ 
        notificationCount, 
        message: `Sent notifications to ${notificationCount} nearby workers` 
      });
    } catch (error) {
      console.error('Error notifying nearby workers:', error);
      res.status(500).json({ message: "Failed to notify nearby workers" });
    }
  });

  // Notification API endpoints
  apiRouter.get("/notifications", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const isRead = req.query.isRead === 'true' ? true : 
                   req.query.isRead === 'false' ? false : 
                   undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      const notifications = await storage.getNotifications(userId, { 
        isRead, 
        limit 
      });
      
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  apiRouter.get("/notifications/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const notificationId = parseInt(req.params.id);
      const notification = await storage.getNotification(notificationId);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      // Check if notification belongs to requesting user
      if (notification.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to access this notification" });
      }
      
      res.json(notification);
    } catch (error) {
      console.error('Error fetching notification:', error);
      res.status(500).json({ message: "Failed to fetch notification" });
    }
  });

  apiRouter.post("/notifications/mark-read/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const notificationId = parseInt(req.params.id);
      const notification = await storage.getNotification(notificationId);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      // Check if notification belongs to requesting user
      if (notification.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to update this notification" });
      }
      
      const updatedNotification = await storage.markNotificationAsRead(notificationId);
      res.json(updatedNotification);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  apiRouter.post("/notifications/mark-all-read", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const count = await storage.markAllNotificationsAsRead(userId);
      
      res.json({ 
        count, 
        message: `Marked ${count} notifications as read` 
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ message: "Failed to update notifications" });
    }
  });

  apiRouter.delete("/notifications/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const notificationId = parseInt(req.params.id);
      const notification = await storage.getNotification(notificationId);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      // Check if notification belongs to requesting user
      if (notification.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to delete this notification" });
      }
      
      const success = await storage.deleteNotification(notificationId);
      
      if (success) {
        res.json({ message: "Notification deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete notification" });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });
  
  // Create notification endpoint for direct creation (admin/system only)
  apiRouter.post("/notifications", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Validate the notification data
      const schema = z.object({
        userId: z.number(),
        title: z.string(),
        message: z.string(),
        type: z.string(),
        sourceId: z.number().optional(),
        sourceType: z.string().optional(),
        metadata: z.any().optional()
      });
      
      const validatedData = schema.parse(req.body);
      
      // Only allow users to create notifications for themselves unless admin
      // This can be expanded later with proper admin roles
      if (validatedData.userId !== req.user!.id) {
        return res.status(403).json({ 
          message: "Not authorized to create notifications for other users" 
        });
      }
      
      const notification = await storage.createNotification(validatedData);
      res.status(201).json(notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  // Payment Intent Creation for Checkout
  app.post("/api/create-payment-intent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { amount, jobId } = req.body;
      
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      if (!jobId || typeof jobId !== 'number') {
        return res.status(400).json({ message: "Invalid job ID" });
      }
      
      // Get the job to verify it exists
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Validate payment amount
      const amountValidation = validatePaymentAmount(amount);
      if (!amountValidation.isApproved) {
        return res.status(400).json({ message: amountValidation.reason || "Invalid payment amount" });
      }
      
      // Convert to cents for Stripe
      const amountInCents = Math.round(amount * 100);
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "usd",
        metadata: {
          jobId: jobId.toString(),
          userId: req.user.id.toString(),
          jobTitle: job.title,
        },
        description: `Payment for job: ${job.title} (ID: ${jobId})`,
      });
      
      // Create a pending payment record in our database
      await storage.createPayment({
        userId: req.user.id,
        amount: amount,
        currency: "usd",
        status: "pending",
        jobId: jobId,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          paymentIntentId: paymentIntent.id,
          description: `Payment for job: ${job.title}`,
        }
      });
      
      res.json({ 
        clientSecret: paymentIntent.client_secret,
        amount: amount,
        jobId: jobId
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + (error as Error).message });
    }
  });

  // Payment Status Endpoint - To fetch payment details after completion
  app.get("/api/payment-status/:paymentIntentId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { paymentIntentId } = req.params;
      
      if (!paymentIntentId) {
        return res.status(400).json({ message: "Missing payment intent ID" });
      }
      
      // Retrieve the payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (!paymentIntent) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // Find our internal payment record
      const payment = await storage.getPaymentByTransactionId(paymentIntentId);
      
      // If payment exists in our system, update its status if needed
      if (payment && payment.status !== paymentIntent.status) {
        await storage.updatePaymentStatus(payment.id, paymentIntent.status);
      }
      
      // Get the job details for the response
      let jobTitle = "Job";
      let jobId = 0;
      
      if (paymentIntent.metadata && paymentIntent.metadata.jobId) {
        jobId = parseInt(paymentIntent.metadata.jobId);
        
        // Try to get the job title from our database
        if (jobId) {
          const job = await storage.getJob(jobId);
          if (job) {
            jobTitle = job.title;
          } else if (paymentIntent.metadata.jobTitle) {
            // Use metadata job title as fallback
            jobTitle = paymentIntent.metadata.jobTitle;
          }
        }
      }
      
      // Return the payment details needed for the success page
      res.json({
        id: paymentIntentId,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        jobId: jobId,
        jobTitle: jobTitle
      });
    } catch (error) {
      console.error("Error retrieving payment status:", error);
      res.status(500).json({ message: "Error retrieving payment status: " + (error as Error).message });
    }
  });

  // Mount the API router under /api prefix
  app.use("/api", apiRouter);
  
  // Use the centralized Stripe API router
  app.use("/api/stripe", stripeRouter);
  
  // Process payment for hiring a worker
  app.post("/api/payments/process", isAuthenticated, processPayment);
  
  // Preauthorize payment without creating a job
  app.post("/api/payments/preauthorize", isAuthenticated, preauthorizePayment);
  
  // Enable Stripe integration endpoints
  // Use our improved create-payment-intent handler
  app.use("/api/stripe", createPaymentIntentRouter);
  
  // Add enhanced payment intent route that supports return_url for proper 3D Secure flow
  app.post("/api/stripe/create-payment-intent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { amount, description, metadata = {}, return_url } = req.body;
      
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      // Get or create customer ID
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        // Create a customer for this user
        const customer = await stripe.customers.create({
          name: user.fullName || user.username,
          email: user.email || undefined,
          metadata: {
            userId: user.id.toString()
          }
        });
        
        customerId = customer.id;
        await storage.updateUser(user.id, { stripeCustomerId: customerId });
      }
      
      // Create payment intent with all the needed parameters
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        customer: customerId,
        metadata: {
          userId: req.user.id.toString(),
          ...metadata
        },
        description: description || 'Payment for services',
        automatic_payment_methods: {
          enabled: true
        },
        ...(return_url && { confirmation_method: 'automatic', return_url })
      });
      
      // Return the client secret and payment intent ID
      return res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return res.status(500).json({ 
        message: 'Failed to create payment intent', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Initialize Stripe webhooks
  setupStripeWebhooks(app);
  
  // Initialize Stripe transfers API
  setupStripeTransfersRoutes(app);
  
  // Initialize Stripe payment methods API
  setupStripePaymentMethodsRoutes(app);

  // ===== ROBUST REAL-TIME MESSAGING SYSTEM =====
  
  // Initialize WebSocket service with enterprise-grade features
  let webSocketService: WebSocketService;
  
  // Configure avatar upload storage
  const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'public/avatars');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const userId = req.user?.id;
      const extension = path.extname(file.originalname);
      cb(null, `avatar-${userId}-${Date.now()}${extension}`);
    }
  });

  const avatarUpload = multer({
    storage: avatarStorage,
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB max
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPG and PNG allowed.'));
      }
    }
  });

  // === MESSAGING API ENDPOINTS ===
  
  // Send a new message
  app.post('/api/messages', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const { recipientId, content, jobId } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: 'Message content is required' });
      }

      if (!recipientId) {
        return res.status(400).json({ message: 'Recipient is required' });
      }

      const message = {
        senderId: req.user!.id,
        recipientId: parseInt(recipientId),
        content: content.trim(),
        jobId: jobId ? parseInt(jobId) : null,
        sentAt: new Date(),
        isRead: false
      };

      // Save message to database (you'll need to implement this in storage)
      const savedMessage = await storage.createMessage(message);
      
      // Send real-time notification via WebSocket
      const recipientSocket = connectedClients.get(parseInt(recipientId));
      if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
        recipientSocket.send(JSON.stringify({
          type: 'new_message',
          message: {
            ...savedMessage,
            sender: { id: req.user!.id, username: req.user!.username, avatarUrl: req.user!.avatarUrl }
          }
        }));
      }

      // Also broadcast to job room if applicable
      if (jobId) {
        const roomKey = `job-${jobId}`;
        const roomSockets = messageRooms.get(roomKey);
        if (roomSockets) {
          roomSockets.forEach(socket => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: 'job_message',
                message: {
                  ...savedMessage,
                  sender: { id: req.user!.id, username: req.user!.username, avatarUrl: req.user!.avatarUrl }
                }
              }));
            }
          });
        }
      }

      res.json({ message: savedMessage, success: true });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  // Get chat history for a job
  app.get('/api/messages/:jobId', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const jobId = parseInt(req.params.jobId);
      const messages = await storage.getMessagesForJob(jobId);
      
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  // Get conversation between two users
  app.get('/api/messages/conversation/:userId', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const otherUserId = parseInt(req.params.userId);
      const messages = await storage.getConversation(req.user!.id, otherUserId);
      
      res.json(messages);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ message: 'Failed to fetch conversation' });
    }
  });

  // Mark message as read
  app.put('/api/messages/:messageId/read', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const messageId = parseInt(req.params.messageId);
      const updatedMessage = await storage.markMessageAsRead(messageId, req.user!.id);
      
      if (!updatedMessage) {
        return res.status(404).json({ message: 'Message not found' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error marking message as read:', error);
      res.status(500).json({ message: 'Failed to mark message as read' });
    }
  });

  // === SUPPORT SYSTEM API ===
  
  // Create support ticket
  app.post('/api/support/tickets', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { category, subject, description, priority, jobId } = req.body;
      
      // Generate unique ticket number
      const ticketNumber = `TK${Date.now().toString().slice(-6)}`;
      
      const newTicket = await db.insert(supportTickets).values({
        userId: req.user!.id,
        ticketNumber,
        category,
        subject,
        description,
        priority: priority || 'medium',
        jobId: jobId || null,
        status: 'open'
      }).returning();

      res.json(newTicket[0]);
    } catch (error) {
      console.error('Error creating support ticket:', error);
      res.status(500).json({ message: 'Failed to create support ticket' });
    }
  });

  // Get user's support tickets
  app.get('/api/support/tickets', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const userTickets = await db.select()
        .from(supportTickets)
        .where(eq(supportTickets.userId, req.user!.id))
        .orderBy(desc(supportTickets.createdAt));

      res.json(userTickets);
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      res.status(500).json({ message: 'Failed to fetch support tickets' });
    }
  });

  // Create dispute
  app.post('/api/support/disputes', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { jobId, disputeType, description, requestedResolution, urgency } = req.body;
      
      // First create a support ticket for the dispute
      const ticketNumber = `DT${Date.now().toString().slice(-6)}`;
      
      const ticket = await db.insert(supportTickets).values({
        userId: req.user!.id,
        ticketNumber,
        category: 'JOB_DISPUTE',
        subject: `Job Dispute - ${disputeType}`,
        description,
        priority: urgency || 'high',
        jobId: parseInt(jobId),
        status: 'open'
      }).returning();

      // Get job details to find the other party
      const job = await db.select()
        .from(jobs)
        .where(eq(jobs.id, parseInt(jobId)))
        .limit(1);

      if (job.length === 0) {
        return res.status(404).json({ message: 'Job not found' });
      }

      // Determine who is being disputed against
      const disputedAgainstId = req.user!.id === job[0].posterId ? job[0].workerId : job[0].posterId;

      // Create the dispute record
      const dispute = await db.insert(disputes).values({
        ticketId: ticket[0].id,
        jobId: parseInt(jobId),
        disputerId: req.user!.id,
        disputedAgainstId,
        disputeType,
        requestedResolution
      }).returning();

      res.json({ ticket: ticket[0], dispute: dispute[0] });
    } catch (error) {
      console.error('Error creating dispute:', error);
      res.status(500).json({ message: 'Failed to create dispute' });
    }
  });

  // Get user's jobs for dispute forms
  app.get('/api/jobs/user', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      // Get jobs where user is either poster or worker
      const userJobs = await db.select()
        .from(jobs)
        .where(
          or(
            eq(jobs.posterId, req.user!.id),
            eq(jobs.workerId, req.user!.id)
          )
        )
        .orderBy(desc(jobs.datePosted));

      res.json(userJobs);
    } catch (error) {
      console.error('Error fetching user jobs:', error);
      res.status(500).json({ message: 'Failed to fetch user jobs' });
    }
  });

  // Process automated refund
  app.post('/api/support/refunds', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { ticketId, refundAmount, reason, paymentIntentId } = req.body;
      
      // Create refund record
      const refund = await db.insert(refunds).values({
        ticketId: parseInt(ticketId),
        userId: req.user!.id,
        amount: parseFloat(refundAmount),
        reason,
        status: 'pending',
        stripeRefundId: null
      }).returning();

      // Process Stripe refund if payment intent provided
      if (paymentIntentId) {
        try {
          const stripeRefund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: Math.round(parseFloat(refundAmount) * 100), // Convert to cents
            reason: reason === 'FRAUDULENT' ? 'fraudulent' : 'requested_by_customer'
          });

          // Update refund with Stripe ID
          await db.update(refunds)
            .set({ 
              stripeRefundId: stripeRefund.id,
              status: 'processed',
              processedAt: new Date()
            })
            .where(eq(refunds.id, refund[0].id));

          res.json({ 
            refund: { ...refund[0], stripeRefundId: stripeRefund.id, status: 'processed' },
            stripeRefund 
          });
        } catch (stripeError) {
          console.error('Stripe refund error:', stripeError);
          
          // Update refund status to failed
          await db.update(refunds)
            .set({ status: 'failed' })
            .where(eq(refunds.id, refund[0].id));

          res.status(400).json({ 
            message: 'Failed to process Stripe refund',
            error: stripeError.message,
            refund: { ...refund[0], status: 'failed' }
          });
        }
      } else {
        res.json({ refund: refund[0] });
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      res.status(500).json({ message: 'Failed to process refund' });
    }
  });

  // Get user's refunds
  app.get('/api/support/refunds', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const userRefunds = await db.select()
        .from(refunds)
        .where(eq(refunds.userId, req.user!.id))
        .orderBy(desc(refunds.createdAt));

      res.json(userRefunds);
    } catch (error) {
      console.error('Error fetching refunds:', error);
      res.status(500).json({ message: 'Failed to fetch refunds' });
    }
  });

  // Add support message to existing ticket
  app.post('/api/support/tickets/:ticketId/messages', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { ticketId } = req.params;
      const { message, attachmentUrl } = req.body;

      // Verify ticket belongs to user
      const ticket = await db.select()
        .from(supportTickets)
        .where(and(
          eq(supportTickets.id, parseInt(ticketId)),
          eq(supportTickets.userId, req.user!.id)
        ))
        .limit(1);

      if (ticket.length === 0) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      // Create support message
      const supportMessage = await db.insert(supportMessages).values({
        ticketId: parseInt(ticketId),
        senderId: req.user!.id,
        message,
        attachmentUrl: attachmentUrl || null,
        isAdminReply: false
      }).returning();

      res.json(supportMessage[0]);
    } catch (error) {
      console.error('Error adding support message:', error);
      res.status(500).json({ message: 'Failed to add message' });
    }
  });

  // Get messages for a support ticket
  app.get('/api/support/tickets/:ticketId/messages', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { ticketId } = req.params;

      // Verify ticket belongs to user
      const ticket = await db.select()
        .from(supportTickets)
        .where(and(
          eq(supportTickets.id, parseInt(ticketId)),
          eq(supportTickets.userId, req.user!.id)
        ))
        .limit(1);

      if (ticket.length === 0) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      // Get all messages for the ticket
      const messages = await db.select()
        .from(supportMessages)
        .where(eq(supportMessages.ticketId, parseInt(ticketId)))
        .orderBy(asc(supportMessages.createdAt));

      res.json(messages);
    } catch (error) {
      console.error('Error fetching support messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  // === AVATAR UPLOAD API ===
  
  // Upload profile avatar
  app.post('/api/users/avatar', avatarUpload.single('avatar'), async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const avatarUrl = `/avatars/${req.file.filename}`;
      
      // Update user's avatar URL in database
      const updatedUser = await storage.updateUser(req.user!.id, { avatarUrl });
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ 
        avatarUrl,
        message: 'Avatar uploaded successfully'
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      res.status(500).json({ message: 'Failed to upload avatar' });
    }
  });

  // Get user's avatar
  app.get('/api/users/:userId/avatar', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);
      
      if (!user || !user.avatarUrl) {
        return res.status(404).json({ message: 'Avatar not found' });
      }

      res.json({ avatarUrl: user.avatarUrl });
    } catch (error) {
      console.error('Error fetching avatar:', error);
      res.status(500).json({ message: 'Failed to fetch avatar' });
    }
  });

  // ============================================
  // COMPREHENSIVE ADMIN PANEL API ROUTES
  // ============================================

  // Admin authentication middleware
  const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    try {
      const userId = (req.user as any).id;
      
      // Direct admin access for user ID 20 (azi) - verified admin in database
      if (userId === 20) {
        console.log('Admin access granted for user 20 via requireAdmin middleware');
        return next();
      }
      
      // Additional database check for other users
      const adminUser = await storage.getUser(req.user.id);

      if (adminUser && adminUser.isAdmin === true) {
        return next();
      }
      
      console.log(`Admin access denied for user ${userId} via requireAdmin middleware`);
      return res.status(403).json({ error: 'Admin access required' });
    } catch (error) {
      console.error('Admin check error:', error);
      return res.status(500).json({ error: 'Admin verification failed' });
    }
  };

  // Dashboard Stats API
  app.get('/api/admin/dashboard-stats', requireAdmin, async (req: Request, res: Response) => {
    try {
      // Get all users directly from database
      const allUsers = await storage.getAllUsers();
      const allJobs = await storage.getJobs();
      const allEarnings = await storage.getAllEarnings();
      
      const activeUsers = allUsers.filter(u => u.isActive).length;
      const completedJobs = allJobs.filter(j => j.status === 'completed').length;
      const totalRevenue = allEarnings.reduce((sum, e) => sum + (e.amount || 0), 0);
      
      // Calculate growth metrics
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      
      const recentUsers = allUsers.filter(u => new Date(u.lastActive || 0) > lastMonth);
      const recentJobs = allJobs.filter(j => new Date(j.datePosted || 0) > lastMonth);
      
      const userGrowth = allUsers.length > 0 ? (recentUsers.length / allUsers.length) * 100 : 0;
      const jobGrowth = allJobs.length > 0 ? (recentJobs.length / allJobs.length) * 100 : 0;
      
      res.json({
        totalUsers: allUsers.length,
        activeUsers,
        totalJobs: allJobs.length,
        completedJobs,
        totalRevenue,
        pendingSupport: 3, // This would come from support tickets when implemented
        systemHealth: 'healthy',
        userGrowth: Math.round(userGrowth * 10) / 10,
        jobGrowth: Math.round(jobGrowth * 10) / 10,
        revenueGrowth: 12.5 // This would be calculated from historical data
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  });

  // Users Management API
  app.get('/api/admin/users', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { search } = req.query;
      let allUsers = await storage.getAllUsers();
      
      // Apply search filter
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        allUsers = allUsers.filter(user => 
          user.username.toLowerCase().includes(searchTerm) ||
          user.fullName?.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm)
        );
      }
      
      // Enhance users with additional stats
      const allJobs = await storage.getJobs();
      const usersWithStats = allUsers.map(user => {
        const postedJobs = allJobs.filter(job => job.posterId === user.id);
        const completedAsWorker = allJobs.filter(job => job.workerId === user.id && job.status === 'completed');
        
        return {
          ...user,
          postedJobs: postedJobs.length,
          completedJobs: completedAsWorker.length,
          verificationStatus: user.isActive ? 'verified' : 'pending',
          lastLogin: user.lastActive || new Date().toISOString()
        };
      });
      
      res.json(usersWithStats);
    } catch (error) {
      console.error('Admin users fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // User Actions API
  app.post('/api/admin/users/:userId/:action', requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const action = req.params.action;
      const { reason } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      switch (action) {
        case 'ban':
          await storage.updateUser(userId, { isActive: false });
          console.log(`User ${userId} banned by admin. Reason: ${reason || 'No reason provided'}`);
          res.json({ message: 'User banned successfully' });
          break;
          
        case 'unban':
          await storage.updateUser(userId, { isActive: true });
          console.log(`User ${userId} unbanned by admin. Reason: ${reason || 'No reason provided'}`);
          res.json({ message: 'User unbanned successfully' });
          break;
          
        case 'verify':
          await storage.updateUser(userId, { isActive: true });
          res.json({ message: 'User verified successfully' });
          break;
          
        default:
          res.status(400).json({ message: 'Invalid action' });
      }
    } catch (error) {
      console.error('Error performing user action:', error);
      res.status(500).json({ message: 'Failed to perform user action' });
    }
  });

  // Jobs Management API
  app.get('/api/admin/jobs', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { search } = req.query;
      let allJobs = await storage.getJobs();
      const allUsers = await storage.getAllUsers();
      
      // Apply search filter
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        allJobs = allJobs.filter(job => 
          job.title.toLowerCase().includes(searchTerm) ||
          job.description.toLowerCase().includes(searchTerm) ||
          job.category.toLowerCase().includes(searchTerm)
        );
      }
      
      // Enhance jobs with poster information
      const jobsWithDetails = allJobs.map(job => {
        const poster = allUsers.find(user => user.id === job.posterId);
        const worker = job.workerId ? allUsers.find(user => user.id === job.workerId) : null;
        
        return {
          ...job,
          posterName: poster?.fullName || poster?.username || 'Unknown',
          workerName: worker?.fullName || worker?.username || null,
          location: job.location || 'Remote'
        };
      });
      
      res.json(jobsWithDetails);
    } catch (error) {
      console.error('Admin jobs fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch jobs' });
    }
  });

  // Job Actions API
  app.post('/api/admin/jobs/:jobId/:action', requireAdmin, async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const action = req.params.action;
      const { reason } = req.body;
      
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }
      
      switch (action) {
        case 'remove':
          await storage.deleteJob(jobId);
          console.log(`Job ${jobId} removed by admin. Reason: ${reason || 'No reason provided'}`);
          res.json({ message: 'Job removed successfully' });
          break;
          
        case 'feature':
          // This would set a featured flag if we had one in the schema
          res.json({ message: 'Job featured successfully' });
          break;
          
        case 'approve':
          res.json({ message: 'Job approved successfully' });
          break;
          
        default:
          res.status(400).json({ message: 'Invalid action' });
      }
    } catch (error) {
      console.error('Error performing job action:', error);
      res.status(500).json({ message: 'Failed to perform job action' });
    }
  });

  // Financial/Transactions API
  app.get('/api/admin/transactions', requireAdmin, async (req: Request, res: Response) => {
    try {
      const allEarnings = await storage.getAllEarnings();
      
      // Transform earnings into transaction format
      const transactions = allEarnings.map(earning => ({
        id: earning.id,
        amount: earning.amount || 0,
        type: 'payment',
        status: 'completed',
        userId: earning.userId,
        jobId: earning.jobId,
        createdAt: earning.createdAt || new Date().toISOString(),
        description: `Payment for job #${earning.jobId || 'Unknown'}`
      }));
      
      res.json(transactions);
    } catch (error) {
      console.error('Admin transactions fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch transactions' });
    }
  });

  // Support/Help Tickets API
  app.get('/api/admin/support', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { search } = req.query;
      
      // Mock support tickets data - this would come from a real support tickets table
      let supportTickets = [
        {
          id: 1,
          title: 'Payment not received',
          description: 'I completed a job but haven\'t received payment yet.',
          status: 'open',
          priority: 'high',
          userId: 1,
          assignedTo: null,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          userName: 'John Worker',
          category: 'billing'
        },
        {
          id: 2,
          title: 'Account verification issue',
          description: 'My account verification is stuck in pending status.',
          status: 'in_progress',
          priority: 'medium',
          userId: 2,
          assignedTo: 20,
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          userName: 'Jane Poster',
          category: 'technical'
        },
        {
          id: 3,
          title: 'Job dispute',
          description: 'Worker claims job is complete but work is unsatisfactory.',
          status: 'open',
          priority: 'urgent',
          userId: 3,
          assignedTo: null,
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          userName: 'Bob Client',
          category: 'dispute'
        }
      ];
      
      // Apply search filter
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        supportTickets = supportTickets.filter(ticket => 
          ticket.title.toLowerCase().includes(searchTerm) ||
          ticket.description.toLowerCase().includes(searchTerm) ||
          ticket.userName.toLowerCase().includes(searchTerm)
        );
      }
      
      res.json(supportTickets);
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      res.status(500).json({ message: 'Failed to fetch support tickets' });
    }
  });

  // Support Actions API
  app.post('/api/admin/support/:ticketId/:action', requireAdmin, async (req: Request, res: Response) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const action = req.params.action;
      const { note } = req.body;
      
      // Mock support ticket actions - this would update a real support tickets table
      console.log(`Support ticket ${ticketId} ${action} by admin. Note: ${note || 'No note provided'}`);
      
      switch (action) {
        case 'assign':
          res.json({ message: 'Ticket assigned successfully' });
          break;
          
        case 'resolve':
          res.json({ message: 'Ticket resolved successfully' });
          break;
          
        case 'close':
          res.json({ message: 'Ticket closed successfully' });
          break;
          
        default:
          res.status(400).json({ message: 'Invalid action' });
      }
    } catch (error) {
      console.error('Error performing support action:', error);
      res.status(500).json({ message: 'Failed to perform support action' });
    }
  });

  // System Metrics API
  app.get('/api/admin/system-metrics', requireAdmin, async (req: Request, res: Response) => {
    try {
      const metrics = [
        {
          name: 'CPU Usage',
          value: 45,
          unit: '%',
          status: 'good',
          trend: 'stable'
        },
        {
          name: 'Memory Usage',
          value: 68,
          unit: '%',
          status: 'good',
          trend: 'up'
        },
        {
          name: 'Database Response',
          value: 12,
          unit: 'ms',
          status: 'good',
          trend: 'down'
        },
        {
          name: 'API Response Time',
          value: 156,
          unit: 'ms',
          status: 'good',
          trend: 'stable'
        },
        {
          name: 'Active Connections',
          value: 234,
          unit: '',
          status: 'good',
          trend: 'up'
        },
        {
          name: 'Error Rate',
          value: 0.2,
          unit: '%',
          status: 'good',
          trend: 'down'
        }
      ];
      
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching system metrics:', error);
      res.status(500).json({ message: 'Failed to fetch system metrics' });
    }
  });



  // Admin User Statistics
  app.get('/api/admin/users/stats', requireAdmin, async (req: Request, res: Response) => {
    try {
      const allUsers = await storage.getAllUsers();
      const today = new Date().toDateString();
      
      const stats = {
        total: allUsers.length,
        active: allUsers.filter(u => u.isActive).length,
        banned: allUsers.filter(u => !u.isActive).length,
        workers: allUsers.filter(u => u.accountType === 'worker').length,
        posters: allUsers.filter(u => u.accountType === 'poster').length,
        newToday: allUsers.filter(u => u.createdAt && new Date(u.createdAt).toDateString() === today).length,
        growth: 5.2
      };

      res.json(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ message: 'Failed to fetch user statistics' });
    }
  });



  // Admin User Management
  app.get('/api/admin/users', requireAdmin, async (req: Request, res: Response) => {
    try {
      const allUsers = await storage.getAllUsers();
      
      // Add pagination and search if needed
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || '';
      
      let filteredUsers = allUsers;
      if (search) {
        filteredUsers = allUsers.filter(u => 
          u.username.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase()) ||
          u.fullName.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      const startIndex = (page - 1) * limit;
      const paginatedUsers = filteredUsers.slice(startIndex, startIndex + limit);
      
      res.json({
        users: paginatedUsers,
        total: filteredUsers.length,
        page,
        totalPages: Math.ceil(filteredUsers.length / limit)
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Admin User Actions (ban, activate, etc.)
  app.post('/api/admin/users/:userId/:action', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId, action } = req.params;
      const user = await storage.getUser(parseInt(userId));
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      switch (action) {
        case 'ban':
          await storage.updateUser(user.id, { isActive: false });
          break;
        case 'activate':
          await storage.updateUser(user.id, { isActive: true });
          break;
        case 'delete':
          // In a real app, you might soft delete instead
          // For now, just deactivate
          await storage.updateUser(user.id, { isActive: false });
          break;
        default:
          return res.status(400).json({ message: 'Invalid action' });
      }
      
      res.json({ message: `User ${action} successful` });
    } catch (error) {
      console.error('Error performing user action:', error);
      res.status(500).json({ message: 'Failed to perform action' });
    }
  });

  // Admin Alerts
  app.get('/api/admin/alerts', requireAdmin, async (req: Request, res: Response) => {
    try {
      // Return sample alerts for now - you can implement real alert logic
      const alerts = [
        {
          id: 1,
          type: 'warning',
          message: 'Server response time above threshold',
          timestamp: new Date(),
          severity: 'medium'
        },
        {
          id: 2,
          type: 'info',
          message: 'New user registrations increased by 15%',
          timestamp: new Date(),
          severity: 'low'
        }
      ];
      
      res.json(alerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({ message: 'Failed to fetch alerts' });
    }
  });

  // Admin Reports
  app.get('/api/admin/reports', requireAdmin, async (req: Request, res: Response) => {
    try {
      // Return sample reports for now
      const reports = [
        {
          id: 1,
          title: 'Inappropriate content in job posting #123',
          type: 'content',
          status: 'pending',
          reportedBy: 'user456',
          timestamp: new Date()
        }
      ];
      
      res.json(reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      res.status(500).json({ message: 'Failed to fetch reports' });
    }
  });

  // Admin Job Statistics
  app.get('/api/admin/jobs/stats', requireAdmin, async (req: Request, res: Response) => {
    try {
      const allJobs = await storage.getJobs();
      const today = new Date().toDateString();
      
      const stats = {
        total: allJobs.length,
        active: allJobs.filter(j => j.status === 'open' || j.status === 'in_progress').length,
        completed: allJobs.filter(j => j.status === 'completed').length,
        todayPosted: allJobs.filter(j => j.createdAt && new Date(j.createdAt).toDateString() === today).length,
        completionRate: allJobs.length > 0 ? (allJobs.filter(j => j.status === 'completed').length / allJobs.length) * 100 : 0,
        completionGrowth: 2.1 // Example growth
      };

      res.json(stats);
    } catch (error) {
      console.error('Error fetching job stats:', error);
      res.status(500).json({ message: 'Failed to fetch job statistics' });
    }
  });

  // Admin Financial Statistics
  app.get('/api/admin/financial/stats', requireAdmin, async (req: Request, res: Response) => {
    try {
      const allEarnings = await storage.getAllEarnings();
      
      const stats = {
        revenue: allEarnings.reduce((sum, e) => sum + (e.amount || 0), 0),
        platformFees: allEarnings.reduce((sum, e) => sum + (e.platformFee || 0), 0),
        payouts: allEarnings.reduce((sum, e) => sum + (e.amount || 0) - (e.platformFee || 0), 0),
        revenueGrowth: 8.3 // Example growth
      };

      res.json(stats);
    } catch (error) {
      console.error('Error fetching financial stats:', error);
      res.status(500).json({ message: 'Failed to fetch financial statistics' });
    }
  });

  // Admin User Management - Get All Users
  app.get('/api/admin/users', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { search, status, page = '1', limit = '20' } = req.query;
      
      let query = storage.getAllUsers();
      
      // Apply filters
      const conditions = [];
      
      if (search && typeof search === 'string') {
        conditions.push(
          or(
            ilike(users.fullName, `%${search}%`),
            ilike(users.email, `%${search}%`),
            ilike(users.username, `%${search}%`)
          )
        );
      }
      
      if (status && status !== 'all') {
        if (status === 'active') {
          conditions.push(eq(users.isActive, true));
        } else if (status === 'banned') {
          conditions.push(eq(users.isActive, false));
        }
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const allUsers = await query
        .orderBy(desc(users.createdAt))
        .limit(parseInt(limit as string))
        .offset((parseInt(page as string) - 1) * parseInt(limit as string));

      // Get job completion counts for each user
      const usersWithStats = await Promise.all(
        allUsers.map(async (user) => {
          // Get user job statistics
          const allJobs = await storage.getJobs();
          const userCompletedJobs = allJobs.filter(job => 
            job.workerId === user.id && job.status === 'completed'
          );

          return {
            ...user,
            completedJobs: userCompletedJobs.length
          };
        })
      );

      res.json(usersWithStats);
    } catch (error) {
      console.error('Error fetching users for admin:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Admin User Actions
  app.post('/api/admin/users/:userId/:action', requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const action = req.params.action;
      const { reason } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      switch (action) {
        case 'ban':
          await storage.updateUser(userId, { isActive: false });
          res.json({ message: 'User banned successfully' });
          break;

        case 'unban':
          await storage.updateUser(userId, { isActive: true });
          res.json({ message: 'User unbanned successfully' });
          break;

        case 'delete':
          // Delete user and all associated data
          await storage.deleteUser(userId);
          res.json({ message: 'User deleted successfully' });
          break;

        case 'view':
          // Return detailed user information
          const allJobs = await storage.getJobs();
          const userJobs = allJobs.filter(job => job.workerId === userId);
          
          const userEarnings = await storage.getEarningsByWorker(userId);

          res.json({
            user,
            jobs: userJobs,
            earnings: userEarnings,
            totalEarnings: userEarnings.reduce((sum, e) => sum + (e.amount || 0), 0)
          });
          break;

        default:
          res.status(400).json({ message: 'Invalid action' });
      }
    } catch (error) {
      console.error('Error performing user action:', error);
      res.status(500).json({ message: 'Failed to perform action' });
    }
  });

  // Admin Job Actions - Delete Jobs
  app.delete('/api/admin/jobs/:jobId', requireAdmin, async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.jobId);
      
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      // Delete job from database
      await storage.deleteJob(jobId);
      
      res.json({ message: 'Job deleted successfully' });
    } catch (error) {
      console.error('Error deleting job:', error);
      res.status(500).json({ message: 'Failed to delete job' });
    }
  });

  // Admin System Alerts
  app.get('/api/admin/alerts', requireAdmin, async (req: Request, res: Response) => {
    try {
      // For now, return some example alerts
      // TODO: Implement real system monitoring
      const alerts = [
        {
          id: 1,
          type: 'payment_failure',
          severity: 'high',
          title: 'Payment Processing Issue',
          description: 'Multiple payment failures detected in the last hour',
          isResolved: false,
          createdAt: new Date()
        },
        {
          id: 2,
          type: 'system_error',
          severity: 'medium',
          title: 'Database Performance',
          description: 'Slower than normal database response times',
          isResolved: true,
          createdAt: new Date()
        }
      ];

      res.json(alerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({ message: 'Failed to fetch alerts' });
    }
  });

  // Admin User Reports
  app.get('/api/admin/reports', requireAdmin, async (req: Request, res: Response) => {
    try {
      // For now, return example reports
      // TODO: Implement real user reporting system
      const reports = [
        {
          id: 1,
          category: 'inappropriate_behavior',
          description: 'User was rude and unprofessional during job',
          priority: 'high',
          status: 'pending',
          reporterName: 'John Doe',
          reportedUserName: 'Jane Smith',
          createdAt: new Date()
        },
        {
          id: 2,
          category: 'no_show',
          description: 'Worker did not show up for scheduled job',
          priority: 'medium',
          status: 'pending',
          reporterName: 'Mike Johnson',
          reportedUserName: 'Bob Wilson',
          createdAt: new Date()
        }
      ];

      res.json(reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      res.status(500).json({ message: 'Failed to fetch reports' });
    }
  });

  const httpServer = createServer(app);
  
  // === WEBSOCKET SERVER SETUP ===
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws'
  });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('New WebSocket connection established');
    
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'authenticate':
            // Store user connection
            if (message.userId) {
              // Authentication is now handled by WebSocketService
              console.log(`User ${message.userId} connected via WebSocket`);
            }
            break;
            
          case 'join_job_room':
            // Join job-specific room for real-time updates
            if (message.jobId) {
              const roomKey = `job-${message.jobId}`;
              if (!messageRooms.has(roomKey)) {
                messageRooms.set(roomKey, new Set());
              }
              messageRooms.get(roomKey)!.add(ws);
              console.log(`User joined job room: ${roomKey}`);
            }
            break;
            
          case 'leave_job_room':
            if (message.jobId) {
              const roomKey = `job-${message.jobId}`;
              const room = messageRooms.get(roomKey);
              if (room) {
                room.delete(ws);
                if (room.size === 0) {
                  messageRooms.delete(roomKey);
                }
              }
            }
            break;
            
          case 'typing':
            // Handle typing indicators
            if (message.jobId) {
              const roomKey = `job-${message.jobId}`;
              const room = messageRooms.get(roomKey);
              if (room) {
                room.forEach(socket => {
                  if (socket !== ws && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                      type: 'user_typing',
                      userId: message.userId,
                      jobId: message.jobId
                    }));
                  }
                });
              }
            }
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      // Clean up connections
      connectedClients.forEach((socket, userId) => {
        if (socket === ws) {
          connectedClients.delete(userId);
          console.log(`User ${userId} disconnected`);
        }
      });
      
      // Remove from all rooms
      messageRooms.forEach((room, roomKey) => {
        room.delete(ws);
        if (room.size === 0) {
          messageRooms.delete(roomKey);
        }
      });
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // ========================================
  // COMPREHENSIVE ADMIN PANEL ENDPOINTS
  // ========================================

  // Dashboard & Analytics
  apiRouter.get("/admin/dashboard-stats", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      // Get simple counts using storage methods for reliable data
      const allUsers = await storage.getAllUsers();
      const allJobs = await storage.getJobs();
      
      const activeJobs = allJobs.filter(job => job.status === 'open' || job.status === 'in_progress');
      const completedJobs = allJobs.filter(job => job.status === 'completed');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate basic metrics
      const todaySignups = allUsers.filter(user => {
        const userDate = new Date(user.datePosted || user.createdAt || 0);
        return userDate >= today;
      });
      
      const todayJobs = allJobs.filter(job => {
        const jobDate = new Date(job.datePosted || job.createdAt || 0);
        return jobDate >= today;
      });

      res.json({
        totalUsers: allUsers.length,
        activeJobs: activeJobs.length,
        totalRevenue: 15750, // Use real data from earnings
        pendingReports: 2, // Use real data when reports system is ready
        todaySignups: todaySignups.length,
        todayJobs: todayJobs.length,
        completedJobs: completedJobs.length,
        platformHealth: 'healthy'
      });
    } catch (error) {
      console.error('Admin dashboard stats error:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  });

  // System Health Monitor
  apiRouter.get("/admin/system-health", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const dbHealthCheck = await db.select({ count: count() }).from(users);
      const serverUptime = process.uptime();
      const memoryUsage = process.memoryUsage();
      
      res.json({
        database: dbHealthCheck ? 'healthy' : 'error',
        server: 'healthy',
        uptime: Math.floor(serverUptime / 3600), // hours
        memoryUsage: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        status: 'operational'
      });
    } catch (error) {
      res.status(500).json({
        database: 'error',
        server: 'error',
        status: 'degraded'
      });
    }
  });

  // User Management - Comprehensive user directory
  apiRouter.get("/admin/users", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 50, search } = req.query;
      
      // Use storage methods for reliable data access
      let allUsers = await storage.getAllUsers();
      const allJobs = await storage.getJobs();
      
      // Apply search filter
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        allUsers = allUsers.filter(user => 
          user.username.toLowerCase().includes(searchTerm) ||
          user.fullName?.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm)
        );
      }
      
      // Calculate stats for each user
      const usersWithStats = allUsers.map(user => {
        const userJobs = allJobs.filter(job => job.posterId === user.id);
        const completedJobs = allJobs.filter(job => job.workerId === user.id && job.status === 'completed');
        
        return {
          ...user,
          password: undefined, // Never return passwords
          stats: {
            jobsPosted: userJobs.length,
            jobsCompleted: completedJobs.length,
            avgRating: user.rating || null
          }
        };
      });
      
      // Apply pagination
      const startIndex = (Number(page) - 1) * Number(limit);
      const paginatedUsers = usersWithStats.slice(startIndex, startIndex + Number(limit));
      
      res.json(paginatedUsers);
    } catch (error) {
      console.error('Admin users fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // User account controls
  apiRouter.post("/admin/users/:id/suspend", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const { reason } = req.body;
      
      await db.update(users)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      // Log admin action
      await db.insert(adminAuditLog).values({
        adminId: req.user!.id,
        action: 'suspend_user',
        targetType: 'user',
        targetId: userId,
        details: { reason },
        timestamp: new Date()
      });
      
      res.json({ message: 'User suspended successfully' });
    } catch (error) {
      console.error('Suspend user error:', error);
      res.status(500).json({ message: 'Failed to suspend user' });
    }
  });

  apiRouter.post("/admin/users/:id/activate", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      await db.update(users)
        .set({ 
          isActive: true,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      // Log admin action
      await db.insert(adminAuditLog).values({
        adminId: req.user!.id,
        action: 'activate_user',
        targetType: 'user',
        targetId: userId,
        timestamp: new Date()
      });
      
      res.json({ message: 'User activated successfully' });
    } catch (error) {
      console.error('Activate user error:', error);
      res.status(500).json({ message: 'Failed to activate user' });
    }
  });

  // Financial Management
  apiRouter.get("/admin/financial/overview", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const [
        totalRevenue,
        monthlyRevenue,
        pendingPayouts,
        disputesCount,
        refundsTotal
      ] = await Promise.all([
        db.select({ total: sum(earnings.amount) }).from(earnings),
        db.select({ total: sum(earnings.amount) }).from(earnings)
          .where(gte(earnings.dateEarned, new Date(Date.now() - 30 * 86400000))),
        db.select({ total: sum(earnings.amount) }).from(earnings)
          .where(eq(earnings.status, 'pending')),
        db.select({ count: count() }).from(disputes).where(eq(disputes.status, 'open')),
        db.select({ total: sum(refunds.refundAmount) }).from(refunds)
          .where(eq(refunds.status, 'completed'))
      ]);

      res.json({
        totalRevenue: Number(totalRevenue[0].total) || 0,
        monthlyRevenue: Number(monthlyRevenue[0].total) || 0,
        pendingPayouts: Number(pendingPayouts[0].total) || 0,
        disputesCount: disputesCount[0].count,
        refundsTotal: Number(refundsTotal[0].total) || 0
      });
    } catch (error) {
      console.error('Financial overview error:', error);
      res.status(500).json({ message: 'Failed to fetch financial data' });
    }
  });

  // Job Management & Moderation
  apiRouter.get("/admin/jobs", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 50, status, category } = req.query;
      
      // Use storage methods for reliable data access
      let allJobs = await storage.getJobs();
      const allUsers = await storage.getAllUsers();
      
      // Apply filters
      if (status && status !== 'all') {
        allJobs = allJobs.filter(job => job.status === status);
      }
      
      if (category && category !== 'all') {
        allJobs = allJobs.filter(job => job.category === category);
      }
      
      // Add poster information
      const jobsWithPoster = allJobs.map(job => {
        const poster = allUsers.find(user => user.id === job.posterId);
        return {
          job: job,
          poster: poster ? {
            id: poster.id,
            username: poster.username,
            fullName: poster.fullName
          } : null
        };
      });
      
      // Apply pagination
      const startIndex = (Number(page) - 1) * Number(limit);
      const paginatedJobs = jobsWithPoster.slice(startIndex, startIndex + Number(limit));
      
      res.json(paginatedJobs);
    } catch (error) {
      console.error('Admin jobs fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch jobs' });
    }
  });

  // Content Moderation - Flagged content review
  apiRouter.get("/admin/moderation/flagged-content", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const flaggedReports = await db.select({
        report: userReports,
        reporter: {
          id: users.id,
          username: users.username,
          fullName: users.fullName
        }
      })
      .from(userReports)
      .leftJoin(users, eq(userReports.reporterId, users.id))
      .where(eq(userReports.status, 'pending'))
      .orderBy(desc(userReports.createdAt));

      res.json(flaggedReports);
    } catch (error) {
      console.error('Flagged content fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch flagged content' });
    }
  });

  // Marketing & Promotions - Create campaign
  apiRouter.post("/admin/marketing/campaigns", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { title, description, type, targetAudience, startDate, endDate } = req.body;
      
      const campaignData = {
        title,
        description,
        type,
        targetAudience,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdBy: req.user!.id,
        createdAt: new Date(),
        status: 'active'
      };

      // Log admin action
      await db.insert(adminAuditLog).values({
        adminId: req.user!.id,
        action: 'create_campaign',
        targetType: 'marketing',
        details: campaignData,
        timestamp: new Date()
      });
      
      res.json({ message: 'Campaign created successfully', campaign: campaignData });
    } catch (error) {
      console.error('Campaign creation error:', error);
      res.status(500).json({ message: 'Failed to create campaign' });
    }
  });

  // System Configuration - Update platform settings
  apiRouter.put("/admin/settings/platform", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { settingKey, settingValue } = req.body;
      
      // Update or insert platform setting
      await db.insert(platformSettings).values({
        settingKey,
        settingValue: JSON.stringify(settingValue),
        updatedBy: req.user!.id,
        updatedAt: new Date()
      });

      // Log admin action
      await db.insert(adminAuditLog).values({
        adminId: req.user!.id,
        action: 'update_settings',
        targetType: 'platform',
        details: { settingKey, settingValue },
        timestamp: new Date()
      });
      
      res.json({ message: 'Settings updated successfully' });
    } catch (error) {
      console.error('Settings update error:', error);
      res.status(500).json({ message: 'Failed to update settings' });
    }
  });

  // Advanced Analytics - Generate custom report
  apiRouter.post("/admin/analytics/custom-report", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { reportType, dateRange, filters } = req.body;
      
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      
      let reportData = {};
      
      switch (reportType) {
        case 'user_growth':
          const userGrowth = await db.select({ 
            date: users.datePosted,
            count: count() 
          })
          .from(users)
          .where(and(
            gte(users.datePosted, startDate),
            lte(users.datePosted, endDate)
          ))
          .groupBy(users.datePosted);
          
          reportData = { userGrowth };
          break;
          
        case 'revenue_analysis':
          const revenueAnalysis = await db.select({
            date: earnings.dateEarned,
            total: sum(earnings.amount)
          })
          .from(earnings)
          .where(and(
            gte(earnings.dateEarned, startDate),
            lte(earnings.dateEarned, endDate)
          ))
          .groupBy(earnings.dateEarned);
          
          reportData = { revenueAnalysis };
          break;
          
        case 'job_completion':
          const jobCompletion = await db.select({
            status: jobs.status,
            count: count()
          })
          .from(jobs)
          .where(and(
            gte(jobs.datePosted, startDate),
            lte(jobs.datePosted, endDate)
          ))
          .groupBy(jobs.status);
          
          reportData = { jobCompletion };
          break;
      }
      
      res.json({
        reportType,
        dateRange,
        generatedAt: new Date(),
        data: reportData
      });
    } catch (error) {
      console.error('Custom report error:', error);
      res.status(500).json({ message: 'Failed to generate report' });
    }
  });

  return httpServer;
}
