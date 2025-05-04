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
    <div className="md:col-span-2 bg-white shadow rounded-lg overflow-hidden">
      <div className="relative h-[70vh] md:h-[calc(100vh-160px)]">
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
        
        {/* DoorDash-like top bar */}
        <div className="absolute top-0 left-0 right-0 bg-white shadow-md z-[1000] p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">Nearby Jobs</h2>
              <p className="text-sm text-gray-500">
                {jobs.length} jobs within 2 miles
              </p>
            </div>
            <div className="flex space-x-2">
              <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium">
                Filter
              </button>
            </div>
          </div>
          
          {/* Fallback location notice */}
          {isUsingFallback && (
            <div className="mt-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
              <p className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Using approximate location. Enable location services for accurate results.
              </p>
            </div>
          )}
        </div>
        
        {/* Bottom card for job details */}
        {showJobDetail && selectedJob && (
          <div className="absolute bottom-0 left-0 right-0 z-[1000] max-h-[50%] overflow-y-auto">
            <JobDetail job={selectedJob} onClose={handleCloseDetail} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MapSection;
