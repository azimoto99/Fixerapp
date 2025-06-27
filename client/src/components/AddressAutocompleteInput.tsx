import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";

// Set the access token from environment variable
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

interface AddressAutocompleteInputProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, lat?: number, lng?: number) => void;
  onLocationSelect?: (address: string, coordinates: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  name?: string;
}

interface GeocodingResult {
  place_name: string;
  center: [number, number]; // [longitude, latitude]
}

export const AddressAutocompleteInput = forwardRef<HTMLInputElement, AddressAutocompleteInputProps>(({
  value,
  defaultValue,
  onChange,
  onLocationSelect,
  placeholder = "Enter an address",
  className = "",
  required = false,
  name
}, ref) => {
  const [inputValue, setInputValue] = useState(value || defaultValue || '');
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch address suggestions from Mapbox Geocoding API with Nominatim fallback
  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setIsLoading(true);
    try {
      let results: GeocodingResult[] = [];

      // Try Mapbox first if we have an access token
      if (MAPBOX_ACCESS_TOKEN) {
        try {
          const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;
          const params = new URLSearchParams({
            access_token: MAPBOX_ACCESS_TOKEN,
            country: 'us',
            types: 'address,place,neighborhood,locality',
            limit: '5',
          });
          
          const response = await fetch(`${endpoint}?${params.toString()}`);
          if (response.ok) {
            const data = await response.json();
            if (data.features && Array.isArray(data.features)) {
              results = data.features
                .filter((feature: any) => {
                  // Validate that the feature has valid coordinates
                  return feature.center && 
                         Array.isArray(feature.center) && 
                         feature.center.length === 2 &&
                         typeof feature.center[0] === 'number' &&
                         typeof feature.center[1] === 'number' &&
                         Math.abs(feature.center[1]) <= 90 &&
                         Math.abs(feature.center[0]) <= 180;
                })
                .map((feature: any) => ({
                  place_name: feature.place_name,
                  center: feature.center,
                }));
              console.log('Mapbox results:', results.length, 'valid addresses found');
            }
          }
        } catch (mapboxError) {
          console.warn('Mapbox geocoding failed, trying fallback:', mapboxError);
        }
      }

      // If Mapbox failed or no results, try Nominatim as fallback
      if (results.length === 0) {
        try {
          const endpoint = `https://nominatim.openstreetmap.org/search`;
          const params = new URLSearchParams({
            q: query,
            format: 'json',
            limit: '5',
            addressdetails: '1',
            countrycodes: 'us',
          });
          
          const response = await fetch(`${endpoint}?${params.toString()}`, {
            headers: {
              'Accept-Language': 'en-US,en',
              'User-Agent': 'Fixer App Address Autocomplete'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
              results = data
                .filter((item: any) => {
                  // Validate coordinates
                  const lat = parseFloat(item.lat);
                  const lon = parseFloat(item.lon);
                  return !isNaN(lat) && !isNaN(lon) && 
                         Math.abs(lat) <= 90 && 
                         Math.abs(lon) <= 180;
                })
                .map((item: any) => ({
                  place_name: item.display_name,
                  center: [parseFloat(item.lon), parseFloat(item.lat)]
                }));
              console.log('Nominatim results:', results.length, 'valid addresses found');
            }
          }
        } catch (nominatimError) {
          console.warn('Nominatim geocoding failed:', nominatimError);
        }
      }

      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error) {
      console.error('Geocoding error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Call onChange immediately for form handling
    if (onChange) {
      onChange(newValue);
    }
    
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set a new timer for debounced geocoding
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 500); // 500ms debounce
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: GeocodingResult) => {
    const address = suggestion.place_name;
    const [lng, lat] = suggestion.center;
    
    console.log('Address suggestion selected:', {
      address,
      coordinates: { lat, lng },
      originalCenter: suggestion.center
    });

    // Validate coordinates
    if (!lat || !lng || typeof lat !== 'number' || typeof lng !== 'number') {
      console.error('Invalid coordinates from suggestion:', { lat, lng });
      return;
    }

    // Check for reasonable coordinate ranges
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      console.error('Coordinates out of range:', { lat, lng });
      return;
    }
    
    setInputValue(address);
    setSuggestions([]);
    setShowSuggestions(false);
    
    // Call both callbacks
    if (onChange) {
      onChange(address, lat, lng);
    }
    if (onLocationSelect) {
      onLocationSelect(address, { lat, lng });
    }

    console.log('Address selection completed:', { address, lat, lng });
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Update input value when prop changes
  useEffect(() => {
    if (value !== undefined && value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  // Clear debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full relative">
      <div className="flex items-center w-full relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          ref={ref}
          name={name}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`pl-10 pr-10 ${className}`}
          required={required}
          onFocus={() => {
            if (inputValue.length >= 3 && suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      
      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="px-4 py-2 hover:bg-muted cursor-pointer text-sm flex items-start transition-colors"
              onClick={() => handleSuggestionSelect(suggestion)}
            >
              <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-muted-foreground" />
              <span className="break-words">{suggestion.place_name}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* No results message */}
      {showSuggestions && suggestions.length === 0 && !isLoading && inputValue.length >= 3 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg">
          <div className="px-4 py-2 text-sm text-muted-foreground">
            No addresses found. Try a different search term.
          </div>
        </div>
      )}
    </div>
  );
});

AddressAutocompleteInput.displayName = 'AddressAutocompleteInput';
