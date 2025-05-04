import { useState, useEffect, useMemo } from 'react';
import { useGeolocation } from '@/lib/geolocation';
import JobDetail from './JobDetail';
import { JobMarker } from './JobMarker';
import { Job } from '@shared/schema';
import { 
  MapContainer, 
  TileLayer, 
  Circle, 
  useMap,
  ZoomControl,
  CircleMarker,
  Popup
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LatLngExpression } from 'leaflet';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface MapSectionProps {
  jobs: Job[];
  selectedJob?: Job;
  onSelectJob?: (job: Job) => void;
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

// DoorDash-style interactive map component for showing nearby gigs
const MapSection: React.FC<MapSectionProps> = ({ jobs, selectedJob, onSelectJob }) => {
  const { userLocation, locationError, isUsingFallback } = useGeolocation();
  const [showJobDetail, setShowJobDetail] = useState<boolean>(false);
  const [mapReady, setMapReady] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Convert user location to leaflet format
  const position: LatLngExpression | null = userLocation 
    ? [userLocation.latitude, userLocation.longitude] 
    : null;
  
  // Handle selecting a job when a map marker is clicked
  const handleMarkerClick = (job: Job) => {
    if (onSelectJob) {
      onSelectJob(job);
      setShowJobDetail(true);
    }
  };

  // Close the job detail panel
  const handleCloseDetail = () => {
    setShowJobDetail(false);
  };

  useEffect(() => {
    setShowJobDetail(!!selectedJob);
  }, [selectedJob]);
  
  // Calculate job positions (in a real app, this would come from the server)
  const jobPositions = useMemo(() => {
    if (!position) return [];
    
    // In a real app, the jobs would have actual lat/lng coordinates
    // For demo purposes, we'll generate positions within 2 miles of the user
    return jobs.map((job, index) => {
      // Random offset within ~2 miles (0.03 degrees is roughly 2 miles)
      const latOffset = (Math.random() - 0.5) * 0.03;
      const lngOffset = (Math.random() - 0.5) * 0.03;
      
      return {
        job,
        position: [
          position[0] + latOffset,
          position[1] + lngOffset
        ] as LatLngExpression
      };
    });
  }, [jobs, position]);
  
  // If no user location yet, show loading
  if (!position) {
    return (
      <div className="md:col-span-2 bg-white shadow rounded-lg flex items-center justify-center h-80">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p>Finding your location...</p>
          {locationError && (
            <p className="text-sm text-red-600 mt-2">{locationError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="relative h-screen">
        <style>{`
          .leaflet-container {
            height: 100%;
            width: 100%;
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
        `}</style>
        
        {position && (
          <MapContainer 
            center={position as [number, number]} 
            zoom={15} 
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* 2-mile radius circle around user's location */}
            <Circle 
              center={position}
              pathOptions={{ 
                fillColor: '#3b82f6', 
                fillOpacity: 0.1, 
                color: '#3b82f6',
                weight: 1
              }}
              radius={3218} // 2 miles in meters
            />
            
            {/* User's location marker */}
            <CircleMarker 
              center={position}
              pathOptions={{ 
                fillColor: '#3b82f6', 
                fillOpacity: 0.6, 
                color: 'white',
                weight: 2
              }}
              radius={8}
            >
              <Popup>Your location</Popup>
            </CircleMarker>
            
            {/* Job markers */}
            {jobPositions.map(({ job, position }) => (
              <JobMarker 
                key={job.id}
                job={job}
                position={position}
                isSelected={selectedJob?.id === job.id}
                onClick={handleMarkerClick}
              />
            ))}
            
            {/* Recenter map component */}
            <RecenterMap position={position} />
            
            {/* Custom zoom control position */}
            <ZoomControl position="bottomright" />
          </MapContainer>
        )}
        
        {/* Minimalist Job counter - DoorDash style */}
        <div className="absolute top-4 left-4 z-[1000]">
          <div className="flex items-center gap-2">
            <div className="bg-white shadow-lg rounded-full px-4 py-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-primary mr-2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="text-sm font-medium">
                {jobs.length} jobs within 2 miles
              </span>
            </div>
          </div>
          
          {/* Fallback location notice */}
          {isUsingFallback && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-full shadow px-3 py-1 text-amber-800 text-xs">
              <p className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Using approximate location
              </p>
            </div>
          )}
        </div>
        
        {/* My account button in top right */}
        <div className="absolute top-4 right-4 z-[1000]">
          <button className="bg-white shadow-lg rounded-full p-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-700">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </div>
        
        {/* Bottom card for job details - DoorDash-style slide-up panel */}
        {showJobDetail && selectedJob && (
          <div className="absolute bottom-0 left-0 right-0 z-[1000] max-h-[70%] overflow-y-auto 
                          bg-white rounded-t-xl shadow-xl animate-slide-up">
            <div className="sticky top-0 bg-white pt-2 pb-1 px-4 border-b">
              <div className="flex justify-center pb-1">
                <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
              </div>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">${selectedJob.paymentAmount}</h3>
                <button 
                  onClick={handleCloseDetail}
                  className="p-1 rounded-full hover:bg-gray-100"
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
            <div className="sticky bottom-0 left-0 right-0 bg-white p-4 border-t">
              <button 
                className="w-full py-3 px-4 rounded-full bg-primary hover:bg-primary/90 text-white font-medium flex items-center justify-center"
              >
                <span>Apply for this Job</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 ml-2">
                  <path d="M5 12h14"></path>
                  <path d="m12 5 7 7-7 7"></path>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapSection;
