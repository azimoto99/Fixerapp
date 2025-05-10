/**
 * Geocoding service to convert addresses to coordinates
 * Uses a combination of browser's Geolocation API and nominatim for geocoding
 */

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName?: string;
  success: boolean;
  error?: string;
}

/**
 * Geocode an address string to coordinates
 * @param address Address or postal code to geocode
 * @returns Promise with geocoding result
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult> {
  try {
    // Check if address is empty
    if (!address || address.trim() === '') {
      return {
        latitude: 0,
        longitude: 0,
        success: false,
        error: 'Please enter an address or postal code'
      };
    }

    console.log("Attempting to geocode address:", address);
    
    // In a development environment, some geocoding services might block requests
    // Let's provide an alternative approach with a fallback for common locations
    
    // First try with OpenStreetMap's Nominatim service
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'Accept': 'application/json',
            // Add a custom user agent as per Nominatim's usage policy
            'User-Agent': 'TheJobApp/1.0',
            'Referer': window.location.origin
          },
          // Prevent caching
          cache: 'no-cache'
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Nominatim response:", data);
        
        // Check if we got any results
        if (data && data.length > 0) {
          // Extract the coordinates from the first result
          const result = data[0];
          return {
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            displayName: result.display_name,
            success: true
          };
        }
      } else {
        console.warn("Nominatim API returned error:", response.status, response.statusText);
      }
    } catch (e) {
      console.warn("Error using Nominatim:", e);
    }
    
    // Try multiple geocoding approaches if initial one fails
    // For a production app, consider using a paid geocoding service with better reliability
    // Or implementing additional geocoding providers as fallbacks
    try {
      // You could add alternative geocoding service calls here
      console.log("Primary geocoding service failed, no fallbacks available");
    } catch (innerError) {
      console.error("All geocoding approaches failed:", innerError);
    }
    
    // If all geocoding approaches fail, return an error
    console.error("All geocoding approaches failed");
    return {
      latitude: 0,
      longitude: 0,
      success: false,
      error: "Unable to find location coordinates. Please try a different address or location."
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      latitude: 0,
      longitude: 0,
      success: false,
      error: 'Failed to geocode address. Please try again later.'
    };
  }
}

/**
 * Get an address from coordinates (reverse geocoding)
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Promise with address information
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<{
  success: boolean;
  displayName?: string;
  error?: string;
}> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TheJobAppGeocodingService/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to reverse geocode coordinates');
    }

    const data = await response.json();

    if (!data || data.error) {
      return {
        success: false,
        error: 'Could not find address for this location'
      };
    }

    return {
      success: true,
      displayName: data.display_name
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return {
      success: false,
      error: 'Failed to get address information'
    };
  }
}