import { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
      const response = await fetch('/api/jobs?hasCoordinates=true');
      if (!response.ok) {
        throw new Error('Failed to fetch jobs for map');
      }
      return response.json();
    }
  });
  
  // Process jobs to ensure coordinates are valid numbers
  const processedJobs = useMemo(() => {
    if (!jobsResponse) return [];
    
    return jobsResponse.reduce<Array<Job & { latitude: number; longitude: number }>>((validJobs, job) => {
      try {
        // Skip if coordinates are missing
        if (job.latitude === undefined || job.longitude === undefined) {
          console.warn('Job missing coordinates:', job.id);
          return validJobs;
        }
        
        // Convert string coordinates to numbers if needed
        const latitude = typeof job.latitude === 'string' ? parseFloat(job.latitude) : job.latitude;
        const longitude = typeof job.longitude === 'string' ? parseFloat(job.longitude) : job.longitude;
        
        // Validate coordinate ranges
        if (isNaN(latitude) || isNaN(longitude) || 
            latitude < -90 || latitude > 90 || 
            longitude < -180 || longitude > 180) {
          console.warn('Invalid coordinates for job:', job.id, { latitude, longitude });
          return validJobs;
        }
        
        return [
          ...validJobs,
          {
            ...job,
            latitude,
            longitude
          }
        ];
      } catch (error) {
        console.error('Error processing job coordinates:', error);
        return validJobs;
      }
    }, []);
  }, [jobsResponse]);
  
  useEffect(() => {
    if (processedJobs.length > 0) {
      console.log(`Map hook found ${processedJobs.length} jobs with valid coordinates`);
    } else if (jobsResponse && jobsResponse.length > 0) {
      console.warn('No jobs with valid coordinates found in the response');
    }
  }, [processedJobs.length, jobsResponse]);
  
  return {
    jobs: processedJobs,
    isLoading,
    error
  };
}