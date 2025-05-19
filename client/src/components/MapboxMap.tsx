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
    if (mapLoaded && map.current) {
      // Clear existing markers (if any implementation uses this)
      const existingMarkers = document.getElementsByClassName('mapboxgl-marker');
      while (existingMarkers[0]) {
        existingMarkers[0].remove();
      }
      
      // Add new markers
      markers.forEach(marker => {
        // Create a popup if there's a title or description
        let popup;
        if (marker.title || marker.description) {
          popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<h3>${marker.title || ''}</h3><p>${marker.description || ''}</p>`
          );
        }
        
        // Create the marker
        const markerEl = document.createElement('div');
        markerEl.className = 'map-marker';
        markerEl.style.width = '24px';
        markerEl.style.height = '24px';
        markerEl.style.backgroundImage = 'url(/marker-icon.png)';
        markerEl.style.backgroundSize = 'cover';
        
        // Add the marker to the map
        const mapboxMarker = new mapboxgl.Marker(markerEl)
          .setLngLat([marker.longitude, marker.latitude]);
          
        if (popup) {
          mapboxMarker.setPopup(popup);
        }
        
        if (marker.onClick) {
          markerEl.addEventListener('click', marker.onClick);
        }
        
        mapboxMarker.addTo(map.current);
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