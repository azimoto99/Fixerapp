import React from 'react';
import { useGeolocation } from './hooks/use-react-geolocated';
import LocationPermissionHelper from './components/LocationPermissionHelper';
import { getLocationAccuracyDescription } from './lib/location-utils';

// Enhanced test component to verify the improved geolocation hook works
export const TestGeolocation: React.FC = () => {
  const {
    userLocation,
    locationError,
    isLoading,
    isUsingFallback,
    locationAccuracy,
    refreshLocation,
    requestHighAccuracyLocation
  } = useGeolocation();

  const handleRefresh = async () => {
    try {
      const location = await refreshLocation();
      console.log('Refreshed location:', location);
    } catch (error) {
      console.error('Failed to refresh location:', error);
    }
  };

  const handleHighAccuracy = async () => {
    try {
      const location = await requestHighAccuracyLocation();
      console.log('High accuracy location:', location);
    } catch (error) {
      console.error('Failed to get high accuracy location:', error);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '20px auto' }}>
      <h2>Enhanced Geolocation Test</h2>

      {/* Location Permission Helper Component */}
      <LocationPermissionHelper
        showAccuracyInfo={true}
        onLocationObtained={(location) => {
          console.log('Location obtained via helper:', location);
        }}
        className="mb-6"
      />

      {/* Detailed Status Information */}
      <div style={{
        padding: '20px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
        marginTop: '20px'
      }}>
        <h3>Detailed Location Information</h3>

        <div style={{ marginBottom: '10px' }}>
          <strong>Status:</strong> {isLoading ? 'Loading...' : 'Ready'}
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>Using Fallback:</strong> {isUsingFallback ? 'Yes' : 'No'}
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>Accuracy Level:</strong> {locationAccuracy || 'Unknown'}
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>Coordinates:</strong> {
            userLocation
              ? `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`
              : 'Not available'
          }
        </div>

        {userLocation?.accuracy && (
          <div style={{ marginBottom: '10px' }}>
            <strong>Accuracy:</strong> {getLocationAccuracyDescription(userLocation.accuracy)}
          </div>
        )}

        {userLocation?.source && (
          <div style={{ marginBottom: '10px' }}>
            <strong>Source:</strong> {userLocation.source}
          </div>
        )}

        <div style={{ marginBottom: '10px' }}>
          <strong>Error:</strong> {locationError || 'None'}
        </div>

        <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleRefresh}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh Location
          </button>

          <button
            onClick={handleHighAccuracy}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Get High Accuracy
          </button>
        </div>
      </div>
    </div>
  );
};
