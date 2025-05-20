import { useState, useEffect, useMemo, useCallback } from 'react';
import JobCard from './JobCard';
import { Job } from '@shared/schema';
import { useJobs } from '@/hooks/useJobs';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

interface JobListSectionProps {
  onSelectJob?: (job: Job) => void;
  selectedJobId?: number;
  searchParams?: {
    query?: string;
    category?: string;
    searchMode?: 'location' | 'description';
    coordinates?: { latitude: number; longitude: number };
  };
}

const JobListSection: React.FC<JobListSectionProps> = ({ 
  onSelectJob, 
  selectedJobId,
  searchParams
}) => {
  // Get the current user to check if we're showing jobs for a worker or poster
  const { user } = useAuth();
  const isViewingAsWorker = !user || user.accountType === 'worker';
  
  // When viewing as a worker, show available jobs
  // When viewing as a poster, only show the user's posted jobs
  const { jobs, isLoading } = useJobs(
    { 
      poster: !isViewingAsWorker,  // Filter by poster ID if viewing as poster
      includeAll: !isViewingAsWorker   // Include pending and completed jobs for poster view
    }, 
    searchParams
  );
  
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

  // Enhanced loading skeleton that better matches the final UI
  if (isLoading) {
    return (
      <div className="md:col-span-1 bg-card shadow-md rounded-lg overflow-hidden border border-border">
        <div className="h-full flex flex-col">
          <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-secondary">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Finding jobs near you</h3>
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
          </div>

          <ScrollArea className="flex-1" style={{ height: 'calc(100vh - 160px)' }}>
            <div className="p-0.5 animate-pulse space-y-0">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border-b border-border py-4 px-6">
                  <div className="flex items-start space-x-3">
                    <Skeleton className="h-10 w-10 rounded-md flex-shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center space-x-2">
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-5 w-full max-w-md" />
                    </div>
                    <div className="space-y-2 flex-shrink-0">
                      <Skeleton className="h-6 w-20 rounded-full ml-auto" />
                      <Skeleton className="h-4 w-16 rounded ml-auto" />
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Skeleton className="h-4 w-28" />
                    <div className="flex justify-end">
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-4 w-40 col-span-2" />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
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
              <div className="px-6 py-12 text-center">
                <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="w-8 h-8 text-muted-foreground"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    <line x1="9" y1="10" x2="15" y2="10"></line>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No jobs found</h3>
                <div className="max-w-xs mx-auto space-y-3">
                  <p className="text-sm text-muted-foreground">We couldn't find any jobs matching your current search criteria.</p>
                  
                  <div className="bg-primary/5 p-3 rounded-md text-sm">
                    <p className="font-medium text-primary mb-1">Try these suggestions:</p>
                    <ul className="text-left text-xs text-muted-foreground space-y-1.5">
                      <li className="flex items-start gap-1.5">
                        <span className="bg-primary/10 text-primary rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                        <span>Use more general keywords in your search</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="bg-primary/10 text-primary rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                        <span>Try a different location or increase your search radius</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="bg-primary/10 text-primary rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                        <span>Check all job categories instead of specific ones</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default JobListSection;
