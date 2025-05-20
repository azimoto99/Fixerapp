import { useQuery } from '@tanstack/react-query';
import { Job } from '@shared/schema';

/**
 * A specialized hook that fetches ALL jobs with coordinates for map display
 * This ensures that every job with coordinates will appear on the map regardless of search filters
 */
export function useAllJobsForMap() {
  // Query all jobs that have coordinates, regardless of search filters or status
  const { data: allJobsWithCoordinates, isLoading, error } = useQuery<Job[]>({
    queryKey: ['/api/jobs', 'map-display'],
    queryFn: async () => {
      const response = await fetch('/api/jobs?hasCoordinates=true');
      if (!response.ok) {
        throw new Error('Failed to fetch jobs for map');
      }
      return response.json();
    }
  });
  
  return {
    jobs: allJobsWithCoordinates || [],
    isLoading,
    error
  };
}