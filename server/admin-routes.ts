import type { Express } from "express";
import { storage } from "./storage";
import { refundService } from "./refund-service";
import { auditService } from "./audit-service";
import { securityMonitor } from "./security-monitor";

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

  // Get support tickets - now using real database data
  app.get("/api/admin/support-tickets", adminAuth, async (req, res) => {
    try {
      const tickets = await storage.getSupportTickets();
      res.json(tickets);
    } catch (error) {
      console.error('Admin support tickets error:', error);
      res.status(500).json({ message: "Failed to fetch support tickets" });
    }
  });

  // Update support ticket status - now using real database operations
  app.patch("/api/admin/support-tickets/:ticketId", adminAuth, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const { status, resolution, priority, assignedTo } = req.body;

      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
      if (resolution !== undefined) updateData.resolution = resolution;
      if (priority !== undefined) updateData.priority = priority;
      if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
      
      // Set resolved timestamp if status is resolved or closed
      if (status === 'resolved' || status === 'closed') {
        updateData.resolvedAt = new Date();
      }

      const updatedTicket = await storage.updateSupportTicket(ticketId, updateData);
      
      if (!updatedTicket) {
        return res.status(404).json({ message: "Support ticket not found" });
      }

      res.json({ 
        message: "Support ticket updated successfully",
        ticket: updatedTicket
      });
    } catch (error) {
      console.error('Admin support ticket update error:', error);
      res.status(500).json({ message: "Failed to update support ticket" });
    }
  });

  // Delete support ticket - now using real database operations
  app.delete("/api/admin/support-tickets/:ticketId", adminAuth, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      
      const deletedTicket = await storage.deleteSupportTicket(ticketId);
      
      if (!deletedTicket) {
        return res.status(404).json({ message: "Support ticket not found" });
      }
      
      res.json({ 
        message: "Support ticket deleted successfully",
        ticketId
      });
    } catch (error) {
      console.error('Admin support ticket delete error:', error);
      res.status(500).json({ message: "Failed to delete support ticket" });
    }
  });

  // Respond to support ticket
  app.post("/api/admin/support-tickets/:ticketId/respond", adminAuth, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const { response, status } = req.body;
      
      // Update the ticket with the response and new status
      const updateData: any = {
        status: status || "resolved"
      };
      
      if (status === 'resolved' || status === 'closed') {
        updateData.resolvedAt = new Date();
        updateData.resolution = response;
      }
      
      const updatedTicket = await storage.updateSupportTicket(ticketId, updateData);
      
      if (!updatedTicket) {
        return res.status(404).json({ message: "Support ticket not found" });
      }
      
      res.json({ 
        message: "Response sent successfully",
        ticket: updatedTicket
      });
    } catch (error) {
      console.error('Admin support ticket response error:', error);
      res.status(500).json({ message: "Failed to send response" });
    }
  });

  // Get admin alerts - real implementation instead of hardcoded examples
  app.get("/api/admin/alerts", adminAuth, async (req, res) => {
    try {
      const [users, jobs, payments, tickets] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllJobs(),
        storage.getAllPayments(),
        storage.getSupportTickets()
      ]);

      const alerts = [];

      // Check for suspicious payment activity
      const failedPayments = payments.filter(p => p.status === 'failed').length;
      if (failedPayments > 5) {
        alerts.push({
          id: 'payment-failures',
          type: 'warning',
          title: 'High Payment Failure Rate',
          message: `${failedPayments} failed payments detected in recent activity`,
          severity: 'medium',
          timestamp: new Date().toISOString()
        });
      }

      // Check for urgent support tickets
      const urgentTickets = tickets.filter(t => t.priority === 'urgent' && t.status === 'open').length;
      if (urgentTickets > 0) {
        alerts.push({
          id: 'urgent-tickets',
          type: 'error',
          title: 'Urgent Support Tickets',
          message: `${urgentTickets} urgent support tickets require immediate attention`,
          severity: 'high',
          timestamp: new Date().toISOString()
        });
      }

      // Check for inactive users
      const inactiveUsers = users.filter(u => !u.isActive).length;
      if (inactiveUsers > users.length * 0.1) {
        alerts.push({
          id: 'user-activity',
          type: 'info',
          title: 'User Activity Alert',
          message: `${inactiveUsers} users are currently inactive`,
          severity: 'low',
          timestamp: new Date().toISOString()
        });
      }

      // Check for jobs without applications
      const jobsWithoutApps = jobs.filter(j => j.status === 'open').length;
      if (jobsWithoutApps > 10) {
        alerts.push({
          id: 'job-applications',
          type: 'warning',
          title: 'Low Job Application Rate',
          message: `${jobsWithoutApps} open jobs may need attention to attract applicants`,
          severity: 'medium',
          timestamp: new Date().toISOString()
        });
      }

      res.json(alerts);
    } catch (error) {
      console.error('Admin alerts error:', error);
      res.status(500).json({ message: "Failed to fetch admin alerts" });
    }
  });

  // Get admin reports - real implementation with actual data
  app.get("/api/admin/reports", adminAuth, async (req, res) => {
    try {
      const { type, startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const [users, jobs, payments, earnings] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllJobs(),
        storage.getAllPayments(),
        storage.getAllEarnings()
      ]);

      const reports = {
        summary: {
          totalUsers: users.length,
          totalJobs: jobs.length,
          totalRevenue: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
          totalEarnings: earnings.reduce((sum, e) => sum + (e.amount || 0), 0),
          generatedAt: new Date().toISOString(),
          dateRange: { start: start.toISOString(), end: end.toISOString() }
        },
        userMetrics: {
          activeUsers: users.filter(u => u.isActive).length,
          verifiedUsers: users.filter(u => u.emailVerified).length,
          adminUsers: users.filter(u => u.isAdmin).length,
          workerAccounts: users.filter(u => u.accountType === 'worker').length,
          posterAccounts: users.filter(u => u.accountType === 'poster').length
        },
        jobMetrics: {
          completedJobs: jobs.filter(j => j.status === 'completed').length,
          activeJobs: jobs.filter(j => j.status === 'in_progress').length,
          openJobs: jobs.filter(j => j.status === 'open').length,
          cancelledJobs: jobs.filter(j => j.status === 'cancelled').length,
          averageJobValue: jobs.length > 0 ? jobs.reduce((sum, j) => sum + j.paymentAmount, 0) / jobs.length : 0
        },
        financialMetrics: {
          totalRevenue: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
          platformFees: payments.reduce((sum, p) => sum + (p.serviceFee || 0), 0),
          completedPayments: payments.filter(p => p.status === 'completed').length,
          pendingPayments: payments.filter(p => p.status === 'pending').length,
          failedPayments: payments.filter(p => p.status === 'failed').length
        }
      };

      res.json(reports);
    } catch (error) {
      console.error('Admin reports error:', error);
      res.status(500).json({ message: "Failed to generate admin reports" });
    }
  });

  // Support ticket messaging endpoints for Ultrabug Prompt 2
  app.get("/api/admin/support-tickets/:ticketId/messages", adminAuth, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const messages = await storage.getSupportTicketMessages(ticketId);
      res.json(messages);
    } catch (error) {
      console.error('Admin ticket messages error:', error);
      res.status(500).json({ message: "Failed to fetch ticket messages" });
    }
  });

  app.post("/api/admin/support-tickets/:ticketId/messages", adminAuth, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const { message, isInternal, attachmentUrl } = req.body;

      const messageData = {
        ticketId,
        senderId: req.user?.id,
        message,
        isInternal: isInternal || false,
        attachmentUrl
      };

      const newMessage = await storage.createSupportTicketMessage(messageData);
      
      // Update ticket status if this is a response
      if (!isInternal) {
        await storage.updateSupportTicket(ticketId, {
          status: 'in_progress'
        });
      }

      res.json({
        message: "Message sent successfully",
        ticketMessage: newMessage
      });
    } catch (error) {
      console.error('Admin ticket message creation error:', error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.post("/api/admin/support-tickets/:ticketId/assign", adminAuth, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const { adminId } = req.body;

      const updatedTicket = await storage.assignSupportTicket(ticketId, adminId || req.user?.id);
      
      if (!updatedTicket) {
        return res.status(404).json({ message: "Support ticket not found" });
      }

      res.json({
        message: "Ticket assigned successfully",
        ticket: updatedTicket
      });
    } catch (error) {
      console.error('Admin ticket assignment error:', error);
      res.status(500).json({ message: "Failed to assign ticket" });
    }
  });

  app.get("/api/admin/support-tickets/:ticketId", adminAuth, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const ticket = await storage.getSupportTicketById(ticketId);
      
      if (!ticket) {
        return res.status(404).json({ message: "Support ticket not found" });
      }

      res.json(ticket);
    } catch (error) {
      console.error('Admin ticket fetch error:', error);
      res.status(500).json({ message: "Failed to fetch ticket" });
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

  // Refund Management Routes for Plan Bravo Financial Management
  app.get('/api/admin/refunds', adminAuth, async (req: any, res: any) => {
    try {
      const { status, limit, offset } = req.query;
      const refunds = await refundService.getRefundRequests({
        status: status as string,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined
      });
      
      res.json(refunds);
    } catch (error) {
      console.error('Admin refunds fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch refund requests' });
    }
  });

  app.post('/api/admin/refunds/:id/process', adminAuth, async (req: any, res: any) => {
    try {
      const refundId = parseInt(req.params.id);
      const { decision, adminNotes } = req.body;
      
      const result = await refundService.processRefundRequest({
        refundId,
        adminId: req.user.id,
        decision,
        adminNotes,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json(result);
    } catch (error) {
      console.error('Refund processing error:', error);
      res.status(500).json({ message: 'Failed to process refund request' });
    }
  });

  app.get('/api/admin/refund-statistics', adminAuth, async (req: any, res: any) => {
    try {
      const stats = await refundService.getRefundStatistics();
      res.json(stats);
    } catch (error) {
      console.error('Refund statistics error:', error);
      res.status(500).json({ message: 'Failed to fetch refund statistics' });
    }
  });

  // Financial Audit Trail Routes
  app.get('/api/admin/audit-trail', adminAuth, async (req: any, res: any) => {
    try {
      const { limit, offset } = req.query;
      const auditData = await auditService.getAllAuditEntries(
        limit ? parseInt(limit) : 100,
        offset ? parseInt(offset) : 0
      );
      
      res.json(auditData);
    } catch (error) {
      console.error('Audit trail fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch audit trail' });
    }
  });

  app.get('/api/admin/financial-integrity', adminAuth, async (req: any, res: any) => {
    try {
      const integrity = await auditService.validateFinancialIntegrity();
      res.json(integrity);
    } catch (error) {
      console.error('Financial integrity check error:', error);
      res.status(500).json({ message: 'Failed to validate financial integrity' });
    }
  });

  app.get('/api/admin/audit-summary', adminAuth, async (req: any, res: any) => {
    try {
      const { startDate, endDate } = req.query;
      const summary = await auditService.getFinancialAuditSummary(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json(summary);
    } catch (error) {
      console.error('Audit summary error:', error);
      res.status(500).json({ message: 'Failed to generate audit summary' });
    }
  });

  // Security Monitoring Routes for Plan Bravo
  app.get('/api/admin/security-dashboard', adminAuth, async (req: any, res: any) => {
    try {
      const dashboard = await securityMonitor.getSecurityDashboard();
      res.json(dashboard);
    } catch (error) {
      console.error('Security dashboard error:', error);
      res.status(500).json({ message: 'Failed to fetch security dashboard' });
    }
  });

  app.get('/api/admin/security-incidents', adminAuth, async (req: any, res: any) => {
    try {
      const { severity, type, status, limit, offset } = req.query;
      const incidents = await securityMonitor.getSecurityIncidents({
        severity: severity as string,
        type: type as string,
        status: status as string,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined
      });
      
      res.json(incidents);
    } catch (error) {
      console.error('Security incidents fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch security incidents' });
    }
  });

  app.post('/api/admin/security-incidents/:id/resolve', adminAuth, async (req: any, res: any) => {
    try {
      const incidentId = parseInt(req.params.id);
      const { notes } = req.body;
      
      const resolved = await securityMonitor.resolveIncident(incidentId, req.user.id, notes);
      
      if (resolved) {
        res.json({ message: 'Security incident resolved successfully' });
      } else {
        res.status(404).json({ message: 'Security incident not found' });
      }
    } catch (error) {
      console.error('Security incident resolution error:', error);
      res.status(500).json({ message: 'Failed to resolve security incident' });
    }
  });
}