import { registerRootComponent } from 'expo';
import React, { useEffect, useState } from 'react';
import * as Updates from 'expo-updates';
import App from './client/src/App';

// Create a wrapper component to handle updates
function AppWrapper() {
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Check for updates when app starts
  useEffect(() => {
    async function checkForUpdates() {
      if (process.env.NODE_ENV === 'development') {
        console.log('Running in development mode, skipping updates check');
        return;
      }

      try {
        setIsCheckingForUpdate(true);

        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          // Fetch the update
          await Updates.fetchUpdateAsync();
          setUpdateAvailable(true);
        }
      } catch (error) {
        // Just log errors, don't crash the app
        console.log('Error checking for updates:', error);
      } finally {
        setIsCheckingForUpdate(false);
      }
    }

    checkForUpdates();
  }, []);

  // Function to apply the update
  const applyUpdate = async () => {
    try {
      await Updates.reloadAsync();
    } catch (error) {
      console.log('Error applying update:', error);
    }
  };

  // If an update is available, show a simple notification
  if (updateAvailable) {
    return (
      <div style={{
        position: 'absolute', 
        bottom: 20, 
        left: 0, 
        right: 0, 
        backgroundColor: '#4caf50', 
        color: 'white',
        padding: 16,
        textAlign: 'center',
        zIndex: 9999
      }}>
        <p>A new version is available!</p>
        <button 
          onClick={applyUpdate}
          style={{
            backgroundColor: 'white', 
            color: '#4caf50',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 4,
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Update Now
        </button>
      </div>
    );
  }

  // Render the regular app
  return <App />;
}

// Register the main component for Expo
registerRootComponent(AppWrapper);