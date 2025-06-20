import express from 'express';
import { requireAuth } from '../middleware/auth';
import { storage } from '../storage';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for avatar uploads
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/avatars';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `user-${req.user?.id}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage_multer,
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

    // Build avatar URL
    const avatarUrl = `/avatars/${req.file.filename}`;
    
    // Update user profile with new avatar URL
    const updatedUser = await storage.updateUser(req.user.id, {
      avatarUrl
    });
    
    if (!updatedUser) {
      // Clean up uploaded file if user update fails
      fs.unlinkSync(req.file.path);
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
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
    }
    
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

    // Delete old avatar file if it exists and is a custom upload
    if (user.avatarUrl && user.avatarUrl.startsWith('/avatars/user-')) {
      const filePath = `public${user.avatarUrl}`;
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileError) {
        console.error('Error deleting avatar file:', fileError);
      }
    }
    
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