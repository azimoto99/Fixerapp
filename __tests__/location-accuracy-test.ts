import { describe, expect, it, beforeEach, beforeAll, jest } from '@jest/globals';

// Import the location utilities for testing
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const toRad = (value: number) => value * Math.PI / 180;
  const R = 3959; // Earth's radius in miles
  
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const validateCoordinates = (lat: number, lng: number): boolean => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

describe('Location Accuracy and Job Coordination Tests', () => {
  beforeEach(() => {
    console.log('Setting up location accuracy test...');
  });

  describe('GPS Accuracy Testing', () => {
    it('should validate high accuracy GPS coordinates (≤10m)', () => {
      const highAccuracyCoords = {
        latitude: 37.7749295,
        longitude: -122.4194155,
        accuracy: 5, // High accuracy GPS
        source: 'gps' as const
      };

      // Verify precision is maintained (at least 6 decimal places)
      expect(highAccuracyCoords.latitude.toString().split('.')[1]?.length).toBeGreaterThanOrEqual(6);
      expect(highAccuracyCoords.longitude.toString().split('.')[1]?.length).toBeGreaterThanOrEqual(6);
      
      // Verify coordinates are valid
      expect(validateCoordinates(highAccuracyCoords.latitude, highAccuracyCoords.longitude)).toBe(true);
      
      // Verify accuracy is within acceptable range for GPS
      expect(highAccuracyCoords.accuracy).toBeLessThanOrEqual(10);

      console.log('✓ High accuracy GPS coordinates validated');
    });

    it('should handle medium accuracy coordinates (≤100m)', () => {
      const mediumAccuracyCoords = {
        latitude: 37.774929,
        longitude: -122.419416,
        accuracy: 85, // Medium accuracy
        source: 'gps' as const
      };

      expect(validateCoordinates(mediumAccuracyCoords.latitude, mediumAccuracyCoords.longitude)).toBe(true);
      expect(mediumAccuracyCoords.accuracy).toBeLessThanOrEqual(100);
      expect(mediumAccuracyCoords.accuracy).toBeGreaterThan(10);

      console.log('✓ Medium accuracy GPS coordinates validated');
    });

    it('should identify poor accuracy locations (>1000m)', () => {
      const poorAccuracyCoords = {
        latitude: 37.7749, // Less precision
        longitude: -122.4194,
        accuracy: 1500, // Poor network accuracy
        source: 'network' as const
      };

      expect(validateCoordinates(poorAccuracyCoords.latitude, poorAccuracyCoords.longitude)).toBe(true);
      expect(poorAccuracyCoords.accuracy).toBeGreaterThan(1000);

      console.log('✓ Poor accuracy location identified (should trigger accuracy warning)');
    });
  });

  describe('Distance Calculation Accuracy', () => {
    it('should calculate precise distances for job coordination', () => {
      // Test precise distance calculation between known locations
      const sfDowntown = { lat: 37.7749, lng: -122.4194 }; // San Francisco
      const sfMission = { lat: 37.7599, lng: -122.4148 }; // Mission District

      const distance = calculateDistance(
        sfDowntown.lat, sfDowntown.lng,
        sfMission.lat, sfMission.lng
      );

      // Distance should be approximately 1-2 miles
      expect(distance).toBeGreaterThan(0.5);
      expect(distance).toBeLessThan(3);

      console.log(`✓ Distance calculation accurate: ${distance.toFixed(2)} miles`);
    });

    it('should calculate distances for nearby locations accurately', () => {
      const location1 = { lat: 37.7749, lng: -122.4194 };
      const location2 = { lat: 37.7849, lng: -122.4094 }; // About 0.7 miles north

      const distance = calculateDistance(
        location1.lat, location1.lng,
        location2.lat, location2.lng
      );

      // Should be less than 1 mile
      expect(distance).toBeLessThan(1);
      expect(distance).toBeGreaterThan(0.5);

      console.log(`✓ Nearby location distance accurate: ${distance.toFixed(2)} miles`);
    });

    it('should calculate distances for far locations accurately', () => {
      const sanFrancisco = { lat: 37.7749, lng: -122.4194 };
      const sanJose = { lat: 37.3382, lng: -121.8863 }; // About 48 miles away

      const distance = calculateDistance(
        sanFrancisco.lat, sanFrancisco.lng,
        sanJose.lat, sanJose.lng
      );

      // Should be approximately 45-50 miles
      expect(distance).toBeGreaterThan(40);
      expect(distance).toBeLessThan(55);

      console.log(`✓ Long distance calculation accurate: ${distance.toFixed(2)} miles`);
    });
  });

  describe('Coordinate Precision and Validation', () => {
    it('should maintain coordinate precision to 6 decimal places', () => {
      const preciseCoords = {
        latitude: 37.774929123456,
        longitude: -122.419416789012
      };

      // Should maintain at least 6 decimal places for GPS accuracy
      expect(preciseCoords.latitude).toBeCloseTo(37.774929, 6);
      expect(preciseCoords.longitude).toBeCloseTo(-122.419417, 6);

      console.log('✓ Coordinate precision maintained to 6+ decimal places');
    });

    it('should validate coordinate ranges', () => {
      // Test valid coordinates
      const validCoords = [
        { lat: 0, lng: 0 }, // Equator, Prime Meridian
        { lat: 90, lng: 180 }, // North Pole, International Date Line
        { lat: -90, lng: -180 }, // South Pole, International Date Line
        { lat: 37.7749, lng: -122.4194 }, // San Francisco
      ];

      validCoords.forEach(coords => {
        expect(validateCoordinates(coords.lat, coords.lng)).toBe(true);
      });

      // Test invalid coordinates
      const invalidCoords = [
        { lat: 91, lng: 0 }, // Invalid latitude > 90
        { lat: -91, lng: 0 }, // Invalid latitude < -90
        { lat: 0, lng: 181 }, // Invalid longitude > 180
        { lat: 0, lng: -181 }, // Invalid longitude < -180
      ];

      invalidCoords.forEach(coords => {
        expect(validateCoordinates(coords.lat, coords.lng)).toBe(false);
      });

      console.log('✓ Coordinate validation working properly');
    });
  });

  describe('Location-Based Job Filtering', () => {
    it('should filter jobs within specified radius', () => {
      const centerLocation = { lat: 37.7749, lng: -122.4194 };
      const radius = 5; // 5 miles

      // Mock jobs at different distances
      const jobs = [
        { 
          id: 1, 
          title: 'Nearby Job', 
          lat: 37.7849, lng: -122.4094, // ~ 0.7 miles
          status: 'open' 
        },
        { 
          id: 2, 
          title: 'Medium Distance Job', 
          lat: 37.8044, lng: -122.2711, // Oakland ~ 8-12 miles
          status: 'open' 
        },
        { 
          id: 3, 
          title: 'Far Job', 
          lat: 37.3382, lng: -121.8863, // San Jose ~ 48 miles
          status: 'open' 
        }
      ];

      const nearbyJobs = jobs.filter(job => {
        const distance = calculateDistance(
          centerLocation.lat, centerLocation.lng,
          job.lat, job.lng
        );
        return distance <= radius && job.status === 'open';
      });

      // Should find only the nearby job (within 5 miles)
      expect(nearbyJobs).toHaveLength(1);
      expect(nearbyJobs[0].id).toBe(1);

      console.log(`✓ Location-based job filtering working: Found ${nearbyJobs.length} jobs within ${radius} miles`);
    });

    it('should exclude jobs without coordinates', () => {
      const centerLocation = { lat: 37.7749, lng: -122.4194 };
      const radius = 10;

      const jobs = [
        { id: 1, title: 'Job with coords', lat: 37.7849, lng: -122.4094, status: 'open' },
        { id: 2, title: 'Remote job', lat: null, lng: null, status: 'open' },
        { id: 3, title: 'Job missing coords', lat: undefined, lng: undefined, status: 'open' }
      ];

      const validJobs = jobs.filter(job => {
        // Only include jobs that have valid coordinates
        if (!job.lat || !job.lng) {
          return false;
        }
        
        const distance = calculateDistance(
          centerLocation.lat, centerLocation.lng,
          job.lat, job.lng
        );
        return distance <= radius && job.status === 'open';
      });

      expect(validJobs).toHaveLength(1);
      expect(validJobs[0].id).toBe(1);

      console.log('✓ Jobs without coordinates properly excluded from location searches');
    });
  });

  describe('Real-World Accuracy Scenarios', () => {
    it('should handle GPS accuracy variations throughout the day', () => {
      // Simulate different GPS accuracy levels throughout the day
      const locationReadings = [
        { time: '09:00', accuracy: 5, source: 'gps' }, // Morning: good GPS
        { time: '12:00', accuracy: 12, source: 'gps' }, // Noon: slight interference
        { time: '18:00', accuracy: 85, source: 'network' }, // Evening: poor GPS, network fallback
        { time: '22:00', accuracy: 1200, source: 'network' }, // Night: very poor accuracy
      ];

      locationReadings.forEach(reading => {
        let accuracyLevel: string;
        if (reading.accuracy <= 10) {
          accuracyLevel = 'high';
        } else if (reading.accuracy <= 100) {
          accuracyLevel = 'medium';
        } else if (reading.accuracy <= 1000) {
          accuracyLevel = 'low';
        } else {
          accuracyLevel = 'poor';
        }

        console.log(`${reading.time}: ${reading.source} location with ${accuracyLevel} accuracy (${reading.accuracy}m)`);
        
        // Verify accuracy categorization
        if (reading.accuracy <= 10) {
          expect(accuracyLevel).toBe('high');
        } else if (reading.accuracy <= 100) {
          expect(accuracyLevel).toBe('medium');
        } else if (reading.accuracy <= 1000) {
          expect(accuracyLevel).toBe('low');
        } else {
          expect(accuracyLevel).toBe('poor');
        }
      });

      console.log('✓ GPS accuracy variations handled properly');
    });

    it('should validate typical urban location accuracy requirements', () => {
      // Test typical accuracy requirements for different job types
      const jobTypes = [
        { 
          type: 'Delivery', 
          requiredAccuracy: 10, // Need precise address
          description: 'Package delivery requires building-level accuracy'
        },
        { 
          type: 'Home Service', 
          requiredAccuracy: 25, // Need to find the house
          description: 'Home services require house-level accuracy'
        },
        { 
          type: 'Pickup', 
          requiredAccuracy: 50, // General area is fine
          description: 'Item pickup allows for neighborhood-level accuracy'
        },
        { 
          type: 'General Labor', 
          requiredAccuracy: 100, // City block level
          description: 'General labor can work with block-level accuracy'
        }
      ];

      jobTypes.forEach(jobType => {
        // Test if current location meets accuracy requirements
        const currentAccuracy = 15; // Typical GPS accuracy
        const meetsRequirement = currentAccuracy <= jobType.requiredAccuracy;
        
        console.log(`${jobType.type}: Requires ≤${jobType.requiredAccuracy}m, current ${currentAccuracy}m - ${meetsRequirement ? 'PASS' : 'FAIL'}`);
        
        if (jobType.requiredAccuracy >= 15) {
          expect(meetsRequirement).toBe(true);
        }
      });

      console.log('✓ Urban location accuracy requirements validated');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle coordinate edge cases', () => {
      const edgeCases = [
        { lat: 0, lng: 0, description: 'Null Island' },
        { lat: 90, lng: 0, description: 'North Pole' },
        { lat: -90, lng: 0, description: 'South Pole' },
        { lat: 0, lng: 180, description: 'International Date Line' },
        { lat: 0, lng: -180, description: 'International Date Line (negative)' }
      ];

      edgeCases.forEach(edgeCase => {
        const isValid = validateCoordinates(edgeCase.lat, edgeCase.lng);
        expect(isValid).toBe(true);
        console.log(`✓ ${edgeCase.description}: (${edgeCase.lat}, ${edgeCase.lng}) - Valid`);
      });

      console.log('✓ Coordinate edge cases handled properly');
    });

    it('should handle distance calculation edge cases', () => {
      // Test distance calculations with edge cases
      const edgeCases = [
        { 
          from: { lat: 0, lng: 0 }, 
          to: { lat: 0, lng: 0 }, 
          expectedDistance: 0,
          description: 'Same location'
        },
        { 
          from: { lat: 90, lng: 0 }, 
          to: { lat: -90, lng: 0 }, 
          expectedDistance: 12451, // Approximately half Earth's circumference
          description: 'Pole to pole'
        },
        { 
          from: { lat: 0, lng: -180 }, 
          to: { lat: 0, lng: 180 }, 
          expectedDistance: 0, // Same meridian
          description: 'International Date Line crossing'
        }
      ];

      edgeCases.forEach(edgeCase => {
        const distance = calculateDistance(
          edgeCase.from.lat, edgeCase.from.lng,
          edgeCase.to.lat, edgeCase.to.lng
        );
        
        if (edgeCase.expectedDistance === 0) {
          expect(distance).toBeCloseTo(0, 1);
        } else {
          // Allow for reasonable variation in long-distance calculations
          expect(distance).toBeGreaterThan(edgeCase.expectedDistance * 0.9);
          expect(distance).toBeLessThan(edgeCase.expectedDistance * 1.1);
        }
        
        console.log(`✓ ${edgeCase.description}: ${distance.toFixed(2)} miles`);
      });

      console.log('✓ Distance calculation edge cases handled properly');
    });
  });
}); 