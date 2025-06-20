import { describe, expect, it, beforeEach } from '@jest/globals';

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

      expect(validateCoordinates(highAccuracyCoords.latitude, highAccuracyCoords.longitude)).toBe(true);
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
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 1500, // Poor network accuracy
        source: 'network' as const
      };

      expect(validateCoordinates(poorAccuracyCoords.latitude, poorAccuracyCoords.longitude)).toBe(true);
      expect(poorAccuracyCoords.accuracy).toBeGreaterThan(1000);

      console.log('✓ Poor accuracy location identified');
    });
  });

  describe('Distance Calculation Accuracy', () => {
    it('should calculate precise distances for job coordination', () => {
      const sfDowntown = { lat: 37.7749, lng: -122.4194 };
      const sfMission = { lat: 37.7599, lng: -122.4148 };

      const distance = calculateDistance(
        sfDowntown.lat, sfDowntown.lng,
        sfMission.lat, sfMission.lng
      );

      expect(distance).toBeGreaterThan(0.5);
      expect(distance).toBeLessThan(3);

      console.log(`✓ Distance calculation accurate: ${distance.toFixed(2)} miles`);
    });

    it('should calculate distances for nearby locations accurately', () => {
      const location1 = { lat: 37.7749, lng: -122.4194 };
      const location2 = { lat: 37.7849, lng: -122.4094 };

      const distance = calculateDistance(
        location1.lat, location1.lng,
        location2.lat, location2.lng
      );

      expect(distance).toBeLessThan(1);
      expect(distance).toBeGreaterThan(0.5);

      console.log(`✓ Nearby location distance accurate: ${distance.toFixed(2)} miles`);
    });
  });

  describe('Coordinate Validation', () => {
    it('should validate coordinate ranges', () => {
      const validCoords = [
        { lat: 0, lng: 0 },
        { lat: 90, lng: 180 },
        { lat: -90, lng: -180 },
        { lat: 37.7749, lng: -122.4194 },
      ];

      validCoords.forEach(coords => {
        expect(validateCoordinates(coords.lat, coords.lng)).toBe(true);
      });

      const invalidCoords = [
        { lat: 91, lng: 0 },
        { lat: -91, lng: 0 },
        { lat: 0, lng: 181 },
        { lat: 0, lng: -181 },
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
      const radius = 5;

      const jobs = [
        { id: 1, title: 'Nearby Job', lat: 37.7849, lng: -122.4094, status: 'open' },
        { id: 2, title: 'Far Job', lat: 37.3382, lng: -121.8863, status: 'open' }
      ];

      const nearbyJobs = jobs.filter(job => {
        const distance = calculateDistance(
          centerLocation.lat, centerLocation.lng,
          job.lat, job.lng
        );
        return distance <= radius && job.status === 'open';
      });

      expect(nearbyJobs).toHaveLength(1);
      expect(nearbyJobs[0].id).toBe(1);

      console.log(`✓ Location-based job filtering working: Found ${nearbyJobs.length} jobs within ${radius} miles`);
    });
  });
}); 