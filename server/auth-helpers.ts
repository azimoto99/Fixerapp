import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// Simple admin check - in production you'd want more sophisticated auth
export async function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    // Get fresh user data from database to check admin status
    const user = req.user as any;
    const dbUser = await storage.getUser(user.id);
    
    if (!dbUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Check for admin privileges from database (using the correct field name)
    if ((dbUser as any).is_admin === true) {
      return next();
    }
    
    return res.status(403).json({ error: "Admin access required" });
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ error: "Failed to verify admin status" });
  }
}