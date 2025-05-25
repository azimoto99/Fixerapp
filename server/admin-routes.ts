import type { Express } from "express";
import { storage } from "./storage";

export function registerAdminRoutes(app: Express) {
  // Admin middleware - check if user is admin
  const adminAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admin privileges required" });
    }
    
    next();
  };

  // Get admin statistics
  app.get("/api/admin/stats", adminAuth, async (req, res) => {
    try {
      const [users, jobs, payments, earnings] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllJobs(),
        storage.getAllPayments(),
        storage.getAllEarnings()
      ]);

      const activeJobs = jobs.filter(job => job.status === 'open' || job.status === 'in_progress');
      const completedJobs = jobs.filter(job => job.status === 'completed');
      
      const totalRevenue = payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const platformFees = payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (p.serviceFee || 0), 0);

      const totalEarnings = earnings
        .filter(e => e.status === 'paid')
        .reduce((sum, e) => sum + (e.netAmount || 0), 0);

      const stats = {
        totalUsers: users.length,
        totalJobs: jobs.length,
        totalRevenue,
        platformFees,
        totalEarnings,
        activeJobs: activeJobs.length,
        completedJobs: completedJobs.length,
        pendingDisputes: 0 // We'll implement support tickets separately
      };

      res.json(stats);
    } catch (error) {
      console.error('Admin stats error:', error);
      res.status(500).json({ message: "Failed to fetch admin statistics" });
    }
  });

  // Get all users for admin
  app.get("/api/admin/users", adminAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Remove sensitive information
      const safeUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        accountType: user.accountType,
        isActive: user.isActive,
        isAdmin: user.isAdmin,
        rating: user.rating,
        lastActive: user.lastActive,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified
      }));

      res.json(safeUsers);
    } catch (error) {
      console.error('Admin users error:', error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user status
  app.patch("/api/admin/users/:userId", adminAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { isActive, isAdmin } = req.body;

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update user
      await storage.updateUser(userId, { 
        isActive: isActive !== undefined ? isActive : user.isActive,
        isAdmin: isAdmin !== undefined ? isAdmin : user.isAdmin
      });

      res.json({ message: "User updated successfully" });
    } catch (error) {
      console.error('Admin user update error:', error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user
  app.delete("/api/admin/users/:userId", adminAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Don't allow deleting yourself
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.deleteUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error('Admin user delete error:', error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Get all jobs for admin
  app.get("/api/admin/jobs", adminAuth, async (req, res) => {
    try {
      const jobs = await storage.getAllJobs();
      res.json(jobs);
    } catch (error) {
      console.error('Admin jobs error:', error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  // Delete job
  app.delete("/api/admin/jobs/:jobId", adminAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);

      const job = await storage.getJobById(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      await storage.deleteJob(jobId);
      res.json({ message: "Job deleted successfully" });
    } catch (error) {
      console.error('Admin job delete error:', error);
      res.status(500).json({ message: "Failed to delete job" });
    }
  });

  // Get all payments for admin
  app.get("/api/admin/payments", adminAuth, async (req, res) => {
    try {
      const payments = await storage.getAllPayments();
      res.json(payments);
    } catch (error) {
      console.error('Admin payments error:', error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  // Get support tickets (placeholder - will implement with proper support system)
  app.get("/api/admin/support-tickets", adminAuth, async (req, res) => {
    try {
      // For now, return sample tickets based on real users
      const users = await storage.getAllUsers();
      const sampleTickets = users.slice(0, 3).map((user, index) => ({
        id: index + 1,
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
        title: `Support Request ${index + 1}`,
        description: `User needs assistance with platform features`,
        category: index === 0 ? "general" : index === 1 ? "technical" : "account",
        priority: index === 0 ? "medium" : index === 1 ? "high" : "low",
        status: index === 0 ? "open" : index === 1 ? "in_progress" : "resolved",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      res.json(sampleTickets);
    } catch (error) {
      console.error('Admin support tickets error:', error);
      res.status(500).json({ message: "Failed to fetch support tickets" });
    }
  });

  // Update support ticket status
  app.patch("/api/admin/support-tickets/:ticketId", adminAuth, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const { status, resolution } = req.body;

      // For now, just return success - will implement proper support ticket system
      res.json({ 
        message: "Support ticket updated successfully",
        ticketId,
        status,
        resolution
      });
    } catch (error) {
      console.error('Admin support ticket update error:', error);
      res.status(500).json({ message: "Failed to update support ticket" });
    }
  });

  // Get earnings data
  app.get("/api/admin/earnings", adminAuth, async (req, res) => {
    try {
      const earnings = await storage.getAllEarnings();
      res.json(earnings);
    } catch (error) {
      console.error('Admin earnings error:', error);
      res.status(500).json({ message: "Failed to fetch earnings" });
    }
  });

  // Get platform analytics
  app.get("/api/admin/analytics", adminAuth, async (req, res) => {
    try {
      const [users, jobs, payments] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllJobs(),
        storage.getAllPayments()
      ]);

      const analytics = {
        userGrowth: {
          total: users.length,
          workers: users.filter(u => u.accountType === 'worker').length,
          posters: users.filter(u => u.accountType === 'poster').length
        },
        jobMetrics: {
          total: jobs.length,
          completed: jobs.filter(j => j.status === 'completed').length,
          active: jobs.filter(j => j.status === 'in_progress').length,
          open: jobs.filter(j => j.status === 'open').length
        },
        revenue: {
          total: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
          fees: payments.reduce((sum, p) => sum + (p.serviceFee || 0), 0),
          thisMonth: payments
            .filter(p => new Date(p.createdAt).getMonth() === new Date().getMonth())
            .reduce((sum, p) => sum + (p.amount || 0), 0)
        }
      };

      res.json(analytics);
    } catch (error) {
      console.error('Admin analytics error:', error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });
}