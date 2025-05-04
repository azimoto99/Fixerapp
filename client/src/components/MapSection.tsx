import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import { useGeolocation } from '@/lib/geolocation';
import { Job } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import SimpleUserDrawer from './SimpleUserDrawer';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import 'leaflet/dist/leaflet.css';

interface MapSectionProps {
  jobs: Job[];
  selectedJob?: Job;
  onSelectJob?: (job: Job) => void;
  searchCoordinates?: { latitude: number; longitude: number };
}

// Component to recenter map when user location changes
function RecenterMap({ position }: { position: LatLngExpression | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.setView(position, 15);
    }
  }, [position, map]);
  
  return null;
}

// Custom control components for mobile
function ZoomInControl() {
  const map = useMap();
  return (
    <button 
      onClick={() => map.zoomIn()}
      className="bg-primary text-white shadow-lg rounded-full w-10 h-10 flex items-center justify-center transform transition-all hover:scale-105 active:scale-95 hover:bg-primary/90"
      aria-label="Zoom in"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </button>
  );
}

function ZoomOutControl() {
  const map = useMap();
  return (
    <button 
      onClick={() => map.zoomOut()}
      className="bg-primary text-white shadow-lg rounded-full w-10 h-10 flex items-center justify-center transform transition-all hover:scale-105 active:scale-95 hover:bg-primary/90"
      aria-label="Zoom out"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </button>
  );
}

function LocationButton() {
  const map = useMap();
  const { userLocation } = useGeolocation();
  
  const handleClick = () => {
    if (userLocation) {
      map.setView([userLocation.latitude, userLocation.longitude], 15);
    }
  };
  
  return (
    <button 
      onClick={handleClick}
      className="bg-primary text-white shadow-lg rounded-full w-10 h-10 flex items-center justify-center transform transition-all hover:scale-105 active:scale-95 hover:bg-primary/90"
      aria-label="My location"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    </button>
  );
}

function UserButton() {
  return (
    <SimpleUserDrawer>
      <button 
        className="bg-background border border-border shadow-lg rounded-full w-10 h-10 flex items-center justify-center transform transition-all hover:scale-105 active:scale-95"
        aria-label="User menu"
      >
        <User className="h-5 w-5 text-foreground" />
      </button>
    </SimpleUserDrawer>
  );
}

// Build custom marker icon for jobs
const createJobMarker = (category: string, isSelected: boolean = false) => {
  // Determine color based on category
  let color = '#10B981'; // Default green color
  
  switch (category.toLowerCase()) {
    case 'home maintenance':
      color = '#2563EB'; // Blue
      break;
    case 'cleaning':
      color = '#10B981'; // Green
      break;
    case 'delivery':
      color = '#F59E0B'; // Amber
      break;
    case 'event help':
      color = '#8B5CF6'; // Purple
      break;
    case 'moving':
      color = '#EF4444'; // Red
      break;
    default:
      color = '#10B981'; // Default green
  }
  
  // SVG marker - more efficient than HTML
  const markerSvg = `
    <svg width="50" height="64" viewBox="0 0 50 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <filter id="dropShadow" x="-2" y="0" width="54" height="68" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3" />
      </filter>
      <path d="M25 0C11.2 0 0 11.2 0 25C0 38.8 25 64 25 64C25 64 50 38.8 50 25C50 11.2 38.8 0 25 0Z" fill="${color}" filter="url(#dropShadow)" ${isSelected ? 'stroke="#000" stroke-width="2"' : ''} />
      <circle cx="25" cy="25" r="10" fill="white" />
      ${getIconForCategory(category)}
    </svg>
  `;
  
  return L.divIcon({
    className: 'custom-job-marker',
    html: `<div class="${isSelected ? 'animate-bounce-in' : ''}">${markerSvg}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
};

// Function to return SVG path for category icon
function getIconForCategory(category: string): string {
  switch (category.toLowerCase()) {
    case 'home maintenance':
      return '<path d="M35 23L25 15L15 23V35H35V23Z" fill="#2563EB" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    case 'cleaning':
      return '<path d="M30 20C30 17.8 28.8 15.7 26.9 14.2C25 12.7 22.5 12 20 12" stroke="#10B981" stroke-width="2" stroke-linecap="round"/><path d="M20 20V27" stroke="#10B981" stroke-width="2" stroke-linecap="round"/><path d="M30 27C30 29.2 28.8 31.3 26.9 32.8C25 34.3 22.5 35 20 35" stroke="#10B981" stroke-width="2" stroke-linecap="round"/>';
    case 'delivery':
      return '<rect x="17" y="18" width="16" height="12" rx="1" stroke="#F59E0B" stroke-width="2"/><circle cx="19" cy="30" r="2" fill="#F59E0B"/><circle cx="31" cy="30" r="2" fill="#F59E0B"/><path d="M33 24H36L33 20H29" stroke="#F59E0B" stroke-width="2"/>';
    case 'event help':
      return '<path d="M30 15H20V35H30V15Z" stroke="#8B5CF6" stroke-width="2"/><path d="M20 22H15V28H20" stroke="#8B5CF6" stroke-width="2"/><path d="M30 22H35V28H30" stroke="#8B5CF6" stroke-width="2"/>';
    case 'moving':
      return '<rect x="15" y="18" width="20" height="15" rx="1" stroke="#EF4444" stroke-width="2"/><path d="M15 22H35" stroke="#EF4444" stroke-width="2"/><path d="M25 18V15" stroke="#EF4444" stroke-width="2" stroke-linecap="round"/>';
    default:
      return '<circle cx="25" cy="25" r="7" fill="#10B981" stroke="white" stroke-width="1"/>';
  }
}

// Create user location marker
const userLocationIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iIzJBOEJGRiIgZmlsbC1vcGFjaXR5PSIwLjciLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI2IiBmaWxsPSIjZmZmZmZmIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIgZmlsbD0iIzIxOTZGMyIvPjwvc3ZnPg==',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const MapSection: React.FC<MapSectionProps> = ({ jobs, selectedJob, onSelectJob, searchCoordinates }) => {
  const { userLocation, locationError, isUsingFallback } = useGeolocation();
  const [showJobDetail, setShowJobDetail] = useState<boolean>(false);
  const [mapReady, setMapReady] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [forceCloseDrawer, setForceCloseDrawer] = useState(false);
  const [lastSearchLocation, setLastSearchLocation] = useState<LatLngExpression | null>(null);
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
      // Reset state after animation completes
      setTimeout(() => setForceCloseDrawer(false), 300);
    }
  }, [showJobDetail, isUserDrawerOpen]);
  
  // Updates to track drawer state from child component
  const handleUserDrawerChange = (isOpen: boolean) => {
    setIsUserDrawerOpen(isOpen);
  };
  
  // Switch to search location when coordinates change
  useEffect(() => {
    if (searchCoordinates && mapReady) {
      const newLocation: LatLngExpression = [
        searchCoordinates.latitude,
        searchCoordinates.longitude
      ];
      setLastSearchLocation(newLocation);
    }
  }, [searchCoordinates, mapReady]);
  
  // Handle apply button click
  const handleApply = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedJob) return;
    
    setIsApplying(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Application Submitted",
        description: `You've applied to "${selectedJob.title}"`,
        action: (
          <Button variant="ghost" className="gap-1 flex items-center">
            <CheckCircle2 className="h-4 w-4" />
            View
          </Button>
        ),
      });
      
      // Close the job details pane after successful apply
      setShowJobDetail(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to apply for job. Please try again.",
        action: (
          <Button variant="outline" className="gap-1 flex items-center">
            <AlertCircle className="h-4 w-4" />
            Retry
          </Button>
        ),
      });
    } finally {
      setIsApplying(false);
    }
  };
  
  // Prevent map initialization with invalid coordinates
  const initialPosition: LatLngExpression = position || [37.7749, -122.4194]; // Default to SF
  
  return (
    <div className="w-full h-full">
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
          }
        `}</style>
        
        {/* Main Map Container */}
        <MapContainer 
          center={initialPosition}
          zoom={15} 
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
          whenReady={() => setMapReady(true)}
          whenCreated={(map) => {
            map.on('click', handleMapClick);
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* User location marker */}
          {position && (
            <Marker
              position={position}
              icon={userLocationIcon}
              zIndexOffset={1000}
            >
              <Popup>
                <div className="text-sm font-medium">Your Location</div>
                {isUsingFallback && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Using approximate location
                  </div>
                )}
              </Popup>
            </Marker>
          )}
          
          {/* Job markers */}
          {jobs.map((job) => (
            <Marker 
              key={job.id}
              position={[job.latitude, job.longitude]}
              icon={createJobMarker(job.category, selectedJob?.id === job.id)}
              eventHandlers={{
                click: () => handleMarkerClick(job)
              }}
            />
          ))}
          
          {/* Map control to recenter when location changes */}
          <RecenterMap position={position} />
          
          {/* Custom mobile controls */}
          <div className="leaflet-control leaflet-top leaflet-left" style={{ top: '15px', left: '15px', zIndex: 1000 }}>
            <div className="leaflet-control space-y-2">
              <UserButton />
            </div>
          </div>
          
          <div className="leaflet-control leaflet-bottom leaflet-right" style={{ bottom: '75px', right: '15px', zIndex: 1000 }}>
            <div className="leaflet-control space-y-2">
              <ZoomInControl />
              <ZoomOutControl />
              <LocationButton />
            </div>
          </div>
        </MapContainer>
        
        {/* Job details panel */}
        {selectedJob && showJobDetail && (
          <div 
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-xl shadow-lg overflow-hidden z-[800] animate-slide-up"
            style={{ maxHeight: '55vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-muted rounded-full" />
            </div>
            
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selectedJob.title}</h2>
              <span 
                className="text-xs font-medium px-2 py-1 rounded-full bg-green-600 text-white"
              >
                ${selectedJob.paymentAmount.toFixed(2)}
              </span>
            </div>
            
            <div className="p-4 overflow-y-auto pb-safe" style={{ maxHeight: 'calc(55vh - 60px)' }}>
              <div className="flex items-start mb-3">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedJob.posterId}`} />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium">Job Poster #{selectedJob.posterId}</div>
                  <div className="text-xs text-muted-foreground flex items-center">
                    <span className="flex items-center">
                      <svg className="h-3 w-3 text-yellow-500 mr-1" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                      4.8
                    </span>
                    <span className="mx-1">•</span>
                    <span>{selectedJob.category}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-muted rounded-md p-3 mb-4">
                <div className="text-xs text-muted-foreground mb-1">Location</div>
                <div className="text-sm">{selectedJob.location}</div>
              </div>
              
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">{selectedJob.description}</p>
              </div>
              
              {selectedJob.requiredSkills && selectedJob.requiredSkills.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium mb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-1">
                    {selectedJob.requiredSkills.map((skill, index) => (
                      <span 
                        key={index}
                        className="text-xs px-2 py-1 rounded-full bg-primary text-primary-foreground"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex flex-col gap-2 mt-6">
                <Button 
                  onClick={handleApply}
                  disabled={isApplying}
                  className="w-full"
                >
                  {isApplying ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Apply Now'
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowJobDetail(false)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapSection;