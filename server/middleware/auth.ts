import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Extend Request type to include user
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      fullName?: string;
      isAdmin?: boolean;
      stripeCustomerId?: string;
      stripeConnectAccountId?: string;
      isActive: boolean;
    }
  }
}

/**
 * Enhanced authentication middleware with backup session support
 */
export async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  try {
    // Check if session exists
    if (!req.session) {
      console.error('No session object found on request');
      return res.status(401).json({ 
        success: false,
        message: 'Session unavailable',
        code: 'NO_SESSION'
      });
    }

    // Check for expired session cookie
    const hasCookieExpired = req.session.cookie && req.session.cookie.maxAge <= 0;
    if (hasCookieExpired) {
      return res.status(401).json({ 
        success: false,
        message: 'Session expired, please login again',
        code: 'SESSION_EXPIRED'
      });
    }

    // Method 1: Standard Passport authentication
    if (req.isAuthenticated() && req.user) {
      try {
        // Verify user still exists and is active (with timeout protection)
        const currentUser = await Promise.race([
          storage.getUser(req.user.id),
          new Promise<undefined>((_, reject) =>
            setTimeout(() => reject(new Error('User lookup timeout')), 5000)
          )
        ]);

        if (!currentUser || !currentUser.isActive) {
          req.logout((err) => {
            if (err) console.error('Error during logout:', err);
          });
          return res.status(401).json({
            success: false,
            message: 'User account no longer active',
            code: 'USER_INACTIVE'
          });
        }

        // Refresh session to prevent premature expiration
        req.session.touch();
        return next();
      } catch (error: any) {
        // Handle timeout errors gracefully
        if (error.message?.includes('timeout')) {
          console.warn(`⏰ User validation timeout for user ${req.user.id}, allowing access`);
          return next(); // Allow access on timeout to prevent lockouts
        }

        console.error('Error validating authenticated user:', error);
        return res.status(500).json({
          success: false,
          message: 'Error validating authentication',
          code: 'AUTH_VALIDATION_ERROR'
        });
      }
    }

    // Method 2: Backup authentication via userId in session
    if (req.session.userId) {
      try {
        const user = await storage.getUser(req.session.userId);
        if (!user || !user.isActive) {
          return res.status(401).json({ 
            success: false,
            message: 'User account not found or inactive',
            code: 'USER_NOT_FOUND'
          });
        }

        // Restore the session
        req.login(user, (err) => {
          if (err) {
            console.error('Failed to restore session:', err);
            return res.status(401).json({ 
              success: false,
              message: 'Session restoration failed',
              code: 'SESSION_RESTORE_ERROR'
            });
          }
          return next();
        });
        return;
      } catch (err) {
        console.error('Error restoring session:', err);
        return res.status(401).json({ 
          success: false,
          message: 'Database error during authentication',
          code: 'DB_ERROR'
        });
      }
    }

    // Authentication failed
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal authentication error',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Admin-only authentication middleware
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    // First check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Direct admin access for user ID 20 (verified admin)
    if (req.user.id === 20) {
      return next();
    }

    // Check if user has admin privileges
    const user = await storage.getUser(req.user.id);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ 
        success: false,
        message: 'Admin access required',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error verifying admin privileges',
      code: 'ADMIN_CHECK_ERROR'
    });
  }
}

/**
 * Optional authentication middleware - doesn't fail if not authenticated
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.isAuthenticated() && req.user) {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser && currentUser.isActive) {
        req.session.touch();
      }
    }
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue even if there's an error
  }
}

export { isAuthenticated as requireAuth };