import { Request, Response } from 'express';
import { storage } from '../storage';

interface SessionHealth {
  isAuthenticated: boolean;
  sessionId?: string;
  userId?: number;
  hasCookie: boolean;
  cookieMaxAge?: number;
  cookieExpired: boolean;
  userActive?: boolean;
  lastActivity?: Date;
  sessionStarted?: Date;
}

export async function checkSessionHealth(req: Request): Promise<SessionHealth> {
  const health: SessionHealth = {
    isAuthenticated: req.isAuthenticated(),
    sessionId: req.sessionID,
    userId: req.user?.id || req.session?.userId,
    hasCookie: !!req.session?.cookie,
    cookieMaxAge: req.session?.cookie?.maxAge,
    cookieExpired: req.session?.cookie ? req.session.cookie.maxAge <= 0 : true,
    lastActivity: req.session?.lastAccess ? new Date(req.session.lastAccess) : undefined,
    sessionStarted: req.session?.loginTime ? new Date(req.session.loginTime) : undefined
  };

  // Verify user status if we have a userId
  if (health.userId) {
    try {
      const user = await storage.getUser(health.userId);
      health.userActive = !!user?.isActive;
    } catch (error) {
      console.error('Error checking user status:', error);
      health.userActive = false;
    }
  }

  return health;
}
