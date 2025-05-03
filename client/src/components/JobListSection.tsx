import { useState, useEffect } from 'react';
import JobCard from './JobCard';
import { Job } from '@shared/schema';
import { useJobs } from '@/hooks/useJobs';

interface JobListSectionProps {
  onSelectJob?: (job: Job) => void;
  selectedJobId?: number;
  searchParams?: {
    query: string;
    category: string;
  };
}

const JobListSection: React.FC<JobListSectionProps> = ({ 
  onSelectJob, 
  selectedJobId,
  searchParams
}) => {
  const { jobs, isLoading } = useJobs(searchParams);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);

  useEffect(() => {
    setFilteredJobs(jobs || []);
  }, [jobs]);

  const handleSelectJob = (job: Job) => {
    if (onSelectJob) {
      onSelectJob(job);
    }
  };

  if (isLoading) {
    return (
      <div className="md:col-span-1 bg-white shadow rounded-lg overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-900">Loading jobs...</h3>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border-b border-gray-200 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gray-200 rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-6 w-16 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="md:col-span-1 bg-white shadow rounded-lg overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900">
            Jobs ({filteredJobs.length})
          </h3>
        </div>
        <div className="flex-1 overflow-auto" style={{ maxHeight: '70vh' }}>
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isSelected={job.id === selectedJobId}
                onSelect={handleSelectJob}
              />
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              No jobs found matching your search criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobListSection;
