import { Request, Response, NextFunction } from 'express';

export interface StripeURLConfig {
  baseURL: string;
  refreshPath: string;
  returnPath: string;
}

/**
 * Middleware to ensure proper URL handling for Stripe Connect endpoints
 * This middleware only handles URL configuration and HTTPS enforcement.
 * Authentication is handled by separate auth middleware.
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

    // Check for required environment variables
    let baseURL = req.headers.origin as string || defaults.baseURL;
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

    // Ensure production uses HTTPS, but allow localhost for development
    if (process.env.NODE_ENV === 'production' && !baseURL.startsWith('https://')) {
      // If in production and not HTTPS, force HTTPS for Stripe Connect
      if (baseURL.startsWith('http://')) {
        baseURL = baseURL.replace('http://', 'https://');
        console.warn('Forcing HTTPS for Stripe Connect URLs in production:', baseURL);
      } else {
        console.error('Production requires HTTPS for Stripe Connect URLs');
        return res.status(500).json({
          message: 'Server configuration error: HTTPS required in production'
        });
      }
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
