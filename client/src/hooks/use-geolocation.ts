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
      setState({ userLocation: null, error: 'Geolocation not supported', isLoading: false });
      return;
    }
    // Start watching user's position for real-time updates
    setState(prev => ({ ...prev, isLoading: true }));
    const geoOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
    // Fetch initial location immediately
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          userLocation: { latitude: position.coords.latitude, longitude: position.coords.longitude },
          error: null,
          isLoading: false,
        });
      },
      (error) => {
        setState({ userLocation: null, error: error.message, isLoading: false });
      },
      geoOptions
    );
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          userLocation: { latitude: position.coords.latitude, longitude: position.coords.longitude },
          error: null,
          isLoading: false,
        });
      },
      (error) => {
        setState({ userLocation: null, error: error.message, isLoading: false });
      },
      geoOptions
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
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