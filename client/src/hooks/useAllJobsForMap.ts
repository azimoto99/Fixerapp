import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Job } from '@shared/schema';

/**
 * A specialized hook that fetches ALL jobs with coordinates for map display
 * This ensures that every job with coordinates will appear on the map regardless of search filters
 */
export function useAllJobsForMap() {
  // Query all jobs that have coordinates, regardless of search filters or status
  const { data: jobsResponse, isLoading, error } = useQuery<{page: number, total: number, results: Job[]}>({
    queryKey: ['/api/jobs', 'map-display'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/jobs?hasCoordinates=true&limit=1000');
      const data = await response.json();
      console.log('Raw jobs response from backend:', data);
      return data;
    }
  });
  
  // Process jobs to ensure coordinates are valid numbers
  const jobsArray = jobsResponse?.results || [];
  console.log(`Hook: Processing ${jobsArray.length} jobs from backend response`);
  
  const processedJobs = jobsArray.map(job => {
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
  
  // Debug: Log some job details if we have any
  if (processedJobs.length > 0) {
    console.log('Sample job coordinates:', processedJobs.slice(0, 3).map(job => ({
      id: job.id,
      title: job.title,
      location: job.location,
      latitude: job.latitude,
      longitude: job.longitude
    })));
  }
  
  return {
    jobs: processedJobs,
    isLoading,
    error
  };
}