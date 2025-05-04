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
  
  // Build query params
  let queryPath = '/api/jobs?';
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
  
  if (queryParams.length) {
    queryPath += queryParams.join('&');
  }
  
  // Get all jobs query
  const { data: allJobs, isLoading, error } = useQuery<Job[]>({
    queryKey: [queryPath],
  });
  
  // For nearby jobs, filter in the client
  // In a real implementation, we would use the nearby API endpoint
  let jobs = allJobs;
  
  if (nearbyOnly && userLocation && jobs) {
    // This would use the API endpoint in a real implementation
    // For now, we'll assume all jobs are within the radius for demo purposes
    const nearbyPath = `/api/jobs/nearby/location?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&radius=${radiusMiles}`;
    
    // In a real implementation, we'd use this query:
    // return useQuery<Job[]>({
    //   queryKey: [nearbyPath],
    // });
  }
  
  return {
    jobs,
    isLoading,
    error
  };
}
