import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set the access token from environment variable
const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
if (accessToken) {
  mapboxgl.accessToken = accessToken;
} else {
  console.error('Mapbox access token is missing!');
}

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string, lat?: number, lng?: number) => void;
  placeholder?: string;
  className?: string;
}

export function AddressAutocompleteInput({
  value,
  onChange,
  placeholder = "Enter an address",
  className = ""
}: AddressAutocompleteInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const geocoderRef = useRef<MapboxGeocoder | null>(null);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any existing controls
    if (containerRef.current.firstChild) {
      containerRef.current.innerHTML = '';
    }

    // Create the geocoder instance
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      types: 'address,place,neighborhood',
      placeholder: placeholder,
      countries: 'us', // Limit to United States
      mapboxgl: mapboxgl,
      marker: false
    });

    // Store reference for cleanup
    geocoderRef.current = geocoder;

    // Add to container
    // We need to pass a dummy element since onAdd requires an HTMLElement in newer Mapbox versions
    const dummyMap = document.createElement('div');
    containerRef.current.appendChild(geocoder.onAdd(dummyMap as any));

    // Set initial value
    if (value) {
      geocoder.setInput(value);
    }

    // Handle result selection
    geocoder.on('result', (event) => {
      const result = event.result;
      const address = result.place_name;
      const [lng, lat] = result.center;
      
      setInputValue(address);
      onChange(address, lat, lng);
    });

    // Handle clear event
    geocoder.on('clear', () => {
      setInputValue('');
      onChange('');
    });

    // Handle manual input
    geocoder.on('loading', (e) => {
      const query = e.query;
      if (query && query !== inputValue) {
        setInputValue(query);
        onChange(query);
      }
    });

    return () => {
      // Cleanup
      if (geocoderRef.current && containerRef.current?.firstChild) {
        geocoderRef.current = null;
      }
    };
  }, []);

  // Update when value prop changes
  useEffect(() => {
    if (geocoderRef.current && value !== inputValue) {
      geocoderRef.current.setInput(value);
      setInputValue(value);
    }
  }, [value]);

  return (
    <div className="w-full">
      {/* Wrapper for styling */}
      <div className="flex items-center w-full">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
        <div 
          ref={containerRef}
          className={`w-full mapbox-geocoder-custom ${className}`}
        />
      </div>
      
      {/* Add custom styling for the geocoder */}
      <style jsx global>{`
        .mapbox-geocoder-custom .mapboxgl-ctrl-geocoder {
          width: 100%;
          max-width: 100%;
          box-shadow: none;
          border: 1px solid var(--input-border);
          border-radius: var(--radius);
        }
        
        .mapbox-geocoder-custom .mapboxgl-ctrl-geocoder input {
          padding-left: 2.5rem;
          height: 40px;
        }
        
        .mapbox-geocoder-custom .mapboxgl-ctrl-geocoder--icon-search {
          display: none;
        }
        
        .mapbox-geocoder-custom .mapboxgl-ctrl-geocoder--button {
          background: transparent;
        }
      `}</style>
    </div>
  );
}