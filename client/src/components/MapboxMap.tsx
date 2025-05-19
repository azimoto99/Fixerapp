import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set the access token from environment variable
const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
if (accessToken) {
  mapboxgl.accessToken = accessToken;
} else {
  console.error('Mapbox access token is missing!');
}

interface MapboxMapProps {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  markers?: Array<{
    latitude: number;
    longitude: number;
    title?: string;
    description?: string;
    onClick?: () => void;
  }>;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  interactive?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export default function MapboxMap({
  latitude = 40.7128,
  longitude = -74.0060,
  zoom = 12,
  markers = [],
  onMapClick,
  interactive = true,
  style = { width: '100%', height: '400px' },
  className = ''
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Initialize the map
  useEffect(() => {
    if (!mapContainer.current) return;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11', // Using dark theme for better contrast with our green markers
      center: [longitude, latitude],
      zoom: zoom,
      interactive: interactive
    });
    
    // Add event handler for map load
    map.current.on('load', () => {
      // Set map loaded state
      setMapLoaded(true);
      
      try {
        // We need to get all layer ids first to find the road layers
        const layers = map.current.getStyle().layers || [];
        
        // Apply green styling to any layer that contains 'road' in its id
        layers.forEach(layer => {
          const layerId = layer.id;
          
          if (layerId.toLowerCase().includes('road') && layer.type === 'line') {
            console.log('Styling road layer:', layerId);
            
            // Different shades of green based on road type
            let color = '#a5d6a7'; // Default light green
            
            if (layerId.includes('highway') || layerId.includes('major')) {
              color = '#4caf50'; // Darker green for highways/major roads
            } else if (layerId.includes('primary') || layerId.includes('trunk')) {
              color = '#66bb6a'; // Medium green for primary roads
            } else if (layerId.includes('secondary') || layerId.includes('tertiary')) {
              color = '#81c784'; // Slightly darker for secondary/tertiary roads
            }
            
            map.current.setPaintProperty(layerId, 'line-color', color);
          }
        });
      } catch (error) {
        console.warn('Could not set custom road colors:', error);
      }
    });
    
    if (onMapClick) {
      map.current.on('click', (e) => {
        onMapClick(e.lngLat);
      });
    }
    
    // Clean up on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Add markers when they change or map is loaded
  useEffect(() => {
    // Only proceed if map is loaded and map.current exists
    if (!mapLoaded || !map.current) return;
    
    // Clear existing markers (if any implementation uses this)
    const existingMarkers = document.getElementsByClassName('mapboxgl-marker');
    while (existingMarkers[0]) {
      existingMarkers[0].remove();
    }
    
    // Add new markers
    markers.forEach(marker => {
      // Create a styled popup if there's a title or description
      let popup: mapboxgl.Popup | undefined;
      if (marker.title || marker.description) {
        // Create a popup element
        const popupElement = document.createElement('div');
        popupElement.className = 'custom-mapbox-popup-content';
        popupElement.innerHTML = `
          <div style="padding: 8px; cursor: pointer;">
            <h3 style="margin: 0 0 5px; font-size: 15px; font-weight: 600; color: #111;">${marker.title || ''}</h3>
            <p style="margin: 0; font-size: 13px; color: #10b981; font-weight: 500;">${marker.description || ''}</p>
          </div>
        `;
        
        // Create popup with the custom element
        popup = new mapboxgl.Popup({ 
          offset: 25,
          closeButton: false,
          className: 'custom-mapbox-popup'
        });
        
        popup.setDOMContent(popupElement);
        
        // Add click event to the popup content
        if (marker.onClick) {
          popupElement.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (marker.onClick) {
              marker.onClick();
            }
            if (popup) {
              popup.remove(); // Close popup after clicking
            }
          });
        }
      }
      
      // Create a custom marker element with a dollar sign icon
      const markerEl = document.createElement('div');
      markerEl.className = 'map-marker';
      markerEl.style.width = '36px';
      markerEl.style.height = '36px';
      markerEl.style.borderRadius = '50%';
      markerEl.style.backgroundColor = '#10b981'; // Using primary color
      markerEl.style.border = '3px solid white';
      markerEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
      markerEl.style.cursor = 'pointer';
      markerEl.style.display = 'flex';
      markerEl.style.alignItems = 'center';
      markerEl.style.justifyContent = 'center';
      markerEl.style.color = 'white';
      markerEl.style.fontSize = '18px';
      markerEl.style.fontWeight = 'bold';
      markerEl.innerHTML = '$';
      
      // Add the marker to the map
      const mapboxMarker = new mapboxgl.Marker(markerEl)
        .setLngLat([marker.longitude, marker.latitude]);
        
      if (popup) {
        mapboxMarker.setPopup(popup);
      }
      
      if (marker.onClick) {
        // Add the click event to the element
        markerEl.addEventListener('click', marker.onClick);
      }
      
      // Safe to add marker if map.current exists
      if (map.current) {
        mapboxMarker.addTo(map.current);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, mapLoaded]);
  
  // Update map center when latitude/longitude props change
  useEffect(() => {
    if (map.current && mapLoaded) {
      map.current.flyTo({
        center: [longitude, latitude],
        zoom: zoom,
        essential: true
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude, zoom, mapLoaded]);
  
  return (
    <div 
      ref={mapContainer} 
      className={`mapbox-map ${className}`} 
      style={style}
    />
  );
}