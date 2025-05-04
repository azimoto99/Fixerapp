import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Job } from '@shared/schema';
import { Loader2, MapPin } from 'lucide-react';
import { useLocation } from 'wouter';
import { calculateDistance } from '@/lib/geolocation';

export default function FindNearestJobButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Fetch open jobs
  const { data: jobs } = useQuery<Job[]>({
    queryKey: ['/api/jobs', { status: 'open' }],
  });

  const handleFindNearestJob = async () => {
    setIsLoading(true);
    
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Error",
        description: "Your browser doesn't support geolocation. Please update your browser or try a different one.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      // Get current position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;

      if (!jobs || jobs.length === 0) {
        toast({
          title: "No jobs available",
          description: "There are no open jobs at the moment. Please check back later.",
          variant: "default",
        });
        setIsLoading(false);
        return;
      }

      // Calculate distance to each job and find the nearest one
      let nearestJob = jobs[0];
      let shortestDistance = calculateDistance(
        latitude, 
        longitude, 
        nearestJob.latitude, 
        nearestJob.longitude
      );

      jobs.forEach(job => {
        const distance = calculateDistance(
          latitude, 
          longitude, 
          job.latitude, 
          job.longitude
        );

        if (distance < shortestDistance) {
          shortestDistance = distance;
          nearestJob = job;
        }
      });

      // If the job is beyond 25 miles, inform the user
      if (shortestDistance > 25) {
        toast({
          title: "No nearby jobs",
          description: `The nearest job is ${shortestDistance.toFixed(1)} miles away. Try expanding your search radius.`,
          variant: "default",
        });
        setIsLoading(false);
        return;
      }

      // Navigate to the nearest job
      toast({
        title: "Job found!",
        description: `Found a job ${shortestDistance.toFixed(1)} miles away.`,
      });
      
      navigate(`/job/${nearestJob.id}`);
    } catch (error) {
      toast({
        title: "Geolocation Error",
        description: "Unable to determine your location. Please check your device settings and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleFindNearestJob} 
      disabled={isLoading}
      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Finding...
        </>
      ) : (
        <>
          <MapPin className="mr-2 h-4 w-4" />
          Find Nearest Job
        </>
      )}
    </Button>
  );
}