import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { systemMonitor } from '../system-monitor';

export async function sessionRecoveryMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip for health check endpoints to avoid recursion
  if (req.path.includes('/health')) {
    return next();
  }

  // Only attempt recovery if there's no authenticated user but we have a session
  if (!req.isAuthenticated() && req.session && req.session.userId) {
    try {
      const user = await storage.getUser(req.session.userId);
      
      if (user && user.isActive) {
        await new Promise<void>((resolve, reject) => {
          req.login(user, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        // Update session timestamp
        req.session.loginTime = new Date().toISOString();
        req.session.touch();
        
        // Log recovery attempt
        console.log(`Session recovered for user ${user.id}`);
      }
    } catch (error) {
      console.error('Session recovery failed:', error);
      // Clear invalid session data
      req.session.userId = undefined;
    }
  }

  next();
}
