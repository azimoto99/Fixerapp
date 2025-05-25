import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { auditService } from './audit-service';

// Enhanced admin authorization middleware with comprehensive security
export const enhancedAdminAuth = (requiredRole: 'admin' | 'super_admin' = 'admin') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        await auditService.logAdminAction({
          adminId: null,
          action: 'unauthorized_access_attempt',
          resourceType: 'admin_endpoint',
          resourceId: req.path,
          details: { ip: req.ip, userAgent: req.get('User-Agent') },
          success: false
        });
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check if user exists and has admin privileges
      if (!req.user || !req.user.isAdmin) {
        await auditService.logAdminAction({
          adminId: req.user?.id || null,
          action: 'insufficient_privileges',
          resourceType: 'admin_endpoint',
          resourceId: req.path,
          details: { userId: req.user?.id, requiredRole },
          success: false
        });
        return res.status(403).json({ message: "Admin privileges required" });
      }

      // Check for super admin if required
      if (requiredRole === 'super_admin' && !req.user.isSuperAdmin) {
        await auditService.logAdminAction({
          adminId: req.user.id,
          action: 'insufficient_super_admin_privileges',
          resourceType: 'admin_endpoint',
          resourceId: req.path,
          details: { requiredRole },
          success: false
        });
        return res.status(403).json({ message: "Super admin privileges required" });
      }

      // Log successful access
      await auditService.logAdminAction({
        adminId: req.user.id,
        action: 'admin_endpoint_access',
        resourceType: 'admin_endpoint',
        resourceId: req.path,
        details: { method: req.method },
        success: true
      });

      next();
    } catch (error) {
      console.error('Admin authorization error:', error);
      res.status(500).json({ message: "Authorization check failed" });
    }
  };
};

// Rate limiting for admin endpoints
export const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many admin requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req: Request, res: Response) => {
    await auditService.logAdminAction({
      adminId: req.user?.id || null,
      action: 'rate_limit_exceeded',
      resourceType: 'admin_endpoint',
      resourceId: req.path,
      details: { ip: req.ip },
      success: false
    });
    res.status(429).json({
      error: 'Too many admin requests from this IP, please try again later.'
    });
  }
});

// Stricter rate limiting for sensitive operations
export const strictAdminRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many sensitive admin operations from this IP.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Security headers middleware for admin routes
export const adminSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Admin-specific headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
  next();
};

// Input validation and sanitization middleware
export const validateAdminInput = (req: Request, res: Response, next: NextFunction) => {
  // Basic input sanitization
  const sanitizeInput = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeInput);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeInput(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }

  next();
};

// Audit logging wrapper for admin actions
export const auditAdminAction = (actionType: string, resourceType: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      const success = res.statusCode < 400;
      
      // Log the action after response
      setImmediate(async () => {
        try {
          await auditService.logAdminAction({
            adminId: req.user?.id || null,
            action: actionType,
            resourceType,
            resourceId: req.params.id || req.params.userId || req.params.jobId || null,
            details: {
              method: req.method,
              path: req.path,
              body: req.body,
              params: req.params,
              statusCode: res.statusCode
            },
            success
          });
        } catch (error) {
          console.error('Audit logging error:', error);
        }
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};