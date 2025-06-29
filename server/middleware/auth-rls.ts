import { Request, Response, NextFunction } from 'express';
import { setRLSContext } from './rls-context';

/**
 * Enhanced authentication middleware that integrates with RLS
 * This middleware should be used after passport authentication
 */
export const authWithRLS = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // First, set the RLS context based on the authenticated user
    await setRLSContext(req, res, () => {});
    
    // Continue with the request
    next();
  } catch (error) {
    console.error('Error in authWithRLS middleware:', error);
    res.status(500).json({ error: 'Authentication context error' });
  }
};

/**
 * Middleware to require authentication and set RLS context
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Set RLS context for authenticated user
  await setRLSContext(req, res, next);
};

/**
 * Middleware to require admin privileges
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  // Set RLS context with admin privileges
  await setRLSContext(req, res, next);
};

/**
 * Middleware to optionally authenticate (for public endpoints that benefit from user context)
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  // Set RLS context regardless of authentication status
  await setRLSContext(req, res, next);
};

/**
 * Middleware to require specific account type
 */
export const requireAccountType = (accountType: 'worker' | 'poster' | 'enterprise') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.user?.accountType !== accountType && !req.user?.isAdmin) {
      return res.status(403).json({ 
        error: `${accountType} account required`,
        currentAccountType: req.user?.accountType 
      });
    }
    
    await setRLSContext(req, res, next);
  };
};

/**
 * Middleware for enterprise features
 */
export const requireEnterprise = requireAccountType('enterprise');

/**
 * Middleware for worker-only features
 */
export const requireWorker = requireAccountType('worker');

/**
 * Middleware for poster-only features
 */
export const requirePoster = requireAccountType('poster');
