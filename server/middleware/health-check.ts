import { Request, Response, NextFunction } from 'express';
import { systemMonitor } from '../system-monitor';

export async function healthCheckMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip health check for health endpoints to avoid recursion
    if (req.path.includes('/health')) {
      return next();
    }

    // Skip health check for static assets and non-API routes
    if (!req.path.startsWith('/api') || req.path.includes('/static/')) {
      return next();
    }

    const healthCheck = await systemMonitor.getSystemHealth();
    
    // Record request in system monitor
    systemMonitor.recordRequest(false);
    
    // If system is in critical state, return 503
    if (healthCheck.database.status === 'critical' || 
        healthCheck.stripe.status === 'critical' || 
        healthCheck.api.status === 'critical') {
      console.error('System health check failed:', {
        database: healthCheck.database,
        stripe: healthCheck.stripe,
        api: healthCheck.api
      });
      
      return res.status(503).json({
        message: "Service temporarily unavailable",
        status: "error",
        error: "System is in critical state",
        details: {
          database: healthCheck.database.error,
          stripe: healthCheck.stripe.error,
          api: healthCheck.api.error
        }
      });
    }

    next();
  } catch (error) {
    // Log error and continue to avoid blocking requests
    console.error('Health check middleware error:', error);
    // Don't block the request on health check failure
    next();
  }
}
