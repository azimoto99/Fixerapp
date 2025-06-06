import { Request, Response, NextFunction } from 'express';
import { systemMonitor } from '../system-monitor';

/**
 * Health Check Middleware
 * 
 * FIXED: 2025-06-06 - Previous version was too aggressive and blocked all API requests
 * when any single service was marked as critical. This caused 404-like errors for 
 * Stripe Connect endpoints. Now only blocks when multiple systems fail or database
 * is completely unreachable.
 */
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
    
    // Only block requests if database is actually unreachable or multiple critical failures
    // Single service issues shouldn't block the entire API
    const criticalCount = [
      healthCheck.database.status === 'critical',
      healthCheck.stripe.status === 'critical',
      healthCheck.api.status === 'critical'
    ].filter(Boolean).length;
    
    // Only block if multiple systems are critical OR database is completely unreachable
    if (criticalCount >= 2 || (healthCheck.database.status === 'critical' && healthCheck.database.error?.includes('unreachable'))) {
      console.error('System health check failed - blocking requests:', {
        database: healthCheck.database,
        stripe: healthCheck.stripe,
        api: healthCheck.api,
        criticalCount
      });
      
      return res.status(503).json({
        message: "Service temporarily unavailable",
        status: "error",
        error: "Multiple critical system failures",
        details: {
          database: healthCheck.database.error,
          stripe: healthCheck.stripe.error,
          api: healthCheck.api.error
        }
      });
    }
    
    // Log warnings but allow requests to continue
    if (healthCheck.database.status === 'critical' || healthCheck.stripe.status === 'critical') {
      console.warn('System health warning - allowing requests but monitoring:', {
        database: { status: healthCheck.database.status, error: healthCheck.database.error },
        stripe: { status: healthCheck.stripe.status, error: healthCheck.stripe.error },
        api: { status: healthCheck.api.status, error: healthCheck.api.error }
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
