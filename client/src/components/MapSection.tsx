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

interface MapSectionProps {
  jobs: Job[];
  selectedJob?: Job;
  onSelectJob?: (job: Job) => void;
  searchCoordinates?: { latitude: number; longitude: number };
}

// Custom controls removed - no longer needed

// DoorDash-style interactive map component for showing nearby gigs with Mapbox
const MapSection: React.FC<MapSectionProps> = ({ jobs, selectedJob, onSelectJob, searchCoordinates }) => {
  const { userLocation, locationError, isUsingFallback } = useGeolocation();
  const [showJobDetail, setShowJobDetail] = useState<boolean>(false);
  const [mapReady, setMapReady] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  // Control drawer state with debouncing to prevent rapid toggling
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  
  const handleUserDrawerChange = useCallback((isOpen: boolean) => {
    console.log('MapSection: User drawer state changed to:', isOpen);
    setIsUserDrawerOpen(isOpen);
  }, []);
  const [showStripeConnectRequired, setShowStripeConnectRequired] = useState(false);
  // Map view is handled differently in Mapbox vs Leaflet
  const [mapView, setMapView] = useState<'standard' | 'heatmap'>('standard');
  
  // Update map style when view changes
  useEffect(() => {
    // We'll implement heatmap functionality later
    console.log(`Map view changed to: ${mapView}`);
  }, [mapView]);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Use search coordinates if provided, otherwise fall back to user location
  const position = useMemo(() => {
    // Prioritize search coordinates over geolocation
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
  
  // Handle selecting a job when a map marker is clicked
  const handleMarkerClick = (job: Job) => {
    if (onSelectJob) {
      onSelectJob(job);
      setShowJobDetail(true);
      
      // If we're showing a sample job from a marker click, create a temp job object
      if (!job.id) {
        const tempJob: Job = {
          id: 0,
          title: job.title || 'Sample Job',
          description: 'This is a sample job to demonstrate the job detail card functionality.',
          category: 'Cleaning',
          posterId: 1,
          workerId: null,
          status: 'open',
          paymentType: job.paymentType || 'fixed',
          paymentAmount: parseFloat((job.description || '').replace(/\$/g, '')) || 100,
          serviceFee: 5,
          totalAmount: parseFloat((job.description || '').replace(/\$/g, '')) + 5 || 105,
          latitude: job.latitude,
          longitude: job.longitude,
          location: 'Sample Location',
          datePosted: new Date().toISOString(),
          dateNeeded: null as any,
          dateCompleted: null as any,
          autoAccept: false
        };
        onSelectJob(tempJob);
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
    
    // Close user drawer if open
    if (isUserDrawerOpen) {
      setIsUserDrawerOpen(false);
    }
  }, [showJobDetail, isUserDrawerOpen]);
  
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

  // Track previous selected job to avoid reopening the panel on same job
  const [previousSelectedJobId, setPreviousSelectedJobId] = useState<number | null>(null);
  
  useEffect(() => {
    // Only show job detail if there's a selected job
    if (selectedJob) {
      // Check if this is a new job selection (different from previous)
      if (previousSelectedJobId !== selectedJob.id) {
        setShowJobDetail(true);
        setPreviousSelectedJobId(selectedJob.id);
      }
    } else {
      // No job selected
      setPreviousSelectedJobId(null);
    }
  }, [selectedJob, previousSelectedJobId]);
  
  // Create markers for Mapbox map
  const jobMarkers = useMemo(() => {
    // If we have jobs with coordinates, use those
    if (jobs && jobs.length > 0) {
      const realJobMarkers = jobs
        .filter(job => job.latitude && job.longitude) // Only use jobs with coordinates
        .map(job => ({
          latitude: job.latitude,
          longitude: job.longitude,
          title: job.title,
          description: `$${job.paymentAmount} - ${job.paymentType}`,
          onClick: () => handleMarkerClick(job)
        }));
      
      if (realJobMarkers.length > 0) return realJobMarkers;
    }
    
    // If no real jobs with coordinates, return an empty array
    return [];
  }, [jobs, handleMarkerClick, position, toast]);
  
  // If no user location yet, show loading
  if (!position) {
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

  return (
    <div className="w-full h-full">
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
      <div className="relative h-screen max-h-[calc(100vh-64px)] overflow-hidden">
        <style>{`
          /* Animation for markers */
          @keyframes bounce-in {
            0% { transform: scale(0.8); opacity: 0; }
            60% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
          
          @keyframes pulse-marker {
            0% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.3); opacity: 0.3; }
            100% { transform: scale(1.6); opacity: 0; }
          }
          
          .animate-bounce-in {
            animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          }
          
          .animate-pulse-marker {
            animation: pulse-marker 2s infinite;
          }
          
          /* Smooth transition for panel */
          .job-detail-panel {
            transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          }
        `}</style>
        
        {position && (
          <MapboxMap
            latitude={position.latitude}
            longitude={position.longitude}
            zoom={15}
            markers={jobMarkers}
            onMapClick={handleMapClick}
            style={{ width: '100%', height: '100%' }}
            interactive={true}
          />
        )}
        
        {/* Removed duplicate fallback location notice - already shown in top control panel */}
        


        {/* Map controls overlay */}
        <div className="absolute top-0 right-0 z-50 w-full">
          {/* Floating control panel */}
          <div className="bg-background/70 backdrop-blur-md border-b border-border/20 dark:border-border/20 shadow-sm px-4 py-2">
            <div className="flex justify-between items-center">
              {/* Left: Open jobs count */}
              <div className="flex gap-2">
                <div className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full flex items-center">
                  <span>{jobs.filter(job => job.status === 'open').length} open jobs</span>
                </div>
              </div>
              
              {/* Center: Location status */}
              <div className="flex flex-col items-center">
                {isUsingFallback ? (
                  <div className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3 mr-1 flex-shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="truncate max-w-[120px] md:max-w-none">Using approximate location</span>
                  </div>
                ) : (
                  <div className="bg-emerald-500/10 text-emerald-600 text-xs px-3 py-1 rounded-full flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3 mr-1">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Location active</span>
                  </div>
                )}
              </div>
              
              {/* Right: Mapbox credit */}
              <div className="flex items-center">
                <div className="text-xs text-muted-foreground">
                  Powered by Mapbox
                </div>
              </div>
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
            
            <JobDetailCard job={selectedJob} onClose={handleCloseDetail} />
            
            {/* Apply button fixed at bottom */}
            <div className="sticky bottom-0 left-0 right-0 bg-card p-4 border-t border-border z-[900] pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
              <button 
                onClick={handleApply}
                disabled={isApplying}
                className="w-full py-3 px-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <span>Apply for this Job</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 ml-2">
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapSection;
