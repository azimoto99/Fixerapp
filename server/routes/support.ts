import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth-helpers";

// Utility function to safely get authenticated user ID
function getAuthenticatedUserId(req: Request): number {
  if (!req.user?.id) {
    throw new Error('Authentication required: User not found or missing ID');
  }
  return req.user.id;
}

export function registerSupportRoutes(app: Express) {
  // Get user's support tickets
  app.get("/api/support/tickets", requireAuth, async (req, res) => {
    try {
      const userId = getAuthenticatedUserId(req);
      const tickets = await storage.getSupportTicketsByUserId(userId);
      res.json(tickets);
    } catch (error) {
      console.error('Get support tickets error:', error);
      res.status(500).json({ message: "Failed to fetch support tickets" });
    }
  });

  // Create a new support ticket
  app.post("/api/support/tickets", requireAuth, async (req, res) => {
    try {
      const userId = getAuthenticatedUserId(req);
      const { subject, description, category, priority, jobId } = req.body;

      if (!subject || !description || !category) {
        return res.status(400).json({ message: "Subject, description, and category are required" });
      }

      const ticket = await storage.createSupportTicket({
        userId,
        subject,
        description,
        category,
        priority: priority || 'medium',
        jobId: jobId || null,
        status: 'open'
      });

      res.status(201).json(ticket);
    } catch (error) {
      console.error('Create support ticket error:', error);
      res.status(500).json({ message: "Failed to create support ticket" });
    }
  });

  // Create a dispute
  app.post("/api/support/disputes", requireAuth, async (req, res) => {
    try {
      const userId = getAuthenticatedUserId(req);
      const { jobId, reason, description, amount } = req.body;

      if (!jobId || !reason || !description) {
        return res.status(400).json({ message: "Job ID, reason, and description are required" });
      }

      // Verify user has access to this job
      const job = await storage.getJobById(jobId);
      if (!job || (job.clientId !== userId && job.providerId !== userId)) {
        return res.status(403).json({ message: "You don't have access to this job" });
      }

      const dispute = await storage.createDispute({
        jobId,
        raisedBy: userId,
        against: userId === job.clientId ? job.providerId : job.clientId,
        reason,
        description,
        amount: amount || null,
        status: 'open'
      });

      res.status(201).json(dispute);
    } catch (error) {
      console.error('Create dispute error:', error);
      res.status(500).json({ message: "Failed to create dispute" });
    }
  });

  // Request a refund
  app.post("/api/support/refunds", requireAuth, async (req, res) => {
    try {
      const userId = getAuthenticatedUserId(req);
      const { jobId, reason, amount } = req.body;

      if (!jobId || !reason) {
        return res.status(400).json({ message: "Job ID and reason are required" });
      }

      // Verify user is the client for this job
      const job = await storage.getJobById(jobId);
      if (!job || job.clientId !== userId) {
        return res.status(403).json({ message: "You can only request refunds for your own jobs" });
      }

      // Check if there's a payment for this job
      const payment = await storage.getPaymentByJobId(jobId);
      if (!payment) {
        return res.status(400).json({ message: "No payment found for this job" });
      }

      const refund = await storage.createRefund({
        jobId,
        userId,
        originalAmount: payment.amount,
        refundAmount: amount || payment.amount,
        reason,
        status: 'pending'
      });

      res.status(201).json(refund);
    } catch (error) {
      console.error('Create refund request error:', error);
      res.status(500).json({ message: "Failed to create refund request" });
    }
  });

  // Submit feedback
  app.post("/api/feedback", requireAuth, async (req, res) => {
    try {
      const userId = getAuthenticatedUserId(req);
      const { type, rating, message, email } = req.body;

      if (!type || !message) {
        return res.status(400).json({ message: "Type and message are required" });
      }

      const feedback = await storage.createFeedback({
        userId,
        type,
        rating: rating || null,
        message,
        email: email || null,
        status: 'new'
      });

      res.status(201).json(feedback);
    } catch (error) {
      console.error('Submit feedback error:', error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });
}