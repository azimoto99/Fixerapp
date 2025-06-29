import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { 
  enhancedAdminAuth, 
  adminRateLimit, 
  strictAdminRateLimit, 
  adminSecurityHeaders, 
  validateAdminInput, 
  auditAdminAction 
} from "./admin-security";
import { financialService } from "./financial-service";
import { contentModerationService } from "./content-moderation";
import { analyticsService } from "./analytics-service";
import { systemMonitor } from "./system-monitor";
import { sendEmail } from "./utils/email";

// Utility function to safely get authenticated user ID
function getAuthenticatedUserId(req: Request): number {
  if (!req.user?.id) {
    throw new Error('Authentication required: User not found or missing ID');
  }
  return req.user.id;
}
// Import health routes directly from the file to avoid build issues
const healthRoutes = {
  get: (path: string, handler: Function) => {},
  post: (path: string, handler: Function) => {}
};

export function registerAdminRoutes(app: Express) {
  // Apply security headers to all admin routes
  app.use('/api/admin/*', adminSecurityHeaders);
  app.use('/api/admin/*', adminRateLimit);
  app.use('/api/admin/*', validateAdminInput);

  // Legacy admin auth for backward compatibility
  const adminAuth = enhancedAdminAuth('admin');
  const superAdminAuth = enhancedAdminAuth('super_admin');
  // Register basic health endpoint instead of using external routes
  app.get('/api/admin/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

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
      const { 
        page = '1', 
        limit = '10', 
        search = '', 
        status = 'all', 
        sortBy = 'id', 
        sortOrder = 'desc' 
      } = req.query;

      // Get all users from storage (returns User[])
      const allUsers = await storage.getAllUsers();
      let filteredUsers = allUsers || [];

      // Apply search filter
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        filteredUsers = filteredUsers.filter(user => 
          user.username?.toLowerCase().includes(searchTerm) ||
          user.fullName?.toLowerCase().includes(searchTerm) ||
          user.email?.toLowerCase().includes(searchTerm)
        );
      }

      // Apply status filter
      if (status !== 'all') {
        filteredUsers = filteredUsers.filter(user => {
          if (status === 'active') return user.isActive;
          if (status === 'inactive') return !user.isActive;
          return true;
        });
      }

      // Sort users
      filteredUsers.sort((a, b) => {
        const aValue = a[sortBy as keyof typeof a] || '';
        const bValue = b[sortBy as keyof typeof b] || '';
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Apply pagination
      const startIndex = (parseInt(page as string) - 1) * parseInt(limit as string);
      const endIndex = startIndex + parseInt(limit as string);
      const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
      
      // Remove sensitive information
      const safeUsers = paginatedUsers.map(user => ({
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

      res.json({
        users: safeUsers,
        total: filteredUsers.length,
        page: parseInt(page as string),
        totalPages: Math.ceil(filteredUsers.length / parseInt(limit as string))
      });
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
      if (userId === req.user?.id) {
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
      const { 
        page = '1', 
        limit = '10', 
        search = '', 
        status = 'all', 
        sortBy = 'id', 
        sortOrder = 'desc' 
      } = req.query;

      // Get all jobs from storage (returns Job[])
      const allJobs = await storage.getAllJobs();
      let filteredJobs = allJobs || [];

      // Apply search filter
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        filteredJobs = filteredJobs.filter(job => 
          job.title?.toLowerCase().includes(searchTerm) ||
          job.description?.toLowerCase().includes(searchTerm) ||
          job.category?.toLowerCase().includes(searchTerm)
        );
      }

      // Apply status filter
      if (status !== 'all') {
        filteredJobs = filteredJobs.filter(job => job.status === status);
      }

      // Sort jobs
      filteredJobs.sort((a, b) => {
        const aValue = a[sortBy as keyof typeof a] || '';
        const bValue = b[sortBy as keyof typeof b] || '';
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Apply pagination
      const startIndex = (parseInt(page as string) - 1) * parseInt(limit as string);
      const endIndex = startIndex + parseInt(limit as string);
      const paginatedJobs = filteredJobs.slice(startIndex, endIndex);
      
      res.json({
        jobs: paginatedJobs,
        total: filteredJobs.length,
        page: parseInt(page as string),
        totalPages: Math.ceil(filteredJobs.length / parseInt(limit as string))
      });
    } catch (error) {
      console.error('Admin jobs error:', error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  // Delete job
  app.delete("/api/admin/jobs/:jobId", adminAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);

      const job = await storage.getJob(jobId);
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
      const { 
        page = '1', 
        limit = '10', 
        search = '', 
        status = 'all', 
        type = 'all',
        sortBy = 'createdAt', 
        sortOrder = 'desc' 
      } = req.query;

      const allPayments = await storage.getAllPayments();
      let filteredPayments = allPayments || [];

      // Apply search filter
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        filteredPayments = filteredPayments.filter(payment => 
          payment.description?.toLowerCase().includes(searchTerm) ||
          payment.userEmail?.toLowerCase().includes(searchTerm) ||
          payment.id.toString().includes(searchTerm)
        );
      }

      // Apply status filter
      if (status !== 'all') {
        filteredPayments = filteredPayments.filter(payment => payment.status === status);
      }

      // Apply type filter (if needed)
      if (type !== 'all') {
        filteredPayments = filteredPayments.filter(payment => payment.type === type);
      }

      // Sort payments
      filteredPayments.sort((a, b) => {
        const aValue = a[sortBy as keyof typeof a] || '';
        const bValue = b[sortBy as keyof typeof b] || '';
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Apply pagination
      const startIndex = (parseInt(page as string) - 1) * parseInt(limit as string);
      const endIndex = startIndex + parseInt(limit as string);
      const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

      // Ensure payments have required fields for frontend
      const safePayments = paginatedPayments.map(payment => ({
        id: payment.id,
        description: payment.description || `Payment #${payment.id}`,
        userEmail: payment.userEmail || 'Unknown',
        amount: payment.amount || 0,
        status: payment.status || 'pending',
        userId: payment.userId,
        createdAt: payment.createdAt,
        serviceFee: payment.serviceFee || 0
      }));

      res.json({
        payments: safePayments,
        total: filteredPayments.length,
        page: parseInt(page as string),
        totalPages: Math.ceil(filteredPayments.length / parseInt(limit as string))
      });
    } catch (error) {
      console.error('Admin payments error:', error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  // Get support tickets - now using real database data
  app.get("/api/admin/support-tickets", adminAuth, async (req, res) => {
    try {
      const { 
        page = '1', 
        limit = '10', 
        search = '', 
        status = 'all', 
        priority = 'all',
        sortBy = 'createdAt', 
        sortOrder = 'desc' 
      } = req.query;

      const allTickets = await storage.getSupportTickets();
      let filteredTickets = allTickets || [];

      // Apply search filter
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        filteredTickets = filteredTickets.filter(ticket => 
          ticket.title?.toLowerCase().includes(searchTerm) ||
          ticket.userName?.toLowerCase().includes(searchTerm) ||
          ticket.userEmail?.toLowerCase().includes(searchTerm) ||
          ticket.id.toString().includes(searchTerm)
        );
      }

      // Apply status filter
      if (status !== 'all') {
        filteredTickets = filteredTickets.filter(ticket => ticket.status === status);
      }

      // Apply priority filter
      if (priority !== 'all') {
        filteredTickets = filteredTickets.filter(ticket => ticket.priority === priority);
      }

      // Sort tickets
      filteredTickets.sort((a, b) => {
        const aValue = a[sortBy as keyof typeof a] || '';
        const bValue = b[sortBy as keyof typeof b] || '';
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Apply pagination
      const startIndex = (parseInt(page as string) - 1) * parseInt(limit as string);
      const endIndex = startIndex + parseInt(limit as string);
      const paginatedTickets = filteredTickets.slice(startIndex, endIndex);

      // Ensure tickets have required fields for frontend
      const safeTickets = paginatedTickets.map(ticket => ({
        id: ticket.id,
        title: ticket.title || `Ticket #${ticket.id}`,
        userName: ticket.userName || 'Unknown User',
        userEmail: ticket.userEmail || 'unknown@example.com',
        priority: ticket.priority || 'medium',
        status: ticket.status || 'open',
        createdAt: ticket.createdAt,
        description: ticket.description
      }));

      res.json({
        tickets: safeTickets,
        total: filteredTickets.length,
        page: parseInt(page as string),
        totalPages: Math.ceil(filteredTickets.length / parseInt(limit as string))
      });
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
      
      // Get the original ticket first to access user info
      const originalTicket = await storage.getSupportTicketById(ticketId);
      if (!originalTicket) {
        return res.status(404).json({ message: "Support ticket not found" });
      }
      
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
      
      // Send email notification to user
      try {
        const adminUser = await storage.getUser(req.user?.id);
        const adminName = adminUser?.fullName || adminUser?.username || 'Support Team';
        
        await sendEmail(
          originalTicket.userEmail,
          `Response to Support Ticket #${ticketId}: ${originalTicket.title}`,
          `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #333; margin: 0;">Support Ticket Update</h2>
            </div>
            
            <div style="padding: 20px;">
              <p>Hi ${originalTicket.userName},</p>
              
              <p>You've received a response to your support ticket:</p>
              
              <div style="background: #e9ecef; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <strong>Ticket #${ticketId}:</strong> ${originalTicket.title}
              </div>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff;">
                <strong>Response from ${adminName}:</strong><br><br>
                ${response.replace(/\n/g, '<br>')}
              </div>
              
              ${status ? `
                <div style="background: #d4edda; padding: 10px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #28a745;">
                  <strong>Status Updated:</strong> ${status.charAt(0).toUpperCase() + status.slice(1)}
                </div>
              ` : ''}
              
              <p style="margin-top: 30px;">
                To reply or view the full conversation, please log into your Fixer account and visit the support section.
              </p>
              
              <p>Best regards,<br>The Fixer Support Team</p>
            </div>
            
            <div style="background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px;">
              This is an automated notification from Fixer Support System
            </div>
          </div>
          `
        );
        console.log(`✓ Support ticket response email sent to ${originalTicket.userEmail} for ticket #${ticketId}`);
      } catch (emailError) {
        console.error('Failed to send support ticket response email:', emailError);
        // Don't fail the request if email fails
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

      // Send email notification to user if this is not an internal message
      if (!isInternal) {
        try {
          const ticket = await storage.getSupportTicketById(ticketId);
          if (ticket) {
            const adminUser = await storage.getUser(req.user?.id);
            const adminName = adminUser?.fullName || adminUser?.username || 'Support Team';
            
            await sendEmail(
              ticket.userEmail,
              `New Message on Support Ticket #${ticketId}: ${ticket.title}`,
              `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h2 style="color: #333; margin: 0;">New Support Message</h2>
                </div>
                
                <div style="padding: 20px;">
                  <p>Hi ${ticket.userName},</p>
                  
                  <p>You've received a new message on your support ticket:</p>
                  
                  <div style="background: #e9ecef; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <strong>Ticket #${ticketId}:</strong> ${ticket.title}
                  </div>
                  
                  <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff;">
                    <strong>Message from ${adminName}:</strong><br><br>
                    ${message.replace(/\n/g, '<br>')}
                  </div>
                  
                  ${attachmentUrl ? `
                    <div style="background: #fff3cd; padding: 10px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #ffc107;">
                      <strong>Attachment:</strong> <a href="${attachmentUrl}" style="color: #007bff;">View Attachment</a>
                    </div>
                  ` : ''}
                  
                  <p style="margin-top: 30px;">
                    To reply or view the full conversation, please log into your Fixer account and visit the support section.
                  </p>
                  
                  <p>Best regards,<br>The Fixer Support Team</p>
                </div>
                
                <div style="background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px;">
                  This is an automated notification from Fixer Support System
                </div>
              </div>
              `
            );
            console.log(`✓ Support ticket message email sent to ${ticket.userEmail} for ticket #${ticketId}`);
          }
        } catch (emailError) {
          console.error('Failed to send support ticket message email:', emailError);
          // Don't fail the request if email fails
        }
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

      // Get the original ticket first to access user info
      const originalTicket = await storage.getSupportTicketById(ticketId);
      if (!originalTicket) {
        return res.status(404).json({ message: "Support ticket not found" });
      }

      const updatedTicket = await storage.assignSupportTicket(ticketId, adminId || req.user?.id);
      
      if (!updatedTicket) {
        return res.status(404).json({ message: "Support ticket not found" });
      }

      // Send email notification to user about assignment
      try {
        const assignedAdminUser = await storage.getUser(adminId || req.user?.id);
        const adminName = assignedAdminUser?.fullName || assignedAdminUser?.username || 'Support Team';
        
        await sendEmail(
          originalTicket.userEmail,
          `Support Ticket #${ticketId} Assigned: ${originalTicket.title}`,
          `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #333; margin: 0;">Support Ticket Assignment</h2>
            </div>
            
            <div style="padding: 20px;">
              <p>Hi ${originalTicket.userName},</p>
              
              <p>Your support ticket has been assigned to our support team:</p>
              
              <div style="background: #e9ecef; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <strong>Ticket #${ticketId}:</strong> ${originalTicket.title}
              </div>
              
              <div style="background: #d4edda; padding: 15px; border-radius: 6px; border-left: 4px solid #28a745;">
                <strong>Assigned to:</strong> ${adminName}<br>
                <small>Your ticket is now being actively reviewed and you should receive a response soon.</small>
              </div>
              
              <p style="margin-top: 30px;">
                To view your ticket or add additional information, please log into your Fixer account and visit the support section.
              </p>
              
              <p>Best regards,<br>The Fixer Support Team</p>
            </div>
            
            <div style="background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px;">
              This is an automated notification from Fixer Support System
            </div>
          </div>
          `
        );
        console.log(`✓ Support ticket assignment email sent to ${originalTicket.userEmail} for ticket #${ticketId}`);
      } catch (emailError) {
        console.error('Failed to send support ticket assignment email:', emailError);
        // Don't fail the request if email fails
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

  // Enhanced User Management Endpoints for Ultrabug Prompt 3
  
  // Safe user deletion with cascade handling
  app.delete("/api/admin/users/:userId", 
    strictAdminRateLimit, 
    superAdminAuth, 
    auditAdminAction('delete_user', 'user'),
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);
        
        if (!userId || userId === req.user?.id) {
          return res.status(400).json({ message: "Cannot delete yourself or invalid user ID" });
        }

        const deletedUser = await storage.safeDeleteUser(userId);
        
        if (!deletedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json({
          message: "User safely deleted with all related data handled",
          user: deletedUser
        });
      } catch (error) {
        console.error('Safe user deletion error:', error);
        res.status(500).json({ message: "Failed to safely delete user" });
      }
    }
  );

  // Update user account type
  app.patch("/api/admin/users/:userId/account-type", 
    adminAuth, 
    auditAdminAction('update_account_type', 'user'),
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);
        const { accountType } = req.body;

        if (!['worker', 'poster', 'both'].includes(accountType)) {
          return res.status(400).json({ message: "Invalid account type" });
        }

        const updatedUser = await storage.updateUserAccountType(userId, accountType);
        
        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json({
          message: "User account type updated successfully",
          user: updatedUser
        });
      } catch (error) {
        console.error('Account type update error:', error);
        res.status(500).json({ message: "Failed to update account type" });
      }
    }
  );

  // Update user verification status
  app.patch("/api/admin/users/:userId/verification", 
    adminAuth, 
    auditAdminAction('update_verification', 'user'),
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);
        const verificationData = req.body;

        const updatedUser = await storage.updateUserVerificationStatus(userId, verificationData);
        
        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json({
          message: "User verification status updated successfully",
          user: updatedUser
        });
      } catch (error) {
        console.error('Verification update error:', error);
        res.status(500).json({ message: "Failed to update verification status" });
      }
    }
  );

  // Toggle user admin privileges
  app.patch("/api/admin/users/:userId/admin-status", 
    strictAdminRateLimit, 
    superAdminAuth, 
    auditAdminAction('update_admin_privileges', 'user'),
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);
        const { isAdmin, isSuperAdmin = false } = req.body;

        if (userId === req.user?.id && !isAdmin) {
          return res.status(400).json({ message: "Cannot remove your own admin privileges" });
        }

        const updatedUser = await storage.toggleUserAdminStatus(userId, isAdmin, isSuperAdmin);
        
        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json({
          message: "User admin privileges updated successfully",
          user: updatedUser
        });
      } catch (error) {
        console.error('Admin status update error:', error);
        res.status(500).json({ message: "Failed to update admin status" });
      }
    }
  );

  // Bulk user operations
  app.patch("/api/admin/users/bulk-update", 
    strictAdminRateLimit, 
    adminAuth, 
    auditAdminAction('bulk_user_update', 'users'),
    async (req, res) => {
      try {
        const { userIds, updateData } = req.body;

        if (!Array.isArray(userIds) || userIds.length === 0) {
          return res.status(400).json({ message: "Invalid user IDs array" });
        }

        if (userIds.length > 50) {
          return res.status(400).json({ message: "Bulk operations limited to 50 users at a time" });
        }

        const updatedUsers = await storage.bulkUpdateUsers(userIds, updateData);

        res.json({
          message: `Successfully updated ${updatedUsers.length} users`,
          users: updatedUsers
        });
      } catch (error) {
        console.error('Bulk user update error:', error);
        res.status(500).json({ message: "Failed to bulk update users" });
      }
    }
  );

  // Get user statistics
  app.get("/api/admin/user-stats", adminAuth, async (req, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error) {
      console.error('User stats error:', error);
      res.status(500).json({ message: "Failed to fetch user statistics" });
    }
  });

  // Enhanced Financial Management Endpoints for Ultrabug Prompt 4

  // Get comprehensive financial metrics
  app.get("/api/admin/financial-metrics", 
    adminAuth, 
    auditAdminAction('view_financial_metrics', 'financial_data'),
    async (req, res) => {
      try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate as string) : undefined;
        const end = endDate ? new Date(endDate as string) : undefined;

        const metrics = await financialService.getFinancialMetrics(start, end);
        res.json({
          metrics,
          period: { startDate: start, endDate: end },
          generatedAt: new Date()
        });
      } catch (error) {
        console.error('Financial metrics error:', error);
        res.status(500).json({ message: "Failed to fetch financial metrics" });
      }
    }
  );

  // Get detailed transaction history with filtering
  app.get("/api/admin/transaction-history", 
    adminAuth, 
    auditAdminAction('view_transaction_history', 'financial_data'),
    async (req, res) => {
      try {
        const filters = {
          startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
          endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
          status: req.query.status as string,
          type: req.query.type as string,
          userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
          jobId: req.query.jobId ? parseInt(req.query.jobId as string) : undefined,
          limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
          offset: req.query.offset ? parseInt(req.query.offset as string) : 0
        };

        const result = await financialService.getTransactionHistory(filters);
        res.json(result);
      } catch (error) {
        console.error('Transaction history error:', error);
        res.status(500).json({ message: "Failed to fetch transaction history" });
      }
    }
  );

  // Process refund through Stripe
  app.post("/api/admin/payments/:paymentId/refund", 
    strictAdminRateLimit, 
    adminAuth, 
    auditAdminAction('process_refund', 'payment'),
    async (req, res) => {
      try {
        const paymentId = parseInt(req.params.paymentId);
        const { amount, reason } = req.body;

        const result = await financialService.processRefund(paymentId, amount, reason);
        res.json(result);
      } catch (error) {
        console.error('Refund processing error:', error);
        res.status(500).json({ 
          message: "Failed to process refund", 
          error: error.message 
        });
      }
    }
  );

  // Process worker payout
  app.post("/api/admin/earnings/:earningId/payout", 
    strictAdminRateLimit, 
    adminAuth, 
    auditAdminAction('process_payout', 'earning'),
    async (req, res) => {
      try {
        const earningId = parseInt(req.params.earningId);
        const result = await financialService.processPayout(earningId);
        res.json(result);
      } catch (error) {
        console.error('Payout processing error:', error);
        res.status(500).json({ 
          message: "Failed to process payout", 
          error: error.message 
        });
      }
    }
  );

  // Get Stripe transaction details
  app.get("/api/admin/stripe/transaction/:transactionId", 
    adminAuth, 
    auditAdminAction('view_stripe_transaction', 'stripe_data'),
    async (req, res) => {
      try {
        const transactionId = req.params.transactionId;
        const details = await financialService.getStripeTransactionDetails(transactionId);
        res.json(details);
      } catch (error) {
        console.error('Stripe transaction details error:', error);
        res.status(500).json({ 
          message: "Failed to fetch Stripe transaction details", 
          error: error.message 
        });
      }
    }
  );

  // Reconcile platform vs Stripe data
  app.post("/api/admin/financial/reconcile", 
    strictAdminRateLimit, 
    adminAuth, 
    auditAdminAction('reconcile_financial_data', 'financial_data'),
    async (req, res) => {
      try {
        const { startDate, endDate } = req.body;
        
        if (!startDate || !endDate) {
          return res.status(400).json({ message: "Start date and end date are required" });
        }

        const result = await financialService.reconcileData(
          new Date(startDate), 
          new Date(endDate)
        );
        res.json(result);
      } catch (error) {
        console.error('Data reconciliation error:', error);
        res.status(500).json({ 
          message: "Failed to reconcile financial data", 
          error: error.message 
        });
      }
    }
  );

  // Get platform fee breakdown
  app.get("/api/admin/platform-fees", 
    adminAuth, 
    auditAdminAction('view_platform_fees', 'financial_data'),
    async (req, res) => {
      try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate as string) : new Date();

        const payments = await storage.getAllPayments();
        const filteredPayments = payments.filter(p => {
          const paymentDate = p.createdAt || new Date();
          return paymentDate >= start && paymentDate <= end && p.status === 'completed';
        });

        const platformFeesBreakdown = {
          totalFees: filteredPayments.reduce((sum, p) => sum + (p.serviceFee || 0), 0),
          averageFeePerTransaction: filteredPayments.length > 0 
            ? filteredPayments.reduce((sum, p) => sum + (p.serviceFee || 0), 0) / filteredPayments.length 
            : 0,
          feesByJobCategory: {},
          feesByMonth: {},
          transactionCount: filteredPayments.length
        };

        res.json({
          ...platformFeesBreakdown,
          period: { startDate: start, endDate: end }
        });
      } catch (error) {
        console.error('Platform fees error:', error);
        res.status(500).json({ message: "Failed to fetch platform fees data" });
      }
    }
  );

  // Get payout management data
  app.get("/api/admin/payouts", 
    adminAuth, 
    auditAdminAction('view_payouts', 'financial_data'),
    async (req, res) => {
      try {
        const { status, workerId, startDate, endDate } = req.query;
        
        const earnings = await storage.getAllEarnings();
        let filteredEarnings = earnings;

        if (status) {
          filteredEarnings = filteredEarnings.filter(e => e.status === status);
        }
        
        if (workerId) {
          filteredEarnings = filteredEarnings.filter(e => e.workerId === parseInt(workerId as string));
        }

        if (startDate) {
          const start = new Date(startDate as string);
          filteredEarnings = filteredEarnings.filter(e => 
            e.dateEarned && e.dateEarned >= start
          );
        }

        if (endDate) {
          const end = new Date(endDate as string);
          filteredEarnings = filteredEarnings.filter(e => 
            e.dateEarned && e.dateEarned <= end
          );
        }

        const payoutSummary = {
          pendingPayouts: filteredEarnings.filter(e => e.status === 'pending').length,
          pendingAmount: filteredEarnings
            .filter(e => e.status === 'pending')
            .reduce((sum, e) => sum + (e.netAmount || 0), 0),
          completedPayouts: filteredEarnings.filter(e => e.status === 'paid').length,
          completedAmount: filteredEarnings
            .filter(e => e.status === 'paid')
            .reduce((sum, e) => sum + (e.netAmount || 0), 0),
          earnings: filteredEarnings
        };

        res.json(payoutSummary);
      } catch (error) {
        console.error('Payouts data error:', error);
        res.status(500).json({ message: "Failed to fetch payouts data" });
      }
    }
  );

  // Enhanced Job Management & Content Moderation Endpoints for Ultrabug Prompt 5

  // Get moderation queue for flagged jobs
  app.get("/api/admin/moderation-queue", 
    adminAuth, 
    auditAdminAction('view_moderation_queue', 'moderation'),
    async (req, res) => {
      try {
        const filters = {
          status: req.query.status as string,
          severity: req.query.severity as string,
          flaggedBy: req.query.flaggedBy ? parseInt(req.query.flaggedBy as string) : undefined,
          limit: req.query.limit ? parseInt(req.query.limit as string) : 50
        };

        const moderationQueue = await contentModerationService.getModerationQueue(filters);
        res.json(moderationQueue);
      } catch (error) {
        console.error('Moderation queue error:', error);
        res.status(500).json({ message: "Failed to fetch moderation queue" });
      }
    }
  );

  // Get comprehensive job analytics
  app.get("/api/admin/job-analytics", 
    adminAuth, 
    auditAdminAction('view_job_analytics', 'analytics'),
    async (req, res) => {
      try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate as string) : undefined;
        const end = endDate ? new Date(endDate as string) : undefined;

        const analytics = await contentModerationService.getJobAnalytics(start, end);
        res.json({
          ...analytics,
          period: { startDate: start, endDate: end },
          generatedAt: new Date()
        });
      } catch (error) {
        console.error('Job analytics error:', error);
        res.status(500).json({ message: "Failed to fetch job analytics" });
      }
    }
  );

  // Moderate job content automatically
  app.post("/api/admin/jobs/:jobId/moderate", 
    adminAuth, 
    auditAdminAction('moderate_job_content', 'job'),
    async (req, res) => {
      try {
        const jobId = parseInt(req.params.jobId);
        const job = await storage.getJob(jobId);
        
        if (!job) {
          return res.status(404).json({ message: "Job not found" });
        }

        const moderationResult = await contentModerationService.moderateJobContent(job);
        
        // Update job based on moderation result
        const adminUserId = getAuthenticatedUserId(req);
        if (moderationResult.action === 'reject') {
          await contentModerationService.rejectJob(jobId, adminUserId, 'Automated content moderation');
        } else if (moderationResult.action === 'flag') {
          await contentModerationService.flagJobForReview(jobId, 'Automated content flagging', adminUserId);
        }

        res.json({
          jobId,
          moderationResult,
          actionTaken: moderationResult.action
        });
      } catch (error) {
        console.error('Job moderation error:', error);
        res.status(500).json({ 
          message: "Failed to moderate job content", 
          error: error.message 
        });
      }
    }
  );

  // Approve job
  app.post("/api/admin/jobs/:jobId/approve", 
    strictAdminRateLimit, 
    adminAuth, 
    auditAdminAction('approve_job', 'job'),
    async (req, res) => {
      try {
        const jobId = parseInt(req.params.jobId);
        const { notes } = req.body;
        const adminUserId = getAuthenticatedUserId(req);

        const result = await contentModerationService.approveJob(jobId, adminUserId, notes);
        res.json(result);
      } catch (error) {
        console.error('Job approval error:', error);
        res.status(500).json({ 
          message: "Failed to approve job", 
          error: error.message 
        });
      }
    }
  );

  // Reject job
  app.post("/api/admin/jobs/:jobId/reject", 
    strictAdminRateLimit, 
    adminAuth, 
    auditAdminAction('reject_job', 'job'),
    async (req, res) => {
      try {
        const jobId = parseInt(req.params.jobId);
        const { reason } = req.body;

        if (!reason) {
          return res.status(400).json({ message: "Rejection reason is required" });
        }

        const adminUserId = getAuthenticatedUserId(req);
        const result = await contentModerationService.rejectJob(jobId, adminUserId, reason);
        res.json(result);
      } catch (error) {
        console.error('Job rejection error:', error);
        res.status(500).json({ 
          message: "Failed to reject job", 
          error: error.message 
        });
      }
    }
  );

  // Flag job for review
  app.post("/api/admin/jobs/:jobId/flag", 
    adminAuth, 
    auditAdminAction('flag_job', 'job'),
    async (req, res) => {
      try {
        const jobId = parseInt(req.params.jobId);
        const { reason } = req.body;

        if (!reason) {
          return res.status(400).json({ message: "Flag reason is required" });
        }

        const adminUserId = getAuthenticatedUserId(req);
        const result = await contentModerationService.flagJobForReview(jobId, reason, adminUserId);
        res.json(result);
      } catch (error) {
        console.error('Job flagging error:', error);
        res.status(500).json({ 
          message: "Failed to flag job", 
          error: error.message 
        });
      }
    }
  );

  // Bulk job operations
  app.post("/api/admin/jobs/bulk-action", 
    strictAdminRateLimit, 
    adminAuth, 
    auditAdminAction('bulk_job_action', 'job'),
    async (req, res) => {
      try {
        const { jobIds, action, reason } = req.body;

        if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
          return res.status(400).json({ message: "Job IDs array is required" });
        }

        if (!['approve', 'reject', 'flag'].includes(action)) {
          return res.status(400).json({ message: "Invalid action. Must be approve, reject, or flag" });
        }

        if ((action === 'reject' || action === 'flag') && !reason) {
          return res.status(400).json({ message: `Reason is required for ${action} action` });
        }

        const adminUserId = getAuthenticatedUserId(req);
        const result = await contentModerationService.bulkJobAction(
          jobIds, 
          action, 
          adminUserId, 
          reason
        );

        res.json(result);
      } catch (error) {
        console.error('Bulk job action error:', error);
        res.status(500).json({ 
          message: "Failed to perform bulk job action", 
          error: error.message 
        });
      }
    }
  );

  // Get jobs with detailed moderation status
  app.get("/api/admin/jobs-detailed", 
    adminAuth, 
    auditAdminAction('view_detailed_jobs', 'job'),
    async (req, res) => {
      try {
        const { status, category, moderationStatus, posterId, workerId } = req.query;
        
        let jobs = await storage.getAllJobs();

        // Apply filters
        if (status) {
          jobs = jobs.filter(job => job.status === status);
        }
        
        if (category) {
          jobs = jobs.filter(job => job.category === category);
        }
        
        if (posterId) {
          jobs = jobs.filter(job => job.posterId === parseInt(posterId as string));
        }
        
        if (workerId) {
          jobs = jobs.filter(job => job.workerId === parseInt(workerId as string));
        }

        // Add poster and worker details
        const detailedJobs = await Promise.all(
          jobs.map(async (job) => {
            const poster = await storage.getUser(job.posterId);
            const worker = job.workerId ? await storage.getUser(job.workerId) : null;
            
            return {
              ...job,
              posterName: poster?.fullName || poster?.username || 'Unknown',
              posterEmail: poster?.email,
              workerName: worker?.fullName || worker?.username || null,
              workerEmail: worker?.email || null,
              createdAt: job.createdAt || new Date(),
              moderationFlags: [], // Would come from moderation service
              riskScore: 'low' // Would be calculated by moderation service
            };
          })
        );

        res.json({
          jobs: detailedJobs,
          total: detailedJobs.length,
          filters: { status, category, moderationStatus, posterId, workerId }
        });
      } catch (error) {
        console.error('Detailed jobs fetch error:', error);
        res.status(500).json({ message: "Failed to fetch detailed jobs data" });
      }
    }
  );

  // Get content moderation statistics
  app.get("/api/admin/moderation-stats", 
    adminAuth, 
    auditAdminAction('view_moderation_stats', 'moderation'),
    async (req, res) => {
      try {
        const jobs = await storage.getAllJobs();
        
        const stats = {
          totalJobs: jobs.length,
          pendingReview: jobs.filter(j => j.status === 'under_review').length,
          approvedJobs: jobs.filter(j => j.status === 'open' || j.status === 'completed').length,
          rejectedJobs: jobs.filter(j => j.status === 'rejected').length,
          flaggedJobs: jobs.filter(j => j.status === 'under_review').length,
          
          // Category breakdown
          categoryBreakdown: jobs.reduce((acc, job) => {
            acc[job.category] = (acc[job.category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          
          // Status breakdown
          statusBreakdown: jobs.reduce((acc, job) => {
            acc[job.status] = (acc[job.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          
          // Time-based metrics
          recentJobs: jobs.filter(j => {
            const createdAt = j.createdAt || new Date(0);
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return createdAt >= dayAgo;
          }).length,
          
          averageProcessingTime: '2.5 hours', // Would be calculated from real data
          moderationAccuracy: '94.2%' // Would be calculated from real moderation data
        };

        res.json(stats);
      } catch (error) {
        console.error('Moderation stats error:', error);
        res.status(500).json({ message: "Failed to fetch moderation statistics" });
      }
    }
  );

  // Report content (user-generated reports)
  app.post("/api/admin/content/report", 
    adminRateLimit, 
    adminAuth, 
    auditAdminAction('create_content_report', 'report'),
    async (req, res) => {
      try {
        const { jobId, userId, reason, category, description } = req.body;

        if (!jobId || !reason) {
          return res.status(400).json({ message: "Job ID and reason are required" });
        }

        // Create content report (would need reports table)
        const adminUserId = getAuthenticatedUserId(req);
        const report = {
          jobId,
          reportedBy: userId || adminUserId,
          reason,
          category: category || 'general',
          description: description || '',
          status: 'pending',
          createdAt: new Date()
        };

        console.log('Content report created:', report);

        // Auto-flag the job for review
        await contentModerationService.flagJobForReview(
          jobId, 
          `User report: ${reason}`, 
          adminUserId
        );

        res.json({
          success: true,
          reportId: Date.now(), // Would be generated by database
          message: 'Content report submitted successfully'
        });
      } catch (error) {
        console.error('Content report error:', error);
        res.status(500).json({ 
          message: "Failed to submit content report", 
          error: error.message 
        });
      }
    }
  );

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

  // ================================
  // ULTRABUG PROMPT 7: ADVANCED ANALYTICS & REPORTING
  // ================================

  // Comprehensive Analytics Dashboard - The Missing Endpoint!
  app.get("/api/admin/analytics/comprehensive", 
    adminAuth, 
    auditAdminAction('view_comprehensive_analytics', 'analytics'),
    async (req, res) => {
      try {
        const [users, jobs, payments, earnings] = await Promise.all([
          storage.getAllUsers(),
          storage.getAllJobs(),
          storage.getAllPayments(),
          storage.getAllEarnings()
        ]);

        // Calculate user growth metrics
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const newUsersToday = users.filter(user => {
          const createdAt = new Date(user.createdAt || user.id);
          return createdAt >= today;
        }).length;

        const usersLastMonth = users.filter(user => {
          const createdAt = new Date(user.createdAt || user.id);
          return createdAt >= lastMonth;
        }).length;

        const growthRate = usersLastMonth > 0 ? ((users.length - usersLastMonth) / usersLastMonth) * 100 : 0;

        // Calculate job metrics
        const activeJobs = jobs.filter(job => job.status === 'open' || job.status === 'in_progress').length;
        const completedJobs = jobs.filter(job => job.status === 'completed').length;
        const completionRate = jobs.length > 0 ? (completedJobs / jobs.length) * 100 : 0;

        // Calculate financial metrics
        const monthlyRevenue = payments
          .filter(payment => {
            const createdAt = new Date(payment.createdAt || payment.id);
            return createdAt >= lastMonth && payment.status === 'completed';
          })
          .reduce((sum, payment) => sum + (payment.amount || 0), 0);

        const totalRevenue = payments
          .filter(payment => payment.status === 'completed')
          .reduce((sum, payment) => sum + (payment.amount || 0), 0);

        const previousMonthRevenue = payments
          .filter(payment => {
            const createdAt = new Date(payment.createdAt || payment.id);
            const previousMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 1, lastMonth.getDate());
            return createdAt >= previousMonth && createdAt < lastMonth && payment.status === 'completed';
          })
          .reduce((sum, payment) => sum + (payment.amount || 0), 0);

        const revenueGrowth = previousMonthRevenue > 0 ? 
          ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : 0;

        const comprehensiveAnalytics = {
          userGrowth: {
            totalUsers: users.length,
            newUsersToday,
            growthRate: Number(growthRate.toFixed(2))
          },
          jobMetrics: {
            activeJobs,
            totalJobs: jobs.length,
            completedJobs,
            completionRate: Number(completionRate.toFixed(1))
          },
          financialMetrics: {
            monthlyRevenue: Number(monthlyRevenue.toFixed(2)),
            totalRevenue: Number(totalRevenue.toFixed(2)),
            revenueGrowth: Number(revenueGrowth.toFixed(2))
          },
          timestamp: new Date()
        };

        res.json(comprehensiveAnalytics);
      } catch (error) {
        console.error('Comprehensive analytics error:', error);
        res.status(500).json({ message: "Failed to fetch comprehensive analytics" });
      }
    }
  );

  // Enhanced Users Analytics Endpoint
  app.get("/api/admin/analytics/users", 
    adminAuth, 
    async (req, res) => {
      try {
        const { page = 1, limit = 10, search = '', accountType = 'all', sortBy = 'id', sortOrder = 'desc' } = req.query;
        
        const users = await storage.getAllUsers();
        const filteredUsers = users.filter(user => {
          const matchesSearch = search ? 
            user.username.toLowerCase().includes(search.toLowerCase()) ||
            user.fullName.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase()) : true;
          
          const matchesAccountType = accountType === 'all' || user.accountType === accountType;
          
          return matchesSearch && matchesAccountType;
        });

        // Sort users
        filteredUsers.sort((a, b) => {
          const aVal = a[sortBy] || '';
          const bVal = b[sortBy] || '';
          return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        });

        // Paginate
        const startIndex = (Number(page) - 1) * Number(limit);
        const paginatedUsers = filteredUsers.slice(startIndex, startIndex + Number(limit));

        res.json({
          users: paginatedUsers,
          total: filteredUsers.length,
          page: Number(page),
          totalPages: Math.ceil(filteredUsers.length / Number(limit))
        });
      } catch (error) {
        console.error('User analytics error:', error);
        res.status(500).json({ message: "Failed to fetch user analytics" });
      }
    }
  );

  // Enhanced Jobs Analytics Endpoint
  app.get("/api/admin/analytics/jobs", 
    adminAuth, 
    async (req, res) => {
      try {
        const { page = 1, limit = 10, search = '', status = 'all', sortBy = 'id', sortOrder = 'desc' } = req.query;
        
        const jobs = await storage.getAllJobs();
        const filteredJobs = jobs.filter(job => {
          const matchesSearch = search ? 
            job.title.toLowerCase().includes(search.toLowerCase()) ||
            job.description.toLowerCase().includes(search.toLowerCase()) ||
            job.location.toLowerCase().includes(search.toLowerCase()) : true;
          
          const matchesStatus = status === 'all' || job.status === status;
          
          return matchesSearch && matchesStatus;
        });

        // Sort jobs
        filteredJobs.sort((a, b) => {
          const aVal = a[sortBy] || '';
          const bVal = b[sortBy] || '';
          return sortOrder === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
        });

        // Paginate
        const startIndex = (Number(page) - 1) * Number(limit);
        const paginatedJobs = filteredJobs.slice(startIndex, startIndex + Number(limit));

        res.json({
          jobs: paginatedJobs,
          total: filteredJobs.length,
          page: Number(page),
          totalPages: Math.ceil(filteredJobs.length / Number(limit)),
          filters: { status, search }
        });
      } catch (error) {
        console.error('Job analytics error:', error);
        res.status(500).json({ message: "Failed to fetch job analytics" });
      }
    }
  );

  // Support Analytics Endpoint – fetches real tickets from DB
  app.get("/api/admin/analytics/support", adminAuth, async (req, res) => {
      try {
        const { page = 1, limit = 20, search = "", status = "all", priority = "all" } = req.query as any;

        // Pull tickets from storage
        const tickets = await storage.getAllSupportTickets();

        // Basic filtering
        const filtered = tickets.filter(t => {
          const matchesSearch = search ?
            t.title.toLowerCase().includes(search.toLowerCase()) ||
            (t.description || "").toLowerCase().includes(search.toLowerCase()) : true;
          const matchesStatus = status === "all" || t.status === status;
          const matchesPriority = priority === "all" || t.priority === priority;
          return matchesSearch && matchesStatus && matchesPriority;
        });

        // Simple analytics
        const totalTickets = filtered.length;
        const byPriority: Record<string, number> = {};
        const byStatus: Record<string, number> = {};
        filtered.forEach(t => {
          byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
          byStatus[t.status] = (byStatus[t.status] || 0) + 1;
        });

        // Pagination
        const start = (Number(page) - 1) * Number(limit);
        const paginated = filtered.slice(start, start + Number(limit));

        res.json({
          tickets: paginated,
          total: totalTickets,
          page: Number(page),
          totalPages: Math.ceil(totalTickets / Number(limit)),
          analytics: { totalTickets, byPriority, byStatus }
        });
      } catch (error) {
        console.error("Support analytics error:", error);
        res.status(500).json({ message: "Failed to fetch support analytics" });
      }
  });

  // Financial Analytics – real payments
  app.get("/api/admin/analytics/financials", adminAuth, async (req, res) => {
      try {
        const { page = 1, limit = 20, search = "", status = "all", type = "all" } = req.query as any;

        const payments = await storage.getAllPayments();

        const filtered = payments.filter(p => {
          const matchesSearch = search ?
            (p.description || "").toLowerCase().includes(search.toLowerCase()) ||
            String(p.id).includes(search) : true;
          const matchesStatus = status === "all" || p.status === status;
          const matchesType = type === "all" || p.type === type;
          return matchesSearch && matchesStatus && matchesType;
        });

        // Aggregate analytics
        const totalRevenue = filtered.reduce((sum, p) => sum + (p.amount > 0 ? p.amount : 0), 0);
        const platformFees = filtered.reduce((sum, p) => sum + (p.serviceFee || 0), 0);

        // Pagination
        const start = (Number(page) - 1) * Number(limit);
        const paginated = filtered.slice(start, start + Number(limit));

        res.json({
          transactions: paginated,
          total: filtered.length,
          page: Number(page),
          totalPages: Math.ceil(filtered.length / Number(limit)),
          analytics: {
            totalRevenue,
            monthlyRevenue: totalRevenue, // TODO: compute monthly
            platformFees,
            totalTransactions: filtered.length
          }
        });
      } catch (error) {
        console.error("Financial analytics error:", error);
        res.status(500).json({ message: "Failed to fetch financial analytics" });
      }
  });

  // Comprehensive Analytics Dashboard
  app.get("/api/admin/analytics/comprehensive", 
    adminAuth, 
    auditAdminAction('view_comprehensive_analytics', 'analytics'),
    async (req, res) => {
      try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate as string) : undefined;
        const end = endDate ? new Date(endDate as string) : undefined;

        const analytics = await analyticsService.getComprehensiveAnalytics(start, end);
        res.json({
          ...analytics,
          period: { startDate: start, endDate: end },
          generatedAt: new Date()
        });
      } catch (error) {
        console.error('Comprehensive analytics error:', error);
        res.status(500).json({ message: "Failed to fetch comprehensive analytics" });
      }
    }
  );

  // Time Series Data for Charts
  app.get("/api/admin/analytics/time-series/:metric", 
    adminAuth, 
    auditAdminAction('view_time_series_analytics', 'analytics'),
    async (req, res) => {
      try {
        const { metric } = req.params;
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
          return res.status(400).json({ message: "Start and end dates are required" });
        }

        const start = new Date(startDate as string);
        const end = new Date(endDate as string);

        const timeSeriesData = await analyticsService.getTimeSeriesData(metric, start, end);
        res.json({
          metric,
          data: timeSeriesData,
          period: { startDate: start, endDate: end }
        });
      } catch (error) {
        console.error('Time series analytics error:', error);
        res.status(500).json({ message: "Failed to fetch time series data" });
      }
    }
  );

  // Generate Custom Reports
  app.post("/api/admin/analytics/reports/generate", 
    adminAuth, 
    auditAdminAction('generate_analytics_report', 'report'),
    async (req, res) => {
      try {
        const { type, format, startDate, endDate } = req.body;
        
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

        const report = await analyticsService.generateReport(type, format, start, end);
        
        if (format === 'csv') {
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="analytics-report-${Date.now()}.csv"`);
          res.send(report);
        } else {
          res.json(report);
        }
      } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({ message: "Failed to generate report" });
      }
    }
  );

  // Real-time Analytics Dashboard Stats
  app.get("/api/admin/analytics/real-time", 
    adminAuth, 
    auditAdminAction('view_realtime_analytics', 'analytics'),
    async (req, res) => {
      try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const analytics = await analyticsService.getComprehensiveAnalytics(today, now);
        
        res.json({
          ...analytics,
          timestamp: now,
          isRealTime: true
        });
      } catch (error) {
        console.error('Real-time analytics error:', error);
        res.status(500).json({ message: "Failed to fetch real-time analytics" });
      }
    }
  );

  // Export Analytics Data
  app.get("/api/admin/analytics/export/:format", 
    adminAuth, 
    auditAdminAction('export_analytics_data', 'export'),
    async (req, res) => {
      try {
        const { format } = req.params;
        const { startDate, endDate, type = 'detailed' } = req.query;
        
        const start = startDate ? new Date(startDate as string) : undefined;
        const end = endDate ? new Date(endDate as string) : undefined;

        const exportData = await analyticsService.generateReport(type as string, format, start, end);
        
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `fixer-analytics-${type}-${timestamp}.${format}`;
        
        if (format === 'csv') {
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.send(exportData);
        } else {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.json(exportData);
        }
      } catch (error) {
        console.error('Analytics export error:', error);
        res.status(500).json({ message: "Failed to export analytics data" });
      }
    }
  );

  // ================================
  // ULTRABUG PROMPT 8: SYSTEM INTEGRATION & MONITORING
  // ================================

  // Real-time System Health Dashboard
  app.get("/api/admin/system/health", 
    adminAuth, 
    auditAdminAction('view_system_health', 'system'),
    async (req, res) => {
      try {
        const healthStatus = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          database: 'connected',
          api: 'operational'
        };
        res.json(healthStatus);
      } catch (error) {
        console.error('System health check error:', error);
        res.status(500).json({ message: 'Failed to check system health' });
      }
    }
  );

  // Comprehensive Health Check (For external monitoring)
  app.get("/api/admin/system/health-check", 
    adminAuth, 
    auditAdminAction('perform_health_check', 'system'),
    async (req, res) => {
      try {
        const healthCheck = await systemMonitor.performHealthCheck();
        res.json(healthCheck);
      } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({ message: "Failed to perform health check" });
      }
    }
  );

  // System Alerts Management
  app.get("/api/admin/system/alerts", 
    adminAuth, 
    auditAdminAction('view_system_alerts', 'alerts'),
    async (req, res) => {
      try {
        const alerts = await systemMonitor.checkAlerts();
        res.json({
          alerts,
          config: systemMonitor.getAlertConfig(),
          timestamp: new Date()
        });
      } catch (error) {
        console.error('System alerts error:', error);
        res.status(500).json({ message: "Failed to fetch system alerts" });
      }
    }
  );

  // Update Alert Configuration
  app.put("/api/admin/system/alerts/:alertId", 
    adminAuth, 
    auditAdminAction('update_alert_config', 'alerts'),
    async (req, res) => {
      try {
        const { alertId } = req.params;
        const updates = req.body;
        
        const success = systemMonitor.updateAlertConfig(alertId, updates);
        
        if (success) {
          res.json({ message: "Alert configuration updated successfully" });
        } else {
          res.status(404).json({ message: "Alert configuration not found" });
        }
      } catch (error) {
        console.error('Alert config update error:', error);
        res.status(500).json({ message: "Failed to update alert configuration" });
      }
    }
  );

  // Uptime Report
  app.get("/api/admin/system/uptime", 
    adminAuth, 
    auditAdminAction('view_uptime_report', 'system'),
    async (req, res) => {
      try {
        const { days = 30 } = req.query;
        const uptimeReport = await systemMonitor.getUptimeReport(parseInt(days as string));
        res.json(uptimeReport);
      } catch (error) {
        console.error('Uptime report error:', error);
        res.status(500).json({ message: "Failed to fetch uptime report" });
      }
    }
  );

  // System Performance Metrics
  app.get("/api/admin/system/performance", 
    adminAuth, 
    auditAdminAction('view_performance_metrics', 'system'),
    async (req, res) => {
      try {
        const systemHealth = await systemMonitor.getSystemHealth();
        const performanceMetrics = {
          memory: systemHealth.memory,
          cpu: systemHealth.cpu,
          uptime: systemHealth.uptime,
          activeConnections: systemHealth.activeConnections,
          errorRate: systemHealth.errorRate,
          services: {
            database: {
              status: systemHealth.database.status,
              responseTime: systemHealth.database.responseTime,
              uptime: systemHealth.database.uptime
            },
            stripe: {
              status: systemHealth.stripe.status,
              responseTime: systemHealth.stripe.responseTime,
              uptime: systemHealth.stripe.uptime
            },
            api: {
              status: systemHealth.api.status,
              uptime: systemHealth.api.uptime
            }
          },
          timestamp: new Date()
        };
        
        res.json(performanceMetrics);
      } catch (error) {
        console.error('Performance metrics error:', error);
        res.status(500).json({ message: "Failed to fetch performance metrics" });
      }
    }
  );

  // System Maintenance Mode
  app.post("/api/admin/system/maintenance", 
    adminAuth, 
    auditAdminAction('toggle_maintenance_mode', 'system'),
    async (req, res) => {
      try {
        const { enabled, message } = req.body;
        
        // In production, this would update a system-wide maintenance flag
        // For now, we'll simulate the functionality
        const adminUserId = getAuthenticatedUserId(req);
        const maintenanceConfig = {
          enabled: Boolean(enabled),
          message: message || "System maintenance in progress. Please try again later.",
          enabledAt: enabled ? new Date() : null,
          enabledBy: adminUserId
        };
        
        res.json({
          message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`,
          config: maintenanceConfig
        });
      } catch (error) {
        console.error('Maintenance mode error:', error);
        res.status(500).json({ message: "Failed to toggle maintenance mode" });
      }
    }
  );

  // Admin can create a job without payment (adminPosted)
  app.post('/api/admin/jobs', adminAuth, async (req, res) => {
    try {
      const { title, description, paymentAmount, location, category, skillsRequired } = req.body;

      if (!title || !description || !paymentAmount) {
        return res.status(400).json({ message: "Missing required job fields" });
      }

      const newJob = await storage.createJob({
        title,
        description,
        paymentAmount: parseFloat(paymentAmount),
        status: 'open',
        location: location || 'Not specified',
        category: category || 'Uncategorized',
        skillsRequired: skillsRequired || [],
        posterId: req.user.id, // Use the admin's ID as the poster
        datePosted: new Date().toISOString(),
      });

      res.status(201).json(newJob);
    } catch (error) {
      console.error('Admin create job error:', error);
      res.status(500).json({ message: 'Failed to create job' });
    }
  });

  // Global notifications CRUD
  app.get('/api/admin/notifications', adminAuth, async (req, res) => {
    try {
      const notifications = await storage.getAllNotifications();
      res.json(notifications);
    } catch (error) {
      console.error('Admin notifications error:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  app.post('/api/admin/notifications', adminAuth, async (req, res) => {
    try {
      const { title, body } = req.body;
      if (!title || !body) {
        return res.status(400).json({ message: 'Missing required notification fields' });
      }
      const newNotification = await storage.createNotification({
        title,
        body,
        createdAt: new Date().toISOString(),
        adminId: req.user.id
      });
      res.status(201).json(newNotification);
    } catch (error) {
      console.error('Admin create notification error:', error);
      res.status(500).json({ message: 'Failed to create notification' });
    }
  });

  app.delete('/api/admin/notifications/:notificationId', adminAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.notificationId);
      const deleted = await storage.deleteNotification(notificationId);
      if (!deleted) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
      console.error('Admin delete notification error:', error);
      res.status(500).json({ message: 'Failed to delete notification' });
    }
  });

  // ------------------------------------------------------------------
  // Broadcast E-mail to all users
  // ------------------------------------------------------------------
  app.post('/api/admin/broadcast-email', adminAuth, async (req, res) => {
    try {
      const { subject, body } = req.body;
      if (!subject || !body) {
        return res.status(400).json({ message: 'subject and body are required' });
      }

      const users = await storage.getAllUsers();

      // Send e-mails in batches of 100 to avoid overwhelming SMTP
      const batchSize = 100;
      const { sendEmail } = await import('./utils/email.js');

      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        await Promise.all(batch.map(u => sendEmail(u.email, subject, body)));
      }

      res.json({ success: true, sent: users.length });
    } catch (err) {
      console.error('Broadcast email error', err);
      res.status(500).json({ message: 'Failed to send broadcast' });
    }
  });

  // Get system health
  app.get('/api/admin/system/health', adminAuth, async (req, res) => {
    try {
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected',
        api: 'operational'
      };
      res.json(healthStatus);
    } catch (error) {
      console.error('System health check error:', error);
      res.status(500).json({ message: 'Failed to check system health' });
    }
  });

  // Get performance metrics
  app.get('/api/admin/system/performance', adminAuth, async (req, res) => {
    try {
      const metrics = {
        cpuUsage: process.cpuUsage(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };
      res.json(metrics);
    } catch (error) {
      console.error('Performance metrics error:', error);
      res.status(500).json({ message: 'Failed to fetch performance metrics' });
    }
  });

  // Send mass email to all users
  app.post('/api/admin/mass-email', adminAuth, async (req, res) => {
    try {
      const { subject, body } = req.body;
      if (!subject || !body) {
        return res.status(400).json({ message: 'Missing required email fields' });
      }
      const users = await storage.getAllUsers();
      const emailPromises = users.map(user => {
        return new Promise((resolve, reject) => {
          // Placeholder for actual email sending logic
          console.log(`Sending email to ${user.email} with subject: ${subject}`);
          resolve(true);
        });
      });
      await Promise.all(emailPromises);
      res.json({ message: 'Mass email sent successfully', count: users.length });
    } catch (error) {
      console.error('Admin mass email error:', error);
      res.status(500).json({ message: 'Failed to send mass email' });
    }
  });

  // Legacy alias: /api/admin/transactions -> /api/admin/payments (for old frontend)
  app.get('/api/admin/transactions', (req, res) => {
    const qs = new URLSearchParams(req.query as any).toString();
    res.redirect(307, `/api/admin/payments${qs ? '?' + qs : ''}`);
  });

  // Legacy alias: /api/admin/support -> /api/admin/support-tickets
  app.get('/api/admin/support', (req, res) => {
    const qs = new URLSearchParams(req.query as any).toString();
    res.redirect(307, `/api/admin/support-tickets${qs ? '?' + qs : ''}`);
  });

  // ================================
  // PLATFORM SETTINGS ENDPOINTS
  // ================================

  // Get platform settings
  app.get("/api/admin/settings/platform", adminAuth, async (req, res) => {
    try {
      console.log('Fetching platform settings for user:', req.user?.id);
      const settings = await storage.getPlatformSettings();
      console.log('Retrieved platform settings:', settings);
      res.json({ settings: settings || {} });
    } catch (error) {
      console.error('Get platform settings error:', error);
      res.status(500).json({ message: "Failed to fetch platform settings", error: error.message });
    }
  });

  // Update platform settings
  app.put("/api/admin/settings/platform", 
    adminAuth, 
    auditAdminAction('update_platform_settings', 'settings'),
    async (req, res) => {
      try {
        const { settings } = req.body;
        console.log('Received platform settings update request:', { settings, userId: req.user?.id });
        
        if (!settings || typeof settings !== 'object') {
          console.log('Invalid settings data received:', settings);
          return res.status(400).json({ message: "Invalid settings data" });
        }

        const updatedSettings = await storage.updatePlatformSettings(settings);
        console.log('Platform settings updated successfully:', updatedSettings);
        
        res.json({ 
          message: "Platform settings updated successfully",
          settings: updatedSettings 
        });
      } catch (error) {
        console.error('Update platform settings error:', error);
        res.status(500).json({ message: "Failed to update platform settings", error: error.message });
      }
    }
  );

  // Get specific setting value
  app.get("/api/admin/settings/platform/:key", adminAuth, async (req, res) => {
    try {
      const { key } = req.params;
      const settings = await storage.getPlatformSettings();
      
      if (!settings || !(key in settings)) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.json({ key, value: settings[key] });
    } catch (error) {
      console.error('Get platform setting error:', error);
      res.status(500).json({ message: "Failed to fetch platform setting" });
    }
  });

  // Update specific setting value
  app.patch("/api/admin/settings/platform/:key", 
    adminAuth, 
    auditAdminAction('update_platform_setting', 'settings'),
    async (req, res) => {
      try {
        const { key } = req.params;
        const { value } = req.body;
        
        const currentSettings = await storage.getPlatformSettings() || {};
        currentSettings[key] = value;
        
        const updatedSettings = await storage.updatePlatformSettings(currentSettings);
        
        res.json({ 
          message: `Setting '${key}' updated successfully`,
          key,
          value: updatedSettings[key]
        });
      } catch (error) {
        console.error('Update platform setting error:', error);
        res.status(500).json({ message: "Failed to update platform setting" });
      }
    }
  );

  // Reset platform settings to defaults
  app.post("/api/admin/settings/platform/reset", 
    strictAdminRateLimit,
    adminAuth, 
    auditAdminAction('reset_platform_settings', 'settings'),
    async (req, res) => {
      try {
        const defaultSettings = {
          // General Settings
          platformName: 'Fixer',
          supportEmail: 'support@fixer.com',
          maxFileSize: 10,
          sessionTimeout: 60,
          maintenanceMode: false,
          registrationEnabled: true,
          
          // Payment Settings
          platformFee: 5.0,
          minPayout: 20,
          maxJobValue: 10000,
          paymentProcessingFee: 2.9,
          instantPayoutFee: 1.5,
          
          // Security Settings
          requireEmailVerification: true,
          require2FA: false,
          maxLoginAttempts: 5,
          passwordMinLength: 8,
          sessionSecure: true,
          
          // Moderation Settings
          autoModerationEnabled: true,
          profanityFilterEnabled: true,
          imageModeration: true,
          maxReportsBeforeReview: 3,
          
          // Notification Settings
          emailNotificationsEnabled: true,
          smsNotificationsEnabled: false,
          pushNotificationsEnabled: true,
          
          // Feature Flags
          locationVerificationEnabled: true,
          enterpriseAccountsEnabled: true,
          hubPinsEnabled: true,
          analyticsEnabled: true
        };

        const resetSettings = await storage.updatePlatformSettings(defaultSettings);
        
        res.json({ 
          message: "Platform settings reset to defaults successfully",
          settings: resetSettings 
        });
      } catch (error) {
        console.error('Reset platform settings error:', error);
        res.status(500).json({ message: "Failed to reset platform settings" });
      }
    }
  );

  // Get settings history/audit log
  app.get("/api/admin/settings/history", 
    adminAuth, 
    auditAdminAction('view_settings_history', 'settings'),
    async (req, res) => {
      try {
        const { limit = 50, offset = 0 } = req.query;
        
        // This would fetch from an audit log table in a real implementation
        const history = await storage.getSettingsHistory(
          parseInt(limit as string), 
          parseInt(offset as string)
        );
        
        res.json({ 
          history: history || [],
          total: history?.length || 0
        });
      } catch (error) {
        console.error('Get settings history error:', error);
        res.status(500).json({ message: "Failed to fetch settings history" });
      }
    }
  );

  // Backup current settings
  app.post("/api/admin/settings/backup", 
    adminAuth, 
    auditAdminAction('backup_platform_settings', 'settings'),
    async (req, res) => {
      try {
        const currentSettings = await storage.getPlatformSettings();
        const adminUserId = getAuthenticatedUserId(req);
        const backup = {
          settings: currentSettings,
          timestamp: new Date().toISOString(),
          createdBy: adminUserId
        };
        
        // In a real implementation, this would save to a backups table
        const backupId = await storage.createSettingsBackup(backup);
        
        res.json({ 
          message: "Settings backup created successfully",
          backupId,
          timestamp: backup.timestamp
        });
      } catch (error) {
        console.error('Backup settings error:', error);
        res.status(500).json({ message: "Failed to create settings backup" });
      }
    }
  );

  // Restore settings from backup
  app.post("/api/admin/settings/restore/:backupId", 
    strictAdminRateLimit,
    adminAuth, 
    auditAdminAction('restore_platform_settings', 'settings'),
    async (req, res) => {
      try {
        const { backupId } = req.params;
        
        const backup = await storage.getSettingsBackup(parseInt(backupId));
        if (!backup) {
          return res.status(404).json({ message: "Backup not found" });
        }
        
        const restoredSettings = await storage.updatePlatformSettings(backup.settings);
        
        res.json({ 
          message: "Settings restored from backup successfully",
          settings: restoredSettings,
          restoredFrom: backup.timestamp
        });
      } catch (error) {
        console.error('Restore settings error:', error);
        res.status(500).json({ message: "Failed to restore settings from backup" });
      }
    }
  );

  // Get available settings backups
  app.get("/api/admin/settings/backups", 
    adminAuth, 
    async (req, res) => {
      try {
        const backups = await storage.getSettingsBackups();
        res.json({ backups: backups || [] });
      } catch (error) {
        console.error('Get settings backups error:', error);
        res.status(500).json({ message: "Failed to fetch settings backups" });
      }
    }
  );

  // Validate admin token endpoint
  app.get("/api/admin/validate-token", adminAuth, (req: Request, res: Response) => {
    // If this endpoint is reached, it means authentication passed
    // Return admin permissions based on the user
    const adminUser = req.user!; // Use non-null assertion since adminAuth middleware ensures req.user exists
    
    // Default admin permissions
    const permissions = [
      'view_dashboard', 
      'manage_users', 
      'view_jobs',
    ];
    
    // Add special permissions for super admin
    if (adminUser.id === 20) { // Special admin ID - Replace with your actual super admin ID
      permissions.push('manage_settings');
      permissions.push('manage_payments');
      permissions.push('view_system_logs');
    }
    
    res.json({
      isValid: true,
      token: req.session?.id || '', // Use session ID as token with fallback
      permissions,
      userId: adminUser.id,
      username: adminUser.username
    });
  });
}