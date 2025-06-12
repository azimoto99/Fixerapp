import React from 'react';
import { useGeolocation } from './hooks/use-react-geolocated';

// Simple test component to verify the geolocation hook works
export const TestGeolocation: React.FC = () => {
  const { userLocation, locationError, isLoading, isUsingFallback, refreshLocation } = useGeolocation();

  const handleRefresh = async () => {
    try {
      const location = await refreshLocation();
      console.log('Refreshed location:', location);
    } catch (error) {
      console.error('Failed to refresh location:', error);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h3>Geolocation Test</h3>
      <div>
        <strong>Status:</strong> {isLoading ? 'Loading...' : 'Ready'}
      </div>
      <div>
        <strong>Using Fallback:</strong> {isUsingFallback ? 'Yes' : 'No'}
      </div>
      <div>
        <strong>Location:</strong> {
          userLocation 
            ? `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`
            : 'Not available'
        }
      </div>
      <div>
        <strong>Error:</strong> {locationError || 'None'}
      </div>
      <button onClick={handleRefresh} style={{ marginTop: '10px' }}>
        Refresh Location
      </button>
    </div>
  );
};
