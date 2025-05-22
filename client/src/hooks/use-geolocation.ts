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
          setState({
            userLocation: null,
            error: error.message,
            isLoading: false,
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000 // 1 minute cache
        }
      );
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
          setState({
            userLocation: null,
            error: error.message,
            isLoading: false,
          });
          
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0 // Don't use cached position for manual refresh
        }
      );
    });
  };

  return { ...state, refreshLocation };
}