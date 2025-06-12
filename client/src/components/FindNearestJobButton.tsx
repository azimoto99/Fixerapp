import React from 'react';
import { Compass } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { useGeolocation } from '@/hooks/use-react-geolocated';

interface FindNearestJobButtonProps {
  className?: string;
}

const FindNearestJobButton: React.FC<FindNearestJobButtonProps> = ({ className }) => {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [isSearching, setIsSearching] = React.useState(false);
  const { refreshLocation } = useGeolocation();

  const handleFindNearestJob = async () => {
    setIsSearching(true);
    
    try {
      // Get user's current position using the geolocation hook
      const location = await refreshLocation();
      const { latitude, longitude } = location;
      
      // Search for nearby jobs
      const response = await apiRequest(
        'GET', 
        `/api/jobs/nearby?latitude=${latitude}&longitude=${longitude}&radius=5`
      );
      
      const nearbyJobs = await response.json();
      
      if (nearbyJobs && nearbyJobs.length > 0) {
        // Sort by distance to get the nearest job
        const sortedJobs = [...nearbyJobs].sort((a, b) => a.distance - b.distance);
        const nearestJob = sortedJobs[0];
        
        toast({
          title: "Nearest job found!",
          description: `${nearestJob.title} (${nearestJob.distance.toFixed(1)} miles away)`,
        });
        
        // Navigate to job details
        setLocation(`/job/${nearestJob.id}`);
      } else {
        toast({
          title: "No jobs found nearby",
          description: "Try expanding your search radius or check back later.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error finding nearby jobs:", error);
      toast({
        title: "Location error",
        description: "Please enable location services to find nearby jobs.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleFindNearestJob}
      disabled={isSearching}
      className={cn(
        "rounded-full w-10 h-10 bg-background/80 text-foreground shadow-sm border border-border/30",
        "hover:bg-background hover:text-primary transition-all",
        "disabled:opacity-50",
        className
      )}
      title="Find nearest job"
    >
      {isSearching ? (
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent border-primary animate-spin" />
      ) : (
        <Compass className="h-5 w-5" />
      )}
    </Button>
  );
};

export default FindNearestJobButton;