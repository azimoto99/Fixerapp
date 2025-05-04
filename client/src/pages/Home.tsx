import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import JobSearch from '@/components/JobSearch';
import ViewToggle from '@/components/ViewToggle';
import JobListSection from '@/components/JobListSection';
import MapSection from '@/components/MapSection';
import NewJobButton from '@/components/NewJobButton';
import { useJobs } from '@/hooks/useJobs';
import { Job } from '@shared/schema';
import { useGeolocation } from '@/lib/geolocation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Worker Dashboard Component
const WorkerDashboard = () => {
  const [view, setView] = useState<'list' | 'map'>('map');
  const [selectedJob, setSelectedJob] = useState<Job | undefined>(undefined);
  const [searchParams, setSearchParams] = useState({ query: '', category: '' });
  const { jobs, isLoading } = useJobs(undefined, searchParams);
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="py-6 sm:px-6 lg:px-8">
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
  );
};

// Job Poster Dashboard Component
const PosterDashboard = () => {
  const { jobs, isLoading } = useJobs({ poster: true });
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Job Poster Dashboard</h1>
        <Button asChild>
          <a href="/post-job">Post a New Job</a>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Active Jobs</CardTitle>
            <CardDescription>Jobs currently accepting applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {jobs?.filter(job => job.status === 'open').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>In Progress</CardTitle>
            <CardDescription>Jobs with assigned workers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">
              {jobs?.filter(job => job.status === 'assigned').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Completed</CardTitle>
            <CardDescription>Successfully completed jobs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {jobs?.filter(job => job.status === 'completed').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">My Posted Jobs</h2>
        {jobs && jobs.length > 0 ? (
          <div className="space-y-4">
            {jobs.map(job => (
              <div key={job.id} className="border rounded-md p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{job.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{job.description.substring(0, 100)}...</p>
                    <div className="flex items-center mt-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        job.status === 'open' ? 'bg-blue-100 text-blue-800' : 
                        job.status === 'assigned' ? 'bg-amber-100 text-amber-800' : 
                        'bg-green-100 text-green-800'
                      }`}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        Posted on {job.datePosted ? new Date(job.datePosted).toLocaleDateString() : 'Unknown date'}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" asChild size="sm">
                      <a href={`/jobs/${job.id}`}>View Details</a>
                    </Button>
                    <Button variant="outline" asChild size="sm">
                      <a href={`/jobs/${job.id}/applications`}>Applications</a>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">You haven't posted any jobs yet.</p>
            <Button className="mt-4" asChild>
              <a href="/post-job">Post Your First Job</a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto">
          {!user ? (
            // Not logged in - Show worker view for browsing
            <WorkerDashboard />
          ) : user.accountType === 'worker' ? (
            // Worker dashboard
            <WorkerDashboard />
          ) : (
            // Job poster dashboard
            <PosterDashboard />
          )}
        </div>
      </main>
      
      <MobileNav />
      {(!user || user.accountType === 'poster') && <NewJobButton />}
    </div>
  );
}
