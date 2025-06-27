// @ts-nocheck
import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const applicationsRouter = Router();

// Add type definitions

// @ts-nocheck
applicationsRouter.post('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const {
      jobId,
      coverLetter,
      hourlyRate,
      expectedDuration,
      availability
    } = req.body;

    // Validate required fields
    if (!jobId || !coverLetter || !hourlyRate || !expectedDuration) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get the job
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if job is open for applications
    if (job.status !== 'open' && job.status !== 'pending') {
      return res.status(400).json({ message: 'This job is not accepting applications' });
    }

    // Check if user has already applied
    const existingApplication = await storage.getApplicationsByJobId(jobId)
      .then(apps => apps.find(app => app.workerId === req.user.id));

    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied for this job' });
    }

    // Create the application
    const application = await storage.createApplication({
      workerId: req.user.id,
      jobId,
      coverLetter,
      hourlyRate,
      expectedDuration,
      status: 'pending',
      message: null
    });

    // Create notification for job poster
    await storage.createNotification({
      userId: job.posterId,
      title: 'New Application',
      message: `You have received a new application for your job "${job.title}".`,
      type: 'new_application',
      sourceId: application.id,
      sourceType: 'application',
      metadata: {
        jobId,
        applicationId: application.id,
        workerId: req.user.id
      }
    });

    return res.status(201).json({
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    console.error('Application submission error:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to submit application',
      error: error
    });
  }
});

// Instant application endpoint for one-click apply
applicationsRouter.post('/instant', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const {
      jobId,
      workerId,
      message,
      hourlyRate,
      expectedDuration,
      instantApply
    } = req.body;

    // Validate required fields
    if (!jobId || !workerId || !message || !hourlyRate || !expectedDuration) {
      return res.status(400).json({ message: 'Missing required fields for instant application' });
    }

    // Verify the worker is the authenticated user
    if (workerId !== req.user.id) {
      return res.status(403).json({ message: 'You can only apply for jobs as yourself' });
    }

    // Get the job
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if job is open for applications
    if (job.status !== 'open') {
      return res.status(400).json({ message: 'This job is not accepting applications' });
    }

    // Check if user has already applied
    const existingApplication = await storage.getApplicationsByJobId(jobId)
      .then(apps => apps.find(app => app.workerId === req.user.id));

    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied for this job' });
    }

    // Create the instant application
    const application = await storage.createApplication({
      workerId: req.user.id,
      jobId,
      coverLetter: message,
      hourlyRate,
      expectedDuration,
      status: 'pending',
      message: null
    });

    // Create notification for job poster
    await storage.createNotification({
      userId: job.posterId,
      title: '⚡ Instant Application!',
      message: `${req.user.fullName || req.user.username} just applied instantly for your job "${job.title}".`,
      type: 'instant_application',
      sourceId: application.id,
      sourceType: 'application',
      metadata: {
        jobId,
        applicationId: application.id,
        workerId: req.user.id,
        instantApply: true
      }
    });

    return res.status(201).json({
      message: 'Instant application submitted successfully',
      application,
      instant: true
    });
  } catch (error) {
    console.error('Instant application submission error:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to submit instant application',
      error: error
    });
  }
});

// Add application status update endpoint
applicationsRouter.patch('/:id/status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const applicationId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const application = await storage.getApplication(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Get the job to verify ownership
    const job = await storage.getJob(application.jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Verify job ownership
    if (job.posterId !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to update this application' });
    }

    // Validate status transition
    const validTransitions: { [key: string]: string[] } = {
      'pending': ['accepted', 'rejected'],
      'accepted': ['completed', 'cancelled'],
      'rejected': [],
      'completed': [],
      'cancelled': []
    };

    if (!validTransitions[application.status].includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status transition from ${application.status} to ${status}` 
      });
    }

    const updatedApplication = await storage.updateApplication(applicationId, { 
      status
    });

    // Create notification for worker
    await storage.createNotification({
      userId: application.workerId,
      title: 'Application Status Updated',
      message: `Your application for "${job.title}" has been ${status}.`,
      type: 'application_status_updated',
      sourceId: applicationId,
      sourceType: 'application',
      metadata: {
        jobId: job.id,
        applicationId,
        oldStatus: application.status,
        newStatus: status
      }
    });

    // If application is accepted, update job status
    if (status === 'accepted') {
      await storage.updateJob(job.id, {
        status: 'assigned',
        workerId: application.workerId
      });
    }

    return res.status(200).json({
      message: 'Application status updated successfully',
      application: updatedApplication
    });
  } catch (error) {
    console.error('Application status update error:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to update application status',
      error: error
    });
  }
});

// Add application list endpoint
applicationsRouter.get('/job/:jobId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const job = await storage.getJob(jobId);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Verify job ownership
    if (job.posterId !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to view these applications' });
    }

    const applications = await storage.getApplicationsByJobId(jobId);

    // Enhance applications with worker details
    const enhancedApplications = await Promise.all(
      applications.map(async (app) => {
        const worker = await storage.getUser(app.workerId);
        return {
          ...app,
          worker: worker ? {
            id: worker.id,
            username: worker.username,
            fullName: worker.fullName,
            avatarUrl: worker.avatarUrl,
            skills: worker.skills || [],
            rating: worker.rating || 0,
            completedJobs: worker.completedJobs || 0
          } : null
        };
      })
    );

    return res.status(200).json({
      applications: enhancedApplications
    });
  } catch (error) {
    console.error('Application list error:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to fetch applications',
      error: error
    });
  }
});

export default applicationsRouter;