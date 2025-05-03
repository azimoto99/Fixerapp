import { useState, useEffect, useRef } from 'react';
import { useGeolocation } from '@/lib/geolocation';
import JobDetail from './JobDetail';
import { Job } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';

interface MapSectionProps {
  jobs: Job[];
  selectedJob?: Job;
  onSelectJob?: (job: Job) => void;
}

// Mock implementation of a map view
const MapSection: React.FC<MapSectionProps> = ({ jobs, selectedJob, onSelectJob }) => {
  const { userLocation, locationError } = useGeolocation();
  const [showJobDetail, setShowJobDetail] = useState<boolean>(false);
  const mapRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="md:col-span-2 bg-white shadow rounded-lg overflow-hidden">
      <div className="relative h-full">
        <div className="map-container bg-gray-100 relative overflow-hidden">
          {/* Map mockup */}
          <div 
            ref={mapRef}
            className="absolute inset-0 bg-gray-200"
            style={{ backgroundImage: "url('https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/-122.4194,37.7749,12,0/800x600?access_token=pk.dummy')", backgroundSize: 'cover' }}
          >
            {/* This would be replaced by a real map library like MapBox or Google Maps */}
            
            {/* Job markers */}
            {jobs.map((job, index) => {
              // Calculate random positions for demo
              const top = 30 + (index * 10) % 40;
              const left = 25 + (index * 15) % 60;
              
              const isSelected = selectedJob?.id === job.id;
              const colorClass = isSelected ? 'bg-blue-600' : getColorForCategory(job.category);
              
              return (
                <div
                  key={job.id}
                  className="absolute cursor-pointer"
                  style={{ top: `${top}%`, left: `${left}%` }}
                  onClick={() => handleMarkerClick(job)}
                >
                  <div className={`${colorClass} text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg ${isSelected ? 'ring-2 ring-white scale-125' : ''}`}>
                    <span className="text-xs font-bold">${job.paymentAmount}</span>
                  </div>
                </div>
              );
            })}
            
            {/* User location marker */}
            {userLocation && (
              <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-white animate-pulse">
                  <i className="ri-user-location-fill text-xs"></i>
                </div>
              </div>
            )}
            
            {/* Distance radius circle */}
            <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <div className="rounded-full border-2 border-blue-500 opacity-20 w-64 h-64"></div>
            </div>
          </div>
          
          {/* Map controls */}
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-2 flex flex-col space-y-2">
            <button className="p-2 hover:bg-gray-100 rounded-md">
              <i className="ri-zoom-in-line text-gray-700"></i>
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-md">
              <i className="ri-zoom-out-line text-gray-700"></i>
            </button>
            <div className="border-t border-gray-200 my-1"></div>
            <button className="p-2 hover:bg-gray-100 rounded-md">
              <i className="ri-focus-3-line text-gray-700"></i>
            </button>
          </div>
          
          {/* Job Detail Card */}
          {showJobDetail && selectedJob && (
            <div className="absolute bottom-4 left-4 right-4">
              <JobDetail job={selectedJob} onClose={handleCloseDetail} />
            </div>
          )}
          
          {/* Location error message */}
          {locationError && (
            <div className="absolute top-4 left-4 right-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">
                <i className="ri-error-warning-line mr-1"></i>
                {locationError}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to get color based on job category
function getColorForCategory(category: string): string {
  switch(category) {
    case 'Home Maintenance':
      return 'bg-primary-600';
    case 'Cleaning':
      return 'bg-cyan-600';
    case 'Delivery':
      return 'bg-secondary-600';
    case 'Event Help':
      return 'bg-purple-600';
    case 'Moving':
      return 'bg-indigo-600';
    case 'Tech Support':
      return 'bg-amber-600';
    case 'Shopping':
      return 'bg-rose-600';
    case 'Pet Care':
      return 'bg-green-600';
    case 'Tutoring':
      return 'bg-blue-600';
    default:
      return 'bg-gray-600';
  }
}

export default MapSection;
