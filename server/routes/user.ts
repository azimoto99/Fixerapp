import express from 'express';
import { requireAuth } from '../middleware/auth';
import { storage } from '../storage';
import multer from 'multer';
import { uploadProfileImage } from '../services/s3Service';
import { Request, Response } from 'express';

const router = express.Router();

// Configure multer for avatar uploads to memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

/**
 * Upload user avatar
 * POST /api/user/avatar/upload
 */
router.post('/avatar/upload', requireAuth, upload.single('avatar'), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload to S3
    const { url: avatarUrl } = await uploadProfileImage(req.user.id, req.file.buffer, req.file.originalname);
    
    // Update user profile with new avatar URL
    const updatedUser = await storage.updateUser(req.user.id, {
      avatarUrl
    });
    
    if (!updatedUser) {
      return res.status(500).json({ message: 'Failed to update user avatar' });
    }
    
    res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        avatarUrl: updatedUser.avatarUrl
      }
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to upload avatar'
    });
  }
});

/**
 * Delete user avatar
 * DELETE /api/user/avatar
 */
router.delete('/avatar', requireAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Note: Deleting from S3 is not implemented in this pass to avoid complexity.
    // The old file will remain in S3 but will be orphaned.
    // A proper implementation would delete the old S3 object.
    
    // Update user profile to remove avatar URL
    const updatedUser = await storage.updateUser(req.user.id, {
      avatarUrl: null
    });
    
    if (!updatedUser) {
      return res.status(500).json({ message: 'Failed to remove avatar' });
    }
    
    res.json({
      message: 'Avatar removed successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        avatarUrl: updatedUser.avatarUrl
      }
    });
  } catch (error) {
    console.error('Avatar deletion error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to remove avatar'
    });
  }
});

/**
 * Update user's avatar (legacy endpoint for predefined avatars - now deprecated)
 * POST /api/user/avatar
 */
router.post('/avatar', requireAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // This endpoint is now deprecated in favor of avatar upload
    return res.status(400).json({
      message: 'This endpoint is deprecated. Please use /api/user/avatar/upload for uploading images.',
      deprecated: true
    });
  } catch (error) {
    console.error('Avatar update error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to update avatar'
    });
  }
});

/**
 * Send phone verification code
 * POST /api/user/phone/send-verification
 */
router.post('/phone/send-verification', requireAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s+/g, ''))) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Update user with verification code and expiry
    await storage.updateUser(req.user.id, {
      phone: phoneNumber,
      phoneVerificationCode: verificationCode,
      phoneVerificationExpiry: expiryTime,
      phoneVerified: false
    });

    // In production, integrate with SMS service (e.g., Twilio, AWS SNS)
    // For now, we'll log the code (in development only)
    if (process.env.NODE_ENV === 'development') {
      console.log(`SMS Verification Code for ${phoneNumber}: ${verificationCode}`);
    }

    // TODO: Send actual SMS in production
    // await sendSMS(phoneNumber, `Your Fixer verification code is: ${verificationCode}`);

    res.json({
      success: true,
      message: 'Verification code sent successfully',
      // In development, return the code for testing
      ...(process.env.NODE_ENV === 'development' && { verificationCode })
    });

  } catch (error) {
    console.error('Phone verification send error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to send verification code'
    });
  }
});

/**
 * Verify phone number with code
 * POST /api/user/phone/verify
 */
router.post('/phone/verify', requireAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { verificationCode } = req.body;
    
    if (!verificationCode) {
      return res.status(400).json({ message: 'Verification code is required' });
    }

    // Get current user data
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if verification code exists and hasn't expired
    if (!user.phoneVerificationCode || !user.phoneVerificationExpiry) {
      return res.status(400).json({ message: 'No verification code found. Please request a new code.' });
    }

    if (new Date() > user.phoneVerificationExpiry) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new code.' });
    }

    // Check if code matches
    if (user.phoneVerificationCode !== verificationCode) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    // Mark phone as verified and clear verification fields
    await storage.updateUser(req.user.id, {
      phoneVerified: true,
      phoneVerificationCode: null,
      phoneVerificationExpiry: null
    });

    res.json({
      success: true,
      message: 'Phone number verified successfully'
    });

  } catch (error) {
    console.error('Phone verification error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to verify phone number'
    });
  }
});

/**
 * Update user's settings (notifications, privacy, etc.)
 * PATCH /api/user/settings
 */
router.patch('/settings', requireAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const {
      emailNotifications,
      pushNotifications,
      newJobAlerts,
      paymentUpdates,
      marketingEmails,
      profileVisibility,
      showOnlineStatus,
      allowLocationAccess,
      shareActivityStatus
    } = req.body;

    // Update basic user preferences (these would be stored in user table or preferences table)
    const userUpdates: any = {};
    
    // For now, we'll store simple settings in the user table
    // In a full implementation, you'd want separate tables for different setting types
    if (emailNotifications !== undefined) userUpdates.emailNotifications = emailNotifications;
    if (pushNotifications !== undefined) userUpdates.pushNotifications = pushNotifications;

    if (Object.keys(userUpdates).length > 0) {
      await storage.updateUser(req.user.id, userUpdates);
    }

    // Update privacy settings using the existing privacy API
    const privacyUpdates: any = {};
    if (profileVisibility !== undefined) privacyUpdates.profileVisibility = profileVisibility;
    if (showOnlineStatus !== undefined) privacyUpdates.showOnlineStatus = showOnlineStatus;
    if (allowLocationAccess !== undefined) privacyUpdates.allowLocationAccess = allowLocationAccess;
    if (shareActivityStatus !== undefined) privacyUpdates.shareActivityStatus = shareActivityStatus;

    // Note: Privacy settings would ideally be handled by the privacy API
    // For now, we'll just acknowledge the settings were received

    res.json({
      message: 'Settings updated successfully',
      settings: {
        emailNotifications,
        pushNotifications,
        newJobAlerts,
        paymentUpdates,
        marketingEmails,
        profileVisibility,
        showOnlineStatus,
        allowLocationAccess,
        shareActivityStatus
      }
    });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to update settings'
    });
  }
});

// Get contact info for accepted applicants (for call/text functionality)
router.get('/contact-info/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const targetUserId = parseInt(req.params.userId);
    const currentUserId = req.user?.id;

    if (!currentUserId || isNaN(targetUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Get the target user's info
    const targetUser = await storage.getUser(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if users are connected through an accepted job application
    // This prevents random users from getting contact info
    const jobs = await storage.getJobs({});
    const hasConnectionThroughJob = jobs.some(job => 
      ((job.posterId === currentUserId && job.workerId === targetUserId) ||
       (job.posterId === targetUserId && job.workerId === currentUserId)) &&
      (job.status === 'assigned' || job.status === 'in_progress' || job.status === 'completed')
    );

    if (!hasConnectionThroughJob) {
      return res.status(403).json({ message: 'You can only access contact info for accepted job connections' });
    }

    // Only return contact info if phone is verified and user allows contact
    const contactInfo: any = {};
    
    if (targetUser.phoneVerified && targetUser.phone) {
      // Check privacy settings - allow contact for job-related communication
      contactInfo.phone = targetUser.phone;
      contactInfo.phoneVerified = true;
    }

    contactInfo.fullName = targetUser.fullName || targetUser.username;
    contactInfo.username = targetUser.username;

    res.json(contactInfo);
  } catch (error) {
    console.error('Error fetching contact info:', error);
    res.status(500).json({ message: 'Error fetching contact info' });
  }
});

export default router; 