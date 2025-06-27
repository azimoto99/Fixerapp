import { Request } from 'express';
import { storage } from '../storage';

export interface LocationVerificationResult {
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low' | 'rejected';
  distance: number; // Distance from job location in meters
  accuracy: number | null; // GPS accuracy in meters
  source: 'gps' | 'network' | 'ip' | 'unknown';
  timestamp: Date;
  reasons: string[];
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    deviceFingerprint?: string;
    previousLocations?: Array<{
      latitude: number;
      longitude: number;
      timestamp: Date;
      accuracy?: number;
    }>;
  };
}

export interface LocationVerificationRequest {
  jobId: number;
  workerId: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
  source?: 'gps' | 'network' | 'ip';
  deviceInfo?: {
    userAgent: string;
    platform: string;
    language: string;
    timezone: string;
  };
}

export class LocationVerificationService {
  // Maximum allowed distance from job location (in meters)
  private static readonly MAX_DISTANCE_METERS = 500; // 500 meters (~0.3 miles)
  
  // Minimum required GPS accuracy (in meters)
  private static readonly MIN_GPS_ACCURACY = 100; // 100 meters
  
  // Maximum time difference allowed (in milliseconds)
  private static readonly MAX_TIME_DIFF = 5 * 60 * 1000; // 5 minutes
  
  // Minimum time between location updates to prevent rapid spoofing
  private static readonly MIN_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

  /**
   * Verify worker's location when starting a job
   */
  static async verifyJobStartLocation(
    req: LocationVerificationRequest,
    httpRequest?: Request
  ): Promise<LocationVerificationResult> {
    const reasons: string[] = [];
    let confidence: 'high' | 'medium' | 'low' | 'rejected' = 'high';
    
    try {
      // Get job details
      const job = await storage.getJob(req.jobId);
      if (!job) {
        return {
          isValid: false,
          confidence: 'rejected',
          distance: 0,
          accuracy: req.accuracy || null,
          source: req.source || 'unknown',
          timestamp: req.timestamp,
          reasons: ['Job not found'],
          metadata: {}
        };
      }

      // Verify worker is assigned to this job
      if (job.workerId !== req.workerId) {
        return {
          isValid: false,
          confidence: 'rejected',
          distance: 0,
          accuracy: req.accuracy || null,
          source: req.source || 'unknown',
          timestamp: req.timestamp,
          reasons: ['Worker not assigned to this job'],
          metadata: {}
        };
      }

      // Calculate distance from job location
      const distance = this.calculateDistance(
        req.latitude,
        req.longitude,
        job.latitude,
        job.longitude
      );

      // Validate coordinates
      if (!this.isValidCoordinates(req.latitude, req.longitude)) {
        reasons.push('Invalid coordinates provided');
        confidence = 'rejected';
      }

      // Check if location is too far from job site
      if (distance > this.MAX_DISTANCE_METERS) {
        reasons.push(`Location is ${Math.round(distance)}m from job site (max: ${this.MAX_DISTANCE_METERS}m)`);
        confidence = 'rejected';
      }

      // Validate GPS accuracy if provided
      if (req.accuracy && req.accuracy > this.MIN_GPS_ACCURACY) {
        reasons.push(`GPS accuracy too low: ${req.accuracy}m (min required: ${this.MIN_GPS_ACCURACY}m)`);
        if (confidence !== 'rejected') confidence = 'low';
      }

      // Check timestamp freshness
      const timeDiff = Math.abs(Date.now() - req.timestamp.getTime());
      if (timeDiff > this.MAX_TIME_DIFF) {
        reasons.push(`Location timestamp too old: ${Math.round(timeDiff / 1000)}s ago`);
        if (confidence !== 'rejected') confidence = 'low';
      }

      // Get user's recent location history for pattern analysis
      const recentLocations = await this.getRecentLocationHistory(req.workerId);
      
      // Check for suspicious location patterns
      const suspiciousPatterns = this.detectSuspiciousPatterns(
        req,
        recentLocations
      );
      
      if (suspiciousPatterns.length > 0) {
        reasons.push(...suspiciousPatterns);
        if (confidence !== 'rejected') confidence = 'low';
      }

      // Analyze device consistency
      const deviceAnalysis = await this.analyzeDeviceConsistency(
        req.workerId,
        req.deviceInfo,
        httpRequest
      );
      
      if (!deviceAnalysis.isConsistent) {
        reasons.push(...deviceAnalysis.reasons);
        if (confidence !== 'rejected') confidence = 'medium';
      }

      // Store location verification attempt
      await this.storeLocationVerification({
        workerId: req.workerId,
        jobId: req.jobId,
        latitude: req.latitude,
        longitude: req.longitude,
        accuracy: req.accuracy,
        distance,
        confidence,
        isValid: confidence !== 'rejected',
        timestamp: req.timestamp,
        reasons: reasons.join('; '),
        metadata: {
          userAgent: httpRequest?.get('User-Agent'),
          ipAddress: this.getClientIP(httpRequest),
          source: req.source
        }
      });

      return {
        isValid: confidence !== 'rejected',
        confidence,
        distance,
        accuracy: req.accuracy || null,
        source: req.source || 'unknown',
        timestamp: req.timestamp,
        reasons,
        metadata: {
          userAgent: httpRequest?.get('User-Agent'),
          ipAddress: this.getClientIP(httpRequest),
          previousLocations: recentLocations
        }
      };

    } catch (error) {
      console.error('Location verification error:', error);
      return {
        isValid: false,
        confidence: 'rejected',
        distance: 0,
        accuracy: req.accuracy || null,
        source: req.source || 'unknown',
        timestamp: req.timestamp,
        reasons: ['Internal verification error'],
        metadata: {}
      };
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Validate coordinates are within reasonable bounds
   */
  private static isValidCoordinates(lat: number, lon: number): boolean {
    return (
      !isNaN(lat) &&
      !isNaN(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180 &&
      !(lat === 0 && lon === 0) // Exclude null island
    );
  }

  /**
   * Get recent location history for pattern analysis
   */
  private static async getRecentLocationHistory(workerId: number) {
    try {
      // This would query a location_history table
      // For now, return empty array - implement based on your storage system
      return [];
    } catch (error) {
      console.error('Error fetching location history:', error);
      return [];
    }
  }

  /**
   * Detect suspicious location patterns
   */
  private static detectSuspiciousPatterns(
    currentLocation: LocationVerificationRequest,
    recentLocations: any[]
  ): string[] {
    const suspiciousPatterns: string[] = [];

    // Check for impossible travel speed
    if (recentLocations.length > 0) {
      const lastLocation = recentLocations[0];
      const timeDiff = currentLocation.timestamp.getTime() - lastLocation.timestamp.getTime();
      const distance = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        lastLocation.latitude,
        lastLocation.longitude
      );

      // Calculate speed in km/h
      const speedKmh = (distance / 1000) / (timeDiff / (1000 * 60 * 60));
      
      // Flag if speed exceeds reasonable limits (e.g., 200 km/h)
      if (speedKmh > 200) {
        suspiciousPatterns.push(`Impossible travel speed: ${Math.round(speedKmh)} km/h`);
      }
    }

    // Check for repeated exact coordinates (possible spoofing)
    const exactMatches = recentLocations.filter(loc =>
      loc.latitude === currentLocation.latitude &&
      loc.longitude === currentLocation.longitude
    );

    if (exactMatches.length > 3) {
      suspiciousPatterns.push('Repeated exact coordinates detected');
    }

    // Check for location jumping (rapid changes in location)
    if (recentLocations.length >= 2) {
      const distances = [];
      for (let i = 0; i < Math.min(recentLocations.length - 1, 5); i++) {
        const dist = this.calculateDistance(
          recentLocations[i].latitude,
          recentLocations[i].longitude,
          recentLocations[i + 1].latitude,
          recentLocations[i + 1].longitude
        );
        distances.push(dist);
      }

      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      if (avgDistance > 10000) { // 10km average jumps
        suspiciousPatterns.push('Erratic location pattern detected');
      }
    }

    return suspiciousPatterns;
  }

  /**
   * Analyze device consistency
   */
  private static async analyzeDeviceConsistency(
    workerId: number,
    deviceInfo?: any,
    httpRequest?: Request
  ) {
    const reasons: string[] = [];
    let isConsistent = true;

    try {
      // Check User-Agent consistency
      const currentUserAgent = httpRequest?.get('User-Agent');
      if (currentUserAgent) {
        // This would check against stored user agents for this user
        // For now, just basic validation
        if (currentUserAgent.length < 10 || !currentUserAgent.includes('Mozilla')) {
          reasons.push('Suspicious User-Agent detected');
          isConsistent = false;
        }
      }

      // Check for common spoofing indicators
      if (deviceInfo) {
        // Check timezone consistency
        const browserTimezone = deviceInfo.timezone;
        if (browserTimezone && !this.isValidTimezone(browserTimezone)) {
          reasons.push('Invalid timezone detected');
          isConsistent = false;
        }

        // Check language consistency
        if (deviceInfo.language && !this.isValidLanguage(deviceInfo.language)) {
          reasons.push('Suspicious language setting');
          isConsistent = false;
        }
      }

      return { isConsistent, reasons };
    } catch (error) {
      console.error('Device analysis error:', error);
      return { isConsistent: true, reasons: [] };
    }
  }

  private static isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  private static isValidLanguage(language: string): boolean {
    // Basic language code validation
    return /^[a-z]{2}(-[A-Z]{2})?$/.test(language);
  }

  /**
   * Store location verification attempt
   */
  private static async storeLocationVerification(data: any) {
    try {
      // This would store in a location_verifications table
      // Implement based on your storage system
      console.log('Location verification stored:', data);
    } catch (error) {
      console.error('Error storing location verification:', error);
    }
  }

  /**
   * Get client IP address
   */
  private static getClientIP(req?: Request): string | undefined {
    if (!req) return undefined;
    
    return (
      req.get('X-Forwarded-For')?.split(',')[0] ||
      req.get('X-Real-IP') ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      undefined
    );
  }

  /**
   * Verify ongoing job location (for periodic checks)
   */
  static async verifyOngoingJobLocation(
    jobId: number,
    workerId: number,
    latitude: number,
    longitude: number,
    accuracy?: number
  ): Promise<LocationVerificationResult> {
    // Similar to job start verification but with relaxed constraints
    const request: LocationVerificationRequest = {
      jobId,
      workerId,
      latitude,
      longitude,
      accuracy,
      timestamp: new Date(),
      source: 'gps'
    };

    const result = await this.verifyJobStartLocation(request);
    
    // For ongoing verification, we're more lenient
    if (result.distance <= this.MAX_DISTANCE_METERS * 2) { // Double the allowed distance
      result.isValid = true;
      if (result.confidence === 'rejected') {
        result.confidence = 'low';
      }
    }

    return result;
  }
}
