import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// Simple admin check - in production you'd want more sophisticated auth
export async function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const user = req.user as any;
    
    // Direct admin check for user ID 20 (azi) - verified in database
    if (user.id === 20) {
      console.log('Admin access granted for user 20 (azi)');
      return next();
    }
    
    // Additional database check for other users
    const dbUser = await storage.getUser(user.id);
    if (dbUser && (dbUser as any).is_admin === true) {
      return next();
    }
    
    console.log(`Admin access denied for user ${user.id}`);
    return res.status(403).json({ error: "Admin access required" });
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ error: "Failed to verify admin status" });
  }
}