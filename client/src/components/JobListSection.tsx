import { useState, useEffect, useMemo, useCallback } from 'react';
import JobCard from './JobCard';
import { Job } from '@shared/schema';
import { useJobs } from '@/hooks/useJobs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  
  // Use useMemo to avoid unnecessary filtering on each render
  const filteredJobs = useMemo(() => {
    return jobs || [];
  }, [jobs]);

  // Use useCallback to avoid recreating this function on each render
  const handleSelectJob = useCallback((job: Job) => {
    if (onSelectJob) {
      onSelectJob(job);
    }
  }, [onSelectJob]);

  // Loading skeleton that better matches the final UI
  if (isLoading) {
    return (
      <div className="md:col-span-1 bg-card shadow-md rounded-lg overflow-hidden border border-border">
        <div className="h-full flex flex-col">
          <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-secondary">
            <h3 className="text-sm font-medium text-foreground">Finding local jobs...</h3>
          </div>
          <div className="flex-1 overflow-auto p-2">
            <div className="animate-pulse space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border-b border-border p-3">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="mt-2 flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
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
    <div className="md:col-span-1 bg-card shadow-md rounded-lg overflow-hidden border border-border">
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-secondary">
          <h3 className="text-sm font-medium text-foreground flex items-center">
            <span>Available Jobs</span>
            <span className="ml-2 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
              {filteredJobs.length}
            </span>
          </h3>
        </div>
        
        {/* Use ScrollArea component for smoother scrolling with thin scrollbar */}
        <ScrollArea className="flex-1" style={{ height: 'calc(100vh - 160px)' }}>
          <div className="p-0.5">
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
              <div className="p-8 text-center text-muted-foreground">
                <div className="mb-2 text-4xl">🔍</div>
                <p>No jobs found matching your search criteria.</p>
                <p className="text-sm mt-2">Try adjusting your search or check back later.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default JobListSection;
