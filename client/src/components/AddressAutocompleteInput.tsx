import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

// Set the access token from environment variable
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string, lat?: number, lng?: number) => void;
  placeholder?: string;
  className?: string;
}

interface GeocodingResult {
  place_name: string;
  center: [number, number]; // [longitude, latitude]
}

export function AddressAutocompleteInput({
  value,
  onChange,
  placeholder = "Enter an address",
  className = ""
}: AddressAutocompleteInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch address suggestions from Mapbox Geocoding API
  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 3 || !MAPBOX_ACCESS_TOKEN) return;
    
    setIsLoading(true);
    try {
      const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;
      const params = new URLSearchParams({
        access_token: MAPBOX_ACCESS_TOKEN,
        country: 'us',
        types: 'address,place,neighborhood,locality',
        limit: '5',
      });
      
      const response = await fetch(`${endpoint}?${params.toString()}`);
      const data = await response.json();
      
      if (data.features && Array.isArray(data.features)) {
        setSuggestions(data.features.map((feature: any) => ({
          place_name: feature.place_name,
          center: feature.center,
        })));
        setShowSuggestions(true);
      }
    } catch (error) {
      // Try using Nominatim as fallback (OpenStreetMap)
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
            'User-Agent': 'Fixer App'
          }
        });
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          setSuggestions(data.map((item: any) => ({
            place_name: item.display_name,
            center: [parseFloat(item.lon), parseFloat(item.lat)]
          })));
          setShowSuggestions(true);
        }
      } catch (fallbackError) {
        // Silent fail for fallback
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue); // Update the form value immediately
    
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set a new timer for debounce
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 500); // 500ms debounce
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: GeocodingResult) => {
    const address = suggestion.place_name;
    const [lng, lat] = suggestion.center;
    
    setInputValue(address);
    onChange(address, lat, lng);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
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
    if (value !== inputValue) {
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
    <div className="w-full relative">
      <div className="flex items-center w-full relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`pl-10 pr-10 ${className}`}
          onFocus={() => inputValue.length >= 3 && setSuggestions.length > 0 && setShowSuggestions(true)}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Spinner size="sm" />
          </div>
        )}
      </div>
      
      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="px-4 py-2 hover:bg-muted cursor-pointer text-sm flex items-start"
              onClick={() => handleSuggestionSelect(suggestion)}
            >
              <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-muted-foreground" />
              <span>{suggestion.place_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}