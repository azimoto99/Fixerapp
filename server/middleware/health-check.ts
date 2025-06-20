import { Request, Response, NextFunction } from 'express';
import { systemMonitor } from '../system-monitor';

// Cache for health check results to avoid checking on every request
let healthCache: any = null;
let lastHealthCheck = 0;
const HEALTH_CACHE_TTL = 30000; // 30 seconds cache

/**
 * Health Check Middleware
 * 
 * OPTIMIZED: 2025-06-20 - Reduced frequency of health checks by using caching
 * to prevent database overload during high traffic periods.
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

    // Use cached health status if recent
    const now = Date.now();
    if (healthCache && (now - lastHealthCheck) < HEALTH_CACHE_TTL) {
      // Use cached result
      const healthCheck = healthCache;
      
      // Record request in system monitor
      systemMonitor.recordRequest(false);
      
      // Only block if multiple systems are critical
      const criticalCount = [
        healthCheck.database.status === 'critical',
        healthCheck.stripe.status === 'critical',
        healthCheck.api.status === 'critical'
      ].filter(Boolean).length;
      
      if (criticalCount >= 2) {
        return res.status(503).json({
          message: "Service temporarily unavailable",
          status: "error",
          error: "Multiple critical system failures",
          cached: true
        });
      }
      
      return next();
    }

    // Perform health check only if cache is stale
    const healthCheck = await systemMonitor.getSystemHealth();
    
    // Update cache
    healthCache = healthCheck;
    lastHealthCheck = now;
    
    // Record request in system monitor
    systemMonitor.recordRequest(false);
    
    // Only block requests if multiple critical failures
    const criticalCount = [
      healthCheck.database.status === 'critical',
      healthCheck.stripe.status === 'critical',
      healthCheck.api.status === 'critical'
    ].filter(Boolean).length;
    
    // Only block if multiple systems are critical
    if (criticalCount >= 2) {
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
    
    // Log warnings but allow requests to continue (less frequently)
    if ((criticalCount >= 1) && (now - lastHealthCheck) > 60000) { // Log warnings only once per minute
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
