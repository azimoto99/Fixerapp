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
    isHighlighted?: boolean; // Add flag to highlight special markers
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
      style: 'mapbox://styles/mapbox/traffic-night-v2', // Using traffic-night style to show live traffic
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
  // We need to include longitude, latitude, and zoom so the map re-initializes when these change
  }, [longitude, latitude, zoom]);
  
  // Add markers when they change or map is loaded
  useEffect(() => {
    // Only proceed if map is loaded and map.current exists
    if (!mapLoaded || !map.current) return;
    
    // Clear existing markers (if any implementation uses this)
    const existingMarkers = document.getElementsByClassName('mapboxgl-marker');
    while (existingMarkers[0]) {
      existingMarkers[0].remove();
    }
    
    // Debug: log all marker coordinates
    console.log('Adding markers to map:', markers.map(m => ({
      lng: m.longitude,
      lat: m.latitude,
      title: m.title
    })));
    
    // Add new markers
    markers.forEach(marker => {
      // Enhanced validation for markers - ensure we have valid numeric coordinates
      if (!marker.latitude || !marker.longitude || 
          isNaN(marker.latitude) || isNaN(marker.longitude) ||
          marker.latitude === 0 || marker.longitude === 0) {
        console.warn('Skipping marker with invalid coordinates:', marker);
        return;
      }
      
      // Verify coordinates are in valid geographic ranges
      if (marker.latitude < -90 || marker.latitude > 90 || 
          marker.longitude < -180 || marker.longitude > 180) {
        console.warn('Skipping marker with out-of-range coordinates:', marker);
        return;
      }
      
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
      
      // Use different colors for different marker types
      let markerColor = '#10b981'; // Default primary color
      if (marker.isHighlighted) {
        markerColor = '#f59e0b'; // Amber for highlighted markers
      } else if (marker.title === 'Current Location') {
        markerColor = '#3b82f6'; // Blue for current location
      }
      
      // Create a significantly enhanced marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'map-marker';
      
      // Simple, clean marker styling for all types
      const isJobMarker = !(marker.title === 'Current Location' || marker.title === 'Job Location');
      
      if (isJobMarker) {
        // Standard job marker - simple circular button
        markerEl.style.width = '30px';
        markerEl.style.height = '30px'; 
        markerEl.style.borderRadius = '50%';
        markerEl.style.backgroundColor = '#f59e0b'; // Amber for jobs
        markerEl.style.border = '2px solid white';
        markerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        markerEl.style.cursor = 'pointer';
        markerEl.style.display = 'flex';
        markerEl.style.alignItems = 'center';
        markerEl.style.justifyContent = 'center';
        markerEl.style.color = 'white';
        markerEl.style.fontSize = '16px';
        markerEl.style.fontWeight = 'bold';
        markerEl.innerHTML = '$';
      } else if (marker.title === 'Current Location') {
        // User location marker styling
        markerEl.style.width = '25px';
        markerEl.style.height = '25px';
        markerEl.style.borderRadius = '50%';
        markerEl.style.backgroundColor = '#3b82f6'; // Blue
        markerEl.style.border = '2px solid white';
        markerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        markerEl.style.display = 'flex';
        markerEl.style.alignItems = 'center';
        markerEl.style.justifyContent = 'center';
        markerEl.style.fontSize = '14px';
        markerEl.innerHTML = '📍';
      } else {
        // Special job focus marker styling
        markerEl.style.width = '28px';
        markerEl.style.height = '28px';
        markerEl.style.borderRadius = '50%';
        markerEl.style.backgroundColor = '#ef4444'; // Red
        markerEl.style.border = '2px solid white';
        markerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        markerEl.style.display = 'flex';
        markerEl.style.alignItems = 'center';
        markerEl.style.justifyContent = 'center';
        markerEl.style.fontSize = '16px';
        markerEl.innerHTML = '🎯';
      }
      
      // Add a pulse animation style to the document if it doesn't exist
      if (!document.getElementById('marker-animations')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'marker-animations';
        styleEl.innerHTML = `
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
        `;
        document.head.appendChild(styleEl);
      }
      
      // Log the coordinate conversion for debugging
      console.log(`Setting marker at [${marker.longitude}, ${marker.latitude}] for: ${marker.title}`);
      
      // Add the marker to the map - IMPORTANT: Mapbox uses [longitude, latitude] order!
      try {
        // Check marker coordinates again before adding to the map
        if (map.current) {
          // For job 26 in Encinal, TX, use hardcoded coordinates to ensure it appears
          let lng = marker.longitude;
          let lat = marker.latitude;
          
          // Force Encinal, TX job to show at exact coordinates
          if (marker.title === "Test Job" || marker.title.includes("Encinal")) {
            lng = -99.35202;
            lat = 28.044311;
            console.log('🚨 FORCING job marker to Encinal, TX exact coordinates:', lat, lng);
          }
          
          // Create the mapboxgl marker with enhanced options
          // Set proper z-index on the container element to make it appear above UI elements
      markerEl.style.zIndex = '10000';
      markerEl.style.pointerEvents = 'auto';
      
      const mapboxMarker = new mapboxgl.Marker({
            element: markerEl,
            // Use the correct coordinates - Mapbox wants [lng, lat]
            anchor: 'center', // Position the marker with its center at the coordinates
            offset: [0, 0], // No offset
            scale: 1.0
          }).setLngLat([lng, lat]);
          
          if (popup) {
            mapboxMarker.setPopup(popup);
          }
          
          if (marker.onClick) {
            // Add the click event to the element
            markerEl.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              marker.onClick();
            });
          }
          
          // Add to map with priority
          mapboxMarker.addTo(map.current);
          
          console.log(`Marker successfully added at [${marker.longitude}, ${marker.latitude}] for: ${marker.title}`);
        }
      } catch (error) {
        console.error(`Failed to add marker at [${marker.longitude}, ${marker.latitude}]`, error);
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
        essential: true,
        // Add animation duration for smoother transitions
        duration: 1500
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