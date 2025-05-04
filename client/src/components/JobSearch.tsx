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
          {/* Ultra-compact DoorDash-style search bar */}
          <div className="flex items-center">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                {searchMode === 'location' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-400">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-400">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.3-4.3"></path>
                  </svg>
                )}
              </div>
              <Input
                type="text"
                placeholder={searchMode === 'location' ? "Search by location..." : "Search by description..."}
                className="pl-10 pr-2 py-2 rounded-full border-gray-200 shadow-none bg-gray-100 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const searchCategory = category === 'all' ? '' : category;
                    onSearch({ query, category: searchCategory, searchMode });
                  }
                }}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="ml-1 rounded-full w-8 h-8 p-0 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
              onClick={toggleSearchMode}
              title={searchMode === 'location' ? 'Switch to description search' : 'Switch to location search'}
            >
              {searchMode === 'location' ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.3-4.3"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              )}
            </Button>
            <Button
              type="submit"
              size="sm"
              className="ml-1 rounded-full w-8 h-8 p-0 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </svg>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={category ? "default" : "outline"}
              className="ml-1 rounded-full w-8 h-8 p-0 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
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
      </form>
    </div>
  );
};

export default JobSearch;
