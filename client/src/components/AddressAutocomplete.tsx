import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { Input, InputProps } from '@/components/ui/input';
import { MapPin } from 'lucide-react';

interface AddressAutocompleteProps extends Omit<InputProps, 'onChange'> {
  onAddressSelect: (address: string, lat: number, lng: number) => void;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const AddressAutocomplete = forwardRef<HTMLInputElement, AddressAutocompleteProps>(
  ({ onAddressSelect, value, onChange, placeholder = "Enter location", ...props }, ref) => {
    const autocompleteRef = useRef<HTMLInputElement | null>(null);
    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
    const [showError, setShowError] = useState(false);
    
    // Initialize Google Maps Autocomplete
    useEffect(() => {
      // Check if Google Maps API is loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        // Get the input element to attach autocomplete to
        const inputElement = autocompleteRef.current;
        if (inputElement) {
          // Create the autocomplete object
          const autocompleteInstance = new google.maps.places.Autocomplete(inputElement, {
            types: ['address'],
            fields: ['address_components', 'formatted_address', 'geometry']
          });
          
          // Store the autocomplete instance in state
          setAutocomplete(autocompleteInstance);
          
          // Add place_changed listener
          autocompleteInstance.addListener('place_changed', () => {
            const place = autocompleteInstance.getPlace();
            
            if (place.geometry && place.geometry.location) {
              // Get coordinates
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              const formattedAddress = place.formatted_address || '';
              
              // Call the callback with the address and coordinates
              onAddressSelect(formattedAddress, lat, lng);
              onChange(formattedAddress);
            }
          });
        }
      } else {
        console.warn('Google Maps JavaScript API not loaded');
        setShowError(true);
      }
      
      // Cleanup function to remove event listeners
      return () => {
        if (autocomplete) {
          google.maps.event.clearInstanceListeners(autocomplete);
        }
      };
    }, [onAddressSelect, onChange]);
    
    // Prevent form submission when Enter is pressed in the autocomplete field
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
    };
    
    return (
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={(node) => {
            // This handles both the forwarded ref and our internal ref
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
            autocompleteRef.current = node;
          }}
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
);

AddressAutocomplete.displayName = 'AddressAutocomplete';

export default AddressAutocomplete;