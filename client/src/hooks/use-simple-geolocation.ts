import { useState, useEffect, useCallback } from 'react';

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source?: 'gps' | 'network' | 'fallback';
}

// Default location (San Francisco) for development/testing
const DEFAULT_LOCATION: Coordinates = {
  latitude: 37.7749,
  longitude: -122.4194,
  accuracy: 0,
  source: 'fallback'
};

interface SimpleGeolocationState {
  userLocation: Coordinates | null;
  locationError: string | null;
  isLoading: boolean;
  isUsingFallback: boolean;
}

interface SimpleGeolocationHook extends SimpleGeolocationState {
  getCurrentLocation: () => Promise<Coordinates | null>;
  refreshLocation: () => Promise<Coordinates>;
}

/**
 * Simple, reliable geolocation hook that works without external dependencies
 * This is a fallback version that prioritizes functionality over advanced features
 */
export function useSimpleGeolocation(): SimpleGeolocationHook {
  const [state, setState] = useState<SimpleGeolocationState>({
    userLocation: null,
    locationError: null,
    isLoading: true,
    isUsingFallback: false,
  });

  // Check if geolocation is available
  const isGeolocationAvailable = 'geolocation' in navigator;

  // Function to get location with basic error handling
  const getLocation = useCallback((options: PositionOptions = {}): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      if (!isGeolocationAvailable) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
        ...options
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            source: position.coords.accuracy && position.coords.accuracy <= 100 ? 'gps' : 'network'
          };
          resolve(location);
        },
        (error) => {
          let errorMessage = 'Location error';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
            default:
              errorMessage = error.message || 'Unknown location error';
          }
          
          reject(new Error(errorMessage));
        },
        defaultOptions
      );
    });
  }, [isGeolocationAvailable]);

  // Initialize location on mount
  useEffect(() => {
    if (!isGeolocationAvailable) {
      setState({
        userLocation: null,
        locationError: 'Geolocation not supported',
        isLoading: false,
        isUsingFallback: false,
      });
      return;
    }

    // Try to get location
    getLocation()
      .then((location) => {
        setState({
          userLocation: location,
          locationError: null,
          isLoading: false,
          isUsingFallback: false,
        });
        console.log('Location acquired:', location);
      })
      .catch((error) => {
        console.error('Location error:', error);
        
        // Use fallback in development mode
        const isDev = process.env.NODE_ENV === 'development';
        if (isDev) {
          setState({
            userLocation: DEFAULT_LOCATION,
            locationError: `Using default location (${error.message})`,
            isLoading: false,
            isUsingFallback: true,
          });
        } else {
          setState({
            userLocation: null,
            locationError: error.message,
            isLoading: false,
            isUsingFallback: false,
          });
        }
      });
  }, [getLocation]);

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

      getLocation()
        .then(resolve)
        .catch((error) => {
          console.error('getCurrentLocation error:', error);
          // Return fallback in development
          if (process.env.NODE_ENV === 'development') {
            resolve(DEFAULT_LOCATION);
          } else {
            resolve(null);
          }
        });
    });
  }, [state.userLocation, getLocation, isGeolocationAvailable]);

  // Function to refresh location
  const refreshLocation = useCallback((): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      setState(prev => ({ ...prev, isLoading: true, locationError: null }));

      getLocation({ maximumAge: 0 }) // Force fresh location
        .then((location) => {
          setState({
            userLocation: location,
            locationError: null,
            isLoading: false,
            isUsingFallback: false,
          });
          console.log('Location refreshed:', location);
          resolve(location);
        })
        .catch((error) => {
          console.error('Refresh location error:', error);
          setState(prev => ({
            ...prev,
            locationError: error.message,
            isLoading: false,
          }));
          reject(error);
        });
    });
  }, [getLocation]);

  return {
    ...state,
    getCurrentLocation,
    refreshLocation,
  };
}
