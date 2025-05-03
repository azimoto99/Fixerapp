import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import AccountTypeSwitch from '@/components/AccountTypeSwitch';
import JobSearch from '@/components/JobSearch';
import ViewToggle from '@/components/ViewToggle';
import JobListSection from '@/components/JobListSection';
import MapSection from '@/components/MapSection';
import NewJobButton from '@/components/NewJobButton';
import { useJobs } from '@/hooks/useJobs';
import { Job } from '@shared/schema';
import { useGeolocation } from '@/lib/geolocation';

export default function Home() {
  const [view, setView] = useState<'list' | 'map'>('map');
  const [selectedJob, setSelectedJob] = useState<Job | undefined>(undefined);
  const [searchParams, setSearchParams] = useState({ query: '', category: '' });
  const { jobs, isLoading } = useJobs();
  const { userLocation } = useGeolocation();

  const handleSearch = (params: { query: string; category: string }) => {
    setSearchParams(params);
  };

  const handleSelectJob = (job: Job) => {
    setSelectedJob(job);
  };

  const handleViewChange = (newView: 'list' | 'map') => {
    setView(newView);
  };

  // Initial data loading
  useEffect(() => {
    // If we have jobs and no selected job, select the first one
    if (jobs && jobs.length > 0 && !selectedJob) {
      setSelectedJob(jobs[0]);
    }
  }, [jobs, selectedJob]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <AccountTypeSwitch />
          
          <JobSearch onSearch={handleSearch} />
          
          <ViewToggle 
            view={view} 
            onViewChange={handleViewChange} 
            jobCount={jobs?.length || 0} 
          />
          
          <div className="px-4 sm:px-0">
            {view === 'map' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <JobListSection 
                  onSelectJob={handleSelectJob} 
                  selectedJobId={selectedJob?.id}
                  searchParams={searchParams}
                />
                <MapSection 
                  jobs={jobs || []}
                  selectedJob={selectedJob}
                  onSelectJob={handleSelectJob}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                <JobListSection 
                  searchParams={searchParams}
                />
              </div>
            )}
          </div>
        </div>
      </main>
      
      <MobileNav />
      <NewJobButton />
    </div>
  );
}
