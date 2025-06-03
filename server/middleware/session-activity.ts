import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { systemMonitor } from '../system-monitor';

export const sessionActivityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip for health check endpoints to avoid recursion
    if (req.path.includes('/health')) {
      return next();
    }

    // Update last access time
    if (req.session) {
      req.session.lastAccess = Date.now();
      
      // Track connection in system monitor
      systemMonitor.incrementConnectionCount();

      // Clean up on response finish
      res.on('finish', () => {
        systemMonitor.decrementConnectionCount();
        
        // Record request result
        const statusCode = res.statusCode;
        const isError = statusCode >= 400;
        systemMonitor.recordRequest(isError);
      });
    }

    if (req.session) {
      // Update last activity timestamp
      req.session.lastActivity = new Date().toISOString();
      
      // Check for session expiry
      if (req.session.cookie?.expires) {
        const expiryTime = new Date(req.session.cookie.expires).getTime();
        const now = new Date().getTime();
        
        // If session is close to expiry (within 5 minutes), extend it
        if (expiryTime - now < 5 * 60 * 1000) {
          req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // Extend by 24 hours
          console.log('Session extended for:', req.sessionID);
        }
      }

      // If authenticated, verify user still exists
      if (req.isAuthenticated() && req.user) {
        const user = await storage.getUser(req.user.id);
        if (!user) {
          console.warn(`User ${req.user.id} no longer exists, destroying session`);
          await new Promise<void>((resolve) => {
            req.session.destroy((err) => {
              if (err) console.error('Error destroying session:', err);
              resolve();
            });
          });
          return res.status(401).json({ 
            message: 'Session invalid - user not found',
            code: 'USER_NOT_FOUND'
          });
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Session activity middleware error:', error);
    next(error);
  }
};
