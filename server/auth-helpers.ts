import { Request, Response, NextFunction } from "express";

// Simple admin check - in production you'd want more sophisticated auth
export async function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // For demo purposes, check if user has admin role or specific admin email
  const user = req.user as any;
  
  // You can customize this logic based on your admin requirements
  if (user.role === 'admin' || user.email?.includes('admin')) {
    return next();
  }
  
  return res.status(403).json({ error: "Admin access required" });
}