import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Job } from '@/types';

interface LocationMonitoringState {
  isMonitoring: boolean;
  currentLocation: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    timestamp: Date;
  } | null;
  lastVerification: {
    isValid: boolean;
    confidence: 'high' | 'medium' | 'low' | 'rejected';
    distance: number;
    timestamp: Date;
  } | null;
  error: string | null;
  verificationHistory: Array<{
    timestamp: Date;
    isValid: boolean;
    distance: number;
    confidence: string;
  }>;
}

interface UseJobLocationMonitoringOptions {
  job: Job;
  isJobActive: boolean;
  monitoringInterval?: number; // in milliseconds, default 5 minutes
  locationAccuracyThreshold?: number; // in meters, default 100m
  maxDistanceThreshold?: number; // in meters, default 1000m (1km)
}

export function useJobLocationMonitoring({
  job,
  isJobActive,
  monitoringInterval = 5 * 60 * 1000, // 5 minutes
  locationAccuracyThreshold = 100,
  maxDistanceThreshold = 1000
}: UseJobLocationMonitoringOptions) {
  const [state, setState] = useState<LocationMonitoringState>({
    isMonitoring: false,
    currentLocation: null,
    lastVerification: null,
    error: null,
    verificationHistory: []
  });

  const watchIdRef = useRef<number | null>(null);
  const verificationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastVerificationTimeRef = useRef<Date | null>(null);

  // Get current location with high accuracy
  const getCurrentLocation = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000 // 30 seconds cache for monitoring
      };

      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }, []);

  // Verify location with server
  const verifyLocationWithServer = useCallback(async (
    latitude: number,
    longitude: number,
    accuracy: number | null
  ) => {
    try {
      const response = await apiRequest('POST', `/api/jobs/${job.id}/verify-location`, {
        latitude,
        longitude,
        accuracy
      });

      if (response.success) {
        const verification = response.locationVerification;
        const timestamp = new Date();

        setState(prev => ({
          ...prev,
          lastVerification: {
            isValid: verification.isValid,
            confidence: verification.confidence,
            distance: verification.distance,
            timestamp
          },
          verificationHistory: [
            ...prev.verificationHistory.slice(-9), // Keep last 10 entries
            {
              timestamp,
              isValid: verification.isValid,
              distance: verification.distance,
              confidence: verification.confidence
            }
          ],
          error: verification.isValid ? null : `Location verification failed: ${verification.reasons?.join(', ')}`
        }));

        lastVerificationTimeRef.current = timestamp;
        return verification;
      } else {
        throw new Error(response.message || 'Verification failed');
      }
    } catch (error) {
      console.error('Location verification error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Verification failed'
      }));
      return null;
    }
  }, [job.id]);

  // Update current location
  const updateLocation = useCallback(async () => {
    try {
      const position = await getCurrentLocation();
      const { latitude, longitude, accuracy } = position.coords;
      const timestamp = new Date(position.timestamp);

      setState(prev => ({
        ...prev,
        currentLocation: {
          latitude,
          longitude,
          accuracy,
          timestamp
        },
        error: null
      }));

      // Verify location if enough time has passed since last verification
      const now = Date.now();
      const lastVerificationTime = lastVerificationTimeRef.current?.getTime() || 0;
      
      if (now - lastVerificationTime >= monitoringInterval) {
        await verifyLocationWithServer(latitude, longitude, accuracy);
      }

    } catch (error) {
      console.error('Location update error:', error);
      let errorMessage = 'Failed to get location';
      
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
      }

      setState(prev => ({
        ...prev,
        error: errorMessage
      }));
    }
  }, [getCurrentLocation, verifyLocationWithServer, monitoringInterval]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (!isJobActive || state.isMonitoring) return;

    setState(prev => ({ ...prev, isMonitoring: true, error: null }));

    // Get initial location
    updateLocation();

    // Set up continuous location watching
    if (navigator.geolocation) {
      const watchOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // 1 minute cache for continuous watching
      };

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const timestamp = new Date(position.timestamp);

          setState(prev => ({
            ...prev,
            currentLocation: {
              latitude,
              longitude,
              accuracy,
              timestamp
            }
          }));
        },
        (error) => {
          console.error('Location watch error:', error);
        },
        watchOptions
      );
    }

    // Set up periodic verification
    verificationIntervalRef.current = setInterval(() => {
      if (state.currentLocation) {
        verifyLocationWithServer(
          state.currentLocation.latitude,
          state.currentLocation.longitude,
          state.currentLocation.accuracy
        );
      }
    }, monitoringInterval);

  }, [isJobActive, state.isMonitoring, updateLocation, verifyLocationWithServer, monitoringInterval]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setState(prev => ({ ...prev, isMonitoring: false }));

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (verificationIntervalRef.current) {
      clearInterval(verificationIntervalRef.current);
      verificationIntervalRef.current = null;
    }
  }, []);

  // Manual location verification
  const verifyLocationNow = useCallback(async () => {
    if (!state.currentLocation) {
      await updateLocation();
      return;
    }

    return await verifyLocationWithServer(
      state.currentLocation.latitude,
      state.currentLocation.longitude,
      state.currentLocation.accuracy
    );
  }, [state.currentLocation, updateLocation, verifyLocationWithServer]);

  // Auto start/stop monitoring based on job status
  useEffect(() => {
    if (isJobActive && job.status === 'in_progress') {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [isJobActive, job.status, startMonitoring, stopMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  // Calculate distance from job location
  const distanceFromJobSite = state.currentLocation ? 
    calculateDistance(
      state.currentLocation.latitude,
      state.currentLocation.longitude,
      job.latitude,
      job.longitude
    ) : null;

  // Determine if current location is acceptable
  const isLocationAcceptable = distanceFromJobSite !== null && 
    distanceFromJobSite <= maxDistanceThreshold &&
    (state.currentLocation?.accuracy || Infinity) <= locationAccuracyThreshold;

  return {
    ...state,
    distanceFromJobSite,
    isLocationAcceptable,
    startMonitoring,
    stopMonitoring,
    verifyLocationNow,
    updateLocation
  };
}

// Helper function to calculate distance
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
