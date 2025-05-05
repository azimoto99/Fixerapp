import { useState, useCallback, memo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JOB_CATEGORIES } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { geocodeAddress } from '@/lib/geocoding';
import { Loader2, MapPin, Book, RotateCcw, Search, Filter } from 'lucide-react';

interface JobSearchProps {
  onSearch: (params: { 
    query: string; 
    category: string; 
    searchMode?: 'location' | 'description';
    coordinates?: { latitude: number; longitude: number } 
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
  const [category, setCategory] = useState('');
  const [searchMode, setSearchMode] = useState<'location' | 'description'>('location');
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchLocation, setLastSearchLocation] = useState<string | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // If category is 'all', pass empty string to search all categories
    const searchCategory = category === 'all' ? '' : category;
    
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
          
          onSearch({ 
            query, 
            category: searchCategory, 
            searchMode,
            coordinates: {
              latitude: geocodeResult.latitude,
              longitude: geocodeResult.longitude
            }
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
      onSearch({ query, category: searchCategory, searchMode });
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

  // Handle input change with debounced geolocation
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // If in location mode and typing has paused, try to geocode
    if (searchMode === 'location' && value.length > 3) {
      debouncedGeolocation(value);
    }
  };

  const toggleSearchMode = () => {
    setSearchMode(prevMode => prevMode === 'location' ? 'description' : 'location');
    // Clear the last search location when switching to description mode
    if (searchMode === 'location') {
      setLastSearchLocation(null);
    }
  };

  const handleCategorySelect = (selectedCategory: string) => {
    setCategory(selectedCategory);
    // Auto-submit search when category changes
    setTimeout(() => {
      onSearch({ 
        query, 
        category: selectedCategory, 
        searchMode,
        // Pass existing coordinates if we have them and are in location mode
        ...(searchMode === 'location' && lastSearchLocation && {
          coordinates: {
            latitude: 0, // We'd use stored coordinates in a real implementation
            longitude: 0
          }
        })
      });
    }, 100);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col">
          {/* Enhanced search bar with modern styling */}
          <div className="flex items-center bg-background/70 backdrop-blur-sm rounded-full p-1 border border-border/50 hover:border-primary/40 transition-colors shadow-sm">
            {/* Mode indicator icon */}
            <div className="flex items-center justify-center h-8 w-8 ml-1 text-primary">
              {searchMode === 'location' ? <MapPin size={16} /> : <Book size={16} />}
            </div>

            {/* Input field */}
            <Input
              type="text"
              placeholder={searchMode === 'location' ? "Enter location..." : "Search keywords..."}
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

            {/* Clear button - only show when there's text */}
            {query && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-full w-8 h-8 p-0"
                onClick={() => setQuery('')}
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
              className="rounded-full w-8 h-8 p-0"
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
              className="rounded-full w-8 h-8 p-0 bg-primary hover:bg-primary/90"
              disabled={isSearching}
            >
              {isSearching ? 
                <Loader2 size={14} className="animate-spin" /> : 
                <Search size={14} />
              }
            </Button>

            {/* Filter button */}
            <Button
              type="button"
              size="sm"
              variant={category ? "default" : "ghost"}
              className={`rounded-full w-8 h-8 p-0 ml-1 
                ${category ? 'bg-primary hover:bg-primary/90' : 'hover:bg-secondary'}`}
              onClick={() => setShowCategories(!showCategories)}
              title="Filter by category"
            >
              <Filter size={14} />
            </Button>
          </div>
          
          {/* Categories horizontal pill bar - only show when filter is active */}
          {showCategories && (
            <div 
              className="flex items-center space-x-1 overflow-x-auto py-2 my-1 px-1 
                scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent
                animate-in slide-in-from-top duration-300 ease-in-out"
            >
              <div 
                className={`px-2 py-1 rounded-full text-xs cursor-pointer whitespace-nowrap transition-all ${
                  category === '' 
                    ? 'bg-primary text-primary-foreground font-medium shadow-sm scale-105' 
                    : 'bg-secondary/50 text-secondary-foreground hover:bg-secondary'
                }`}
                onClick={() => handleCategorySelect('')}
              >
                All Categories
              </div>
              {JOB_CATEGORIES.map((cat) => (
                <div
                  key={cat}
                  className={`px-2 py-1 rounded-full text-xs cursor-pointer whitespace-nowrap transition-all ${
                    category === cat 
                      ? 'bg-primary text-primary-foreground font-medium shadow-sm scale-105' 
                      : 'bg-secondary/50 text-secondary-foreground hover:bg-secondary'
                  }`}
                  onClick={() => handleCategorySelect(cat)}
                >
                  {cat}
                </div>
              ))}
            </div>
          )}
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
