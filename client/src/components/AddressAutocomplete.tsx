import React, { useEffect, useRef, useState } from 'react';
import { Input, InputProps } from '@/components/ui/input';
import { MapPin } from 'lucide-react';

interface AddressAutocompleteProps extends Omit<InputProps, 'onChange' | 'ref'> {
  onAddressSelect: (address: string, lat: number, lng: number) => void;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function AddressAutocomplete({
  onAddressSelect,
  value,
  onChange,
  placeholder = "Enter location",
  ...props
}: AddressAutocompleteProps) {
  const autocompleteRef = useRef<HTMLInputElement>(null);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (!window.google?.maps?.places) {
      console.warn('Google Maps JavaScript API not loaded');
      setShowError(true);
      return;
    }

    const inputElement = autocompleteRef.current;
    if (!inputElement) {
      return;
    }

    const autocompleteInstance = new google.maps.places.Autocomplete(inputElement, {
      types: ['address'],
      fields: ['address_components', 'formatted_address', 'geometry']
    });

    setShowError(false);

    const listener = autocompleteInstance.addListener('place_changed', () => {
      const place = autocompleteInstance.getPlace();

      if (!place.geometry?.location) {
        return;
      }

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const formattedAddress = place.formatted_address || '';

      onAddressSelect(formattedAddress, lat, lng);
      onChange(formattedAddress);
    });

    return () => {
      google.maps.event.clearInstanceListeners(autocompleteInstance);
      listener.remove();
    };
  }, [onAddressSelect, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={autocompleteRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="pl-9"
        {...props}
      />
      {showError && (
        <div className="text-xs text-red-500 mt-1">
          Google Maps API not loaded. Address autocomplete is unavailable.
        </div>
      )}
    </div>
  );
}

export default AddressAutocomplete;
