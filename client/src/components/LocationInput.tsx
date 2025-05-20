import React, { useState, useEffect } from 'react';
import { geocodeAddress, detectCoordinates } from '@/lib/geocoding';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CircleX, MapPin, Loader2 } from 'lucide-react';

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  onCoordinatesChange?: (latitude: number, longitude: number, formattedAddress: string) => void;
  className?: string;
  placeholder?: string;
}

export default function LocationInput({
  value,
  onChange,
  onCoordinatesChange,
  className = '',
  placeholder = 'Enter address or coordinates'
}: LocationInputProps) {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);
  const [geocodingSuccess, setGeocodingSuccess] = useState(false);

  // Process address whenever the value changes (after a short delay)
  useEffect(() => {
    if (!value) {
      setGeocodingError(null);
      setGeocodingSuccess(false);
      return;
    }

    // Try to detect if the input already contains coordinates
    const detectedCoords = detectCoordinates(value);
    if (detectedCoords) {
      // User entered coordinates directly
      if (onCoordinatesChange) {
        onCoordinatesChange(
          detectedCoords.latitude,
          detectedCoords.longitude,
          value
        );
        setGeocodingSuccess(true);
        setGeocodingError(null);
      }
      return;
    }

    // Set a debounce timer to avoid too many API calls
    const timer = setTimeout(() => {
      handleGeocodeAddress();
    }, 1000); // Wait 1 second after user stops typing

    return () => clearTimeout(timer);
  }, [value]);

  // Function to geocode the address
  const handleGeocodeAddress = async () => {
    if (!value || isGeocoding) return;

    setIsGeocoding(true);
    setGeocodingError(null);
    setGeocodingSuccess(false);

    try {
      const result = await geocodeAddress(value);
      
      if (result) {
        // Successfully geocoded
        if (onCoordinatesChange) {
          onCoordinatesChange(
            result.latitude,
            result.longitude,
            result.formattedAddress
          );
        }
        setGeocodingSuccess(true);
      } else {
        setGeocodingError('Could not find coordinates for this address');
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
      setGeocodingError('Error finding location. Please try a different address.');
    } finally {
      setIsGeocoding(false);
    }
  };

  // Clear the input
  const handleClear = () => {
    onChange('');
    setGeocodingError(null);
    setGeocodingSuccess(false);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`pl-9 ${className} ${
              geocodingError ? 'border-destructive' : ''
            } ${geocodingSuccess ? 'border-green-500' : ''}`}
            disabled={isGeocoding}
          />
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <MapPin
              className={`h-4 w-4 ${
                geocodingError
                  ? 'text-destructive'
                  : geocodingSuccess
                  ? 'text-green-500'
                  : 'text-muted-foreground'
              }`}
            />
          </div>
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-3 flex items-center"
            >
              <CircleX className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleGeocodeAddress}
          disabled={!value || isGeocoding}
        >
          {isGeocoding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </Button>
      </div>
      {geocodingError && (
        <p className="text-destructive text-xs mt-1">{geocodingError}</p>
      )}
      {geocodingSuccess && (
        <p className="text-green-500 text-xs mt-1">
          Location found successfully
        </p>
      )}
    </div>
  );
}