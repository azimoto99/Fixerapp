import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  // Keep all useState calls together and in the same order every render
  const [view, setView] = useState<'list' | 'map'>('map');
  const [selectedJob, setSelectedJob] = useState<Job | undefined>(undefined);
  const [searchParams, setSearchParams] = useState({ query: '', category: '', searchMode: 'location' as 'location' | 'description' });
  const [showPostedJobs, setShowPostedJobs] = useState(false);
  
  // Keep all custom hook calls after useState hooks
  const { user } = useAuth();
  const { userLocation } = useGeolocation();
  const { jobs, isLoading } = useJobs({
    nearbyOnly: true,
    radiusMiles: 2
  }, searchParams);
  
  // Get jobs posted by this worker (if any)
  const { data: postedJobs, isLoading: isLoadingPostedJobs } = useQuery<Job[]>({
    queryKey: ['/api/jobs', { posterId: user?.id }],
    enabled: !!user?.id
  });

  const handleSearch = (params: { query: string; category: string }) => {
    // Preserve the current searchMode when updating search parameters
    setSearchParams({
      ...params,
      searchMode: searchParams.searchMode
    });
  };

  const handleSelectJob = (job: Job) => {
    setSelectedJob(job);
  };

  const handleViewChange = (newView: 'list' | 'map') => {
    setView(newView);
  };
  
  const togglePostedJobs = () => {
    setShowPostedJobs(!showPostedJobs);
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
  
  // Jobs Posted by Worker Drawer
  const PostedJobsDrawer = () => {
    if (!showPostedJobs) return null;
    
    return (
      <div className="absolute top-0 right-0 h-full w-80 bg-card shadow-lg z-[1000] transform transition-transform duration-300">
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-card-foreground">My Posted Jobs</h3>
            <Button size="sm" variant="ghost" onClick={togglePostedJobs}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </Button>
          </div>
        </div>
        
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 60px)' }}>
          {isLoadingPostedJobs ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : postedJobs && postedJobs.length > 0 ? (
            <div className="space-y-3">
              {postedJobs.map((job: Job) => (
                <div key={job.id} className="border border-border rounded-md p-3 hover:bg-secondary">
                  <h4 className="font-medium text-foreground">{job.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{job.description}</p>
                  <div className="flex items-center mt-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      job.status === 'open' ? 'bg-red-900 text-white' : 
                      job.status === 'assigned' ? 'bg-red-800/70 text-white' : 
                      'bg-red-700/50 text-white'
                    }`}>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </span>
                  </div>
                  <div className="mt-3">
                    <Button size="sm" variant="outline" asChild className="w-full">
                      <a href={`/job/${job.id}`}>View Details</a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">You haven't posted any jobs yet.</p>
              <Button asChild>
                <a href="/post-job">Post Your First Job</a>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // My Posted Jobs button
  const PostedJobsButton = () => {
    return (
      <div className="absolute top-4 right-[calc(4rem+8px)] z-[900]">
        <Button 
          onClick={togglePostedJobs}
          variant="circle" 
          size="circle"
          className="bg-card text-primary hover:bg-primary hover:text-card transition-colors shadow-md"
          aria-label="My Posted Jobs"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"></path><path d="M14 2v6"></path><path d="M10 2v6"></path><path d="M3 10h18"></path></svg>
          {(postedJobs && postedJobs.length > 0) ? (
            <span className="absolute -top-1 -right-1 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
              {postedJobs.length}
            </span>
          ) : null}
        </Button>
      </div>
    );
  };

  return (
    <div className="h-full">
      {/* DoorDash-style layout with map as primary interface */}
      <div className="h-full relative">
        {/* Map takes the full screen in this view */}
        <MapSection 
          jobs={jobs || []}
          selectedJob={selectedJob}
          onSelectJob={handleSelectJob}
        />
        
        {/* Worker can view jobs they've posted */}
        <PostedJobsButton />
        <PostedJobsDrawer />
        
        {/* DoorDash-style floating search box at bottom */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[500]">
          <div className="bg-card border border-border rounded-full shadow-lg" style={{ width: '90vw', maxWidth: '400px' }}>
            <div className="p-1.5">
              <JobSearch onSearch={handleSearch} />
            </div>
          </div>
        </div>
        

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
        <h1 className="text-2xl font-bold text-foreground">Job Poster Dashboard</h1>
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

      <div className="bg-card shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-card-foreground mb-4">My Posted Jobs</h2>
        {jobs && jobs.length > 0 ? (
          <div className="space-y-4">
            {jobs.map(job => (
              <div key={job.id} className="border border-border rounded-md p-4 hover:bg-secondary">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-foreground">{job.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{job.description.substring(0, 100)}...</p>
                    <div className="flex items-center mt-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        job.status === 'open' ? 'bg-red-900 text-white' : 
                        job.status === 'assigned' ? 'bg-red-800/70 text-white' : 
                        'bg-red-700/50 text-white'
                      }`}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
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
            <p className="text-muted-foreground">You haven't posted any jobs yet.</p>
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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Only show header for Job Posters - workers get fullscreen map */}
      {(user && user.accountType === 'poster') && <Header />}
      
      <main className={`flex-1 ${(!user || user.accountType === 'worker') ? 'h-screen' : ''}`}>
        {(!user || user.accountType === 'worker') ? (
          // Worker dashboard - Full screen for map view
          <div className="h-full">
            <WorkerDashboard />
          </div>
        ) : (
          // Job poster dashboard - Normal width with padding
          <div className="max-w-7xl mx-auto">
            <PosterDashboard />
          </div>
        )}
      </main>
      
      {/* Always show mobile nav for both account types */}
      {user && <MobileNav />}
      
      {/* Show new job button for all logged-in users */}
      {user && <NewJobButton />}
    </div>
  );
}
