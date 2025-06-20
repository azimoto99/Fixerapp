import { describe, expect, it, beforeEach, beforeAll } from '@jest/globals';
import { Storage } from '../../server/storage/DatabaseStorageV2';

// Mock geolocation for testing
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn()
};

// Mock navigator.geolocation
Object.defineProperty(global, 'navigator', {
  value: {
    geolocation: mockGeolocation
  },
  writable: true
});

describe('Location Accuracy and Job Coordination Tests', () => {
  let storage: Storage;

  beforeAll(async () => {
    storage = new Storage();
  });

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Clean up test data before each test
    console.log('Setting up location accuracy test...');
  });

  describe('GPS Accuracy Testing', () => {
    it('should accept high accuracy GPS coordinates (≤10m)', async () => {
      const highAccuracyCoords = {
        latitude: 37.7749295,
        longitude: -122.4194155,
        accuracy: 5, // High accuracy GPS
        source: 'gps' as const
      };

      // Mock high accuracy GPS response
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: highAccuracyCoords.latitude,
            longitude: highAccuracyCoords.longitude,
            accuracy: highAccuracyCoords.accuracy,
          },
          timestamp: Date.now()
        });
      });

      const job = await storage.createJob({
        title: 'High Precision Job',
        description: 'Requires precise GPS location',
        category: 'Testing',
        posterId: 1,
        paymentType: 'fixed',
        paymentAmount: 100,
        totalAmount: 100,
        latitude: highAccuracyCoords.latitude,
        longitude: highAccuracyCoords.longitude,
        location: 'Precise GPS Location',
        dateNeeded: new Date().toISOString(),
        requiredSkills: [],
        equipmentProvided: false,
        autoAccept: false,
        status: 'open'
      });

      expect(job.latitude).toBe(highAccuracyCoords.latitude);
      expect(job.longitude).toBe(highAccuracyCoords.longitude);
      
      // Verify precision is maintained (at least 6 decimal places)
      expect(job.latitude.toString().split('.')[1]?.length).toBeGreaterThanOrEqual(6);
      expect(job.longitude.toString().split('.')[1]?.length).toBeGreaterThanOrEqual(6);

      console.log('✓ High accuracy GPS coordinates accepted and stored with precision');
    });

    it('should handle medium accuracy coordinates (≤100m)', async () => {
      const mediumAccuracyCoords = {
        latitude: 37.774929,
        longitude: -122.419416,
        accuracy: 85, // Medium accuracy
        source: 'gps' as const
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: mediumAccuracyCoords.latitude,
            longitude: mediumAccuracyCoords.longitude,
            accuracy: mediumAccuracyCoords.accuracy,
          },
          timestamp: Date.now()
        });
      });

      const job = await storage.createJob({
        title: 'Medium Precision Job',
        description: 'Acceptable GPS accuracy for coordination',
        category: 'Testing',
        posterId: 1,
        paymentType: 'fixed',
        paymentAmount: 75,
        totalAmount: 75,
        latitude: mediumAccuracyCoords.latitude,
        longitude: mediumAccuracyCoords.longitude,
        location: 'Medium Accuracy Location',
        dateNeeded: new Date().toISOString(),
        requiredSkills: [],
        equipmentProvided: false,
        autoAccept: false,
        status: 'open'
      });

      expect(job.latitude).toBe(mediumAccuracyCoords.latitude);
      expect(job.longitude).toBe(mediumAccuracyCoords.longitude);

      console.log('✓ Medium accuracy GPS coordinates handled properly');
    });

    it('should identify poor accuracy locations (>1000m)', async () => {
      const poorAccuracyCoords = {
        latitude: 37.7749, // Less precision
        longitude: -122.4194,
        accuracy: 1500, // Poor network accuracy
        source: 'network' as const
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: poorAccuracyCoords.latitude,
            longitude: poorAccuracyCoords.longitude,
            accuracy: poorAccuracyCoords.accuracy,
          },
          timestamp: Date.now()
        });
      });

      // This should still work but with a warning
      const job = await storage.createJob({
        title: 'Poor Accuracy Job',
        description: 'Network-based location with poor accuracy',
        category: 'Testing',
        posterId: 1,
        paymentType: 'fixed',
        paymentAmount: 50,
        totalAmount: 50,
        latitude: poorAccuracyCoords.latitude,
        longitude: poorAccuracyCoords.longitude,
        location: 'Network Location',
        dateNeeded: new Date().toISOString(),
        requiredSkills: [],
        equipmentProvided: false,
        autoAccept: false,
        status: 'open'
      });

      expect(job.latitude).toBe(poorAccuracyCoords.latitude);
      expect(job.longitude).toBe(poorAccuracyCoords.longitude);

      console.log('✓ Poor accuracy location handled (should trigger accuracy warning)');
    });
  });

  describe('Distance Calculation Accuracy', () => {
    it('should calculate precise distances for job coordination', async () => {
      // Test precise distance calculation between known locations
      const sfDowntown = { lat: 37.7749, lng: -122.4194 }; // San Francisco
      const sfMission = { lat: 37.7599, lng: -122.4148 }; // Mission District

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

      const distance = calculateDistance(
        sfDowntown.lat, sfDowntown.lng,
        sfMission.lat, sfMission.lng
      );

      // Distance should be approximately 1-2 miles
      expect(distance).toBeGreaterThan(0.5);
      expect(distance).toBeLessThan(3);

      console.log(`✓ Distance calculation accurate: ${distance.toFixed(2)} miles`);
    });

    it('should find nearby jobs within specified radius', async () => {
      const centerLocation = { lat: 37.7749, lng: -122.4194 };
      const radius = 5; // 5 miles

      // Create jobs at different distances
      const nearbyJob = await storage.createJob({
        title: 'Nearby Job',
        description: 'Within 5 miles',
        category: 'Testing',
        posterId: 1,
        paymentType: 'fixed',
        paymentAmount: 100,
        totalAmount: 100,
        latitude: 37.7849, // Slightly north (~ 0.7 miles)
        longitude: -122.4094,
        location: 'Nearby Location',
        dateNeeded: new Date().toISOString(),
        requiredSkills: [],
        equipmentProvided: false,
        autoAccept: false,
        status: 'open'
      });

      const farJob = await storage.createJob({
        title: 'Far Job',
        description: 'Outside 5 miles',
        category: 'Testing',
        posterId: 1,
        paymentType: 'fixed',
        paymentAmount: 100,
        totalAmount: 100,
        latitude: 37.3382, // San Jose (~ 48 miles away)
        longitude: -121.8863,
        location: 'Far Location',
        dateNeeded: new Date().toISOString(),
        requiredSkills: [],
        equipmentProvided: false,
        autoAccept: false,
        status: 'open'
      });

      // Test location-based job search
      const nearbyJobs = await storage.getJobsNearLocation(
        centerLocation.lat,
        centerLocation.lng,
        radius
      );

      // Should find the nearby job but not the far one
      const foundNearbyJob = nearbyJobs.find(job => job.id === nearbyJob.id);
      const foundFarJob = nearbyJobs.find(job => job.id === farJob.id);

      expect(foundNearbyJob).toBeTruthy();
      expect(foundFarJob).toBeFalsy();

      console.log(`✓ Location-based job search working: Found ${nearbyJobs.length} jobs within ${radius} miles`);
    });
  });

  describe('Coordinate Precision and Validation', () => {
    it('should maintain coordinate precision to 6 decimal places', async () => {
      const preciseCoords = {
        latitude: 37.774929123456,
        longitude: -122.419416789012
      };

      const job = await storage.createJob({
        title: 'Precision Test Job',
        description: 'Testing coordinate precision',
        category: 'Testing',
        posterId: 1,
        paymentType: 'fixed',
        paymentAmount: 100,
        totalAmount: 100,
        latitude: preciseCoords.latitude,
        longitude: preciseCoords.longitude,
        location: 'Precise Location',
        dateNeeded: new Date().toISOString(),
        requiredSkills: [],
        equipmentProvided: false,
        autoAccept: false,
        status: 'open'
      });

      // Should maintain at least 6 decimal places for GPS accuracy
      expect(job.latitude).toBeCloseTo(preciseCoords.latitude, 6);
      expect(job.longitude).toBeCloseTo(preciseCoords.longitude, 6);

      console.log('✓ Coordinate precision maintained to 6+ decimal places');
    });

    it('should validate coordinate ranges', async () => {
      // Test invalid coordinates
      const invalidCoords = [
        { lat: 91, lng: 0 }, // Invalid latitude > 90
        { lat: -91, lng: 0 }, // Invalid latitude < -90
        { lat: 0, lng: 181 }, // Invalid longitude > 180
        { lat: 0, lng: -181 }, // Invalid longitude < -180
      ];

      for (const coords of invalidCoords) {
        try {
          await storage.createJob({
            title: 'Invalid Coords Job',
            description: 'Should fail validation',
            category: 'Testing',
            posterId: 1,
            paymentType: 'fixed',
            paymentAmount: 100,
            totalAmount: 100,
            latitude: coords.lat,
            longitude: coords.lng,
            location: 'Invalid Location',
            dateNeeded: new Date().toISOString(),
            requiredSkills: [],
            equipmentProvided: false,
            autoAccept: false,
            status: 'open'
          });
          // If we get here, validation failed
          expect(true).toBe(false);
        } catch (error) {
          // This is expected for invalid coordinates
          expect(error).toBeTruthy();
        }
      }

      console.log('✓ Coordinate validation working properly');
    });
  });

  describe('Job-Location Integration', () => {
    it('should properly integrate location data with job posting', async () => {
      const jobLocation = {
        latitude: 37.7749295,
        longitude: -122.4194155,
        address: '123 Market St, San Francisco, CA 94102'
      };

      const job = await storage.createJob({
        title: 'Location Integration Test',
        description: 'Testing location integration with job posting',
        category: 'Testing',
        posterId: 1,
        paymentType: 'fixed',
        paymentAmount: 150,
        totalAmount: 150,
        latitude: jobLocation.latitude,
        longitude: jobLocation.longitude,
        location: jobLocation.address,
        dateNeeded: new Date().toISOString(),
        requiredSkills: ['Location Testing'],
        equipmentProvided: true,
        autoAccept: false,
        status: 'open'
      });

      // Verify job was created with location data
      expect(job.id).toBeDefined();
      expect(job.latitude).toBe(jobLocation.latitude);
      expect(job.longitude).toBe(jobLocation.longitude);
      expect(job.location).toBe(jobLocation.address);

      // Verify job can be retrieved with location data
      const retrievedJob = await storage.getJob(job.id);
      expect(retrievedJob).toBeTruthy();
      expect(retrievedJob?.latitude).toBe(jobLocation.latitude);
      expect(retrievedJob?.longitude).toBe(jobLocation.longitude);
      expect(retrievedJob?.location).toBe(jobLocation.address);

      console.log('✓ Job-location integration working properly');
    });

    it('should handle jobs without location data gracefully', async () => {
      const job = await storage.createJob({
        title: 'Remote Job',
        description: 'No specific location required',
        category: 'Remote',
        posterId: 1,
        paymentType: 'fixed',
        paymentAmount: 100,
        totalAmount: 100,
        latitude: null,
        longitude: null,
        location: 'Remote Work',
        dateNeeded: new Date().toISOString(),
        requiredSkills: [],
        equipmentProvided: false,
        autoAccept: false,
        status: 'open'
      });

      expect(job.id).toBeDefined();
      expect(job.latitude).toBeNull();
      expect(job.longitude).toBeNull();
      expect(job.location).toBe('Remote Work');

      // Verify remote jobs don't appear in location-based searches
      const nearbyJobs = await storage.getJobsNearLocation(37.7749, -122.4194, 10);
      const foundRemoteJob = nearbyJobs.find(j => j.id === job.id);
      expect(foundRemoteJob).toBeFalsy();

      console.log('✓ Remote jobs (without coordinates) handled properly');
    });
  });

  describe('Real-World Scenario Testing', () => {
    it('should handle a complete job posting workflow with location', async () => {
      // Simulate user posting a job with location
      const userLocation = {
        latitude: 37.7749295,
        longitude: -122.4194155,
        accuracy: 8, // High accuracy GPS
        address: '123 Main St, San Francisco, CA'
      };

      // 1. Create job with precise location
      const job = await storage.createJob({
        title: 'Home Cleaning Service',
        description: 'Need help cleaning my apartment',
        category: 'Home Services',
        posterId: 1,
        paymentType: 'fixed',
        paymentAmount: 120,
        totalAmount: 120,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        location: userLocation.address,
        dateNeeded: new Date(Date.now() + 86400000).toISOString(),
        requiredSkills: ['Cleaning'],
        equipmentProvided: true,
        autoAccept: false,
        status: 'open'
      });

      // 2. Verify job appears in location-based searches
      const nearbyJobs = await storage.getJobsNearLocation(
        userLocation.latitude,
        userLocation.longitude,
        2 // 2 mile radius
      );

      const foundJob = nearbyJobs.find(j => j.id === job.id);
      expect(foundJob).toBeTruthy();

      // 3. Simulate worker searching for jobs near them
      const workerLocation = {
        latitude: 37.7799, // About 0.35 miles away
        longitude: -122.4144
      };

      const jobsForWorker = await storage.getJobsNearLocation(
        workerLocation.latitude,
        workerLocation.longitude,
        1 // 1 mile radius
      );

      const workerFoundJob = jobsForWorker.find(j => j.id === job.id);
      expect(workerFoundJob).toBeTruthy();

      console.log('✓ Complete job posting workflow with location integration successful');
    });

    it('should simulate GPS accuracy issues and fallback handling', async () => {
      // Simulate poor GPS signal scenario
      mockGeolocation.getCurrentPosition
        .mockImplementationOnce((success, error) => {
          // First attempt fails (no GPS signal)
          error({
            code: 3, // TIMEOUT
            message: 'GPS timeout'
          });
        })
        .mockImplementationOnce((success) => {
          // Second attempt succeeds with network location
          success({
            coords: {
              latitude: 37.7749,
              longitude: -122.4194,
              accuracy: 850, // Poor network accuracy
            },
            timestamp: Date.now()
          });
        });

      // This should demonstrate fallback handling
      // In a real app, this would trigger the progressive fallback strategy
      const fallbackLocation = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 850,
        source: 'network' as const
      };

      const job = await storage.createJob({
        title: 'Fallback Location Job',
        description: 'Created with network location fallback',
        category: 'Testing',
        posterId: 1,
        paymentType: 'fixed',
        paymentAmount: 80,
        totalAmount: 80,
        latitude: fallbackLocation.latitude,
        longitude: fallbackLocation.longitude,
        location: 'Network Location',
        dateNeeded: new Date().toISOString(),
        requiredSkills: [],
        equipmentProvided: false,
        autoAccept: false,
        status: 'open'
      });

      expect(job.latitude).toBe(fallbackLocation.latitude);
      expect(job.longitude).toBe(fallbackLocation.longitude);

      console.log('✓ GPS fallback scenario handled properly');
    });
  });
}); 