import { Request, Response, NextFunction } from 'express';
import { db, client } from '../db';

/**
 * Middleware to set the current user context for Row Level Security (RLS)
 * This must be called after authentication middleware to ensure user context is available
 */
export const setRLSContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get user ID from session or request context
    const userId = req.user?.id || req.session?.userId || 0;
    
    // Set the user context for RLS policies
    if (client && userId) {
      await client`SELECT set_config('app.current_user_id', ${userId.toString()}, true)`;
    }
    
    // Also set admin context if user is admin
    if (req.user?.isAdmin) {
      await client`SELECT set_config('app.is_admin', 'true', true)`;
    } else {
      await client`SELECT set_config('app.is_admin', 'false', true)`;
    }
    
    next();
  } catch (error) {
    console.error('Error setting RLS context:', error);
    // Don't fail the request, but log the error
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
      await client`SELECT set_config('app.current_user_id', ${userId.toString()}, true)`;
      await client`SELECT set_config('app.is_admin', ${isAdmin.toString()}, true)`;
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
