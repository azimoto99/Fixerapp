import { useState, useEffect } from 'react';

interface GeolocationState {
  userLocation: {
    latitude: number;
    longitude: number;
  } | null;
  error: string | null;
  isLoading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    userLocation: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        userLocation: null,
        error: 'Geolocation is not supported by your browser',
        isLoading: false,
      });
      return;
    }

    const updateLocation = () => {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Try low accuracy first for faster response
      const tryGetLocation = (highAccuracy: boolean) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setState({
              userLocation: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              },
              error: null,
              isLoading: false,
            });
          },
          (error) => {
            // If low accuracy fails, try high accuracy
            if (!highAccuracy && error.code !== error.PERMISSION_DENIED) {
              tryGetLocation(true);
              return;
            }
            
            // On timeout, use a fallback or show appropriate message
            let errorMessage = error.message;
            if (error.code === error.TIMEOUT) {
              errorMessage = 'Location request timed out. Please try again.';
            }
            
            setState({
              userLocation: null,
              error: errorMessage,
              isLoading: false,
            });
          },
          {
            enableHighAccuracy: highAccuracy,
            timeout: highAccuracy ? 5000 : 3000, // Shorter timeout for mobile
            maximumAge: 300000 // Accept cached location up to 5 minutes old
          }
        );
      };
      
      // Start with low accuracy
      tryGetLocation(false);
    };

    // Initial location fetch
    updateLocation();

    // Set up a regular polling for updates when the component is active
    const intervalId = setInterval(updateLocation, 60000); // update every minute

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Add a function to manually update location on demand
  const refreshLocation = () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    return new Promise<{latitude: number, longitude: number}>((resolve, reject) => {
      // Try low accuracy first for faster response
      const tryGetLocation = (highAccuracy: boolean) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            
            setState({
              userLocation: newLocation,
              error: null,
              isLoading: false,
            });
            
            resolve(newLocation);
          },
          (error) => {
            // If low accuracy fails, try high accuracy
            if (!highAccuracy && error.code !== error.PERMISSION_DENIED) {
              tryGetLocation(true);
              return;
            }
            
            // On timeout, use a more helpful error message
            let errorMessage = error.message;
            if (error.code === error.TIMEOUT) {
              errorMessage = 'Location request timed out. Please try again.';
            }
            
            setState({
              userLocation: null,
              error: errorMessage,
              isLoading: false,
            });
            
            reject(error);
          },
          {
            enableHighAccuracy: highAccuracy,
            timeout: highAccuracy ? 5000 : 3000, // Shorter timeout for mobile
            maximumAge: 0 // Don't use cached position for manual refresh
          }
        );
      };
      
      // Start with low accuracy
      tryGetLocation(false);
    });
  };

  return { ...state, refreshLocation };
}