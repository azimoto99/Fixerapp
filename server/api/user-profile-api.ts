/**
 * User Profile API Routes - Handles user profile data, badges, and reviews
 */
import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";

export function registerUserProfileRoutes(app: Express) {
  
  // Get user profile data
  app.get("/api/users/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get additional user stats
      let jobCompletionCount = 0;
      let jobPostCount = 0;
      
      if (user.accountType === 'worker') {
        // For workers, count completed jobs
        const completedJobs = await storage.getJobsForWorker(userId, { status: 'completed' });
        jobCompletionCount = completedJobs.length;
      } else if (user.accountType === 'poster') {
        // For job posters, count posted jobs
        const postedJobs = await storage.getJobsForPoster(userId);
        jobPostCount = postedJobs.length;
      }
      
      // Remove sensitive data
      const { password, stripeCustomerId, stripeConnectAccountId, ...safeUserData } = user;
      
      res.json({
        ...safeUserData,
        jobCompletionCount,
        jobPostCount
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });
  
  // Get user's badges
  app.get("/api/users/:id/badges", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const badges = await storage.getUserBadges(userId);
      
      res.json(badges);
    } catch (error) {
      console.error("Error fetching user badges:", error);
      res.status(500).json({ message: "Failed to fetch user badges" });
    }
  });
  
  // Get user's reviews
  app.get("/api/users/:id/reviews", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const reviews = await storage.getReviewsForUser(userId);
      
      // Enhance reviews with reviewer information
      const enhancedReviews = await Promise.all(
        reviews.map(async (review) => {
          const reviewer = await storage.getUser(review.reviewerId);
          const job = review.jobId ? await storage.getJob(review.jobId) : null;
          
          return {
            ...review,
            reviewerName: reviewer?.fullName || reviewer?.username || 'Unknown User',
            reviewerImage: reviewer?.profileImage || null,
            jobTitle: job?.title || null
          };
        })
      );
      
      res.json(enhancedReviews);
    } catch (error) {
      console.error("Error fetching user reviews:", error);
      res.status(500).json({ message: "Failed to fetch user reviews" });
    }
  });
  
  // Get jobs posted by a user
  app.get("/api/jobs/posted/:userId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const jobs = await storage.getJobsForPoster(userId);
      
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching posted jobs:", error);
      res.status(500).json({ message: "Failed to fetch posted jobs" });
    }
  });
  
  // Get jobs completed by a worker
  app.get("/api/jobs/completed/:userId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const jobs = await storage.getJobsForWorker(userId, { status: 'completed' });
      
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching completed jobs:", error);
      res.status(500).json({ message: "Failed to fetch completed jobs" });
    }
  });
}