import { Router, Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { storage } from '../storage';
import { body, validationResult } from 'express-validator';
import { User } from '../types';

const router = Router();

interface AuthenticatedRequest extends Request {
  user?: User;
}

/**
 * Switch between existing account types for the same email
 * POST /api/auth/switch-account-type
 */
router.post(
  '/switch-account-type',
  isAuthenticated,
  [
    body('targetAccountType')
      .isIn(['worker', 'poster', 'enterprise'])
      .withMessage('Invalid account type'),
    body('createIfNotExists')
      .optional()
      .isBoolean()
      .withMessage('createIfNotExists must be a boolean')
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

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const { targetAccountType, createIfNotExists = false } = req.body;
      const currentUser = req.user;

      // Check if user already has the target account type
      if (currentUser.accountType === targetAccountType) {
        return res.json({
          success: true,
          message: 'Already using this account type',
          user: currentUser
        });
      }

      // Look for existing account with same email and target account type
      const existingAccount = await storage.getUserByEmailAndAccountType(
        currentUser.email,
        targetAccountType
      );

      if (existingAccount) {
        // Switch to existing account
        // Update session or return account info for client-side switch
        return res.json({
          success: true,
          message: 'Switched to existing account',
          user: existingAccount,
          switched: true
        });
      } else if (createIfNotExists) {
        // Create new account with same email but different account type
        const newAccount = await storage.createUser({
          username: `${currentUser.username}_${targetAccountType}`,
          email: currentUser.email,
          fullName: (currentUser as any).fullName || currentUser.username,
          accountType: targetAccountType,
          password: '', // Will be handled by OAuth or existing auth
          isActive: true
        });

        return res.json({
          success: true,
          message: 'New account created and switched',
          user: newAccount,
          created: true
        });
      } else {
        return res.status(404).json({
          success: false,
          message: `No ${targetAccountType} account found for this email. Set createIfNotExists=true to create one.`
        });
      }

    } catch (error) {
      console.error('Account type switch error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during account switch'
      });
    }
  }
);

/**
 * Create a new account type for the current user's email
 * POST /api/auth/create-account-type
 */
router.post(
  '/create-account-type',
  isAuthenticated,
  [
    body('accountType')
      .isIn(['worker', 'poster', 'enterprise'])
      .withMessage('Invalid account type'),
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
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

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const { accountType, email } = req.body;
      const currentUser = req.user;

      // Verify email matches current user
      if (email !== currentUser.email) {
        return res.status(403).json({
          success: false,
          message: 'Can only create accounts for your own email'
        });
      }

      // Check if account already exists
      const existingAccount = await storage.getUserByEmailAndAccountType(email, accountType);
      if (existingAccount) {
        return res.status(400).json({
          success: false,
          message: `${accountType} account already exists for this email`
        });
      }

      // Create new account
      const newAccount = await storage.createUser({
        username: `${currentUser.username}_${accountType}`,
        email: email,
        fullName: (currentUser as any).fullName || currentUser.username,
        accountType: accountType,
        password: '', // OAuth or existing auth will handle this
        isActive: true,
        // Copy some profile data from current account
        bio: (currentUser as any).bio || '',
        phone: (currentUser as any).phone || '',
        avatarUrl: (currentUser as any).avatarUrl || null
      });

      // Create notification for the new account
      await storage.createNotification({
        userId: newAccount.id,
        type: 'account_created',
        title: 'Welcome to Fixer!',
        message: `Your ${accountType} account has been created successfully.`,
        sourceId: newAccount.id,
        sourceType: 'user'
      });

      res.json({
        success: true,
        message: `${accountType} account created successfully`,
        user: newAccount
      });

    } catch (error) {
      console.error('Account creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during account creation'
      });
    }
  }
);

/**
 * Get all accounts for the current user's email
 * GET /api/auth/my-accounts
 */
router.get('/my-accounts', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const accounts = await storage.getUsersByEmail(req.user.email);
    
    // Remove sensitive information
    const safeAccounts = accounts.map(account => ({
      id: account.id,
      username: account.username,
      email: account.email,
      fullName: account.fullName,
      accountType: account.accountType,
      avatarUrl: account.avatarUrl,
      isActive: account.isActive,
      createdAt: account.createdAt
    }));

    res.json({
      success: true,
      accounts: safeAccounts,
      currentAccountId: req.user.id
    });

  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Update account type preferences
 * PUT /api/auth/account-preferences
 */
router.put(
  '/account-preferences',
  isAuthenticated,
  [
    body('defaultAccountType')
      .optional()
      .isIn(['worker', 'poster', 'enterprise'])
      .withMessage('Invalid default account type'),
    body('autoSwitchEnabled')
      .optional()
      .isBoolean()
      .withMessage('autoSwitchEnabled must be a boolean')
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

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const { defaultAccountType, autoSwitchEnabled } = req.body;

      // Update user preferences (this would be stored in a preferences table)
      const updatedUser = await storage.updateUser(req.user.id, {
        // Store preferences in a JSON field or separate table
        // preferences: {
        //   defaultAccountType,
        //   autoSwitchEnabled,
        //   ...((req.user as any).preferences || {})
        // }
        // For now, just update basic user info since preferences field doesn't exist
        accountType: defaultAccountType
      });

      res.json({
        success: true,
        message: 'Preferences updated successfully',
        user: updatedUser
      });

    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

export default router;
