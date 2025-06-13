/**
 * Location utilities for accuracy validation and location source detection
 */

export interface LocationAccuracyInfo {
  accuracy: number | undefined;
  accuracyLevel: 'high' | 'medium' | 'low' | 'fallback';
  source: 'gps' | 'network' | 'fallback';
  isAcceptable: boolean;
  description: string;
}

// Location accuracy thresholds (in meters)
export const LOCATION_ACCURACY_THRESHOLDS = {
  HIGH: 10,      // GPS-level accuracy (within 10 meters)
  MEDIUM: 100,   // Good network accuracy (within 100 meters)
  LOW: 1000,     // Poor network accuracy (within 1 km)
  FALLBACK: 10000 // City-level accuracy (within 10 km)
} as const;

/**
 * Analyze location accuracy and provide detailed information
 */
export function analyzeLocationAccuracy(accuracy: number | undefined): LocationAccuracyInfo {
  if (!accuracy || accuracy > LOCATION_ACCURACY_THRESHOLDS.FALLBACK) {
    return {
      accuracy,
      accuracyLevel: 'fallback',
      source: 'fallback',
      isAcceptable: false,
      description: 'Location unavailable or very inaccurate'
    };
  }

  if (accuracy <= LOCATION_ACCURACY_THRESHOLDS.HIGH) {
    return {
      accuracy,
      accuracyLevel: 'high',
      source: 'gps',
      isAcceptable: true,
      description: `High accuracy GPS location (±${accuracy.toFixed(0)}m)`
    };
  }

  if (accuracy <= LOCATION_ACCURACY_THRESHOLDS.MEDIUM) {
    return {
      accuracy,
      accuracyLevel: 'medium',
      source: 'gps',
      isAcceptable: true,
      description: `Medium accuracy GPS location (±${accuracy.toFixed(0)}m)`
    };
  }

  if (accuracy <= LOCATION_ACCURACY_THRESHOLDS.LOW) {
    return {
      accuracy,
      accuracyLevel: 'low',
      source: 'network',
      isAcceptable: true,
      description: `Network-based location (±${accuracy.toFixed(0)}m)`
    };
  }

  return {
    accuracy,
    accuracyLevel: 'fallback',
    source: 'network',
    isAcceptable: false,
    description: `Poor accuracy location (±${accuracy.toFixed(0)}m)`
  };
}

/**
 * Check if a location meets minimum accuracy requirements
 */
export function isLocationAccuracyAcceptable(accuracy: number | undefined, minAccuracy: number = LOCATION_ACCURACY_THRESHOLDS.LOW): boolean {
  return accuracy !== undefined && accuracy <= minAccuracy;
}

/**
 * Get user-friendly description of location accuracy
 */
export function getLocationAccuracyDescription(accuracy: number | undefined): string {
  const info = analyzeLocationAccuracy(accuracy);
  return info.description;
}

/**
 * Determine if location should be cached based on accuracy
 */
export function shouldCacheLocation(accuracy: number | undefined): boolean {
  const info = analyzeLocationAccuracy(accuracy);
  // Only cache high and medium accuracy locations
  return info.accuracyLevel === 'high' || info.accuracyLevel === 'medium';
}

/**
 * Get appropriate cache duration based on location accuracy
 */
export function getLocationCacheDuration(accuracy: number | undefined): number {
  const info = analyzeLocationAccuracy(accuracy);
  
  switch (info.accuracyLevel) {
    case 'high':
      return 5 * 60 * 1000; // 5 minutes for high accuracy
    case 'medium':
      return 3 * 60 * 1000; // 3 minutes for medium accuracy
    case 'low':
      return 1 * 60 * 1000; // 1 minute for low accuracy
    default:
      return 0; // Don't cache fallback locations
  }
}

/**
 * Validate coordinates are within reasonable bounds
 */
export function validateCoordinates(latitude: number, longitude: number): boolean {
  return (
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 && 
    latitude <= 90 && 
    longitude >= -180 && 
    longitude <= 180 &&
    // Exclude null island (0,0) as it's likely an error
    !(latitude === 0 && longitude === 0)
  );
}

/**
 * Check if location appears to be a city-level fallback location
 */
export function isCityLevelLocation(accuracy: number | undefined): boolean {
  return !accuracy || accuracy > LOCATION_ACCURACY_THRESHOLDS.MEDIUM;
}

/**
 * Get recommended geolocation options based on use case
 */
export function getGeolocationOptions(useCase: 'initial' | 'refresh' | 'high-accuracy'): PositionOptions {
  switch (useCase) {
    case 'initial':
      return {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000 // 1 minute cache for initial load
      };
    
    case 'refresh':
      return {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000 // 30 second cache for refresh
      };
    
    case 'high-accuracy':
      return {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0 // No cache for high accuracy requests
      };
    
    default:
      return {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      };
  }
}

/**
 * Format location for display purposes
 */
export function formatLocationForDisplay(latitude: number, longitude: number, accuracy?: number): string {
  const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  if (accuracy) {
    const info = analyzeLocationAccuracy(accuracy);
    return `${coords} (${info.description})`;
  }
  return coords;
}
