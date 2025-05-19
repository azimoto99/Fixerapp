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
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [longitude, latitude],
      zoom: zoom,
      interactive: interactive
    });
    
    map.current.on('load', () => {
      setMapLoaded(true);
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
        let popup;
        if (marker.title || marker.description) {
          popup = new mapboxgl.Popup({ 
            offset: 25,
            closeButton: false,
            className: 'custom-mapbox-popup'
          }).setHTML(
            `<div style="padding: 5px;">
              <h3 style="margin: 0 0 5px; font-size: 14px; font-weight: 600;">${marker.title || ''}</h3>
              <p style="margin: 0; font-size: 12px; color: #10b981;">${marker.description || ''}</p>
            </div>`
          );
        }
        
        // Create a custom marker element
        const markerEl = document.createElement('div');
        markerEl.className = 'map-marker';
        markerEl.style.width = '30px';
        markerEl.style.height = '30px';
        markerEl.style.borderRadius = '50%';
        markerEl.style.backgroundColor = '#10b981'; // Using primary color
        markerEl.style.border = '2px solid white';
        markerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        markerEl.style.cursor = 'pointer';
        
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
    }
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
  }, [latitude, longitude, zoom, mapLoaded]);
  
  return (
    <div 
      ref={mapContainer} 
      className={`mapbox-map ${className}`} 
      style={style}
    />
  );
}