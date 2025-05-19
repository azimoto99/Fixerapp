import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { MapPin } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Common US address suggestions for demo purposes
const COMMON_ADDRESSES = [
  { address: "123 Main St, New York, NY 10001", lat: 40.7128, lng: -74.0060 },
  { address: "456 Market St, San Francisco, CA 94103", lat: 37.7749, lng: -122.4194 },
  { address: "789 Michigan Ave, Chicago, IL 60611", lat: 41.8781, lng: -87.6298 },
  { address: "101 Pine St, Seattle, WA 98101", lat: 47.6062, lng: -122.3321 },
  { address: "202 Peachtree St, Atlanta, GA 30303", lat: 33.7490, lng: -84.3880 },
  { address: "303 South St, Boston, MA 02111", lat: 42.3601, lng: -71.0589 },
  { address: "404 Congress Ave, Austin, TX 78701", lat: 30.2672, lng: -97.7431 },
  { address: "505 Lincoln Rd, Miami Beach, FL 33139", lat: 25.7617, lng: -80.1918 },
  { address: "606 Canal St, New Orleans, LA 70130", lat: 29.9511, lng: -90.0715 },
  { address: "707 Pike St, Seattle, WA 98101", lat: 47.6062, lng: -122.3321 },
];

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
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<typeof COMMON_ADDRESSES>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Filter suggestions based on input
    if (value.length > 2) {
      const filtered = COMMON_ADDRESSES.filter(item => 
        item.address.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setOpen(true);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
    
    // Call parent onChange with just the address string
    onChange(value);
  };

  const handleSelectAddress = (item: typeof COMMON_ADDRESSES[0]) => {
    setInputValue(item.address);
    // Call parent onChange with address, lat, and lng
    onChange(item.address, item.lat, item.lng);
    setOpen(false);
  };

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="flex items-center w-full">
            <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              placeholder={placeholder}
              className={className}
              onFocus={() => inputValue.length > 2 && setSuggestions.length > 0 && setOpen(true)}
            />
          </div>
        </PopoverTrigger>
        {suggestions.length > 0 && (
          <PopoverContent className="p-0 w-[300px] sm:w-[400px]" align="start">
            <Command>
              <CommandList>
                <CommandEmpty>No matches found</CommandEmpty>
                <CommandGroup>
                  {suggestions.map((item, index) => (
                    <CommandItem
                      key={index}
                      value={item.address}
                      onSelect={() => handleSelectAddress(item)}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      <span>{item.address}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}