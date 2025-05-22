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
  const mapMarkers = useRef<mapboxgl.Marker[]>([]);
  
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
      setMapLoaded(true);
      
      try {
        // We need to get all layer ids first to find the road layers
        const layers = map.current?.getStyle().layers || [];
        
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
            
            map.current?.setPaintProperty(layerId, 'line-color', color);
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
  }, [longitude, latitude, zoom, interactive]);

  // Add markers when they change or map is loaded
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    
    // Remove existing markers
    mapMarkers.current.forEach(marker => marker.remove());
    mapMarkers.current = [];
    
    // Debug: log all marker coordinates
    console.log('Adding markers to map:', markers.map(m => ({
      lng: m.longitude,
      lat: m.latitude,
      title: m.title
    })));
    
    // Add new markers
    markers.forEach(marker => {
      if (!marker.latitude || !marker.longitude) return;
      
      // Create a DOM element for the marker
      const el = document.createElement('div');
      
      // Style based on marker type
      if (marker.title === 'Current Location') {
        el.innerHTML = `📍`;
        el.style.backgroundColor = '#3b82f6'; // Blue
      } else {
        // Extract job payment amount from the description if available
        const paymentMatch = marker.description?.match(/\$(\d+)/);
        const paymentAmount = paymentMatch ? paymentMatch[1] : '';
        
        if (paymentAmount) {
          el.innerHTML = `$${paymentAmount}`;
          // Make the marker bigger to fit the payment amount
          el.style.width = '40px';
          el.style.height = '40px';
          el.style.fontSize = '14px';
        } else {
          el.innerHTML = `$`;
        }
        el.style.backgroundColor = '#f59e0b'; // Amber/gold for jobs
      }
      
      // Apply styles to marker element
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5)';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = 'white';
      el.style.fontWeight = 'bold';
      el.style.fontSize = '16px';
      el.style.cursor = 'pointer';
      
      // Create popup if there's a title or description
      let popup: mapboxgl.Popup | undefined;
      if (marker.title || marker.description) {
        popup = new mapboxgl.Popup({ 
          offset: 25,
          closeButton: false 
        }).setHTML(`
          <div style="padding: 8px; cursor: pointer;">
            <h3 style="margin: 0 0 5px; font-size: 15px; font-weight: 600; color: #111;">${marker.title || ''}</h3>
            <p style="margin: 0; font-size: 13px; color: #10b981; font-weight: 500;">${marker.description || ''}</p>
          </div>
        `);
      }
      
      // Create the Mapbox marker
      try {
        const mapboxMarker = new mapboxgl.Marker({
          element: el,
          anchor: 'center'
        }).setLngLat([marker.longitude, marker.latitude]);
        
        // Add popup if available
        if (popup) {
          mapboxMarker.setPopup(popup);
        }
        
        // Add click handler
        if (marker.onClick) {
          el.addEventListener('click', () => {
            marker.onClick!();
          });
        }
        
        // Add to map and track for cleanup
        mapboxMarker.addTo(map.current);
        mapMarkers.current.push(mapboxMarker);
        
        console.log(`Marker successfully added at [${marker.longitude}, ${marker.latitude}] for: ${marker.title}`);
      } catch (error) {
        console.error(`Failed to add marker at [${marker.longitude}, ${marker.latitude}]`, error);
      }
    });
  }, [markers, mapLoaded]);
  
  // Update map center when latitude/longitude props change
  useEffect(() => {
    if (map.current && mapLoaded) {
      map.current.flyTo({
        center: [longitude, latitude],
        zoom: zoom,
        essential: true,
        duration: 1500
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