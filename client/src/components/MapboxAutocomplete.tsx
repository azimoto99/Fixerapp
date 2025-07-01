import React, { useState, useRef, useEffect } from 'react';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import mapboxgl from 'mapbox-gl';

// Use the Mapbox access token from environment variables
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

interface MapboxAutocompleteProps {
  onSelect: (result: {
    text: string;
    place_name: string;
    center: [number, number];
    address?: string;
    context?: Array<{id: string; text: string}>;
  }) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  defaultValue?: string;
}

export default function MapboxAutocomplete({
  onSelect,
  placeholder = 'Search for an address',
  className = '',
  style,
  defaultValue
}: MapboxAutocompleteProps) {
  const geocoderRef = useRef<HTMLDivElement | null>(null);
  const geocoderInstance = useRef<any>(null);
  const [selectedValue, setSelectedValue] = useState(defaultValue || '');

  useEffect(() => {
    if (!geocoderRef.current) return;

    // Initialize the geocoder
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken || '',
      types: 'address,place,neighborhood',
      placeholder,
      countries: 'us', // Limit to United States
      mapboxgl: mapboxgl as any,
    });

    // Add to the container
    geocoderRef.current.appendChild(geocoder.onAdd(null as any));

    // Store the instance for later cleanup
    geocoderInstance.current = geocoder;

    // Handle geocoder results
    geocoder.on('result', (event: any) => {
      const result = event.result;
      setSelectedValue(result.place_name);
      
      onSelect({
        text: result.text,
        place_name: result.place_name,
        center: result.center,
        address: result.place_name,
        context: result.context
      });
    });

    geocoder.on('clear', () => {
      setSelectedValue('');
    });

    // Set initial value if provided
    if (defaultValue) {
      geocoder.setInput(defaultValue);
    }

    return () => {
      // Clean up on unmount
      if (geocoderInstance.current && geocoderRef.current) {
        if (geocoderRef.current.firstChild) {
          geocoderRef.current.removeChild(geocoderRef.current.firstChild);
        }
        geocoderInstance.current = null;
      }
    };
  }, []);

  // Update input value when defaultValue changes
  useEffect(() => {
    if (geocoderInstance.current && defaultValue) {
      geocoderInstance.current.setInput(defaultValue);
      setSelectedValue(defaultValue);
    }
  }, [defaultValue]);

  return (
    <div 
      ref={geocoderRef} 
      className={`mapbox-geocoder ${className}`} 
      style={style}
      data-value={selectedValue}
    />
  );
}