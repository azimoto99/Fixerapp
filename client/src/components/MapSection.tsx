import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useGeolocation } from '@/lib/geolocation';
import JobDetail from './JobDetail';
import { JobMarker } from './JobMarker';
import SimpleUserDrawer from './SimpleUserDrawer';
import HeatmapLayer from './HeatmapLayer';
import MapViewToggle from './MapViewToggle';
import HeatmapLegend from './HeatmapLegend';
import { Job } from '@shared/schema';
import { 
  MapContainer, 
  TileLayer, 
  Circle, 
  useMap,
  CircleMarker,
  Popup
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LatLngExpression } from 'leaflet';
import { Loader2, PlusCircle, MinusCircle, Target, Layers } from 'lucide-react';
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

// Component to recenter map when user location changes - memoized for performance
const RecenterMap = memo(({ position }: { position: LatLngExpression | null }) => {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.setView(position, 15);
    }
  }, [position, map]);
  
  return null;
});

// Custom map control components that are memoized for better performance
const ZoomInControl = memo(() => {
  const map = useMap();
  const handleZoomIn = useCallback(() => {
    map.zoomIn();
  }, [map]);
  
  return (
    <button 
      onClick={handleZoomIn}
      className="bg-primary text-primary-foreground shadow-lg rounded-full w-10 h-10 flex items-center justify-center transform transition-all hover:scale-105 active:scale-95 hover:bg-primary/90 border border-primary/20"
      aria-label="Zoom in"
    >
      <PlusCircle className="h-5 w-5" />
    </button>
  );
});

const ZoomOutControl = memo(() => {
  const map = useMap();
  const handleZoomOut = useCallback(() => {
    map.zoomOut();
  }, [map]);
  
  return (
    <button 
      onClick={handleZoomOut}
      className="bg-primary text-primary-foreground shadow-lg rounded-full w-10 h-10 flex items-center justify-center transform transition-all hover:scale-105 active:scale-95 hover:bg-primary/90 border border-primary/20"
      aria-label="Zoom out"
    >
      <MinusCircle className="h-5 w-5" />
    </button>
  );
});

const RecenterControl = memo(({ position }: { position: LatLngExpression | null }) => {
  const map = useMap();
  const handleRecenter = useCallback(() => {
    if (position) {
      map.setView(position, 15);
    }
  }, [map, position]);
  
  return (
    <button 
      onClick={handleRecenter}
      className="bg-primary text-primary-foreground shadow-lg rounded-full w-12 h-12 flex items-center justify-center transform transition-all hover:scale-105 active:scale-95 hover:bg-primary/90 border border-primary/20"
      aria-label="Return to my location"
    >
      <Target className="h-6 w-6" />
    </button>
  );
});

// DoorDash-style interactive map component for showing nearby gigs
const MapSection: React.FC<MapSectionProps> = ({ jobs, selectedJob, onSelectJob, searchCoordinates }) => {
  const { userLocation, locationError, isUsingFallback } = useGeolocation();
  const [showJobDetail, setShowJobDetail] = useState<boolean>(false);
  const [mapReady, setMapReady] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [forceCloseDrawer, setForceCloseDrawer] = useState(false);
  const [lastSearchLocation, setLastSearchLocation] = useState<LatLngExpression | null>(null);
  const [showStripeConnectRequired, setShowStripeConnectRequired] = useState(false);
  const [mapView, setMapView] = useState<'standard' | 'heatmap'>('standard');
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Use search coordinates if provided, otherwise fall back to user location
  const position: LatLngExpression | null = useMemo(() => {
    // Prioritize search coordinates over geolocation
    if (searchCoordinates) {
      return [searchCoordinates.latitude, searchCoordinates.longitude] as LatLngExpression;
    }
    return userLocation 
      ? [userLocation.latitude, userLocation.longitude] 
      : null;
  }, [searchCoordinates, userLocation]);
  
  // Handle selecting a job when a map marker is clicked
  const handleMarkerClick = (job: Job) => {
    if (onSelectJob) {
      onSelectJob(job);
      setShowJobDetail(true);
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
      setForceCloseDrawer(true);
      // Reset the force close state after a short delay
      setTimeout(() => {
        setForceCloseDrawer(false);
      }, 100);
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
  
  // Calculate job positions (in a real app, this would come from the server)
  const jobPositions = useMemo(() => {
    if (!position) return [];
    
    // Extract latitude and longitude regardless of position format
    let lat: number, lng: number;
    
    if (Array.isArray(position)) {
      [lat, lng] = position;
    } else if ('lat' in position && 'lng' in position) {
      lat = position.lat;
      lng = position.lng;
    } else {
      // Fallback for any other case - we shouldn't get here normally
      return [];
    }
    
    // In a real app, the jobs would have actual lat/lng coordinates
    // For demo purposes, we'll generate positions within 2 miles of the user
    return jobs.map((job, index) => {
      // Random offset within ~2 miles (0.03 degrees is roughly 2 miles)
      const latOffset = (Math.random() - 0.5) * 0.03;
      const lngOffset = (Math.random() - 0.5) * 0.03;
      
      return {
        job,
        position: [
          lat + latOffset,
          lng + lngOffset
        ] as LatLngExpression
      };
    });
  }, [jobs, position]);
  
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
      <div className="relative h-screen">
        <style>{`
          .leaflet-container {
            height: 100%;
            width: 100%;
            touch-action: manipulation;
          }
          .custom-job-marker {
            background: none;
            border: none;
          }
          .custom-job-marker div {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
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
          
          /* Mobile optimizations */
          @media (max-width: 768px) {
            .leaflet-control-zoom {
              display: none;
            }
            .leaflet-control-attribution {
              font-size: 8px;
              max-width: 70%;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .leaflet-touch .leaflet-bar {
              border: none;
              box-shadow: 0 1px 5px rgba(0,0,0,0.2);
            }
            .leaflet-control-container .leaflet-bottom .leaflet-control {
              margin-bottom: 70px; /* Give space for the job search bar */
            }
            /* Larger touch targets for mobile */
            .leaflet-touch .leaflet-bar a {
              width: 40px;
              height: 40px;
              line-height: 40px;
              font-size: 20px;
            }
            /* Space buttons for easier tapping */
            .leaflet-bottom .leaflet-control .leaflet-control-zoom {
              margin-bottom: 10px;
            }
          }
          
          /* Improve tap targets */
          .leaflet-touch .leaflet-control-layers, 
          .leaflet-touch .leaflet-bar {
            border: none;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
          
          /* Loading performance optimizations */
          .leaflet-tile {
            will-change: transform;
          }
          .leaflet-fade-anim .leaflet-tile {
            will-change: opacity;
          }
          
          /* Custom controls spacing */
          .leaflet-control-container .leaflet-bottom .leaflet-control button {
            margin-top: 10px;
            display: block;
          }
          
          /* Smooth transition for panel */
          .job-detail-panel {
            transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          }
        `}</style>
        
        {position && (
          <MapContainer 
            center={position as [number, number]} 
            zoom={15} 
            zoomControl={false}
            attributionControl={false}
            doubleClickZoom={true}
            dragging={true}
            scrollWheelZoom={false}
            touchZoom={true}
            className="mobile-optimized-map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
              eventHandlers={{
                click: handleMapClick,
              }}
            />
            {/* Add a more vibrant street layer on top */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
              className="map-labels-layer"
            />
            
            {/* 2-mile radius circle around user's location */}
            <Circle 
              center={position}
              pathOptions={{ 
                fillColor: 'hsl(160, 84%, 65%)', // Even brighter primary color for dark background
                fillOpacity: 0.15, 
                color: 'hsl(160, 84%, 70%)',
                weight: 2,
                dashArray: '5, 10', // Dashed line for better visibility
              }}
              radius={3218} // 2 miles in meters
              className="map-radius-circle"
            />
            
            {/* User's location marker */}
            <CircleMarker 
              center={position}
              pathOptions={{ 
                fillColor: 'hsl(160, 84%, 75%)', // Even brighter primary color for dark background
                fillOpacity: 0.9, 
                color: 'white',
                weight: 3
              }}
              radius={8}
              className="user-location-marker"
            >
              <Popup className="leaflet-popup-dark">Your location</Popup>
            </CircleMarker>
            
            {/* Job markers - only show them in standard view */}
            {mapView === 'standard' && jobPositions.map(({ job, position }) => (
              <JobMarker 
                key={job.id}
                job={job}
                position={position}
                isSelected={selectedJob?.id === job.id}
                onClick={handleMarkerClick}
              />
            ))}
            
            {/* Heat map layer - only show in heatmap view */}
            <HeatmapLayer 
              jobs={jobPositions}
              visible={mapView === 'heatmap'}
              radius={25} 
              blur={15}
              intensity={0.7}
            />
            
            {/* Recenter map component */}
            <RecenterMap position={position} />

            {/* Map View Toggle Control - placed at top left for better visibility */}
            <div className="leaflet-control-container">
              <div className="leaflet-top leaflet-left">
                <div className="leaflet-control leaflet-bar ml-3 mt-32">
                  <MapViewToggle 
                    view={mapView} 
                    onChange={setMapView}
                  />
                </div>
              </div>
              
              {/* Recenter Control - placed at bottom right */}
              <div className="leaflet-bottom leaflet-right">
                <div className="leaflet-control leaflet-bar flex flex-col items-center mb-32 mr-3">
                  <RecenterControl position={position} />
                </div>
              </div>
              
              {/* Heat map legend - only show in heatmap view, placed at bottom left */}
              <div className="leaflet-bottom leaflet-left">
                <div className="leaflet-control leaflet-bar ml-3 mb-32">
                  <HeatmapLegend visible={mapView === 'heatmap'} />
                </div>
              </div>
            </div>
          </MapContainer>
        )}
        
        {/* Fallback location notice */}
        {isUsingFallback && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000]">
            <div className="bg-card/90 border border-primary/30 rounded-lg shadow-md px-4 py-2 text-foreground text-xs backdrop-blur-sm">
              <div className="flex items-center">
                <span className="bg-primary/20 rounded-full p-1 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3 text-primary">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </span>
                <span className="font-medium">Using approximate location</span>
              </div>
            </div>
          </div>
        )}
        


        {/* Actions menu in top right */}
        <div className="absolute top-4 right-4 z-[1000] flex gap-2">
          {user && (
            <SimpleUserDrawer 
              onDrawerStateChange={setIsUserDrawerOpen}
              externalCloseState={forceCloseDrawer}
            >
              <div className="bg-primary text-white shadow-lg rounded-full w-10 h-10 flex items-center justify-center transform transition-all hover:scale-105 active:scale-95 p-0 relative">
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse-marker"></div>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
            </SimpleUserDrawer>
          )}
        </div>
        
        {/* Bottom card for job details - DoorDash-style slide-up panel */}
        {showJobDetail && selectedJob && (
          <div 
            className="absolute bottom-0 left-0 right-0 z-[9000] max-h-[70%] overflow-y-auto 
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
            <div className="sticky top-0 bg-card pt-2 pb-1 px-4 border-b border-border z-[9999]">
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
            
            <JobDetail job={selectedJob} onClose={handleCloseDetail} />
            
            {/* Apply button fixed at bottom */}
            <div className="sticky bottom-0 left-0 right-0 bg-card p-4 border-t border-border z-[9999] pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
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
