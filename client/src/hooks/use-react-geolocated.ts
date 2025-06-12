import { useState, useEffect, useCallback } from 'react';
import { useGeolocated } from 'react-geolocated';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Default location (San Francisco) for development/testing
const DEFAULT_LOCATION: Coordinates = {
  latitude: 37.7749,
  longitude: -122.4194
};

interface GeolocationState {
  userLocation: Coordinates | null;
  locationError: string | null;
  isLoading: boolean;
  isUsingFallback: boolean;
}

interface GeolocationHook extends GeolocationState {
  getCurrentLocation: () => Promise<Coordinates | null>;
  refreshLocation: () => Promise<Coordinates>;
}

export function useGeolocation(): GeolocationHook {
  // Use the react-geolocated hook
  const {
    coords,
    isGeolocationAvailable,
    isGeolocationEnabled,
    positionError,
    getPosition
  } = useGeolocated({
    positionOptions: {
      enableHighAccuracy: false,
      timeout: 5000,
      maximumAge: 120000, // 2 minutes cache for initial load
    },
    userDecisionTimeout: 10000,
    suppressLocationOnMount: false,
    watchPosition: false,
    isOptimisticGeolocationEnabled: true,
  });

  const [state, setState] = useState<GeolocationState>({
    userLocation: null,
    locationError: null,
    isLoading: true,
    isUsingFallback: false,
  });

  // Update state based on react-geolocated results
  useEffect(() => {
    if (coords) {
      setState({
        userLocation: {
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
        locationError: null,
        isLoading: false,
        isUsingFallback: false,
      });
    } else if (positionError) {
      let errorMessage = positionError.message;
      if (positionError.code === positionError.TIMEOUT) {
        errorMessage = 'Location request timed out. Please try again.';
      } else if (positionError.code === positionError.PERMISSION_DENIED) {
        errorMessage = 'Location access denied. Please enable location services.';
      } else if (positionError.code === positionError.POSITION_UNAVAILABLE) {
        errorMessage = 'Location information is unavailable.';
      }

      // Use fallback location in development or on timeout
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev || positionError.code === positionError.TIMEOUT) {
        console.log('Using fallback location');
        setState({
          userLocation: DEFAULT_LOCATION,
          locationError: null,
          isLoading: false,
          isUsingFallback: true,
        });
      } else {
        setState({
          userLocation: null,
          locationError: errorMessage,
          isLoading: false,
          isUsingFallback: false,
        });
      }
    } else if (!isGeolocationAvailable) {
      const error = 'Geolocation is not supported by your browser';
      const isDev = process.env.NODE_ENV === 'development';
      setState({
        userLocation: isDev ? DEFAULT_LOCATION : null,
        locationError: error,
        isLoading: false,
        isUsingFallback: isDev,
      });
    } else if (!isGeolocationEnabled) {
      setState(prev => ({ ...prev, isLoading: true }));
    }
  }, [coords, positionError, isGeolocationAvailable, isGeolocationEnabled]);

  // Function to get current location
  const getCurrentLocation = useCallback((): Promise<Coordinates | null> => {
    return new Promise((resolve) => {
      if (state.userLocation) {
        resolve(state.userLocation);
        return;
      }

      if (!isGeolocationAvailable) {
        const isDev = process.env.NODE_ENV === 'development';
        const fallback = isDev ? DEFAULT_LOCATION : null;
        resolve(fallback);
        return;
      }

      // Trigger a new position request
      if (getPosition) {
        getPosition();
      }

      // Wait for the position to be available or use fallback
      const checkPosition = () => {
        if (coords) {
          const location = {
            latitude: coords.latitude,
            longitude: coords.longitude,
          };
          resolve(location);
        } else if (positionError) {
          const isDev = process.env.NODE_ENV === 'development';
          if (isDev || positionError.code === positionError.TIMEOUT) {
            resolve(DEFAULT_LOCATION);
          } else {
            resolve(null);
          }
        } else {
          // Still waiting, check again in a bit
          setTimeout(checkPosition, 100);
        }
      };

      checkPosition();
    });
  }, [state.userLocation, coords, positionError, isGeolocationAvailable, getPosition]);

  // Function to manually refresh location with high accuracy
  const refreshLocation = useCallback((): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      if (!isGeolocationAvailable) {
        const error = new Error('Geolocation is not supported by your browser');
        reject(error);
        return;
      }

      setState(prev => ({ ...prev, isLoading: true, locationError: null }));

      // Use navigator.geolocation directly for refresh to get fresh position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          setState(prev => ({
            ...prev,
            userLocation: newLocation,
            locationError: null,
            isLoading: false,
            isUsingFallback: false
          }));

          resolve(newLocation);
        },
        (error) => {
          let errorMessage = error.message;
          if (error.code === error.TIMEOUT) {
            errorMessage = 'Location request timed out. Please try again.';
          } else if (error.code === error.PERMISSION_DENIED) {
            errorMessage = 'Location access denied. Please enable location services and try again.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = 'Location information is unavailable. Please try again.';
          }

          setState(prev => ({ ...prev, locationError: errorMessage, isLoading: false }));
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // Longer timeout for manual refresh
          maximumAge: 0 // Don't use cached position for manual refresh
        }
      );
    });
  }, [isGeolocationAvailable]);

  return {
    ...state,
    getCurrentLocation,
    refreshLocation
  };
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
