import { Request, Response, NextFunction } from 'express';
import { db, client } from '../db';

/**
 * Middleware to set the current user context for Row Level Security (RLS)
 * This must be called after authentication middleware to ensure user context is available
 */
export const setRLSContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip RLS setup for health checks, authentication endpoints, and public endpoints to reduce load
    // This is crucial for login/registration to work properly
    if (req.path === '/api/health' || 
        req.path.startsWith('/api/auth/') || 
        req.path === '/api/login' ||
        req.path === '/api/register' ||
        req.path === '/api/logout' ||
        req.path === '/') {
      return next();
    }

    // Get user ID from session or request context
    const userId = req.user?.id || req.session?.userId;
    const isAdmin = req.user?.isAdmin || false;
    
    // Only set RLS context if we have a valid authenticated user
    // Don't set context if userId is undefined/null to allow authentication queries
    if (client && userId && userId > 0) {
      // Use Promise.race to add timeout protection
      await Promise.race([
        client`SELECT 
          set_config('app.current_user_id', ${userId.toString()}, true),
          set_config('app.is_admin', ${isAdmin.toString()}, true)`,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('RLS context timeout')), 3000)
        )
      ]);
    }
    
    next();
  } catch (error) {
    console.error('Error setting RLS context:', error);
    // Don't fail the request, but log the error and continue without RLS
    next();
  }
};

/**
 * Middleware to clear RLS context (optional, for cleanup)
 */
export const clearRLSContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (client) {
      await client`SELECT set_config('app.current_user_id', '0', true)`;
      await client`SELECT set_config('app.is_admin', 'false', true)`;
    }
    next();
  } catch (error) {
    console.error('Error clearing RLS context:', error);
    next();
  }
};

/**
 * Helper function to set user context programmatically
 */
export const setUserContext = async (userId: number, isAdmin: boolean = false) => {
  try {
    if (client) {
      // Set both configs in a single query with timeout protection
      await Promise.race([
        client`SELECT 
          set_config('app.current_user_id', ${userId.toString()}, true),
          set_config('app.is_admin', ${isAdmin.toString()}, true)`,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('User context timeout')), 2000)
        )
      ]);
    }
  } catch (error) {
    console.error('Error setting user context:', error);
    throw error;
  }
};

/**
 * Helper function to execute queries with elevated privileges (admin context)
 */
export const withAdminContext = async <T>(callback: () => Promise<T>): Promise<T> => {
  const originalUserId = await client`SELECT current_setting('app.current_user_id', true)`.then(
    result => result[0]?.current_setting || '0'
  );
  const originalIsAdmin = await client`SELECT current_setting('app.is_admin', true)`.then(
    result => result[0]?.current_setting || 'false'
  );
  
  try {
    // Set admin context
    await client`SELECT set_config('app.is_admin', 'true', true)`;
    
    // Execute the callback
    const result = await callback();
    
    return result;
  } finally {
    // Restore original context
    await client`SELECT set_config('app.current_user_id', ${originalUserId}, true)`;
    await client`SELECT set_config('app.is_admin', ${originalIsAdmin}, true)`;
  }
};

/**
 * Helper function to execute queries with specific user context
 */
export const withUserContext = async <T>(
  userId: number, 
  isAdmin: boolean, 
  callback: () => Promise<T>
): Promise<T> => {
  const originalUserId = await client`SELECT current_setting('app.current_user_id', true)`.then(
    result => result[0]?.current_setting || '0'
  );
  const originalIsAdmin = await client`SELECT current_setting('app.is_admin', true)`.then(
    result => result[0]?.current_setting || 'false'
  );
  
  try {
    // Set specific user context
    await setUserContext(userId, isAdmin);
    
    // Execute the callback
    const result = await callback();
    
    return result;
  } finally {
    // Restore original context
    await client`SELECT set_config('app.current_user_id', ${originalUserId}, true)`;
    await client`SELECT set_config('app.is_admin', ${originalIsAdmin}, true)`;
  }
};

/**
 * Decorator for service methods that require admin privileges
 */
export const requiresAdmin = (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
  const method = descriptor.value;
  
  descriptor.value = async function (...args: any[]) {
    return withAdminContext(() => method.apply(this, args));
  };
  
  return descriptor;
};

/**
 * Type guard to check if user has admin privileges in current context
 */
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  try {
    const result = await client`SELECT current_setting('app.is_admin', true) as is_admin`;
    return result[0]?.is_admin === 'true';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * Get current user ID from RLS context
 */
export const getCurrentUserId = async (): Promise<number> => {
  try {
    const result = await client`SELECT current_setting('app.current_user_id', true) as user_id`;
    return parseInt(result[0]?.user_id || '0');
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return 0;
  }
};
