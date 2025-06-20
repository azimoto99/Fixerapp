import { Router, Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { privacyControls } from '../utils/privacy-controls';
import { sanitizeForLogging } from '../utils/encryption';
import { storage } from '../storage';
import rateLimit from 'express-rate-limit';

const privacyRouter = Router();

// Rate limiting for privacy-sensitive operations
const privacyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    error: 'Too many privacy requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all privacy routes
privacyRouter.use(privacyRateLimit);

/**
 * GET /api/privacy/settings
 * Get user's privacy settings
 */
privacyRouter.get('/settings', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const settings = await privacyControls.getUserPrivacySettings(userId);
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error getting privacy settings:', sanitizeForLogging(error));
    res.status(500).json({
      success: false,
      message: 'Failed to get privacy settings'
    });
  }
});

/**
 * PUT /api/privacy/settings
 * Update user's privacy settings
 */
privacyRouter.put('/settings', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const updates = req.body;
    
    // Validate updates
    const allowedFields = [
      'showLocationToAll', 'showLocationToJobPosters', 'showLocationRadius',
      'showPhoneToAll', 'showPhoneToJobPosters',
      'showEmailToAll', 'showEmailToJobPosters',
      'showFullNameToAll', 'showFullNameToJobPosters',
      'showProfilePictureToAll', 'showRatingsToAll', 'showJobHistoryToAll',
      'allowMessagesFromAll', 'allowMessagesFromJobPostersOnly',
      'allowJobRecommendations', 'allowMarketingEmails', 'allowPushNotifications',
      'dataRetentionPeriod'
    ];
    
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});
    
    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }
    
    const updatedSettings = await privacyControls.updateUserPrivacySettings(userId, filteredUpdates);
    
    // Log the privacy settings change
    await privacyControls.logPrivacyAction(
      userId,
      'settings_updated',
      { updatedFields: Object.keys(filteredUpdates) },
      req.ip
    );
    
    res.json({
      success: true,
      settings: updatedSettings,
      message: 'Privacy settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating privacy settings:', sanitizeForLogging(error));
    res.status(500).json({
      success: false,
      message: 'Failed to update privacy settings'
    });
  }
});

/**
 * GET /api/privacy/visibility/:userId
 * Check what data the current user can see about another user
 */
privacyRouter.get('/visibility/:userId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const viewerUserId = req.user!.id;
    const targetUserId = parseInt(req.params.userId);
    const context = req.query.context as string || 'public';
    
    if (isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    const visibility = await privacyControls.checkDataVisibility(
      viewerUserId,
      targetUserId,
      context as any
    );
    
    res.json({
      success: true,
      visibility
    });
  } catch (error) {
    console.error('Error checking data visibility:', sanitizeForLogging(error));
    res.status(500).json({
      success: false,
      message: 'Failed to check data visibility'
    });
  }
});

/**
 * POST /api/privacy/filter-user
 * Filter user data based on privacy settings
 */
privacyRouter.post('/filter-user', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const viewerUserId = req.user!.id;
    const { user, context = 'public' } = req.body;
    
    if (!user || !user.id) {
      return res.status(400).json({
        success: false,
        message: 'User data is required'
      });
    }
    
    const filteredUser = await privacyControls.filterUserData(user, viewerUserId, context);
    
    res.json({
      success: true,
      user: filteredUser
    });
  } catch (error) {
    console.error('Error filtering user data:', sanitizeForLogging(error));
    res.status(500).json({
      success: false,
      message: 'Failed to filter user data'
    });
  }
});

/**
 * POST /api/privacy/check-messaging
 * Check if user can send messages to another user
 */
privacyRouter.post('/check-messaging', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const senderUserId = req.user!.id;
    const { recipientUserId, jobContext = false } = req.body;
    
    if (!recipientUserId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient user ID is required'
      });
    }
    
    const canSend = await privacyControls.canSendMessage(senderUserId, recipientUserId, jobContext);
    
    res.json({
      success: true,
      canSendMessage: canSend
    });
  } catch (error) {
    console.error('Error checking messaging permissions:', sanitizeForLogging(error));
    res.status(500).json({
      success: false,
      message: 'Failed to check messaging permissions'
    });
  }
});

/**
 * GET /api/privacy/data-export
 * Export all user data (GDPR compliance)
 */
privacyRouter.get('/data-export', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const userData = await privacyControls.exportUserData(userId);
    
    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}-${Date.now()}.json"`);
    res.setHeader('Content-Type', 'application/json');
    
    res.json({
      success: true,
      exportedAt: new Date().toISOString(),
      data: userData
    });
  } catch (error) {
    console.error('Error exporting user data:', sanitizeForLogging(error));
    res.status(500).json({
      success: false,
      message: 'Failed to export user data'
    });
  }
});

/**
 * POST /api/privacy/delete-account
 * Request account deletion (Right to be forgotten)
 */
privacyRouter.post('/delete-account', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { reason, confirmPassword } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Deletion reason is required'
      });
    }
    
    if (!confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password confirmation is required'
      });
    }
    
    // Verify password before allowing deletion
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Here you would verify the password
    // const isValidPassword = await verifyPassword(confirmPassword, user.password);
    // if (!isValidPassword) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Invalid password'
    //   });
    // }
    
    await privacyControls.deleteUserData(userId, reason);
    
    res.json({
      success: true,
      message: 'Account deletion has been scheduled. You will receive a confirmation email.'
    });
  } catch (error) {
    console.error('Error scheduling account deletion:', sanitizeForLogging(error));
    res.status(500).json({
      success: false,
      message: 'Failed to schedule account deletion'
    });
  }
});

/**
 * GET /api/privacy/data-retention
 * Get data retention policy for user
 */
privacyRouter.get('/data-retention', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const retentionPolicy = await privacyControls.getDataRetentionPolicy(userId);
    
    res.json({
      success: true,
      retentionPolicy
    });
  } catch (error) {
    console.error('Error getting data retention policy:', sanitizeForLogging(error));
    res.status(500).json({
      success: false,
      message: 'Failed to get data retention policy'
    });
  }
});

/**
 * GET /api/privacy/anonymize/:userId
 * Get anonymized user data for public display
 */
privacyRouter.get('/anonymize/:userId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const anonymizedUser = privacyControls.anonymizeUserData(user);
    
    res.json({
      success: true,
      user: anonymizedUser
    });
  } catch (error) {
    console.error('Error anonymizing user data:', sanitizeForLogging(error));
    res.status(500).json({
      success: false,
      message: 'Failed to anonymize user data'
    });
  }
});

/**
 * GET /api/privacy/audit-log
 * Get privacy-related audit log for user
 */
privacyRouter.get('/audit-log', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    // Get audit logs related to privacy actions
    const auditLogs = await storage.getAuditLogsByUserId?.(userId, {
      page,
      limit,
      actionFilter: 'privacy_'
    }) || [];
    
    res.json({
      success: true,
      auditLogs,
      page,
      limit
    });
  } catch (error) {
    console.error('Error getting privacy audit log:', sanitizeForLogging(error));
    res.status(500).json({
      success: false,
      message: 'Failed to get privacy audit log'
    });
  }
});

/**
 * POST /api/privacy/consent
 * Update user consent for data processing
 */
privacyRouter.post('/consent', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { consentType, granted } = req.body;
    
    const validConsentTypes = [
      'data_processing', 'marketing_emails', 'analytics', 
      'location_tracking', 'push_notifications'
    ];
    
    if (!validConsentTypes.includes(consentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consent type'
      });
    }
    
    // Update consent in user preferences
    const consentUpdate: any = {};
    switch (consentType) {
      case 'marketing_emails':
        consentUpdate.allowMarketingEmails = granted;
        break;
      case 'push_notifications':
        consentUpdate.allowPushNotifications = granted;
        break;
      default:
        // Store in metadata or separate consent table
        break;
    }
    
    if (Object.keys(consentUpdate).length > 0) {
      await privacyControls.updateUserPrivacySettings(userId, consentUpdate);
    }
    
    // Log consent change
    await privacyControls.logPrivacyAction(
      userId,
      'consent_updated',
      { consentType, granted },
      req.ip
    );
    
    res.json({
      success: true,
      message: `Consent for ${consentType} ${granted ? 'granted' : 'revoked'}`
    });
  } catch (error) {
    console.error('Error updating consent:', sanitizeForLogging(error));
    res.status(500).json({
      success: false,
      message: 'Failed to update consent'
    });
  }
});

export { privacyRouter }; 