import { storage } from './storage';

// Hard-coded admin user IDs
// In a real application, this would be stored in a database
const ADMIN_USER_IDS = [1, 20]; // Add any user IDs that should have admin access

/**
 * Check if a user is an admin
 * @param userId The user ID to check
 * @returns Promise<boolean> True if the user is an admin
 */
export async function isAdmin(userId: number): Promise<boolean> {
  // Fast path: check if user ID is in the hard-coded admin list
  if (ADMIN_USER_IDS.includes(userId)) {
    return true;
  }
  
  try {
    // Fetch the user from storage to check if they have an admin role
    const user = await storage.getUser(userId);
    
    if (!user) {
      return false;
    }
    
    // Check if the user has an admin role
    // This can be expanded to check a specific admin flag in your user schema
    return user.accountType === 'admin';
  } catch (error) {
    console.error(`Error checking if user ${userId} is admin:`, error);
    return false;
  }
}