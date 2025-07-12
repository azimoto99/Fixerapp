import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';

// Set the access token from environment variable
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

interface LocationInputProps {
  onLocationSelect: (location: any) => void;
  placeholder?: string;
  initialValue?: string;
}

interface GeocodingResult {
  place_name: string;
  center: [number, number]; // [longitude, latitude]
  id: string;
}

export default function LocationInput({ 
  onLocationSelect, 
  placeholder = "Enter location",
  initialValue = ''
}: LocationInputProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.length > 2) {
        fetchSuggestions();
      } else {
        setSuggestions([]);
      }
    }, 500); // Debounce time

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  const fetchSuggestions = async () => {
    if (!query || query.length < 3) {
      setSuggestions([]);
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
                  return feature.center && 
                         Array.isArray(feature.center) && 
                         feature.center.length === 2 &&
                         typeof feature.center[0] === 'number' &&
                         typeof feature.center[1] === 'number' &&
                         Math.abs(feature.center[1]) <= 90 &&
                         Math.abs(feature.center[0]) <= 180;
                })
                .map((feature: any) => ({
                  id: feature.id,
                  place_name: feature.place_name,
                  center: feature.center,
                }));
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
                  const lat = parseFloat(item.lat);
                  const lon = parseFloat(item.lon);
                  return !isNaN(lat) && !isNaN(lon) && 
                         Math.abs(lat) <= 90 && 
                         Math.abs(lon) <= 180;
                })
                .map((item: any, index: number) => ({
                  id: item.osm_id || `nominatim-${index}`,
                  place_name: item.display_name,
                  center: [parseFloat(item.lon), parseFloat(item.lat)]
                }));
            }
          }
        } catch (nominatimError) {
          console.warn('Nominatim geocoding failed:', nominatimError);
        }
      }

      setSuggestions(results);
    } catch (error) {
      console.error('Geocoding error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (suggestion: any) => {
    const locationData = {
      displayName: suggestion.place_name,
      latitude: suggestion.center[1],
      longitude: suggestion.center[0],
    };
    setQuery(locationData.displayName);
    onLocationSelect(locationData);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-10"
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-card border mt-1 rounded-md shadow-lg">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.id}
              onClick={() => handleSelect(suggestion)}
              className="p-2 hover:bg-accent cursor-pointer"
            >
              {suggestion.place_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
