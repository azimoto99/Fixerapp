import { useState, useCallback, memo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

import { useToast } from '@/hooks/use-toast';
import { geocodeAddress } from '@/lib/geocoding';
import MapboxAutocomplete from './MapboxAutocomplete';
import { Loader2, MapPin, Book, RotateCcw, Search, Ruler } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface JobSearchProps {
  onSearch: (params: {
    query: string;
    searchMode?: 'location' | 'description';
    coordinates?: { latitude: number; longitude: number };
    radiusMiles?: number;
  }) => void;
}

// Use a debounce function to prevent too many geocode requests
const useDebounce = (fn: Function, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      fn(...args);
    }, delay);
  }, [fn, delay]);
};

// Use memo to prevent unnecessary re-renders
const JobSearch: React.FC<JobSearchProps> = memo(({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'location' | 'description'>('description'); // Default to description search
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchLocation, setLastSearchLocation] = useState<string | null>(null);
  const [radiusMiles, setRadiusMiles] = useState<number>(10); // Default 10 mile radius
  const [showRadiusFilter, setShowRadiusFilter] = useState(false);
  const [locationCoordinates, setLocationCoordinates] = useState<{latitude: number, longitude: number} | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If in location mode and there's a query, geocode the address
    if (searchMode === 'location' && query.trim()) {
      setIsSearching(true);
      try {
        const geocodeResult = await geocodeAddress(query);

        if (geocodeResult.success) {
          toast({
            title: "Location found",
            description: `Searching near ${geocodeResult.displayName?.split(',')[0] || query}`,
          });

          // Store the location name for displaying to user
          setLastSearchLocation(geocodeResult.displayName?.split(',')[0] || query);

          // Store coordinates for radius filter to use
          const coordinates = {
            latitude: geocodeResult.latitude,
            longitude: geocodeResult.longitude
          };
          setLocationCoordinates(coordinates);

          onSearch({
            query,
            searchMode,
            coordinates,
            radiusMiles: searchMode === 'location' ? radiusMiles : undefined
          });
        } else {
          toast({
            title: "Location not found",
            description: geocodeResult.error || "Couldn't find that location. Try a different address or postal code.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Geocoding error:", error);
        toast({
          title: "Search error",
          description: "There was a problem with your search. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsSearching(false);
      }
    } else {
      // For description search, just pass the query directly
      onSearch({ query, searchMode });
    }
  };
  
  // Handle radius change and search with updated radius
  const handleRadiusChange = (value: number[]) => {
    const newRadius = value[0];
    setRadiusMiles(newRadius);

    // Only trigger a search if we have coordinates and are in location mode
    if (locationCoordinates && searchMode === 'location') {
      onSearch({
        query,
        searchMode,
        coordinates: locationCoordinates,
        radiusMiles: newRadius
      });
    }
  };

  // Debounce the geolocation to prevent too many API calls
  const debouncedGeolocation = useDebounce(async (address: string) => {
    if (!address.trim()) return;
    
    try {
      const result = await geocodeAddress(address);
      if (result.success) {
        // Show a subtle indicator that we found the location
        setLastSearchLocation(result.displayName?.split(',')[0] || address);
      }
    } catch (error) {
      // Silent fail for auto-complete attempts
    }
  }, 800);

  // Debounced search function for real-time filtering
  const debouncedSearch = useDebounce((searchQuery: string) => {
    if (searchMode === 'description') {
      // For description search, trigger search immediately for real-time filtering
      onSearch({ query: searchQuery, searchMode });
    }
  }, 300); // 300ms delay for real-time search

  // Handle input change with debounced geolocation and real-time search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // If in location mode and typing has paused, try to geocode
    if (searchMode === 'location' && value.length > 3) {
      debouncedGeolocation(value);
    } else if (searchMode === 'description') {
      // For description mode, trigger real-time search
      debouncedSearch(value);
    }
  };

  const toggleSearchMode = () => {
    setSearchMode(prevMode => prevMode === 'location' ? 'description' : 'location');
    // Clear the last search location when switching to description mode
    if (searchMode === 'location') {
      setLastSearchLocation(null);
    }
  };



  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col">
          {/* Square search bar with modern styling */}
          <div className="flex items-center bg-background/90 backdrop-blur-sm p-2 border border-border hover:border-primary/40 transition-colors shadow-sm">
            {/* Mode indicator icon */}
            <div className="flex items-center justify-center h-8 w-8 text-primary">
              {searchMode === 'location' ? <MapPin size={16} /> : <Book size={16} />}
            </div>

            {/* Input field - conditionally render MapboxAutocomplete for location search */}
            {searchMode === 'location' ? (
              <div className="flex-1">
                <MapboxAutocomplete
                  onSelect={(result) => {
                    setQuery(result.place_name);
                    setLastSearchLocation(result.text);
                    setLocationCoordinates({
                      latitude: result.center[1],
                      longitude: result.center[0]
                    });
                    // Trigger search with the selected location
                    onSearch({
                      query: result.place_name,
                      searchMode: 'location',
                      coordinates: {
                        latitude: result.center[1],
                        longitude: result.center[0]
                      },
                      radiusMiles
                    });
                  }}
                  placeholder="Enter location..."
                  className="flex-1 border-0 shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-foreground placeholder:text-muted-foreground"
                  defaultValue={query}
                />
              </div>
            ) : (
              <Input
                type="text"
                placeholder="Search keywords..."
                className="flex-1 border-0 shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-foreground placeholder:text-muted-foreground"
                value={query}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
                autoComplete="off"
              />
            )}

            {/* Clear button - only show when there's text */}
            {query && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="w-8 h-8 p-0"
                onClick={() => {
                  setQuery('');
                  // Trigger search with empty query to show all jobs
                  onSearch({ query: '', searchMode });
                }}
                title="Clear search"
              >
                <RotateCcw size={14} className="text-muted-foreground" />
              </Button>
            )}

            {/* Toggle search mode button */}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="w-8 h-8 p-0"
              onClick={toggleSearchMode}
              title={searchMode === 'location' ? 'Switch to keyword search' : 'Switch to location search'}
            >
              {searchMode === 'location' ? 
                <Book size={14} className="text-muted-foreground" /> : 
                <MapPin size={14} className="text-muted-foreground" />
              }
            </Button>

            {/* Search button */}
            <Button
              type="submit"
              size="sm"
              className="w-8 h-8 p-0 bg-primary hover:bg-primary/90"
              disabled={isSearching}
            >
              {isSearching ? 
                <Loader2 size={14} className="animate-spin" /> : 
                <Search size={14} />
              }
            </Button>


            
            {/* Radius filter button - only show in location mode */}
            {searchMode === 'location' && (
              <Popover open={showRadiusFilter} onOpenChange={setShowRadiusFilter}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant={showRadiusFilter ? "default" : "ghost"}
                    className={`w-8 h-8 p-0 ml-1 
                      ${showRadiusFilter ? 'bg-primary hover:bg-primary/90' : 'hover:bg-secondary'}`}
                    title="Set search radius"
                  >
                    <Ruler size={14} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4" align="end">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Search Radius</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Distance: {radiusMiles} miles</span>
                        <span className="text-xs text-muted-foreground">
                          {radiusMiles < 5 ? 'Local' : radiusMiles < 15 ? 'Nearby' : radiusMiles < 30 ? 'In area' : 'Regional'}
                        </span>
                      </div>
                      <Slider 
                        defaultValue={[radiusMiles]} 
                        min={1} 
                        max={50} 
                        step={1}
                        onValueChange={handleRadiusChange}
                      />
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">1mi</span>
                        <span className="text-xs text-muted-foreground">50mi</span>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          

        </div>
        
        {/* Location indicator - subtle toast-like message */}
        {searchMode === 'location' && lastSearchLocation && !isSearching && (
          <div className="mt-2 flex items-center justify-center text-xs text-primary bg-primary/5 py-1 px-2 rounded-full animate-in fade-in">
            <MapPin size={12} className="mr-1" />
            <span>Searching near <strong>{lastSearchLocation}</strong></span>
          </div>
        )}
      </form>
    </div>
  );
});

JobSearch.displayName = 'JobSearch';

export default JobSearch;
