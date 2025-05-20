/**
 * Geocoding utilities for converting between addresses and coordinates
 * Using Mapbox Geocoding API
 */

// Make sure we have access to the Mapbox token
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

/**
 * Convert a text address to coordinates using Mapbox Geocoding API
 * @param address The address to geocode
 * @returns Promise resolving to coordinates or null if geocoding failed
 */
export async function geocodeAddress(address: string): Promise<{
  latitude: number;
  longitude: number;
  formattedAddress: string;
} | null> {
  if (!address || !MAPBOX_ACCESS_TOKEN) {
    console.error('Cannot geocode: Missing address or Mapbox token');
    return null;
  }

  try {
    // Encode the address for URL
    const encodedAddress = encodeURIComponent(address);
    
    // Call the Mapbox Geocoding API
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Check if we got any results
    if (!data.features || data.features.length === 0) {
      console.warn('No geocoding results found for address:', address);
      return null;
    }

    // Get the first result (most relevant)
    const location = data.features[0];
    
    // Mapbox returns coordinates as [longitude, latitude]
    const [longitude, latitude] = location.center;
    
    // Return formatted result
    return {
      latitude,
      longitude,
      formattedAddress: location.place_name
    };
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

/**
 * Try to detect coordinates in a string (in any common format)
 * @param text Text that might contain coordinates
 * @returns Coordinates if detected, null otherwise
 */
export function detectCoordinates(text: string): { latitude: number; longitude: number } | null {
  if (!text) return null;
  
  // Try to match common coordinate formats
  // Format 1: "latitude,longitude" (e.g. "40.7128,-74.0060")
  // Format 2: "latitude, longitude" (e.g. "40.7128, -74.0060")
  // Format 3: "(latitude, longitude)" (e.g. "(40.7128, -74.0060)")
  // Format 4: "latitude longitude" (e.g. "40.7128 -74.0060")
  
  const patterns = [
    /(-?\d+\.\d+),\s*(-?\d+\.\d+)/,                  // Format 1
    /(-?\d+\.\d+),\s*(-?\d+\.\d+)/,                  // Format 2
    /\(\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*\)/,     // Format 3
    /(-?\d+\.\d+)\s+(-?\d+\.\d+)/                    // Format 4
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match.length >= 3) {
      const latitude = parseFloat(match[1]);
      const longitude = parseFloat(match[2]);
      
      // Validate the coordinates are in reasonable range
      if (isValidCoordinate(latitude, longitude)) {
        return { latitude, longitude };
      }
    }
  }
  
  return null;
}

/**
 * Validate that coordinates are in a reasonable range
 */
function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 && 
    latitude <= 90 && 
    longitude >= -180 && 
    longitude <= 180
  );
}

/**
 * Reverse geocode from coordinates to address
 * @param latitude Latitude
 * @param longitude Longitude
 * @returns Promise resolving to address or null if reverse geocoding failed
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  if (!MAPBOX_ACCESS_TOKEN || !isValidCoordinate(latitude, longitude)) {
    return null;
  }
  
  try {
    // Call Mapbox Reverse Geocoding API
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`
    );
    
    if (!response.ok) {
      throw new Error(`Reverse geocoding failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if we got any results
    if (!data.features || data.features.length === 0) {
      return null;
    }
    
    // Return the place name (address)
    return data.features[0].place_name;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}