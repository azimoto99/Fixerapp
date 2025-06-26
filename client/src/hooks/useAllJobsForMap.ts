import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Job } from '@shared/schema';

/**
 * A specialized hook that fetches ALL jobs with coordinates for map display
 * This ensures that every job with coordinates will appear on the map regardless of search filters
 */
export function useAllJobsForMap() {
  // Query all jobs that have coordinates, regardless of search filters or status
  const { data: jobsResponse, isLoading, error } = useQuery<Job[]>({
    queryKey: ['/api/jobs', 'map-display'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/jobs?hasCoordinates=true');
      return response.json();
    }
  });
  
  // Process jobs to ensure coordinates are valid numbers
  const processedJobs = (Array.isArray(jobsResponse) ? jobsResponse : []).map(job => {
    // Convert string coordinates to numbers if needed
    const latitude = typeof job.latitude === 'string' ? parseFloat(job.latitude) : job.latitude;
    const longitude = typeof job.longitude === 'string' ? parseFloat(job.longitude) : job.longitude;
    
    return {
      ...job,
      latitude,
      longitude
    };
  }).filter(job => {
    // Filter out jobs with invalid or missing coordinates
    return (
      job.latitude !== null && 
      job.longitude !== null && 
      !isNaN(Number(job.latitude)) && 
      !isNaN(Number(job.longitude))
    );
  });
  
  console.log(`Map hook found ${processedJobs.length} jobs with valid coordinates`);
  
  return {
    jobs: processedJobs,
    isLoading,
    error
  };
}