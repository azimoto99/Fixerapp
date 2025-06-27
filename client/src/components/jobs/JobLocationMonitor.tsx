import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, 
  Navigation, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Clock,
  Zap
} from 'lucide-react';
import { useJobLocationMonitoring } from '@/hooks/useJobLocationMonitoring';
import { Job } from '@/types';

interface JobLocationMonitorProps {
  job: Job;
  isJobActive: boolean;
  className?: string;
}

export default function JobLocationMonitor({ 
  job, 
  isJobActive, 
  className = '' 
}: JobLocationMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    isMonitoring,
    currentLocation,
    lastVerification,
    error,
    verificationHistory,
    distanceFromJobSite,
    isLocationAcceptable,
    verifyLocationNow,
    updateLocation
  } = useJobLocationMonitoring({
    job,
    isJobActive,
    monitoringInterval: 5 * 60 * 1000, // 5 minutes
    locationAccuracyThreshold: 100, // 100m
    maxDistanceThreshold: 1000 // 1km
  });

  const getStatusColor = () => {
    if (!isMonitoring) return 'text-gray-500';
    if (error) return 'text-red-600';
    if (!isLocationAcceptable) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (!isMonitoring) return <MapPin className="h-4 w-4" />;
    if (error) return <XCircle className="h-4 w-4" />;
    if (!isLocationAcceptable) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (!isMonitoring) return 'Location monitoring inactive';
    if (error) return 'Location error';
    if (!isLocationAcceptable) return 'Location verification warning';
    return 'Location verified';
  };

  const getConfidenceBadge = (confidence: string) => {
    const variants = {
      high: 'default',
      medium: 'secondary',
      low: 'outline',
      rejected: 'destructive'
    } as const;
    
    return variants[confidence as keyof typeof variants] || 'outline';
  };

  if (!isJobActive || job.status !== 'in_progress') {
    return null;
  }

  return (
    <Card className={`border-l-4 ${isLocationAcceptable ? 'border-l-green-500' : 'border-l-yellow-500'} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className={getStatusColor()}>
              {getStatusIcon()}
            </div>
            Location Monitoring
          </CardTitle>
          <div className="flex items-center gap-2">
            {isMonitoring && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-muted-foreground">Active</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Status Summary */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{getStatusText()}</span>
          {lastVerification && (
            <Badge variant={getConfidenceBadge(lastVerification.confidence)}>
              {lastVerification.confidence}
            </Badge>
          )}
        </div>

        {/* Distance Display */}
        {distanceFromJobSite !== null && (
          <div className="flex items-center justify-between text-sm">
            <span>Distance from job site:</span>
            <span className={`font-medium ${distanceFromJobSite > 500 ? 'text-red-600' : 'text-green-600'}`}>
              {Math.round(distanceFromJobSite)}m
            </span>
          </div>
        )}

        {/* Current Location Accuracy */}
        {currentLocation?.accuracy && (
          <div className="flex items-center justify-between text-sm">
            <span>GPS accuracy:</span>
            <span className={`font-medium ${currentLocation.accuracy > 100 ? 'text-yellow-600' : 'text-green-600'}`}>
              ±{Math.round(currentLocation.accuracy)}m
            </span>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Warning for Poor Location */}
        {isMonitoring && !error && !isLocationAcceptable && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Your location may be too far from the job site or GPS accuracy is low. 
              The job poster has been notified.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={updateLocation}
            className="flex-1"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Update Location
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={verifyLocationNow}
            className="flex-1"
          >
            <Shield className="h-3 w-3 mr-1" />
            Verify Now
          </Button>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-3 pt-3 border-t">
            {/* Current Location Details */}
            {currentLocation && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Current Location</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Latitude:</span>
                    <div className="font-mono">{currentLocation.latitude.toFixed(6)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Longitude:</span>
                    <div className="font-mono">{currentLocation.longitude.toFixed(6)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Updated:</span>
                    <div>{currentLocation.timestamp.toLocaleTimeString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Accuracy:</span>
                    <div>±{Math.round(currentLocation.accuracy || 0)}m</div>
                  </div>
                </div>
              </div>
            )}

            {/* Job Location */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Job Location</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Latitude:</span>
                  <div className="font-mono">{job.latitude.toFixed(6)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Longitude:</span>
                  <div className="font-mono">{job.longitude.toFixed(6)}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{job.location}</p>
            </div>

            {/* Verification History */}
            {verificationHistory.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recent Verifications</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {verificationHistory.slice(-5).reverse().map((verification, index) => (
                    <div key={index} className="flex items-center justify-between text-xs p-2 bg-muted rounded">
                      <div className="flex items-center gap-2">
                        {verification.isValid ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-600" />
                        )}
                        <span>{verification.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{Math.round(verification.distance)}m</span>
                        <Badge variant={getConfidenceBadge(verification.confidence)} className="text-xs">
                          {verification.confidence}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Info */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium">Location Monitoring</p>
                  <p>Your location is monitored every 5 minutes to ensure job authenticity. This helps protect both workers and job posters.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
