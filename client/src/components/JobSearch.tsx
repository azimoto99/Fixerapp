import { memo, useCallback, useRef, useState } from 'react';
import {
  BookText,
  Filter,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { JOB_CATEGORIES } from '@shared/schema';
import { geocodeAddress } from '@/lib/geocoding';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface JobSearchProps {
  onSearch: (params: {
    query: string;
    category: string;
    searchMode?: 'location' | 'description';
    coordinates?: { latitude: number; longitude: number };
    radiusMiles?: number;
  }) => void;
}

const useDebounce = (fn: Function, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        fn(...args);
      }, delay);
    },
    [fn, delay]
  );
};

const JobSearch: React.FC<JobSearchProps> = memo(({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [searchMode, setSearchMode] = useState<'location' | 'description'>('location');
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchLocation, setLastSearchLocation] = useState<string | null>(null);
  const [radiusMiles, setRadiusMiles] = useState(10);
  const [locationCoordinates, setLocationCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showCategoryTray, setShowCategoryTray] = useState(false);
  const { toast } = useToast();

  const runSearch = async (overrideQuery?: string, overrideRadius?: number) => {
    const activeQuery = (overrideQuery ?? query).trim();
    const activeRadius = overrideRadius ?? radiusMiles;
    const activeCategory = category === 'all' ? '' : category;

    if (searchMode === 'location' && activeQuery) {
      setIsSearching(true);
      try {
        const geocodeResult = await geocodeAddress(activeQuery);

        if (!geocodeResult) {
          toast({
            title: 'Location not found',
            description: 'Try a city, ZIP code, or a more specific address.',
            variant: 'destructive',
          });
          return;
        }

        const coordinates = {
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude,
        };

        setLocationCoordinates(coordinates);
        setLastSearchLocation(geocodeResult.formattedAddress.split(',')[0] || activeQuery);
        onSearch({
          query: activeQuery,
          category: activeCategory,
          searchMode,
          coordinates,
          radiusMiles: activeRadius,
        });
      } catch (error) {
        console.error('Geocoding error:', error);
        toast({
          title: 'Search error',
          description: 'We could not load that area right now. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsSearching(false);
      }

      return;
    }

    onSearch({
      query: activeQuery,
      category: activeCategory,
      searchMode,
      coordinates: locationCoordinates || undefined,
      radiusMiles: activeRadius,
    });
  };

  const debouncedLocationPreview = useDebounce(async (address: string) => {
    if (address.trim().length < 4 || searchMode !== 'location') {
      return;
    }

    try {
      const result = await geocodeAddress(address);
      if (result) {
        setLastSearchLocation(result.formattedAddress.split(',')[0] || address);
      }
    } catch {
      // Silent preview failure on purpose.
    }
  }, 700);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);

    if (searchMode === 'location') {
      debouncedLocationPreview(value);
    }
  };

  const handleRadiusChange = (value: number[]) => {
    const nextRadius = value[0];
    setRadiusMiles(nextRadius);

    if (locationCoordinates || query.trim()) {
      runSearch(undefined, nextRadius);
    }
  };

  const toggleSearchMode = () => {
    setSearchMode((current) => (current === 'location' ? 'description' : 'location'));
    setLastSearchLocation(null);
  };

  const handleCategorySelect = (nextCategory: string) => {
    setCategory(nextCategory);
    setTimeout(() => runSearch(), 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSearchMode('location')}
          className={[
            'rounded-full px-4 py-2 text-sm font-semibold transition-all',
            searchMode === 'location'
              ? 'bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-primary-foreground shadow-[0_12px_28px_rgba(3,105,161,0.22)]'
              : 'bg-foreground/[0.05] text-foreground/70 hover:text-foreground',
          ].join(' ')}
        >
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Nearby search
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSearchMode('description')}
          className={[
            'rounded-full px-4 py-2 text-sm font-semibold transition-all',
            searchMode === 'description'
              ? 'bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-primary-foreground shadow-[0_12px_28px_rgba(3,105,161,0.22)]'
              : 'bg-foreground/[0.05] text-foreground/70 hover:text-foreground',
          ].join(' ')}
        >
          <span className="inline-flex items-center gap-2">
            <BookText className="h-4 w-4" />
            Keyword search
          </span>
        </button>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          runSearch();
        }}
        className="space-y-4"
      >
        <div className="rounded-[26px] border border-white/70 bg-white/78 p-2 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/72">
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,rgba(2,132,199,0.16),rgba(251,146,60,0.14))] text-primary">
              {searchMode === 'location' ? <MapPin className="h-5 w-5" /> : <BookText className="h-5 w-5" />}
            </div>

            <Input
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder={
                searchMode === 'location'
                  ? 'City, ZIP code, or neighborhood'
                  : 'Search for work like moving, cleaning, or delivery'
              }
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              autoComplete="off"
            />

            {query ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => {
                  setQuery('');
                  setLastSearchLocation(null);
                }}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            ) : null}

            <Button type="submit" size="icon" className="shrink-0" disabled={isSearching}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={showCategoryTray ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowCategoryTray((current) => !current)}
          >
            <Filter className="h-4 w-4" />
            {category ? category : 'All categories'}
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <SlidersHorizontal className="h-4 w-4" />
                Radius {radiusMiles} mi
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-5" align="start">
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Search radius
                  </div>
                  <div className="mt-2 text-sm text-foreground/75">
                    Control how wide your job discovery area should be.
                  </div>
                </div>

                <Slider defaultValue={[radiusMiles]} min={1} max={50} step={1} onValueChange={handleRadiusChange} />

                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <span>1 mile</span>
                  <span>{radiusMiles} miles</span>
                  <span>50 miles</span>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button type="button" variant="ghost" size="sm" onClick={toggleSearchMode}>
            {searchMode === 'location' ? <BookText className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
            Switch mode
          </Button>
        </div>

        {showCategoryTray ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleCategorySelect('')}
              className={[
                'rounded-full px-3 py-2 text-sm font-semibold transition-all',
                category === ''
                  ? 'bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-primary-foreground shadow-[0_10px_24px_rgba(3,105,161,0.20)]'
                  : 'bg-foreground/[0.05] text-foreground/72 hover:text-foreground',
              ].join(' ')}
            >
              All categories
            </button>

            {JOB_CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleCategorySelect(item)}
                className={[
                  'rounded-full px-3 py-2 text-sm font-semibold transition-all',
                  category === item
                    ? 'bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-primary-foreground shadow-[0_10px_24px_rgba(3,105,161,0.20)]'
                    : 'bg-foreground/[0.05] text-foreground/72 hover:text-foreground',
                ].join(' ')}
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-2">
        {lastSearchLocation ? (
          <div className="stat-pill">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>Searching near {lastSearchLocation}</span>
          </div>
        ) : null}
        <div className="stat-pill">
          <Search className="h-3.5 w-3.5 text-primary" />
          <span>{searchMode === 'location' ? 'Location aware results' : 'Keyword ranked results'}</span>
        </div>
      </div>
    </div>
  );
});

JobSearch.displayName = 'JobSearch';

export default JobSearch;
