import { useState, useEffect } from 'react';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Default location (San Francisco) for development/testing
const DEFAULT_LOCATION: Coordinates = {
  latitude: 37.7749,
  longitude: -122.4194
};

interface GeolocationHook {
  userLocation: Coordinates | null;
  locationError: string | null;
  isUsingFallback: boolean;
  getCurrentLocation: () => Promise<Coordinates | null>;
}

export function useGeolocation(): GeolocationHook {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  // Function to get the current location
  const getCurrentLocation = (): Promise<Coordinates | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by your browser');
        
        // Use fallback location in development
        if (import.meta.env.DEV) {
          setUserLocation(DEFAULT_LOCATION);
          setIsUsingFallback(true);
          resolve(DEFAULT_LOCATION);
          return;
        }
        
        resolve(null);
        return;
      }

      setLocationError(null);

      // Set a timeout for development environments
      const timeoutId = import.meta.env.DEV ? 
        setTimeout(() => {
          if (!userLocation) {
            console.log('Using fallback location for development (timeout)');
            setUserLocation(DEFAULT_LOCATION);
            setIsUsingFallback(true);
            resolve(DEFAULT_LOCATION);
          }
        }, 3000) : undefined;

      // First try with low accuracy for faster response on mobile
      const tryGetLocation = (highAccuracy: boolean) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (timeoutId) clearTimeout(timeoutId);
            
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            setUserLocation(location);
            setIsUsingFallback(false);
            resolve(location);
          },
          (error) => {
            // If low accuracy fails, try high accuracy
            if (!highAccuracy) {
              console.log('Low accuracy location failed, trying high accuracy...');
              tryGetLocation(true);
              return;
            }
            
            if (timeoutId) clearTimeout(timeoutId);
            
            let errorMessage;
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Please enable location services to see jobs near you';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information is unavailable';
                break;
              case error.TIMEOUT:
                errorMessage = 'The request to get user location timed out';
                break;
              default:
                errorMessage = 'An unknown error occurred while retrieving location';
                break;
            }
            setLocationError(errorMessage);
            
            // Use fallback location in development or on timeout
            if (import.meta.env.DEV || error.code === error.TIMEOUT) {
              console.log('Using fallback location');
              setUserLocation(DEFAULT_LOCATION);
              setIsUsingFallback(true);
              resolve(DEFAULT_LOCATION);
              return;
            }
            
            resolve(null);
          },
          {
            enableHighAccuracy: highAccuracy,
            timeout: highAccuracy ? 10000 : 5000, // Increased timeout for better accuracy
            maximumAge: highAccuracy ? 30000 : 120000 // Fresh location for high accuracy, 2min cache for low accuracy
          }
        );
      };
      
      // Start with low accuracy for faster response
      tryGetLocation(false);
    });
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  return { userLocation, locationError, isUsingFallback, getCurrentLocation };
}

// Calculate distance between two points using the Haversine formula
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
