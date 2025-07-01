import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface LocationInputProps {
  onLocationSelect: (location: any) => void;
  placeholder?: string;
  initialValue?: string;
}

export default function LocationInput({ 
  onLocationSelect, 
  placeholder = "Enter location",
  initialValue = ''
}: LocationInputProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.length > 2) {
        fetchSuggestions();
      }
    }, 500); // Debounce time

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('GET', `/api/geocode/autocomplete?q=${query}`);
      const data = await response.json();
      if (data.features) {
        setSuggestions(data.features);
      }
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
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
