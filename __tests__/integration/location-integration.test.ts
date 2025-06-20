import { describe, expect, it, beforeEach } from '@jest/globals';
import { Storage } from '../../server/storage/DatabaseStorageV2';

describe('Location Integration Tests', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    // Note: In a real test environment, you'd want to use a separate test database
    console.log('Setting up location integration test...');
  });

  it('creates job with coordinates and retrieves them correctly', async () => {
    const testCoordinates = {
      latitude: 37.7749,
      longitude: -122.4194,
      location: 'San Francisco, CA'
    };

    const job = await Storage.createJob({
      title: 'Test Location Job',
      description: 'Testing location integration',
      category: 'Testing',
      posterId: 1,
      paymentType: 'fixed',
      paymentAmount: 100,
      totalAmount: 100,
      latitude: testCoordinates.latitude,
      longitude: testCoordinates.longitude,
      location: testCoordinates.location,
      dateNeeded: new Date().toISOString(),
      requiredSkills: [],
      equipmentProvided: false,
      autoAccept: false,
      status: 'open'
    });

    expect(job.id).toBeDefined();
    expect(job.latitude).toBe(testCoordinates.latitude);
    expect(job.longitude).toBe(testCoordinates.longitude);
    expect(job.location).toBe(testCoordinates.location);

    // Verify job can be retrieved with coordinates
    const retrievedJob = await Storage.getJob(job.id);
    expect(retrievedJob).toBeTruthy();
    expect(retrievedJob?.latitude).toBe(testCoordinates.latitude);
    expect(retrievedJob?.longitude).toBe(testCoordinates.longitude);

    console.log('✓ Job created and retrieved with coordinates successfully');
  });

  it('filters jobs by coordinates on map display', async () => {
    // Create jobs with and without coordinates
    const jobWithCoords = await Storage.createJob({
      title: 'Job With Location',
      description: 'Has coordinates',
      category: 'Testing',
      posterId: 1,
      paymentType: 'fixed',
      paymentAmount: 50,
      totalAmount: 50,
      latitude: 37.7749,
      longitude: -122.4194,
      location: 'San Francisco, CA',
      dateNeeded: new Date().toISOString(),
      requiredSkills: [],
      equipmentProvided: false,
      autoAccept: false,
      status: 'open'
    });

    const jobWithoutCoords = await Storage.createJob({
      title: 'Job Without Location',
      description: 'No coordinates',
      category: 'Testing',
      posterId: 1,
      paymentType: 'fixed',
      paymentAmount: 50,
      totalAmount: 50,
      latitude: null,
      longitude: null,
      location: 'Remote',
      dateNeeded: new Date().toISOString(),
      requiredSkills: [],
      equipmentProvided: false,
      autoAccept: false,
      status: 'open'
    });

    // Simulate map filtering logic
    const allJobs = await testDb.query.jobs.findMany();
    const jobsWithCoordinates = allJobs.filter(job => job.latitude && job.longitude);

    expect(allJobs.length).toBe(2);
    expect(jobsWithCoordinates.length).toBe(1);
    expect(jobsWithCoordinates[0].id).toBe(jobWithCoords.id);
  });

  it('calculates distance between coordinates correctly', async () => {
    // Simple distance calculation (Haversine formula)
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

    const sfCoords = { lat: 37.7749, lng: -122.4194 }; // San Francisco
    const oaklandCoords = { lat: 37.8044, lng: -122.2711 }; // Oakland

    const distance = calculateDistance(
      sfCoords.lat,
      sfCoords.lng,
      oaklandCoords.lat,
      oaklandCoords.lng
    );

    // Distance between SF and Oakland is approximately 8-12 miles
    expect(distance).toBeGreaterThan(7);
    expect(distance).toBeLessThan(15);
    
    console.log(`✓ Distance calculation works correctly: ${distance.toFixed(2)} miles`);
  });

  it('handles coordinate precision correctly', async () => {
    const preciseCoordinates = {
      latitude: 37.774929,
      longitude: -122.419416
    };

    const job = await Storage.createJob({
      title: 'Precise Location Job',
      description: 'Testing coordinate precision',
      category: 'Testing',
      posterId: 1,
      paymentType: 'fixed',
      paymentAmount: 75,
      totalAmount: 75,
      latitude: preciseCoordinates.latitude,
      longitude: preciseCoordinates.longitude,
      location: 'Precise Location',
      dateNeeded: new Date().toISOString(),
      requiredSkills: [],
      equipmentProvided: false,
      autoAccept: false,
      status: 'open'
    });

    // Verify precision is maintained
    expect(job.latitude).toBe(preciseCoordinates.latitude);
    expect(job.longitude).toBe(preciseCoordinates.longitude);
    
    console.log('✓ Coordinate precision maintained correctly');
  });
}); 