import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useGeolocation } from '@/lib/geolocation';
import JobDetail from './JobDetail';
import JobDetailCard from './JobDetailCard';
import UserDrawerV2 from './UserDrawerV2';
import MapViewToggle from './MapViewToggle';
import { Job } from '@shared/schema';
import MapboxMap from './MapboxMap';
import JobLocationMap from './JobLocationMap';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { StripeConnectRequired } from '@/components/stripe';
import JobDetailsCard from './jobs/JobDetailsCard';
import { useAllJobsForMap } from '@/hooks/useAllJobsForMap';

interface MapSectionProps {
  jobs: Job[];
  selectedJob?: Job;
  onSelectJob?: (job: Job) => void;
  searchCoordinates?: { latitude: number; longitude: number };
}

// DoorDash-style interactive map component for showing nearby gigs with Mapbox
const MapSection: React.FC<MapSectionProps> = ({ jobs, selectedJob, onSelectJob, searchCoordinates }) => {
  const { userLocation, locationError, isUsingFallback } = useGeolocation();
  const [showJobDetail, setShowJobDetail] = useState<boolean>(false);
  const [mapReady, setMapReady] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  
  // Fetch ALL jobs with coordinates for map display, regardless of search filters
  const { jobs: allJobsWithCoordinates } = useAllJobsForMap();
  // Control drawer state with debouncing to prevent rapid toggling
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  // State for the new job details card
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [showJobDetailsCard, setShowJobDetailsCard] = useState(false);
  
  const handleUserDrawerChange = useCallback((isOpen: boolean) => {
    console.log('MapSection: User drawer state changed to:', isOpen);
    setIsUserDrawerOpen(isOpen);
  }, []);
  const [showStripeConnectRequired, setShowStripeConnectRequired] = useState(false);
  // Map view is handled by Mapbox
  const [mapView, setMapView] = useState<'standard' | 'heatmap'>('standard');
  
  // Update map style when view changes
  useEffect(() => {
    // We'll implement heatmap functionality later
    console.log(`Map view changed to: ${mapView}`);
  }, [mapView]);

  // Add event listener for centering map on a specific job
  const [focusMapCoordinates, setFocusMapCoordinates] = useState<{
    latitude: number;
    longitude: number;
    jobId: number;
  } | null>(null);
  
  // Create a highlighted job marker for the "Show on Map" functionality
  const [highlightedJobId, setHighlightedJobId] = useState<number | null>(null);
  
  useEffect(() => {
    // Listen for requests to center the map on a specific job
    const handleCenterMapOnJob = (event: CustomEvent<{
      jobId: number;
      latitude: number;
      longitude: number;
    }>) => {
      console.log('Centering map on job:', event.detail);
      setFocusMapCoordinates({
        jobId: event.detail.jobId,
        latitude: event.detail.latitude,
        longitude: event.detail.longitude
      });
      
      // Mark this job as highlighted so we can add a special marker for it
      setHighlightedJobId(event.detail.jobId);
      
      // After 5 seconds, reset the highlight
      setTimeout(() => {
        setHighlightedJobId(null);
      }, 5000);
    };
    
    window.addEventListener('center-map-on-job', handleCenterMapOnJob as EventListener);
    return () => {
      window.removeEventListener('center-map-on-job', handleCenterMapOnJob as EventListener);
    };
  }, []);

  // Early return for loading state
  if (!userLocation && !searchCoordinates) {
    return (
      <div className="md:col-span-2 bg-background/50 border border-border shadow-md rounded-lg flex items-center justify-center h-80">
        <div className="text-center p-6 bg-card/80 rounded-xl border border-border shadow-sm max-w-sm">
          <div className="relative mx-auto mb-5 w-16 h-16">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
            <div className="relative flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
          <h3 className="text-foreground font-medium mb-2">Finding your location...</h3>
          <p className="text-muted-foreground text-sm">Please allow location access for the best experience</p>
          {locationError && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {locationError}
            </div>
          )}
        </div>
      </div>
    );
  }

  const { user } = useAuth();
  const { toast } = useToast();

  // Early return for not logged in
  if (!user) {
    toast({
      title: "Login Required",
      description: "Please login to apply for this job",
      variant: "destructive"
    });
    return null;
  }

  // Early return for not a worker
  if (user.accountType !== 'worker') {
    toast({
      title: "Worker Account Required",
      description: "You need a worker account to apply for jobs",
      variant: "destructive"
    });
    return null;
  }

  // --- Main logic and hooks follow ---

  // Use search coordinates if provided, otherwise fall back to user location
  const position = useMemo(() => {
    if (searchCoordinates) {
      return {
        latitude: searchCoordinates.latitude,
        longitude: searchCoordinates.longitude
      };
    }
    return userLocation 
      ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        }
      : null;
  }, [searchCoordinates, userLocation]);

  // Track previous selected job to avoid reopening the panel on same job
  const [previousSelectedJobId, setPreviousSelectedJobId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedJob) {
      if (previousSelectedJobId !== selectedJob.id) {
        setShowJobDetail(true);
        setPreviousSelectedJobId(selectedJob.id);
      }
    } else {
      setPreviousSelectedJobId(null);
    }
  }, [selectedJob, previousSelectedJobId]);

  const handleMarkerClick = (job: Job) => {
    if (job.id) {
      window.dispatchEvent(new CustomEvent('open-job-details', { 
        detail: { jobId: job.id }
      }));
    } else {
      if (onSelectJob) {
        onSelectJob(job);
        setSelectedJobId(0);
        setShowJobDetailsCard(true);
      }
    }
  };

  
  // Handle map click to close panels
  // Memoize expensive calculations and event handlers for better performance
  const handleMapClick = React.useCallback(() => {
    // Close job details panel if open
    if (showJobDetail) {
      setShowJobDetail(false);
    }
    
    // Close new job details card if open
    if (showJobDetailsCard) {
      setShowJobDetailsCard(false);
    }
    
    // Close user drawer if open
    if (isUserDrawerOpen) {
      setIsUserDrawerOpen(false);
    }
  }, [showJobDetail, showJobDetailsCard, isUserDrawerOpen]);
  
  // Use debounced updater for performance sensitive operations
  const debouncedSetShowJobDetail = React.useMemo(() => {
    const debounce = (func: Function, wait: number) => {
      let timeout: NodeJS.Timeout;
      return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
      };
    };
    return debounce(setShowJobDetail, 100);
  }, []);

  // Close the job detail panel and deselect the job
  const handleCloseDetail = () => {
    setShowJobDetail(false);
    // Clear the selected job if onSelectJob callback is provided
    if (onSelectJob) {
      onSelectJob(undefined as any);
    }
  };
  
  // Handle job application
  const handleApply = async () => {
    if (!selectedJob) return;
    
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to apply for this job",
        variant: "destructive"
      });
      return;
    }
    
    if (user.accountType !== 'worker') {
      toast({
        title: "Worker Account Required",
        description: "You need a worker account to apply for jobs",
        variant: "destructive"
      });
      return;
    }
    
    // Check if user has a Stripe Connect account
    try {
      const res = await apiRequest('GET', '/api/stripe/connect/account-status');
      const accountStatus = await res.json();
      
      // If user doesn't have an active Connect account, show the setup modal
      if (!accountStatus || accountStatus.accountStatus !== 'active') {
        setShowStripeConnectRequired(true);
        return;
      }
      
      // If they have an active Connect account, proceed with application
      setIsApplying(true);
      await apiRequest('POST', '/api/applications', {
        jobId: selectedJob.id,
        workerId: user.id,
        message: "I'm interested in this job!"
      });
      
      toast({
        title: "Application Submitted",
        description: "Your application has been submitted successfully"
      });
      
      // Close the job detail panel after successful application
      handleCloseDetail();
    } catch (error: any) {
      // If the error is a 404 (no account), show the Stripe Connect setup
      if (error.status === 404) {
        setShowStripeConnectRequired(true);
        return;
      }
      
      toast({
        title: "Application Failed",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsApplying(false);
    }
  };


  const jobMarkers = useMemo(() => {
    // Create a typed array to avoid TypeScript errors
    const markers: {
      latitude: number;
      longitude: number;
      title: string;
      description: string;
      onClick: () => void;
      isHighlighted?: boolean;
      markerColor?: string; // Added support for custom marker colors
    }[] = [];
    
    // Decide which job list to use: the filtered list (jobs prop) or all jobs with coordinates
    const sourceJobs = (jobs && jobs.length > 0) ? jobs : (allJobsWithCoordinates || []);

    if (sourceJobs && sourceJobs.length > 0) {
      // Only keep jobs that have coordinates
      const jobsWithCoordinates = sourceJobs.filter(job => job.latitude && job.longitude);
      
      jobsWithCoordinates.forEach(job => {
        // Check if this is a highlighted job
        const isHighlighted = job.id === highlightedJobId;
        
        // Log creation for debugging
        // console.log('Creating marker for job:', job.id, job.title, job.latitude, job.longitude);
        
        // Force number conversion and ensure coordinates are valid numbers
        const lat = typeof job.latitude === 'string' ? parseFloat(job.latitude) : job.latitude;
        const lng = typeof job.longitude === 'string' ? parseFloat(job.longitude) : job.longitude;
        
        markers.push({
          latitude: lat,
          longitude: lng,
          title: job.title,
          description: `$${job.paymentAmount?.toFixed(2)} - ${job.paymentType}`,
          onClick: () => handleMarkerClick(job),
          isHighlighted: isHighlighted,
          markerColor: job.markerColor || '#f59e0b', // Use the job's marker color or default to amber
        });
      });
    }
    
    // Add user location marker
    if (position) {
      console.log('Creating user location marker');
      markers.push({
        latitude: position.latitude,
        longitude: position.longitude,
        title: 'Current Location',
        description: 'You are here',
        onClick: () => {}
      });
    }
    


const jobMarkers = useMemo(() => {
  // Create a typed array to avoid TypeScript errors
  const markers: {
    latitude: number;
    longitude: number;
    title: string;
    description: string;
    onClick: () => void;
    isHighlighted?: boolean;
    markerColor?: string; // Added support for custom marker colors
  }[] = [];

  // Decide which job list to use: the filtered list (jobs prop) or all jobs with coordinates
  const sourceJobs = (jobs && jobs.length > 0) ? jobs : (allJobsWithCoordinates || []);

  if (sourceJobs && sourceJobs.length > 0) {
    // Only keep jobs that have coordinates
    const jobsWithCoordinates = sourceJobs.filter(job => job.latitude && job.longitude);

    jobsWithCoordinates.forEach(job => {
      // Check if this is a highlighted job
      const isHighlighted = job.id === highlightedJobId;

      // Log creation for debugging
      // console.log('Creating marker for job:', job.id, job.title, job.latitude, job.longitude);

      // Force number conversion and ensure coordinates are valid numbers
      const lat = typeof job.latitude === 'string' ? parseFloat(job.latitude) : job.latitude;
      const lng = typeof job.longitude === 'string' ? parseFloat(job.longitude) : job.longitude;

      markers.push({
        latitude: lat,
        longitude: lng,
        title: job.title,
        description: `$${job.paymentAmount?.toFixed(2)} - ${job.paymentType}`,
        onClick: () => handleMarkerClick(job),
        isHighlighted: isHighlighted,
        markerColor: job.markerColor || '#f59e0b', // Use the job's marker color or default to amber
      });
    });
  }

  // Add user location marker
  if (position) {
    console.log('Creating user location marker');
    markers.push({
      latitude: position.latitude,
      longitude: position.longitude,
      title: 'Current Location',
      description: 'You are here',
      onClick: () => {}
    });
  }

  // If we have focus coordinates from "Show on Map", add a special highlighted marker
  if (focusMapCoordinates) {
    console.log('Adding special marker for focused job at:', focusMapCoordinates);
    markers.push({
      latitude: focusMapCoordinates.latitude,
      longitude: focusMapCoordinates.longitude,
      title: 'Job Location',
      description: 'Selected Job Position',
      onClick: () => {},
      isHighlighted: true
    });
  }

  return markers;
}, [jobs, allJobsWithCoordinates, handleMarkerClick, position, focusMapCoordinates, highlightedJobId]);

// If no user location yet, show loading
if (!position) {
  return (
    <div className="md:col-span-2 bg-background/50 border border-border shadow-md rounded-lg flex items-center justify-center h-80">
      <div className="text-center p-6 bg-card/80 rounded-xl border border-border shadow-sm max-w-sm">
        <div className="relative mx-auto mb-5 w-16 h-16">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
          <div className="relative flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {/* Stripe Connect Required Modal */}
      {showStripeConnectRequired && (
        <StripeConnectRequired
          onComplete={() => {
            setShowStripeConnectRequired(false);
            // After setup, try to apply again after a small delay
            setTimeout(() => {
              handleApply();
            }, 500);
          }}
          onSkip={() => setShowStripeConnectRequired(false)}
        />
      )}
        

        
        {position && (
          <MapboxMap
            latitude={
              focusMapCoordinates 
              ? focusMapCoordinates.latitude 
              : (allJobsWithCoordinates?.length > 0 && allJobsWithCoordinates[0].latitude) 
                ? allJobsWithCoordinates[0].latitude 
                : position.latitude
            }
            longitude={
              focusMapCoordinates 
              ? focusMapCoordinates.longitude 
              : (allJobsWithCoordinates?.length > 0 && allJobsWithCoordinates[0].longitude) 
                ? allJobsWithCoordinates[0].longitude 
                : position.longitude
            }
            zoom={focusMapCoordinates ? 18 : 10}
            markers={jobMarkers}
            onMapClick={handleMapClick}
            style={{ width: '100%', height: '100%' }}
            interactive={true}
          />
        )}
        
        {/* Removed duplicate fallback location notice - already shown in top control panel */}
        


        {/* Map controls overlay - Job count display (positioned below UserDrawerV2) */}
        <div className="absolute top-0 right-0 z-30 p-2">
          <div className="bg-background/90 border border-border/30 rounded-full shadow-md px-4 py-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">
                {allJobsWithCoordinates.filter(job => job.status === 'open').length} Open Jobs
              </span>
            </div>
          </div>
        </div>
        
        {/* Bottom card for job details - DoorDash-style slide-up panel */}
        {showJobDetail && selectedJob && (
          <div 
            className="absolute bottom-0 left-0 right-0 z-[900] max-h-[70%] overflow-y-auto 
                      bg-card rounded-t-xl shadow-xl animate-slide-up job-detail-panel border-t border-x border-border"
            style={{ filter: 'drop-shadow(0 -10px 8px rgb(0 0 0 / 0.04))' }}
            onTouchStart={(e) => {
              // Store initial touch position for swipe detection
              const touchY = e.touches[0].clientY;
              const panel = e.currentTarget;
              
              // Add data attribute to store touch position
              panel.setAttribute('data-touch-start-y', touchY.toString());
            }}
            onTouchMove={(e) => {
              // Get handle element (the drag indicator)
              const handle = e.currentTarget.querySelector('.drag-handle');
              if (!handle || handle.contains(e.target as Node)) {
                const panel = e.currentTarget;
                const touchStartY = parseInt(panel.getAttribute('data-touch-start-y') || '0');
                const currentTouchY = e.touches[0].clientY;
                const deltaY = currentTouchY - touchStartY;
                
                // Only allow downward swipes to close (deltaY > 0)
                if (deltaY > 0) {
                  // Calculate opacity based on swipe distance
                  const opacity = Math.max(0, 1 - (deltaY / 200));
                  panel.style.transform = `translateY(${deltaY}px)`;
                  panel.style.opacity = opacity.toString();
                }
              }
            }}
            onTouchEnd={(e) => {
              const panel = e.currentTarget;
              const touchStartY = parseInt(panel.getAttribute('data-touch-start-y') || '0');
              const touchEndY = e.changedTouches[0].clientY;
              const deltaY = touchEndY - touchStartY;
              
              // If swipe down is significant, close the panel
              if (deltaY > 100) {
                handleCloseDetail();
              } else {
                // Reset the panel position with animation
                panel.style.transform = '';
                panel.style.opacity = '1';
              }
            }}
          >
            <div className="sticky top-0 bg-card pt-2 pb-1 px-4 border-b border-border z-[900]">
              <div className="flex justify-center pb-1 drag-handle cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full"></div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-foreground">${selectedJob.paymentAmount}</h3>
                  <div className="text-xs text-primary font-medium flex items-center">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary mr-1"></span>
                    Available Now
                  </div>
                </div>
                <button 
                  onClick={handleCloseDetail}
                  className="p-1 rounded-full hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="Close details"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Removed old JobDetailCard - using new JobDetailsCard component exclusively */}
            
            {/* Apply button fixed at bottom */}
            <div className="sticky bottom-0 left-0 right-0 bg-card p-4 border-t border-border z-[900] pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
              <button 
                onClick={() => {
                  // Use the new JobDetailsCard by triggering it via event
                  window.dispatchEvent(new CustomEvent('open-job-details', { 
                    detail: { jobId: selectedJob.id }
                  }));
                  handleCloseDetail(); // Close this panel
                }}
                className="w-full py-3 px-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg"
              >
                <span>View Job Details</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 ml-2">
                  <path d="M5 12h14"></path>
                  <path d="m12 5 7 7-7 7"></path>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* New Job Details Card */}

    </div>
  );
};

export default MapSection;
