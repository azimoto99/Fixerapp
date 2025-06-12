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
      enableHighAccuracy: false, // Start with low accuracy for faster response
      timeout: 8000, // Reasonable timeout for initial load
      maximumAge: 300000, // 5 minute cache for initial load
    },
    userDecisionTimeout: 10000, // Give user time to allow location
    suppressLocationOnMount: false,
    watchPosition: false,
    isOptimisticGeolocationEnabled: true, // Enable for faster initial response
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

      // Only use fallback for permission denied in development
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev && positionError.code === positionError.PERMISSION_DENIED) {
        console.log('Using fallback location (permission denied in dev)');
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
      setState({
        userLocation: null,
        locationError: error,
        isLoading: false,
        isUsingFallback: false,
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
        resolve(null);
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
          // Only use fallback for permission denied in development
          const isDev = process.env.NODE_ENV === 'development';
          if (isDev && positionError.code === positionError.PERMISSION_DENIED) {
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

      // Progressive fallback: try high accuracy first, then low accuracy
      const tryGetLocation = (highAccuracy: boolean) => {
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
            // If high accuracy fails and it's not permission denied, try low accuracy
            if (highAccuracy && error.code !== error.PERMISSION_DENIED) {
              console.log('High accuracy failed, trying low accuracy...');
              tryGetLocation(false);
              return;
            }

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
            enableHighAccuracy: highAccuracy,
            timeout: highAccuracy ? 15000 : 10000, // Shorter timeout for low accuracy
            maximumAge: 0 // Don't use cached position for manual refresh
          }
        );
      };

      // Start with high accuracy
      tryGetLocation(true);
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
