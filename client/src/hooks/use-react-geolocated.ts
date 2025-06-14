import { useState, useEffect, useCallback } from 'react';
import { useGeolocated } from 'react-geolocated';

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source?: 'gps' | 'network' | 'fallback';
}

// Location accuracy thresholds (in meters)
const ACCURACY_THRESHOLDS = {
  HIGH: 10,      // GPS-level accuracy
  MEDIUM: 100,   // Good network accuracy
  LOW: 1000,     // Poor network accuracy
  FALLBACK: 10000 // City-level accuracy
};

// Default location (only used in development mode as last resort)
const DEFAULT_LOCATION: Coordinates = {
  latitude: 37.7749,
  longitude: -122.4194,
  accuracy: 10000,
  source: 'fallback'
};

interface GeolocationState {
  userLocation: Coordinates | null;
  locationError: string | null;
  isLoading: boolean;
  isUsingFallback: boolean;
  locationAccuracy: 'high' | 'medium' | 'low' | 'fallback' | null;
}

interface GeolocationHook extends GeolocationState {
  getCurrentLocation: () => Promise<Coordinates | null>;
  refreshLocation: () => Promise<Coordinates>;
  requestHighAccuracyLocation: () => Promise<Coordinates>;
}

// Helper function to determine location accuracy level
function getLocationAccuracy(accuracy: number | undefined): 'high' | 'medium' | 'low' | 'fallback' {
  if (!accuracy) return 'fallback';
  if (accuracy <= ACCURACY_THRESHOLDS.HIGH) return 'high';
  if (accuracy <= ACCURACY_THRESHOLDS.MEDIUM) return 'medium';
  if (accuracy <= ACCURACY_THRESHOLDS.LOW) return 'low';
  return 'fallback';
}

// Helper function to determine location source
function getLocationSource(accuracy: number | undefined): 'gps' | 'network' | 'fallback' {
  if (!accuracy) return 'fallback';
  if (accuracy <= ACCURACY_THRESHOLDS.HIGH) return 'gps';
  if (accuracy <= ACCURACY_THRESHOLDS.LOW) return 'network';
  return 'fallback';
}

export function useGeolocation(): GeolocationHook {
  // Use the react-geolocated hook with balanced settings for reliability and accuracy
  const {
    coords,
    isGeolocationAvailable,
    isGeolocationEnabled,
    positionError,
    getPosition
  } = useGeolocated({
    positionOptions: {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,    // no cache to ensure fresh location
    },
    userDecisionTimeout: 15000,
    suppressLocationOnMount: false,
    watchPosition: true,   // continuously watch for updates
    isOptimisticGeolocationEnabled: false,
  });

  const [state, setState] = useState<GeolocationState>({
    userLocation: null,
    locationError: null,
    isLoading: true,
    isUsingFallback: false,
    locationAccuracy: null,
  });

  // Update state based on react-geolocated results with improved accuracy handling
  useEffect(() => {
    if (coords) {
      const accuracy = coords.accuracy;
      const locationAccuracy = getLocationAccuracy(accuracy);
      const locationSource = getLocationSource(accuracy);

      // Accept all locations initially, but provide accuracy feedback
      // We'll be less strict to ensure location works, but still provide quality info
      const location: Coordinates = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: accuracy,
        source: locationSource
      };

      setState({
        userLocation: location,
        locationError: null,
        isLoading: false,
        isUsingFallback: false,
        locationAccuracy: locationAccuracy,
      });

      // Log location quality for debugging
      console.log(`Location acquired: ${locationSource} (${locationAccuracy} accuracy: ${accuracy?.toFixed(0) || 'unknown'}m)`);

      // If accuracy is poor, suggest getting a better location but don't block
      if (accuracy && accuracy > ACCURACY_THRESHOLDS.LOW) {
        console.warn(`Location accuracy is poor (${accuracy.toFixed(0)}m). Consider requesting high accuracy location for better results.`);
      }
    } else if (positionError) {
      let errorMessage = positionError.message;

      // Provide user-friendly error messages
      if (positionError.code === positionError.PERMISSION_DENIED) {
        errorMessage = 'Location access denied. Please enable location services in your browser settings and try again.';
      } else if (positionError.code === positionError.POSITION_UNAVAILABLE) {
        errorMessage = 'Location information is unavailable. Please check your GPS signal or try again later.';
      } else if (positionError.code === positionError.TIMEOUT) {
        errorMessage = 'Location request timed out. Please check your GPS signal and try again.';
      }

      console.error('Location error:', errorMessage);

      // In development mode, use fallback for permission denied only
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev && positionError.code === positionError.PERMISSION_DENIED) {
        console.warn('Using fallback location in development mode');
        setState({
          userLocation: DEFAULT_LOCATION,
          locationError: `Using default location (${errorMessage})`,
          isLoading: false,
          isUsingFallback: true,
          locationAccuracy: 'fallback',
        });
      } else {
        setState({
          userLocation: null,
          locationError: errorMessage,
          isLoading: false,
          isUsingFallback: false,
          locationAccuracy: null,
        });
      }
    } else if (!isGeolocationAvailable) {
      const error = 'Geolocation is not supported by your browser. Please use a modern browser with location services.';
      console.error('Geolocation not available');
      setState({
        userLocation: null,
        locationError: error,
        isLoading: false,
        isUsingFallback: false,
        locationAccuracy: null,
      });
    } else if (!isGeolocationEnabled) {
      setState(prev => ({ ...prev, isLoading: true }));
    }
  }, [coords, positionError, isGeolocationAvailable, isGeolocationEnabled]);

  // Function to get current location with accuracy validation
  const getCurrentLocation = useCallback((): Promise<Coordinates | null> => {
    return new Promise((resolve) => {
      // If we already have a high-quality location, return it
      if (state.userLocation && !state.isUsingFallback &&
          (state.locationAccuracy === 'high' || state.locationAccuracy === 'medium')) {
        resolve(state.userLocation);
        return;
      }

      // If we have a low-quality location, try to get a better one first
      if (state.userLocation && state.locationAccuracy === 'low') {
        console.log('Current location has low accuracy, attempting to get better location');
        requestHighAccuracyLocation()
          .then(resolve)
          .catch(() => resolve(state.userLocation)); // Fallback to existing location
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

      // Wait for the position to be available
      const checkPosition = () => {
        if (coords) {
          const location: Coordinates = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            source: getLocationSource(coords.accuracy)
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
          setTimeout(checkPosition, 200);
        }
      };

      checkPosition();
    });
  }, [state.userLocation, state.locationAccuracy, state.isUsingFallback, coords, positionError, isGeolocationAvailable, getPosition]);

  // Function to request high accuracy location specifically
  const requestHighAccuracyLocation = useCallback((): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      if (!isGeolocationAvailable) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const accuracy = position.coords.accuracy;
          const locationAccuracy = getLocationAccuracy(accuracy);
          const locationSource = getLocationSource(accuracy);

          const newLocation: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: accuracy,
            source: locationSource
          };

          setState(prev => ({
            ...prev,
            userLocation: newLocation,
            locationError: null,
            isLoading: false,
            isUsingFallback: false,
            locationAccuracy: locationAccuracy,
          }));

          console.log(`High accuracy location acquired: ${locationSource} (${locationAccuracy} accuracy: ${accuracy?.toFixed(0)}m)`);
          resolve(newLocation);
        },
        (error) => {
          let errorMessage = error.message;
          if (error.code === error.TIMEOUT) {
            errorMessage = 'High accuracy location request timed out. GPS signal may be weak.';
          } else if (error.code === error.PERMISSION_DENIED) {
            errorMessage = 'Location access denied. Please enable location services.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = 'High accuracy location unavailable. GPS signal may be blocked.';
          }

          console.warn('High accuracy location failed:', errorMessage);
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 20000, // Longer timeout for GPS acquisition
          maximumAge: 0 // Always get fresh location
        }
      );
    });
  }, [isGeolocationAvailable]);

  // Function to manually refresh location with progressive accuracy fallback
  const refreshLocation = useCallback((): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      if (!isGeolocationAvailable) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      setState(prev => ({ ...prev, isLoading: true, locationError: null }));

      // Progressive fallback: try high accuracy first, then medium, then low accuracy
      const tryGetLocation = (accuracyLevel: 'high' | 'medium' | 'low') => {
        const options = {
          high: { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
          medium: { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
          low: { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        };

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const accuracy = position.coords.accuracy;
            const locationAccuracy = getLocationAccuracy(accuracy);
            const locationSource = getLocationSource(accuracy);

            const newLocation: Coordinates = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: accuracy,
              source: locationSource
            };

            setState(prev => ({
              ...prev,
              userLocation: newLocation,
              locationError: null,
              isLoading: false,
              isUsingFallback: false,
              locationAccuracy: locationAccuracy,
            }));

            console.log(`Location refreshed: ${locationSource} (${locationAccuracy} accuracy: ${accuracy?.toFixed(0)}m)`);
            resolve(newLocation);
          },
          (error) => {
            // Try next accuracy level if current one fails
            if (accuracyLevel === 'high' && error.code !== error.PERMISSION_DENIED) {
              console.log('High accuracy failed, trying medium accuracy...');
              tryGetLocation('medium');
              return;
            } else if (accuracyLevel === 'medium' && error.code !== error.PERMISSION_DENIED) {
              console.log('Medium accuracy failed, trying low accuracy...');
              tryGetLocation('low');
              return;
            }

            let errorMessage = error.message;
            if (error.code === error.TIMEOUT) {
              errorMessage = 'Location request timed out. Please check your GPS signal and try again.';
            } else if (error.code === error.PERMISSION_DENIED) {
              errorMessage = 'Location access denied. Please enable location services and try again.';
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              errorMessage = 'Location information is unavailable. Please check your GPS signal.';
            }

            setState(prev => ({ ...prev, locationError: errorMessage, isLoading: false }));
            reject(new Error(errorMessage));
          },
          options[accuracyLevel]
        );
      };

      // Start with high accuracy
      tryGetLocation('high');
    });
  }, [isGeolocationAvailable]);

  return {
    ...state,
    getCurrentLocation,
    refreshLocation,
    requestHighAccuracyLocation
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
