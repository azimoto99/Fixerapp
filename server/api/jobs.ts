import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../middleware/auth';

const jobsRouter = Router();

// Add type definitions
interface JobRequest extends Request {
  user?: {
    id: number;
  };
}

interface JobResponse extends Response {
  json: (body: any) => JobResponse;
}

jobsRouter.post('/', isAuthenticated, async (req: JobRequest, res: JobResponse) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const {
      title,
      description,
      category,
      location,
      budget,
      duration,
      skills,
      images,
      paymentType,
      hourlyRate,
      latitude,
      longitude,
      address
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !location || !budget) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate payment type and related fields
    if (paymentType === 'hourly' && !hourlyRate) {
      return res.status(400).json({ message: 'Hourly rate is required for hourly jobs' });
    }

    if (paymentType === 'fixed' && !budget) {
      return res.status(400).json({ message: 'Budget is required for fixed-price jobs' });
    }

    // Create the job
    const job = await storage.createJob({
      title,
      description,
      category,
      location,
      budget: paymentType === 'hourly' ? hourlyRate : budget,
      duration,
      skills,
      images,
      paymentType,
      hourlyRate,
      latitude,
      longitude,
      address,
      posterId: req.user.id,
      status: 'pending', // Job starts as pending until payment is processed
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create notification for job poster
    await storage.createNotification({
      userId: req.user.id,
      title: 'Job Created',
      message: `Your job "${title}" has been created successfully. Please complete the payment to make it visible to workers.`,
      type: 'job_created',
      sourceId: job.id,
      sourceType: 'job',
      metadata: {
        jobId: job.id,
        status: 'pending'
      }
    });

    return res.status(201).json({
      message: 'Job created successfully',
      job
    });
  } catch (error) {
    console.error('Job creation error:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to create job',
      error: error
    });
  }
});

// Add job update endpoint
jobsRouter.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const job = await storage.getJob(jobId);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Verify job ownership
    if (job.posterId !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to update this job' });
    }

    // Only allow updates to certain fields
    const allowedUpdates = [
      'title',
      'description',
      'category',
      'location',
      'budget',
      'duration',
      'skills',
      'images',
      'hourlyRate',
      'latitude',
      'longitude',
      'address'
    ];

    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {} as any);

    updates.updatedAt = new Date();

    const updatedJob = await storage.updateJob(jobId, updates);

    return res.status(200).json({
      message: 'Job updated successfully',
      job: updatedJob
    });
  } catch (error) {
    console.error('Job update error:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to update job',
      error: error
    });
  }
});

// Add job status update endpoint
jobsRouter.patch('/:id/status', isAuthenticated, async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Verify job ownership
    if (job.posterId !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to update this job' });
    }

    // Validate status transition
    const validTransitions: { [key: string]: string[] } = {
      'pending': ['open', 'cancelled'],
      'open': ['assigned', 'cancelled'],
      'assigned': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'cancelled'],
      'completed': ['closed'],
      'cancelled': [],
      'closed': []
    };

    if (!validTransitions[job.status].includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status transition from ${job.status} to ${status}` 
      });
    }

    const updatedJob = await storage.updateJob(jobId, { 
      status,
      updatedAt: new Date()
    });

    // Create notification for status change
    await storage.createNotification({
      userId: job.posterId,
      title: 'Job Status Updated',
      message: `Your job "${job.title}" status has been updated to ${status}.`,
      type: 'job_status_updated',
      sourceId: jobId,
      sourceType: 'job',
      metadata: {
        jobId,
        oldStatus: job.status,
        newStatus: status
      }
    });

    // If job is assigned, notify the worker
    if (status === 'assigned' && job.workerId) {
      await storage.createNotification({
        userId: job.workerId,
        title: 'Job Assigned',
        message: `You have been assigned to the job "${job.title}".`,
        type: 'job_assigned',
        sourceId: jobId,
        sourceType: 'job',
        metadata: {
          jobId,
          posterId: job.posterId
        }
      });
    }

    return res.status(200).json({
      message: 'Job status updated successfully',
      job: updatedJob
    });
  } catch (error) {
    console.error('Job status update error:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to update job status',
      error: error
    });
  }
}); 