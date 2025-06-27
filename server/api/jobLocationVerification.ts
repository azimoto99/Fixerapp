import { Router, Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { LocationVerificationService } from '../services/locationVerificationService';
import { storage } from '../storage';
import { body, validationResult } from 'express-validator';

const router = Router();

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    isAdmin: boolean;
  };
}

/**
 * Start a job with location verification
 * POST /api/jobs/:jobId/start-with-location
 */
router.post(
  '/:jobId/start-with-location',
  isAuthenticated,
  [
    body('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    body('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    body('accuracy')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Accuracy must be a positive number'),
    body('timestamp')
      .isISO8601()
      .withMessage('Timestamp must be a valid ISO 8601 date'),
    body('source')
      .optional()
      .isIn(['gps', 'network', 'ip'])
      .withMessage('Source must be gps, network, or ip'),
    body('deviceInfo')
      .optional()
      .isObject()
      .withMessage('Device info must be an object')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: errors.array()
        });
      }

      const jobId = parseInt(req.params.jobId);
      if (isNaN(jobId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid job ID'
        });
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const {
        latitude,
        longitude,
        accuracy,
        timestamp,
        source = 'gps',
        deviceInfo
      } = req.body;

      // Get job details
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Verify user is the assigned worker
      if (job.workerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this job'
        });
      }

      // Check job status
      if (job.status !== 'assigned') {
        return res.status(400).json({
          success: false,
          message: `Cannot start job with status: ${job.status}. Job must be in 'assigned' status.`
        });
      }

      // Verify location
      const verificationResult = await LocationVerificationService.verifyJobStartLocation(
        {
          jobId,
          workerId: req.user.id,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          accuracy: accuracy ? parseFloat(accuracy) : undefined,
          timestamp: new Date(timestamp),
          source,
          deviceInfo
        },
        req
      );

      // Check if location verification passed
      if (!verificationResult.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Location verification failed',
          details: {
            confidence: verificationResult.confidence,
            distance: verificationResult.distance,
            reasons: verificationResult.reasons
          }
        });
      }

      // If verification passed but with low confidence, require additional confirmation
      if (verificationResult.confidence === 'low') {
        // Store pending verification for manual review
        await storage.createNotification({
          userId: job.posterId,
          type: 'location_verification_warning',
          title: 'Worker Location Verification Warning',
          message: `Worker started job with low confidence location verification. Distance: ${Math.round(verificationResult.distance)}m. Reasons: ${verificationResult.reasons.join(', ')}`,
          sourceId: jobId,
          sourceType: 'job'
        });
      }

      // Update job status to in_progress
      const updatedJob = await storage.updateJob(jobId, {
        status: 'in_progress',
        startedAt: new Date(),
        workerStartLocation: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          accuracy,
          timestamp: new Date(timestamp),
          verificationResult
        }
      });

      // Create notification for job poster
      await storage.createNotification({
        userId: job.posterId,
        type: 'job_started',
        title: 'Job Started',
        message: `Worker has started working on your job: ${job.title}`,
        sourceId: jobId,
        sourceType: 'job'
      });

      // Log successful job start
      console.log(`Job ${jobId} started by worker ${req.user.id} with location verification:`, {
        confidence: verificationResult.confidence,
        distance: verificationResult.distance,
        accuracy: verificationResult.accuracy
      });

      res.json({
        success: true,
        message: 'Job started successfully',
        job: updatedJob,
        locationVerification: {
          confidence: verificationResult.confidence,
          distance: verificationResult.distance,
          accuracy: verificationResult.accuracy
        }
      });

    } catch (error) {
      console.error('Job start with location verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during job start'
      });
    }
  }
);

/**
 * Verify ongoing job location (periodic check)
 * POST /api/jobs/:jobId/verify-location
 */
router.post(
  '/:jobId/verify-location',
  isAuthenticated,
  [
    body('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    body('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    body('accuracy')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Accuracy must be a positive number')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: errors.array()
        });
      }

      const jobId = parseInt(req.params.jobId);
      if (isNaN(jobId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid job ID'
        });
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const { latitude, longitude, accuracy } = req.body;

      // Get job details
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Verify user is the assigned worker
      if (job.workerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this job'
        });
      }

      // Check job status
      if (job.status !== 'in_progress') {
        return res.status(400).json({
          success: false,
          message: 'Job is not in progress'
        });
      }

      // Verify ongoing location
      const verificationResult = await LocationVerificationService.verifyOngoingJobLocation(
        jobId,
        req.user.id,
        parseFloat(latitude),
        parseFloat(longitude),
        accuracy ? parseFloat(accuracy) : undefined
      );

      // If location verification fails, create alert
      if (!verificationResult.isValid) {
        await storage.createNotification({
          userId: job.posterId,
          type: 'location_verification_failed',
          title: 'Worker Location Verification Failed',
          message: `Worker location verification failed during job. Distance: ${Math.round(verificationResult.distance)}m from job site.`,
          sourceId: jobId,
          sourceType: 'job'
        });
      }

      res.json({
        success: true,
        locationVerification: {
          isValid: verificationResult.isValid,
          confidence: verificationResult.confidence,
          distance: verificationResult.distance,
          accuracy: verificationResult.accuracy,
          reasons: verificationResult.reasons
        }
      });

    } catch (error) {
      console.error('Location verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during location verification'
      });
    }
  }
);

/**
 * Get location verification history for a job
 * GET /api/jobs/:jobId/location-history
 */
router.get(
  '/:jobId/location-history',
  isAuthenticated,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const jobId = parseInt(req.params.jobId);
      if (isNaN(jobId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid job ID'
        });
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Get job details
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Verify user has access (job poster or assigned worker)
      if (job.posterId !== req.user.id && job.workerId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // This would fetch from location_verifications table
      // For now, return placeholder data
      const locationHistory = [
        {
          timestamp: job.startedAt,
          latitude: job.workerStartLocation?.latitude,
          longitude: job.workerStartLocation?.longitude,
          accuracy: job.workerStartLocation?.accuracy,
          confidence: job.workerStartLocation?.verificationResult?.confidence,
          distance: job.workerStartLocation?.verificationResult?.distance,
          type: 'job_start'
        }
      ].filter(entry => entry.latitude && entry.longitude);

      res.json({
        success: true,
        jobId,
        locationHistory
      });

    } catch (error) {
      console.error('Location history fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

export default router;
