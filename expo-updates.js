// Expo Updates configuration helper
// This ensures the proper initialization of the expo-updates module

import * as Updates from 'expo-updates';

/**
 * Initialize Expo Updates checking
 * This should be called at app startup
 */
export async function checkForUpdates() {
  try {
    if (!__DEV__) {
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        // New update has been fetched
        
        // Alert the user before restarting
        if (confirm('A new version is available. Would you like to restart to apply the update?')) {
          await Updates.reloadAsync();
        }
      }
    }
  } catch (error) {
    // Log but don't crash the app if updates fail
    console.error('Error checking for updates:', error);
  }
}

/**
 * Utility function to force an update
 * Useful for testing or when a critical update needs to be applied immediately
 */
export async function forceUpdate() {
  try {
    if (!__DEV__) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } else {
      console.log('Updates are disabled in development mode');
    }
  } catch (error) {
    console.error('Error forcing update:', error);
  }
}

/**
 * Get the current update information
 * Useful for debugging or showing version information to users
 */
export function getUpdateInfo() {
  if (!__DEV__) {
    return {
      updateId: Updates.updateId,
      createdAt: Updates.createdAt,
      channel: Updates.channel,
      runtimeVersion: Updates.runtimeVersion,
    };
  }
  return {
    isDev: true,
    message: 'Running in development mode, updates disabled',
  };
}