import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JOB_CATEGORIES } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { geocodeAddress } from '@/lib/geocoding';

interface JobSearchProps {
  onSearch: (params: { 
    query: string; 
    category: string; 
    searchMode?: 'location' | 'description';
    coordinates?: { latitude: number; longitude: number } 
  }) => void;
}

const JobSearch: React.FC<JobSearchProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [searchMode, setSearchMode] = useState<'location' | 'description'>('location');
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchLocation, setLastSearchLocation] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // If category is 'all', pass empty string to search all categories
    const searchCategory = category === 'all' ? '' : category;
    
    // If in location mode and there's a query, geocode the address
    if (searchMode === 'location' && query.trim()) {
      setIsSearching(true);
      try {
        console.log("Geocoding address:", query);
        const geocodeResult = await geocodeAddress(query);
        console.log("Geocode result:", geocodeResult);
        
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

  const toggleSearchMode = () => {
    const newSearchMode = searchMode === 'location' ? 'description' : 'location';
    setSearchMode(newSearchMode);
    
    // Also trigger search with the new search mode if there's a query
    if (query) {
      const searchCategory = category === 'all' ? '' : category;
      onSearch({ query, category: searchCategory, searchMode: newSearchMode });
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col">
          {/* Redesigned search bar with consistent styling */}
          <div className="flex items-center bg-gray-100 rounded-full p-1 border border-gray-200 hover:border-primary/40 transition-colors">
            {/* Mode indicator icon with no magnifying glass */}
            <div className="flex items-center justify-center h-8 w-8 ml-1">
              {searchMode === 'location' ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-primary">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-primary">
                  <path d="M21 16S8.3 20 3 16"></path>
                  <path d="M21 8S8.3 4 3 8"></path>
                  <path d="M3 8v8"></path>
                  <path d="M21 8v8"></path>
                </svg>
              )}
            </div>

            {/* Input field with no icon */}
            <Input
              type="text"
              placeholder={searchMode === 'location' ? "Search by location..." : "Search by keywords..."}
              className="flex-1 border-0 shadow-none bg-transparent focus:ring-0 h-8 px-1"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />

            {/* Toggle search mode button */}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full w-8 h-8 p-0 flex items-center justify-center"
              onClick={toggleSearchMode}
              title={searchMode === 'location' ? 'Switch to keyword search' : 'Switch to location search'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-500">
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path>
                <line x1="16" y1="5" x2="22" y2="5"></line>
                <line x1="19" y1="2" x2="19" y2="8"></line>
                <circle cx="9" cy="9" r="2"></circle>
                <path d="m16 11-2.51 2.51c-.42.42-.99.59-1.54.58-1.24-.03-2.46-.5-3.35-1.36-.89-.86-1.27-1.86-1.49-2.89-.32-1.77.7-3.76 2.16-4.81"></path>
              </svg>
            </Button>

            {/* Search button - single magnifying glass here */}
            <Button
              type="submit"
              size="sm"
              className="rounded-full w-8 h-8 p-0 flex items-center justify-center bg-primary hover:bg-primary/90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </svg>
            </Button>

            {/* Filter button */}
            <Button
              type="button"
              size="sm"
              variant={category ? "default" : "ghost"}
              className={`rounded-full w-8 h-8 p-0 flex items-center justify-center ml-1 ${category ? 'bg-primary hover:bg-primary/90' : 'text-gray-500'}`}
              onClick={() => {
                // Toggle current category filter
                if (category) {
                  setCategory('');
                  onSearch({ query, category: '', searchMode });
                } else {
                  // Show category horizontal scrollbar
                  const categoryScroll = document.getElementById('category-scroll');
                  if (categoryScroll) {
                    categoryScroll.scrollIntoView({ behavior: 'smooth' });
                  }
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
            </Button>
          </div>
          
          {/* Ultra-compact category horizontal pills - with animation */}
          <div id="category-scroll" className="flex items-center space-x-1 overflow-x-auto mt-1 no-scrollbar">
            <div 
              className={`px-2 py-0.5 rounded-full text-xs cursor-pointer whitespace-nowrap transition-all duration-200 ${
                category === '' 
                  ? 'bg-primary text-white font-medium shadow-md scale-105' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => {
                setCategory('');
                onSearch({ query, category: '', searchMode });
              }}
            >
              All
            </div>
            {JOB_CATEGORIES.map((cat) => (
              <div
                key={cat}
                className={`px-2 py-0.5 rounded-full text-xs cursor-pointer whitespace-nowrap transition-all duration-200 ${
                  category === cat 
                    ? 'bg-primary text-white font-medium shadow-md scale-105' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => {
                  setCategory(cat);
                  onSearch({ query, category: cat, searchMode });
                }}
              >
                {cat}
              </div>
            ))}
          </div>
        </div>
        
        {/* Display search status indicators */}
        {isSearching && (
          <div className="mt-2 flex items-center text-xs text-primary animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Finding location...</span>
          </div>
        )}
        
        {searchMode === 'location' && lastSearchLocation && !isSearching && (
          <div className="mt-2 flex items-center text-xs text-primary-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Searching near: <strong>{lastSearchLocation}</strong></span>
          </div>
        )}
      </form>
    </div>
  );
};

export default JobSearch;
