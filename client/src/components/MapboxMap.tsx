import { useEffect, useRef, useState, FC, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Extend the window type to include our custom properties
declare global {
  interface Window {
    __ENV?: {
      [key: string]: string;
    };
  }
}

// Extend the Mapbox Marker type to include our custom cleanup function
interface CustomMapboxMarker extends mapboxgl.Marker {
  _cleanup?: () => void;
}

// Helper function to safely get environment variables
const getEnv = (key: string, defaultValue: string = ''): string => {
  if (typeof window !== 'undefined' && (window as any).__ENV?.[key]) {
    return String((window as any).__ENV[key]);
  }
  
  if (typeof process !== 'undefined' && process?.env?.[key]) {
    return String(process.env[key]);
  }
  
  if (import.meta.env?.[key]) {
    return String(import.meta.env[key]);
  }
  
  return defaultValue;
};

// Helper function to validate Mapbox token format
const isValidMapboxToken = (token: string | null): boolean => {
  if (!token) return false;
  // Basic validation - Mapbox tokens typically start with 'pk.'
  return token.startsWith('pk.') && token.length > 30;
};

// Custom hook to fetch and manage the Mapbox token
const useMapboxToken = () => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch('/api/mapbox/token');
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        
        if (!data || typeof data !== 'object' || !('token' in data)) {
          throw new Error('Invalid response format from server');
        }
        
        const tokenValue = String(data.token);
        if (!tokenValue) {
          throw new Error('Empty token received from server');
        }
        
        setToken(tokenValue);
        mapboxgl.accessToken = tokenValue;
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        console.error('Error fetching Mapbox token:', errorMessage);
        setError(`Failed to load map configuration: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchToken();
    
    // Cleanup function
    return () => {
      // Reset the access token when component unmounts
      mapboxgl.accessToken = '';
    };
  }, []);

  return { 
    token, 
    isLoading, 
    error,
    hasValidToken: token ? isValidMapboxToken(token) : false
  };
};



interface Marker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  color?: string;
  isHighlighted?: boolean;
  markerColor?: string;
  onClick?: () => void;
}

interface MapboxMapProps {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  markers?: Marker[];
  onMarkerClick?: (markerId: string) => void;
  onMapClick?: (e: mapboxgl.MapMouseEvent) => void;
  onMapMove?: (e: mapboxgl.MapboxEvent<MouseEvent | TouchEvent | WheelEvent | undefined> & mapboxgl.EventData) => void;
  interactive?: boolean;
  style?: React.CSSProperties;
  className?: string;
  containerStyle?: React.CSSProperties;
}

const MapboxMap: FC<MapboxMapProps> = ({
  markers = [],
  latitude,
  longitude,
  zoom = 12,
  onMarkerClick,
  onMapClick,
  onMapMove,
  interactive = true,
  style = { width: '100%', height: '400px' },
  className = ''
}) => {
  const { token, isLoading, error, hasValidToken: isValidToken } = useMapboxToken();
  const [mapError, setMapError] = useState<string | null>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{ [key: string]: CustomMapboxMarker }>({});
  
  // Initialize map when token is available and container is ready
  useEffect(() => {
    if (!mapContainer.current || !token || !isValidToken) {
      return;
    }

    // Set initial center from props or default to San Francisco
    const initialLng = typeof longitude === 'number' ? longitude : -122.4372;
    const initialLat = typeof latitude === 'number' ? latitude : 37.758;
    const initialZoom = typeof zoom === 'number' ? zoom : 12;

    // Only initialize the map if we don't have an instance yet
    if (mapInstance.current) return;

    try {
      // Initialize map
      const newMapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [initialLng, initialLat],
        zoom: initialZoom,
        interactive,
      });

      // Add navigation control
      newMapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Handle map load
      newMapInstance.once('load', () => {
        setMapLoaded(true);
      });

      // Handle map click
      const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
        if (onMapClick) onMapClick(e);
      };

      // Handle map move
      const handleMapMove = (e: mapboxgl.MapboxEvent<MouseEvent | TouchEvent | WheelEvent | undefined> & mapboxgl.EventData) => {
        if (onMapMove) onMapMove(e);
      };

      // Add event listeners
      newMapInstance.on('click', handleMapClick);
      newMapInstance.on('move', handleMapMove);

      // Store map instance
      mapInstance.current = newMapInstance;

      // Cleanup on unmount
      return () => {
        if (newMapInstance) {
          // Remove event listeners
          newMapInstance.off('click', handleMapClick);
          newMapInstance.off('move', handleMapMove);
          
          // Remove the map instance
          newMapInstance.remove();
        }
      };
    } catch (err) {
      console.error('Error initializing map:', err);
      setMapError('Failed to initialize map. Please try again later.');
    }
  }, [token, latitude, longitude, zoom, interactive, onMapClick, onMapMove, isValidToken]);

  // Add markers when they change or map is loaded
  useEffect(() => {
    if (!mapLoaded || !mapInstance.current) return;

    const updateMarkers = () => {
      try {
        // Type guard for markers array
        if (!Array.isArray(markers)) {
          console.warn('Markers prop must be an array');
          return;
        }

        // Remove old markers that are no longer in the props
        Object.entries(markersRef.current).forEach(([id, marker]) => {
          if (!markers.some(m => m.id === id)) {
            if (marker._cleanup) marker._cleanup();
            marker.remove();
            delete markersRef.current[id];
          }
        });

        // Add or update markers
        markers.forEach((marker) => {
          if (!marker.id) {
            console.warn('Marker is missing required id property');
            return;
          }


          // Update existing marker
          if (markersRef.current[marker.id]) {
            markersRef.current[marker.id]
              .setLngLat([marker.longitude, marker.latitude])
              .setPopup(
                new mapboxgl.Popup({ offset: 25 })
                  .setHTML(`<h3>${marker.title || 'Location'}</h3>`)
              );
            return;
          }

          // Create new marker
          const el = document.createElement('div');
          el.className = 'map-marker';
          el.style.width = marker.isHighlighted ? '32px' : '24px';
          el.style.height = marker.isHighlighted ? '32px' : '24px';
          el.style.background = marker.markerColor || marker.color || '#3b82f6';
          el.style.borderRadius = '50%';
          el.style.border = '2px solid white';
          el.style.cursor = 'pointer';
          el.style.transition = 'all 0.2s ease';
          el.style.boxShadow = marker.isHighlighted 
            ? '0 0 0 3px rgba(59, 130, 246, 0.5)' 
            : '0 2px 4px rgba(0,0,0,0.1)';

          // Add click handler to marker
          const handleMarkerClick = (e: Event) => {
            e.stopPropagation();
            if (marker.onClick) marker.onClick();
            if (onMarkerClick) onMarkerClick(marker.id);
          };

          el.addEventListener('click', handleMarkerClick);

          // Create and store marker
          const markerInstance = new mapboxgl.Marker({
            element: el,
            anchor: 'bottom',
            offset: [0, marker.isHighlighted ? -16 : -12]
          })
            .setLngLat([marker.longitude, marker.latitude])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 })
                .setHTML(`<h3>${marker.title || 'Location'}</h3>`)
            )
            .addTo(mapInstance.current);

          // Store cleanup function for the event listener
          const cleanup = () => {
            el.removeEventListener('click', handleMarkerClick);
          };

          // Store marker with cleanup function
          const customMarker = markerInstance as CustomMapboxMarker;
          customMarker._cleanup = cleanup;
          markersRef.current[marker.id] = customMarker;
        });
      } catch (err) {
        console.error('Error updating markers:', err);
      }
    };

    updateMarkers();

    // Cleanup function to remove all markers and their event listeners
    return () => {
      Object.values(markersRef.current).forEach(marker => {
        if (marker._cleanup) {
          marker._cleanup();
        }
        marker.remove();
      });
      markersRef.current = {};
    };
  }, [markers, mapLoaded, onMarkerClick]);

  // Update map center when props change
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded) return;

    try {
      const currentCenter = mapInstance.current.getCenter();
      const targetLng = longitude ?? currentCenter.lng;
      const targetLat = latitude ?? currentCenter.lat;
      const currentZoom = mapInstance.current.getZoom();
      const targetZoom = zoom ?? currentZoom;

      // Only update if we need to
      if (
        targetLng !== currentCenter.lng ||
        targetLat !== currentCenter.lat ||
        targetZoom !== currentZoom
      ) {
        mapInstance.current.flyTo({
          center: [targetLng, targetLat],
          zoom: targetZoom,
          essential: true,
          duration: 1000
        });
      }
    } catch (err) {
      console.error('Error updating map center:', err);
    }
  }, [longitude, latitude, zoom, mapInstance, mapLoaded]);

  // Set up cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        // Clean up all markers and their event listeners
        Object.values(markersRef.current).forEach(marker => {
          if (marker._cleanup) {
            marker._cleanup();
          }
          marker.remove();
        });
        markersRef.current = {};
        
        // Remove map instance
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={style}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading map...</span>
      </div>
    );
  }

  // Render error state
  if (error || !token || !isValidToken) {
    return (
      <div 
        className={`bg-red-50 border-l-4 border-red-400 p-4 rounded ${className}`}
        style={style}
      >
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Map Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error || 'Failed to load map configuration. Please try again later.'}</p>
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-2 p-2 bg-red-100 rounded text-xs">
                  <p>Token: {token ? 'Present' : 'Missing'}</p>
                  <p>Error: {error || 'None'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render the map container
  return (
    <div
      ref={mapContainer}
      className={`map-container ${className}`}
      style={{
        width: '100%',
        height: '400px',
        ...style
      }}
      data-testid="mapbox-container"
    />
  );
}

export default MapboxMap;