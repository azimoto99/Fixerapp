import express from 'express';
import { requireAuth } from '../middleware/auth';
import { Storage } from '../storage/DatabaseStorageV2';
import { z } from 'zod';
import { validateRequest } from 'zod-express-middleware';

const router = express.Router();

const privacySettingsSchema = z.object({
  showLocation: z.boolean(),
  showProfile: z.boolean(),
});

router.post(
  '/privacy',
  requireAuth,
  validateRequest({ body: privacySettingsSchema }),
  async (req, res) => {
    const { id: userId } = req.user;
    const { showLocation, showProfile } = req.body;

    try {
      const settings = await Storage.upsertUserPrivacySettings(userId, {
        show_location: showLocation,
        show_profile: showProfile,
      });
      res.status(200).json(settings);
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
      res.status(500).json({ message: 'Failed to update privacy settings' });
    }
  }
);

router.get('/privacy', requireAuth, async (req, res) => {
  const { id: userId } = req.user;

  try {
    const settings = await Storage.getUserPrivacySettings(userId);
    if (settings) {
      res.status(200).json(settings);
    } else {
      res.status(404).json({ message: 'Privacy settings not found' });
    }
  } catch (error) {
    console.error('Failed to fetch privacy settings:', error);
    res.status(500).json({ message: 'Failed to fetch privacy settings' });
  }
});

export default router; 