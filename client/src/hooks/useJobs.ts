import { useQuery } from '@tanstack/react-query';
import { Job } from '@shared/schema';
import { useGeolocation } from '@/lib/geolocation';

interface UseJobsOptions {
  nearbyOnly?: boolean;
  radiusMiles?: number;
}

export function useJobs(searchParams?: { query?: string; category?: string }, options?: UseJobsOptions) {
  const { userLocation } = useGeolocation();
  const { nearbyOnly = false, radiusMiles = 2 } = options || {};
  
  // Build query params
  let queryPath = '/api/jobs?';
  const queryParams: string[] = [];
  
  if (searchParams?.query) {
    queryParams.push(`search=${encodeURIComponent(searchParams.query)}`);
  }
  
  if (searchParams?.category) {
    queryParams.push(`category=${encodeURIComponent(searchParams.category)}`);
  }
  
  // Always filter to "open" jobs by default
  queryParams.push('status=open');
  
  if (queryParams.length) {
    queryPath += queryParams.join('&');
  }
  
  // Get all jobs query
  const { data: allJobs, isLoading, error } = useQuery<Job[]>({
    queryKey: [queryPath],
  });
  
  // For nearby jobs, we filter in the client
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
