import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { PREDEFINED_AVATARS } from '../../shared/constants.js';
import { storage } from '../storage/index.js';

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
    const { avatarName } = req.body;
    
    // Validate avatar name
    if (!avatarName || !PREDEFINED_AVATARS.includes(avatarName as any)) {
      return res.status(400).json({
        error: 'Invalid avatar',
        message: 'Please select a valid avatar'
      });
    }
    
    // Update user profile with new avatar URL
    const avatarUrl = `/avatars/${avatarName}`;
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