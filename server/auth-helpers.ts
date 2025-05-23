import { Request, Response, NextFunction } from "express";

// Simple admin check - in production you'd want more sophisticated auth
export async function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // Check the is_admin field from database
  const user = req.user as any;
  
  // Check for admin privileges using database field
  if (user.isAdmin === true || user.is_admin === true || user.role === 'admin' || user.email?.includes('admin')) {
    return next();
  }
  
  return res.status(403).json({ error: "Admin access required" });
}