import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { PREDEFINED_AVATARS } from '../../client/src/components/AvatarPicker.js';

const router = express.Router();

/**
 * Update user's avatar
 * POST /api/user/avatar
 */
router.post('/avatar', requireAuth, async (req, res) => {
  try {
    const { avatarName } = req.body;
    const userId = req.user!.id;

    // Validate avatar name
    if (!avatarName || !PREDEFINED_AVATARS.includes(avatarName)) {
      return res.status(400).json({
        error: 'Invalid avatar',
        message: 'Please select a valid avatar'
      });
    }

    // Update user profile with new avatar URL
    const avatarUrl = `/avatars/${avatarName}`;
    const updatedUser = await req.storage.updateUser(userId, {
      avatarUrl
    });

    if (!updatedUser) {
      return res.status(500).json({
        error: 'Update failed',
        message: 'Failed to update avatar'
      });
    }

    res.json({
      success: true,
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
      error: 'Update failed',
      message: 'Failed to update avatar. Please try again.'
    });
  }
});

export default router; 