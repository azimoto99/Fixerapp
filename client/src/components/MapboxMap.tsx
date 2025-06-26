import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { generatePinStyle, generatePinCSS, type PinConfig } from '@/lib/mapPinStyles';

// Set the access token from Vite environment variable
// Note: in a Vite/React app we must use import.meta.env to access env vars at build time.
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;


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
    markerColor?: string; // Custom color for job markers (legacy)
    // New contextual styling properties
    category?: string;
    paymentAmount?: number;
    requiredSkills?: string[];
    status?: string;
    // Circle properties
    showCircle?: boolean;
    circleRadius?: number; // in meters
    circleColor?: string;
    circleOpacity?: number;
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
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const mapMarkers = useRef<mapboxgl.Marker[]>([]);
  const circleLayerIds = useRef<string[]>([]);
  
  // Initialize the map
  useEffect(() => {
    if (!mapContainer.current) return;
      // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: document.documentElement.classList.contains('dark') 
        ? 'mapbox://styles/mapbox/dark-v11'  // Dark theme style
        : 'mapbox://styles/mapbox/streets-v12', // Light theme style
      center: [longitude || 0, latitude || 0],
      zoom,
      interactive: interactive,
    });
    
    // Add event handler for map load
    map.current.on('load', () => {
      setMapLoaded(true);
      
      // Add Mapbox Traffic source and layers
      if (map.current && !map.current.getSource('traffic')) {
        map.current.addSource('traffic', {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-traffic-v1'
        });
        // Traffic flow layer
        map.current.addLayer({
          id: 'traffic-flow',
          type: 'line',
          source: 'traffic',
          'source-layer': 'traffic',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'congestion'], 'low'], '#6bcf6b',
              ['==', ['get', 'congestion'], 'moderate'], '#ffeb3b',
              ['==', ['get', 'congestion'], 'heavy'], '#ff9800',
              ['==', ['get', 'congestion'], 'severe'], '#f44336',
              '#aaaaaa'
            ],
            'line-width': 3
          }
        });
        // Traffic incidents layer
        map.current.addLayer({
          id: 'traffic-incidents',
          type: 'symbol',
          source: 'traffic',
          'source-layer': 'incidents',
          layout: {
            'icon-image': 'car-15',
            'icon-size': 1.2
          }
        });
      }
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

    // Add zoom change listener to update pin sizes
    map.current.on('zoom', () => {
      if (map.current) {
        setCurrentZoom(map.current.getZoom());
      }
    });
      // Theme change observer
    const darkModeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && map.current) {
          const isDark = document.documentElement.classList.contains('dark');
          map.current.setStyle(
            isDark ? 'mapbox://styles/mapbox/navigation-night-v1' : 'mapbox://styles/mapbox/streets-v12'
          );
        }
      });
    });

    darkModeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
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

  // Track current location marker separately
  const currentLocationMarker = useRef<mapboxgl.Marker | null>(null);
  
  // Add/update markers when they change or map is loaded
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    
    // Only remove non-current-location markers
    mapMarkers.current.forEach(marker => marker.remove());
    mapMarkers.current = [];

    // Remove existing circle layers
    circleLayerIds.current.forEach(layerId => {
      if (map.current?.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current?.getSource(layerId)) {
        map.current.removeSource(layerId);
      }
    });
    circleLayerIds.current = [];
    
    // Add new markers
    markers.forEach(marker => {
      if (!marker.latitude || !marker.longitude) return;
      
      // Create a DOM element for the marker
      const el = document.createElement('div');
      const isDark = document.documentElement.classList.contains('dark');

      if (marker.title === 'Current Location') {
        // Update existing current location marker or create new one
        if (currentLocationMarker.current) {
          // Just update position without recreating
          currentLocationMarker.current.setLngLat([marker.longitude, marker.latitude]);
          return;
        }
        
        // Enhanced user location marker with pulsing animation
        el.innerHTML = `
          <div style="
            position: relative;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <!-- Pulsing outer ring -->
            <div style="
              position: absolute;
              width: 40px;
              height: 40px;
              background-color: #10b981;
              border-radius: 50%;
              opacity: 0.3;
              animation: pulse 2s infinite;
            "></div>
            <!-- Inner location dot -->
            <div style="
              position: relative;
              width: 20px;
              height: 20px;
              background-color: #10b981;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              z-index: 2;
            "></div>
          </div>
        `;
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.cursor = 'pointer';
        el.style.zIndex = '15';

        // Add pulsing animation
        const style = document.createElement('style');
        style.textContent = `
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.3; }
            50% { transform: scale(1.5); opacity: 0.1; }
            100% { transform: scale(2); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
        
        // Create and store current location marker
        const mapboxMarker = new mapboxgl.Marker({
          element: el,
          anchor: 'center'
        }).setLngLat([marker.longitude, marker.latitude]);

        if (map.current) {
          mapboxMarker.addTo(map.current);
          currentLocationMarker.current = mapboxMarker;

          // Exit early to avoid creating a duplicate generic marker using the same DOM element.
          // We intentionally do NOT push the current-location marker to mapMarkers so it
          // persists across re-renders and isn't removed during the standard cleanup cycle.
          return; // continue to next marker
        }
      } else {
        // Use new contextual styling system for job markers
        const pinConfig: PinConfig = {
          category: marker.category || 'Other',
          paymentAmount: marker.paymentAmount || 0,
          requiredSkills: marker.requiredSkills || [],
          status: marker.status || 'open',
          isHighlighted: marker.isHighlighted,
          // Enterprise-specific styling
          isEnterprise: (marker as any).isEnterprise,
          enterpriseColor: (marker as any).enterpriseColor,
          enterpriseIcon: (marker as any).enterpriseIcon,
          priority: (marker as any).priority
        };

        const pinStyle = generatePinStyle(pinConfig, isDark, currentZoom);
        const cssStyles = generatePinCSS(pinStyle);

        // Apply all CSS styles
        Object.entries(cssStyles).forEach(([property, value]) => {
          el.style.setProperty(property, value);
        });

        // Create a CIRCULAR pin with emoji on top (what the user actually wants)
        el.innerHTML = `
          <div style="
            width: 100%;
            height: 100%;
            background-color: ${pinStyle.backgroundColor};
            border: ${pinStyle.borderWidth}px ${pinStyle.borderStyle} ${pinStyle.borderColor};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${Math.max(pinStyle.size * 0.4, 18)}px;
            position: relative;
            box-shadow: 0 4px 12px ${pinStyle.shadowColor};
          ">
            ${pinStyle.icon}
          </div>
        `;

        // Add hover effects without transform (to avoid Mapbox positioning conflicts)
        el.addEventListener('mouseenter', () => {
          el.style.zIndex = '20';
          el.style.filter = 'brightness(1.2) drop-shadow(0 6px 12px rgba(0,0,0,0.4))';
          el.style.boxShadow = `0 8px 16px ${pinStyle.shadowColor}, 0 4px 8px rgba(0,0,0,0.2)`;
        });

        el.addEventListener('mouseleave', () => {
          el.style.zIndex = '1';
          el.style.filter = 'none';
          el.style.boxShadow = `0 4px 12px ${pinStyle.shadowColor}, 0 2px 4px rgba(0,0,0,0.1)`;
        });
      }
      
      // Create popup if there's a title or description
      let popup: mapboxgl.Popup | undefined;
      if (marker.title || marker.description) {        const isDark = document.documentElement.classList.contains('dark');
        popup = new mapboxgl.Popup({ 
          offset: 25,
          closeButton: false,
          className: isDark ? 'dark-popup' : 'light-popup'
        }).setHTML(`
          <div style="padding: 8px; cursor: pointer;">
            <h3 style="margin: 0 0 5px; font-size: 15px; font-weight: 600; color: ${isDark ? '#fff' : '#111'};">${marker.title || ''}</h3>
            <p style="margin: 0; font-size: 13px; color: #10b981; font-weight: 500;">${marker.description || ''}</p>
          </div>
        `);
      }
      
      // Create the Mapbox marker
      try {
        const mapboxMarker = new mapboxgl.Marker({
          element: el,
          anchor: 'bottom'
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
        if (map.current) {
          mapboxMarker.addTo(map.current);
          mapMarkers.current.push(mapboxMarker);
        }
      } catch (error) {
        console.error(`Failed to add marker at [${marker.longitude}, ${marker.latitude}]`, error);
      }

      // No more separate circles - the pin IS the circle now
    });
  }, [markers, mapLoaded, currentZoom]);
  
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
      style={{
        ...style,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        margin: 0,
        padding: 0,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#000' : '#fff'
      }}
    />
  );
}