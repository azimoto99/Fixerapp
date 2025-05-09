import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { geocodeAddress, GeocodingResult } from '@/lib/geocoding';
import { Loader2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddressAutocompleteProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect?: (result: GeocodingResult) => void;
  className?: string;
}

/**
 * Address autocomplete component that suggests addresses based on user input
 * and geocodes the selected address.
 */
const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  onLocationSelect,
  className,
  ...props
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (newValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setLoading(true);
    
    // Debounce the API call
    timeoutRef.current = setTimeout(async () => {
      try {
        // For demonstration, we'll use the geocoding API to get address suggestions
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newValue)}&limit=5`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'TheJobApp/1.0',
              'Referer': window.location.origin
            },
            cache: 'no-cache'
          }
        );

        if (response.ok) {
          const data = await response.json();
          const addressSuggestions = data.map((item: any) => item.display_name);
          setSuggestions(addressSuggestions);
          setShowSuggestions(addressSuggestions.length > 0);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 500); // 500ms debounce
  };

  // Handle selection of a suggestion
  const handleSuggestionClick = async (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    
    if (onLocationSelect) {
      setLoading(true);
      try {
        const geocoded = await geocodeAddress(suggestion);
        if (geocoded.success) {
          onLocationSelect(geocoded);
        }
      } catch (error) {
        console.error('Error geocoding selected address:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionRef.current && 
        !suggestionRef.current.contains(event.target as Node) &&
        inputRef.current && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          className={cn("pr-10 text-gray-800 placeholder:text-gray-500", className)}
          onFocus={() => value.length >= 3 && suggestions.length > 0 && setShowSuggestions(true)}
          {...props}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <MapPin className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      
      {showSuggestions && (
        <div
          ref={suggestionRef}
          className="absolute z-10 mt-1 w-full bg-card shadow-md rounded-md border border-border overflow-auto max-h-60"
        >
          <ul>
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="px-4 py-2 hover:bg-accent cursor-pointer truncate text-sm"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <span>{suggestion}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;