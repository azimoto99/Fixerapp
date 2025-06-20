import express from 'express';
import { requireAuth } from '../middleware/auth';
import { storage } from '../storage';
import multer from 'multer';
import { uploadProfileImage } from '../services/s3Service';

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

export default router; 