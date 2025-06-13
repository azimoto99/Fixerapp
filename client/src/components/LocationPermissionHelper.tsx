import React, { useState, useEffect } from 'react';
import { MapPin, AlertCircle, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGeolocation } from '@/hooks/use-react-geolocated';
import { analyzeLocationAccuracy, getLocationAccuracyDescription } from '@/lib/location-utils';

interface LocationPermissionHelperProps {
  onLocationObtained?: (location: { latitude: number; longitude: number; accuracy?: number }) => void;
  showAccuracyInfo?: boolean;
  className?: string;
}

export const LocationPermissionHelper: React.FC<LocationPermissionHelperProps> = ({
  onLocationObtained,
  showAccuracyInfo = true,
  className
}) => {
  const { 
    userLocation, 
    locationError, 
    isLoading, 
    isUsingFallback, 
    locationAccuracy,
    refreshLocation,
    requestHighAccuracyLocation
  } = useGeolocation();

  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Check permission status on mount
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then(result => {
          setPermissionState(result.state);
          result.addEventListener('change', () => {
            setPermissionState(result.state);
          });
        })
        .catch(() => {
          // Permissions API not supported, fallback to checking geolocation availability
          setPermissionState('unknown');
        });
    }
  }, []);

  // Notify parent when location is obtained
  useEffect(() => {
    if (userLocation && !isUsingFallback && onLocationObtained) {
      onLocationObtained(userLocation);
    }
  }, [userLocation, isUsingFallback, onLocationObtained]);

  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    try {
      await refreshLocation();
    } catch (error) {
      console.error('Failed to get location:', error);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleRequestHighAccuracy = async () => {
    try {
      await requestHighAccuracyLocation();
    } catch (error) {
      console.error('Failed to get high accuracy location:', error);
    }
  };

  const getLocationStatusInfo = () => {
    if (isLoading || isRequestingPermission) {
      return {
        status: 'loading',
        title: 'Getting your location...',
        description: 'Please wait while we determine your location.',
        icon: RefreshCw,
        color: 'blue'
      };
    }

    if (locationError && !userLocation) {
      return {
        status: 'error',
        title: 'Location access needed',
        description: locationError,
        icon: AlertCircle,
        color: 'red'
      };
    }

    if (isUsingFallback) {
      return {
        status: 'fallback',
        title: 'Using default location',
        description: 'We\'re using a default location. For better results, please enable location services.',
        icon: MapPin,
        color: 'yellow'
      };
    }

    if (userLocation) {
      const accuracyInfo = analyzeLocationAccuracy(userLocation.accuracy);
      return {
        status: 'success',
        title: 'Location found',
        description: showAccuracyInfo ? accuracyInfo.description : 'Your location has been determined.',
        icon: MapPin,
        color: accuracyInfo.accuracyLevel === 'high' ? 'green' : 
               accuracyInfo.accuracyLevel === 'medium' ? 'blue' : 'yellow'
      };
    }

    return {
      status: 'unknown',
      title: 'Location status unknown',
      description: 'Unable to determine location status.',
      icon: AlertCircle,
      color: 'gray'
    };
  };

  const statusInfo = getLocationStatusInfo();
  const StatusIcon = statusInfo.icon;

  const showPermissionButton = permissionState === 'prompt' || 
                               permissionState === 'denied' || 
                               (locationError && !userLocation);

  const showHighAccuracyButton = userLocation && 
                                !isUsingFallback && 
                                locationAccuracy === 'low';

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <StatusIcon 
            className={`h-5 w-5 ${
              statusInfo.color === 'green' ? 'text-green-600' :
              statusInfo.color === 'blue' ? 'text-blue-600' :
              statusInfo.color === 'yellow' ? 'text-yellow-600' :
              statusInfo.color === 'red' ? 'text-red-600' :
              'text-gray-600'
            } ${isLoading || isRequestingPermission ? 'animate-spin' : ''}`}
          />
          {statusInfo.title}
        </CardTitle>
        <CardDescription>
          {statusInfo.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {permissionState === 'denied' && (
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              Location access is blocked. Please enable location services in your browser settings and refresh the page.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 flex-wrap">
          {showPermissionButton && (
            <Button 
              onClick={handleRequestPermission}
              disabled={isLoading || isRequestingPermission}
              variant="default"
              size="sm"
            >
              {isRequestingPermission ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Getting Location...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  Enable Location
                </>
              )}
            </Button>
          )}

          {showHighAccuracyButton && (
            <Button 
              onClick={handleRequestHighAccuracy}
              variant="outline"
              size="sm"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Get Precise Location
            </Button>
          )}

          {userLocation && !isUsingFallback && (
            <Button 
              onClick={() => refreshLocation()}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Location
            </Button>
          )}
        </div>

        {showAccuracyInfo && userLocation && userLocation.accuracy && (
          <div className="text-sm text-muted-foreground">
            <strong>Location Details:</strong><br />
            Coordinates: {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}<br />
            {getLocationAccuracyDescription(userLocation.accuracy)}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LocationPermissionHelper;
