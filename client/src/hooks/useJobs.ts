import { useQuery } from '@tanstack/react-query';
import { Job } from '@shared/schema';
import { useGeolocation } from '@/lib/geolocation';
import { useAuth } from '@/hooks/use-auth';

interface UseJobsOptions {
  nearbyOnly?: boolean;
  radiusMiles?: number;
  poster?: boolean;
  includeAll?: boolean;
}

export function useJobs(
  options?: UseJobsOptions,
  searchParams?: { query?: string; category?: string }
) {
  const { userLocation } = useGeolocation();
  const { user } = useAuth();
  const { 
    nearbyOnly = false, 
    radiusMiles = 2,
    poster = false,
    includeAll = false 
  } = options || {};
  
  // Create a function to build the query path
  const buildQueryString = (params: string[]) => {
    return params.length ? `?${params.join('&')}` : '';
  };
  
  // Build normal jobs query
  const buildStandardJobsQuery = () => {
    const queryParams: string[] = [];
    
    if (searchParams?.query) {
      queryParams.push(`search=${encodeURIComponent(searchParams.query)}`);
    }
    
    if (searchParams?.category) {
      queryParams.push(`category=${encodeURIComponent(searchParams.category)}`);
    }
    
    // For job poster view, filter by poster ID
    if (poster && user) {
      queryParams.push(`posterId=${user.id}`);
    }
    
    // Default to open jobs unless we're viewing all jobs
    if (!includeAll && !poster) {
      queryParams.push('status=open');
    }
    
    return `/api/jobs${buildQueryString(queryParams)}`;
  };
  
  // Build nearby jobs query
  const buildNearbyJobsQuery = () => {
    if (!userLocation) return null;
    
    const queryParams: string[] = [
      `latitude=${userLocation.latitude}`,
      `longitude=${userLocation.longitude}`,
      `radius=${radiusMiles}`
    ];
    
    if (searchParams?.query) {
      queryParams.push(`search=${encodeURIComponent(searchParams.query)}`);
    }
    
    if (searchParams?.category) {
      queryParams.push(`category=${encodeURIComponent(searchParams.category)}`);
    }
    
    // Always limit to open jobs for nearby view unless explicitly showing all
    if (!includeAll) {
      queryParams.push('status=open');
    }
    
    return `/api/jobs/nearby/location${buildQueryString(queryParams)}`;
  };
  
  // Decide which query to use
  const queryPath = nearbyOnly && userLocation 
    ? buildNearbyJobsQuery() 
    : buildStandardJobsQuery();
  
  // If we couldn't build a query (shouldn't happen, but type safety)
  if (!queryPath) {
    return {
      jobs: undefined,
      isLoading: false,
      error: new Error('Could not build query path')
    };
  }
  
  // Get jobs query
  const { data: jobs, isLoading, error } = useQuery<Job[]>({
    queryKey: [queryPath],
  });
  
  return {
    jobs,
    isLoading,
    error
  };
}
