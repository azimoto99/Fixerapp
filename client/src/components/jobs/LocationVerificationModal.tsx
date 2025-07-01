import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  Navigation, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Loader2,
  RefreshCw,
  Clock
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Job } from '@/types';

interface LocationVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  onJobStarted: (job: Job) => void;
}

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: Date | null;
  error: string | null;
  isLoading: boolean;
}

interface VerificationResult {
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low' | 'rejected';
  distance: number;
  accuracy: number | null;
  reasons: string[];
}

export default function LocationVerificationModal({
  isOpen,
  onClose,
  job,
  onJobStarted
}: LocationVerificationModalProps) {
  const [locationState, setLocationState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
    error: null,
    isLoading: false
  });

  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isStartingJob, setIsStartingJob] = useState(false);
  const [step, setStep] = useState<'location' | 'verification' | 'starting' | 'complete'>('location');

  // Calculate distance from job location
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
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
  }, []);

  // Get current location with high accuracy
  const getCurrentLocation = useCallback(() => {
    setLocationState(prev => ({ ...prev, isLoading: true, error: null }));

    if (!navigator.geolocation) {
      setLocationState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Geolocation is not supported by this browser'
      }));
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 20000, // 20 seconds
      maximumAge: 0 // No cache - get fresh location
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const timestamp = new Date(position.timestamp);

        setLocationState({
          latitude,
          longitude,
          accuracy,
          timestamp,
          error: null,
          isLoading: false
        });

        // Calculate distance from job location
        const distance = calculateDistance(latitude, longitude, job.latitude, job.longitude);
        
        // Determine verification confidence based on distance and accuracy
        let confidence: 'high' | 'medium' | 'low' | 'rejected' = 'high';
        const reasons: string[] = [];

        if (distance > 500) {
          confidence = 'rejected';
          reasons.push(`You are ${Math.round(distance)}m away from the job location (max: 500m)`);
        } else if (distance > 200) {
          confidence = 'low';
          reasons.push(`You are ${Math.round(distance)}m from the job location`);
        } else if (distance > 100) {
          confidence = 'medium';
          reasons.push(`You are ${Math.round(distance)}m from the job location`);
        }

        if (accuracy && accuracy > 100) {
          if (confidence !== 'rejected') confidence = 'low';
          reasons.push(`GPS accuracy is ${Math.round(accuracy)}m (recommended: <100m)`);
        }

        setVerificationResult({
          isValid: confidence !== 'rejected',
          confidence,
          distance,
          accuracy,
          reasons
        });

        setStep('verification');
      },
      (error) => {
        let errorMessage = 'Unable to get your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please check your GPS settings.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }

        setLocationState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }));
      },
      options
    );
  }, [calculateDistance, job.latitude, job.longitude]);

  // Start job with location verification
  const startJobWithLocation = async () => {
    if (!locationState.latitude || !locationState.longitude || !locationState.timestamp) {
      return;
    }

    setIsStartingJob(true);
    setStep('starting');

    try {
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      const response = await apiRequest('POST', `/api/jobs/${job.id}/start-with-location`, {
        latitude: locationState.latitude,
        longitude: locationState.longitude,
        accuracy: locationState.accuracy,
        timestamp: locationState.timestamp.toISOString(),
        source: 'gps',
        deviceInfo
      });
      
      const result = await response.json();

      if (result.success) {
        setStep('complete');
        onJobStarted(result.job);
        
        // Close modal after a brief delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error(result.message || 'Failed to start job');
      }
    } catch (error) {
      console.error('Job start error:', error);
      setLocationState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start job'
      }));
      setStep('verification');
    } finally {
      setIsStartingJob(false);
    }
  };

  // Auto-get location when modal opens
  useEffect(() => {
    if (isOpen && step === 'location') {
      getCurrentLocation();
    }
  }, [isOpen, step, getCurrentLocation]);

  const getConfidenceBadgeVariant = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'medium': return <Shield className="h-4 w-4 text-blue-600" />;
      case 'low': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Location Verification
          </DialogTitle>
          <DialogDescription>
            We need to verify your location before you can start this job.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Job Location Info */}
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">Job Location:</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{job.location}</p>
          </div>

          {/* Step 1: Getting Location */}
          {step === 'location' && (
            <div className="space-y-4">
              {locationState.isLoading ? (
                <div className="text-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Getting your precise location...</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    This may take up to 20 seconds for high accuracy
                  </p>
                </div>
              ) : locationState.error ? (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{locationState.error}</AlertDescription>
                  </Alert>
                  <Button onClick={getCurrentLocation} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : null}
            </div>
          )}

          {/* Step 2: Verification Results */}
          {step === 'verification' && verificationResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Verification Status:</span>
                <Badge variant={getConfidenceBadgeVariant(verificationResult.confidence)}>
                  {getConfidenceIcon(verificationResult.confidence)}
                  <span className="ml-1 capitalize">{verificationResult.confidence}</span>
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Distance from job:</span>
                  <span className="font-medium">{Math.round(verificationResult.distance)}m</span>
                </div>
                {verificationResult.accuracy && (
                  <div className="flex justify-between text-sm">
                    <span>GPS accuracy:</span>
                    <span className="font-medium">±{Math.round(verificationResult.accuracy)}m</span>
                  </div>
                )}
                {locationState.timestamp && (
                  <div className="flex justify-between text-sm">
                    <span>Location time:</span>
                    <span className="font-medium">
                      {locationState.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>

              {verificationResult.reasons.length > 0 && (
                <Alert variant={verificationResult.isValid ? "default" : "destructive"}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {verificationResult.reasons.map((reason, index) => (
                        <li key={index} className="text-sm">{reason}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('location');
                    getCurrentLocation();
                  }}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Location
                </Button>
                <Button
                  onClick={startJobWithLocation}
                  disabled={!verificationResult.isValid || isStartingJob}
                  className="flex-1"
                >
                  {isStartingJob ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Start Job
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Starting Job */}
          {step === 'starting' && (
            <div className="text-center py-6">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Starting job...</p>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && (
            <div className="text-center py-6">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="font-medium text-green-600">Job Started Successfully!</p>
              <p className="text-sm text-muted-foreground mt-2">
                You can now begin working on this job.
              </p>
            </div>
          )}

          {/* Security Notice */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-medium">Security Notice</p>
                <p>Your location is verified to ensure job authenticity and protect all users.</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
