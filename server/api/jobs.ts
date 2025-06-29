import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { isAuthenticated, optionalAuth } from '../middleware/auth';
import { z } from 'zod';

const jobsRouter = Router();

// Add type definitions  
interface JobRequest extends Request {
  user?: Express.User;
}

jobsRouter.post('/', isAuthenticated, async (req: JobRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }    const {
      title,
      description,
      category,
      location,
      paymentAmount, // Use paymentAmount instead of budget
      duration,
      skills,
      images,
      paymentType,
      hourlyRate,
      latitude,
      longitude,
      address,
      dateNeeded,
      requiredSkills,
      equipmentProvided,
      autoAccept
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !location || !paymentAmount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate payment type and related fields
    if (paymentType === 'hourly' && !hourlyRate) {
      return res.status(400).json({ message: 'Hourly rate is required for hourly jobs' });
    }

    if (paymentType === 'fixed' && !paymentAmount) {
      return res.status(400).json({ message: 'Payment amount is required for fixed-price jobs' });
    }

    // Calculate service fee and total amount
    const serviceFee = 2.5; // Fixed service fee of $2.50
    const totalAmount = paymentAmount + serviceFee;

    // Create the job
    const job = await storage.createJob({
      title,
      description,
      category,
      location,
      paymentAmount: paymentType === 'hourly' ? hourlyRate : paymentAmount,
      paymentType,
      serviceFee,
      totalAmount,
      latitude,
      longitude,
      posterId: req.user.id,
      status: 'pending', // Job starts as pending until payment is processed
      dateNeeded: new Date(dateNeeded),
      requiredSkills: requiredSkills || [],
      equipmentProvided: equipmentProvided || false,
      autoAccept: autoAccept || false
    });

    // Create notification for job poster
    if (job && job.id) {
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
    }

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
    }    // Verify job ownership
    if (!req.user || job.posterId !== req.user.id) {
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
    ];    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {} as any);

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
    }    // Verify job ownership
    if (!req.user || job.posterId !== req.user.id) {
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
    }    const updatedJob = await storage.updateJob(jobId, { 
      status
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

// --------------------------------------------------------
// GET /api/jobs – list jobs with filters
// --------------------------------------------------------
jobsRouter.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status, category, search, posterId } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    let jobs = await storage.getJobs();

    if (status && status !== 'all') jobs = jobs.filter(j => j.status === status);
    if (category && category !== 'all') jobs = jobs.filter(j => j.category === category);
    if (posterId) {
      const posterIdNum = parseInt(posterId);
      if (!isNaN(posterIdNum)) {
        jobs = jobs.filter(j => j.posterId === posterIdNum);
      }
    }
    if (search) {
      const term = search.toLowerCase();
      jobs = jobs.filter(j => j.title.toLowerCase().includes(term) || j.description.toLowerCase().includes(term));
    }

    jobs.sort((a, b) => new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime());
    const start = (pageNum - 1) * limitNum;
    const paginated = jobs.slice(start, start + limitNum);

    res.json({ page: pageNum, total: jobs.length, results: paginated });
  } catch (err) {
    console.error('Jobs list error:', err);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
});

// --------------------------------------------------------
// GET /api/jobs/:id – details
// --------------------------------------------------------
jobsRouter.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  const jobId = parseInt(req.params.id);
  if (isNaN(jobId)) return res.status(400).json({ message: 'Invalid job ID' });
  try {
    const job = await storage.getJob(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (err) {
    console.error('Job detail error:', err);
    res.status(500).json({ message: 'Failed to fetch job' });
  }
});

// --------------------------------------------------------
// DELETE /api/jobs/:id – soft delete
// --------------------------------------------------------
jobsRouter.delete('/:id', isAuthenticated, async (req: Request, res: Response) => {
  const jobId = parseInt(req.params.id);
  if (isNaN(jobId)) return res.status(400).json({ message: 'Invalid job ID' });
  try {
    const job = await storage.getJob(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (!req.user || (req.user.id !== job.posterId && !req.user.isAdmin)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    const updated = await storage.updateJob(jobId, { status: 'cancelled' });
    res.json({ message: 'Job cancelled', job: updated });
  } catch (err) {
    console.error('Job delete error:', err);
    res.status(500).json({ message: 'Failed to cancel job' });
  }
});

// --------------------------------------------------------
// POST /api/jobs/:id/apply – apply to job
// --------------------------------------------------------
jobsRouter.post('/:id/apply', isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  const jobId = parseInt(req.params.id);
  if (isNaN(jobId)) return res.status(400).json({ message: 'Invalid job ID' });
  try {
    const existing = (await storage.getApplicationsByJobId(jobId)).find(a => a.workerId === req.user!.id);
    if (existing) return res.status(400).json({ message: 'You already applied to this job' });
    const application = await storage.createApplication({ jobId, workerId: req.user.id, status: 'pending', message: req.body.message || null } as any);
    res.status(201).json({ message: 'Application submitted', application });
  } catch (err) {
    console.error('Apply error:', err);
    res.status(500).json({ message: 'Failed to apply' });
  }
});

// --------------------------------------------------------
// GET /api/jobs/nearby – get nearby jobs
// --------------------------------------------------------
jobsRouter.get('/nearby', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radius = 25 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const radiusMiles = parseFloat(radius as string);

    if (isNaN(lat) || isNaN(lng) || isNaN(radiusMiles)) {
      return res.status(400).json({ message: 'Invalid coordinates or radius' });
    }

    // Get all active jobs
    const allJobs = await storage.getJobs();
    
    // Filter jobs by distance and status
    const nearbyJobs = allJobs
      .filter(job => {
        // Only show open jobs
        if (job.status !== 'open') return false;
        
        // Calculate distance using Haversine formula
        const R = 3959; // Earth's radius in miles
        const dLat = (job.latitude - lat) * Math.PI / 180;
        const dLon = (job.longitude - lng) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat * Math.PI / 180) * Math.cos(job.latitude * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return distance <= radiusMiles;
      })
      .sort((a, b) => {
        // Sort by date posted (newest first)
        const dateA = new Date(a.datePosted || 0).getTime();
        const dateB = new Date(b.datePosted || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 50); // Limit to 50 results

    res.json(nearbyJobs);
  } catch (err) {
    console.error('Nearby jobs error:', err);
    res.status(500).json({ message: 'Failed to fetch nearby jobs' });
  }
});

// --------------------------------------------------------
// DELETE /api/jobs/:id/apply – withdraw application
// --------------------------------------------------------
jobsRouter.delete('/:id/apply', isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  const jobId = parseInt(req.params.id);
  if (isNaN(jobId)) return res.status(400).json({ message: 'Invalid job ID' });
  try {
    const applications = await storage.getApplicationsByJobId(jobId);
    const appForUser = applications.find(a => a.workerId === req.user!.id);
    if (!appForUser) return res.status(404).json({ message: 'Application not found' });
    await storage.updateApplication(appForUser.id, { status: 'withdrawn' });
    res.json({ message: 'Application withdrawn' });
  } catch (err) {
    console.error('Withdraw error:', err);
    res.status(500).json({ message: 'Failed to withdraw application' });
  }
});

export { jobsRouter };
export default jobsRouter;