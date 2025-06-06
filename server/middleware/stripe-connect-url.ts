import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

export interface StripeURLConfig {
  baseURL: string;
  refreshPath: string;
  returnPath: string;
}

/**
 * Middleware to ensure proper URL handling for Stripe Connect endpoints
 */
export function stripeURLMiddleware(config: Partial<StripeURLConfig> = {}) {
  // Log middleware initialization
  console.log('[STRIPE URL MIDDLEWARE] Initializing with APP_URL:', process.env.APP_URL);
  
  const defaults: StripeURLConfig = {
    baseURL: process.env.APP_URL || '',
    refreshPath: '/dashboard/connect/refresh',
    returnPath: '/dashboard/connect/return',
    ...config
  };
  return async (req: Request, res: Response, next: NextFunction) => {
    // Log request
    console.log('[STRIPE URL MIDDLEWARE] Processing request:', req.method, req.path);
    
    // First ensure user is authenticated
    if (!req.session) {
      console.error("[STRIPE URL MIDDLEWARE] No session object found");
      return res.status(401).json({ message: "Session unavailable" });
    }

    // Log session state for debugging
    console.log('Stripe route: Session state:', {
      isAuthenticated: req.isAuthenticated(),
      hasSession: !!req.session,
      hasUser: !!req.user,
      sessionID: req.sessionID,
      sessionData: {
        id: req.session.id,
        cookie: req.session.cookie,
        passport: req.session.passport || 'not set',
        userId: req.session.userId || 'not set',
        loginTime: req.session.loginTime || 'not set'
      }
    });

    // Enhanced session restoration
    if (!req.isAuthenticated() && req.session?.userId) {
      try {
        // Attempt to restore session from userId with validation
        const user = await storage.getUser(req.session.userId);
        if (user && user.isActive) {
          await new Promise<void>((resolve, reject) => {
            req.login(user, (err) => {
              if (err) {
                console.error("Session restoration failed:", err);
                reject(err);
              }
              // Update session data
              req.session.loginTime = new Date().toISOString();
              req.session.touch(); // Refresh session expiry
              resolve();
            });
          });
          console.log(`Session restored for user ${user.id}`);
        } else {
          console.warn(`Invalid user or inactive account: ${req.session.userId}`);
          req.session.userId = undefined;
        }
      } catch (error) {
        console.error("Error restoring session:", error);
      }
    }

    // Check for required environment variables
    const baseURL = req.headers.origin || defaults.baseURL;
    if (!baseURL) {
      console.error('No base URL available for Stripe Connect URLs');
      return res.status(500).json({ 
        message: 'Server configuration error: APP_URL or Origin header required' 
      });
    }

    // Validate the base URL
    try {
      new URL(baseURL);
    } catch {
      console.error('Invalid base URL for Stripe Connect URLs:', baseURL);
      return res.status(500).json({
        message: 'Server configuration error: Invalid base URL'
      });
    }

    // Ensure production uses HTTPS
    if (process.env.NODE_ENV === 'production' && !baseURL.startsWith('https://')) {
      console.error('Production requires HTTPS for Stripe Connect URLs');
      return res.status(500).json({
        message: 'Server configuration error: HTTPS required in production'
      });
    }

    // Remove any trailing slashes from baseURL
    const cleanBaseURL = baseURL.replace(/\/$/, '');

    // Attach the URL config to the request for use in route handlers
    (req as any).stripeURLs = {
      baseURL: cleanBaseURL,
      refresh: `${cleanBaseURL}${defaults.refreshPath}`,
      return: `${cleanBaseURL}${defaults.returnPath}`,
    };

    next();
  };
}
