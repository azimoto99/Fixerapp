import express, { Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { storage } from '../storage';
import { z } from 'zod';

const disputeRouter = express.Router();

// Validation schemas
const createDisputeSchema = z.object({
  jobId: z.number(),
  type: z.enum(['payment_not_received', 'payment_incorrect', 'work_not_completed', 'work_quality', 'other']),
  description: z.string().min(10).max(1000),
  expectedAmount: z.number().optional(),
  evidence: z.array(z.string()).optional(),
  reportedBy: z.number()
});

const updateDisputeSchema = z.object({
  status: z.enum(['open', 'investigating', 'resolved', 'closed']).optional(),
  resolution: z.string().optional(),
  adminNotes: z.string().optional()
});

// Create a new dispute
disputeRouter.post('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const disputeData = createDisputeSchema.parse(req.body);
    
    // Verify user can create dispute for this job
    const job = await storage.getJob(disputeData.jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    // Only job poster or assigned worker can create disputes
    if (req.user!.id !== job.posterId && req.user!.id !== job.workerId) {
      return res.status(403).json({ message: 'You can only create disputes for jobs you are involved in' });
    }
    
    // Job must be completed to create a dispute
    if (job.status !== 'completed') {
      return res.status(400).json({ message: 'Disputes can only be created for completed jobs' });
    }
    
    // Create the dispute
    const dispute = {
      id: Date.now(), // Simple ID generation for now
      jobId: disputeData.jobId,
      type: disputeData.type,
      description: disputeData.description,
      expectedAmount: disputeData.expectedAmount,
      evidence: disputeData.evidence || [],
      reportedBy: req.user!.id,
      status: 'open' as const,
      createdAt: new Date().toISOString()
    };
    
    // For now, just return the dispute object
    // In a real implementation, this would be saved to database
    console.log('Dispute created:', dispute);
    
    res.status(201).json(dispute);
  } catch (error) {
    console.error('Error creating dispute:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid dispute data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to create dispute' });
  }
});

// Get disputes (user can see their own, admins can see all)
disputeRouter.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;
    
    let disputes;
    if (req.user!.isAdmin) {
      // Admins can see all disputes
      disputes = await storage.getDisputes({
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        type: type as string
      });
    } else {
      // Users can only see disputes they're involved in
      disputes = await storage.getDisputesByUserId(req.user!.id, {
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        type: type as string
      });
    }
    
    res.json(disputes);
  } catch (error) {
    console.error('Error fetching disputes:', error);
    res.status(500).json({ message: 'Failed to fetch disputes' });
  }
});

// Get specific dispute
disputeRouter.get('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id);
    const dispute = await storage.getDispute(disputeId);
    
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }
    
    // Get the job to check permissions
    const job = await storage.getJob(dispute.jobId);
    if (!job) {
      return res.status(404).json({ message: 'Associated job not found' });
    }
    
    // Only involved parties and admins can view dispute
    if (!req.user!.isAdmin && req.user!.id !== job.posterId && req.user!.id !== job.workerId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(dispute);
  } catch (error) {
    console.error('Error fetching dispute:', error);
    res.status(500).json({ message: 'Failed to fetch dispute' });
  }
});

// Update dispute (admin only)
disputeRouter.patch('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user!.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const disputeId = parseInt(req.params.id);
    const updateData = updateDisputeSchema.parse(req.body);
    
    const dispute = await storage.getDispute(disputeId);
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }
    
    const updatedDispute = await storage.updateDispute(disputeId, {
      ...updateData,
      updatedAt: new Date().toISOString(),
      resolvedBy: updateData.status === 'resolved' ? req.user!.id : undefined,
      resolvedAt: updateData.status === 'resolved' ? new Date().toISOString() : undefined
    });
    
    // Notify involved parties of status change
    const job = await storage.getJob(dispute.jobId);
    if (job && updateData.status) {
      const parties = [job.posterId, job.workerId].filter(Boolean);
      
      for (const partyId of parties) {
        await storage.createNotification({
          userId: partyId!,
          title: 'Dispute Status Updated',
          message: `Dispute #${disputeId} status has been updated to: ${updateData.status}`,
          type: 'dispute_updated',
          sourceId: disputeId,
          sourceType: 'dispute'
        });
      }
    }
    
    res.json(updatedDispute);
  } catch (error) {
    console.error('Error updating dispute:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid update data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to update dispute' });
  }
});

// Add message to dispute
disputeRouter.post('/:id/messages', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id);
    const { message } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message content is required' });
    }
    
    const dispute = await storage.getDispute(disputeId);
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }
    
    // Get the job to check permissions
    const job = await storage.getJob(dispute.jobId);
    if (!job) {
      return res.status(404).json({ message: 'Associated job not found' });
    }
    
    // Only involved parties and admins can add messages
    if (!req.user!.isAdmin && req.user!.id !== job.posterId && req.user!.id !== job.workerId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const disputeMessage = await storage.createDisputeMessage({
      disputeId,
      userId: req.user!.id,
      message: message.trim(),
      createdAt: new Date().toISOString()
    });
    
    res.status(201).json(disputeMessage);
  } catch (error) {
    console.error('Error adding dispute message:', error);
    res.status(500).json({ message: 'Failed to add message' });
  }
});

// Get dispute messages
disputeRouter.get('/:id/messages', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id);
    
    const dispute = await storage.getDispute(disputeId);
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }
    
    // Get the job to check permissions
    const job = await storage.getJob(dispute.jobId);
    if (!job) {
      return res.status(404).json({ message: 'Associated job not found' });
    }
    
    // Only involved parties and admins can view messages
    if (!req.user!.isAdmin && req.user!.id !== job.posterId && req.user!.id !== job.workerId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const messages = await storage.getDisputeMessages(disputeId);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching dispute messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

export { disputeRouter }; 