import express from 'express';
import { requireAuth } from '../middleware/auth';
import { PREDEFINED_AVATARS } from '../../shared/constants';
import { storage } from '../storage';

const router = express.Router();

/**
 * Update user's avatar
 * POST /api/user/avatar
 * This endpoint works with the unified storage system to update the user's profile picture.
 */
router.post('/avatar', requireAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const { avatarName, customAvatar } = req.body;
    
    let avatarUrl = '';
    // Handle predefined avatar
    if (avatarName) {
      // Validate avatar name
      if (!avatarName || !PREDEFINED_AVATARS.includes(avatarName as any)) {
        return res.status(400).json({
          error: 'Invalid avatar',
          message: 'Please select a valid avatar'
        });
      }
      avatarUrl = `/avatars/${avatarName}`;
    } else if (customAvatar) {
      // Handle custom avatar upload (placeholder for actual upload logic)
      // In a real implementation, you would upload to S3 or another storage service
      avatarUrl = `/custom-avatars/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      console.log('Custom avatar upload placeholder:', customAvatar);
    } else {
      return res.status(400).json({
        error: 'No avatar provided',
        message: 'Please provide an avatar name or custom avatar data'
      });
    }
    
    // Update user profile with new avatar URL
    const updatedUser = await storage.updateUser(req.user.id, {
      avatarUrl
    });
    
    if (!updatedUser) {
      return res.status(500).json({
        message: 'Failed to update avatar'
      });
    }
    
    res.json({
      message: 'Avatar updated successfully',
      avatarUrl,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        avatarUrl: updatedUser.avatarUrl
      }
    });
  } catch (error) {
    console.error('Avatar update error:', error);
    res.status(500).json({
      message: 'Failed to update avatar. Please try again.'
    });
  }
});

export default router; 