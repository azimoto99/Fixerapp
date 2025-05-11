import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import JobSearch from '@/components/JobSearch';
import ViewToggle from '@/components/ViewToggle';
import JobListSection from '@/components/JobListSection';
import MapSection from '@/components/MapSection';
import NewJobButton from '@/components/NewJobButton';
import PostJobDrawer from '@/components/PostJobDrawer';

import { useJobs } from '@/hooks/useJobs';
import { Job } from '@shared/schema';
import { useGeolocation } from '@/lib/geolocation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Worker Dashboard Component
const WorkerDashboard = () => {
  // Keep all useState calls together and in the same order every render
  const [view, setView] = useState<'list' | 'map'>('map');
  const [selectedJob, setSelectedJob] = useState<Job | undefined>(undefined);
  const [cancelJobId, setCancelJobId] = useState<number | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [searchParams, setSearchParams] = useState({ 
    query: '', 
    category: '', 
    searchMode: 'location' as 'location' | 'description',
    coordinates: undefined as { latitude: number; longitude: number } | undefined
  });
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

  const handleSearch = (params: { 
    query: string; 
    category: string; 
    searchMode?: 'location' | 'description';
    coordinates?: { latitude: number; longitude: number }
  }) => {
    // Preserve existing searchMode if not provided
    const newSearchMode = params.searchMode || searchParams.searchMode;
    
    setSearchParams({
      query: params.query,
      category: params.category,
      searchMode: newSearchMode,
      coordinates: params.coordinates
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

  // We no longer auto-select the first job to avoid unwanted drawer opening
  // This gives users full control over when job details are displayed

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  // Jobs Posted by Worker Drawer
  const PostedJobsDrawer = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [cancelJobId, setCancelJobId] = useState<number | null>(null);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    
    // Mutation for canceling a job
    const cancelJobMutation = useMutation({
      mutationFn: async (jobId: number) => {
        const response = await apiRequest('DELETE', `/api/jobs/${jobId}`, { 
          withRefund: true // Request a refund when canceling
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to cancel job');
        }
        return response.json();
      },
      onSuccess: () => {
        toast({
          title: "Job Canceled",
          description: "The job has been canceled and a refund has been issued",
          variant: "default"
        });
        
        // Refresh job data
        queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      },
      onError: (error: Error) => {
        toast({
          title: "Error",
          description: `Failed to cancel job: ${error.message}`,
          variant: "destructive"
        });
      }
    });
    
    const handleCancelJob = () => {
      if (cancelJobId) {
        cancelJobMutation.mutate(cancelJobId);
        setShowCancelDialog(false);
        setCancelJobId(null);
      }
    };
    
    if (!showPostedJobs) return null;
    
    return (
      <div className="fixed top-0 right-0 h-full w-80 bg-card shadow-lg z-[var(--z-drawer)] transform transition-transform duration-300 animate-in slide-in-from-right">
        {/* X button on the left side */}
        <button 
          onClick={togglePostedJobs}
          className="absolute -left-12 top-4 bg-blue-600 text-white shadow-lg rounded-full w-10 h-10 flex items-center justify-center transform transition-all hover:scale-105 active:scale-95 p-0"
          aria-label="Close posted jobs panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <div className="bg-blue-600 text-white px-4 py-3 border-b border-blue-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">My Posted Jobs</h3>
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
                <div key={job.id} className="border border-border rounded-md p-3 hover:bg-secondary/30 transition-colors">
                  <h4 className="font-medium text-foreground">{job.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{job.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      job.status === 'open' ? 'bg-emerald-600 text-white' : 
                      job.status === 'assigned' ? 'bg-emerald-700 text-white' : 
                      job.status === 'completed' ? 'bg-emerald-800 text-white' :
                      'bg-emerald-600 text-white'
                    }`}>
                      {job.status ? job.status.charAt(0).toUpperCase() + job.status.slice(1) : 'Open'}
                    </span>
                    {job.paymentAmount && (
                      <span className="text-xs text-muted-foreground">
                        ${job.paymentAmount} {job.paymentType === 'hourly' ? '/hr' : ''}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button 
                      size="sm" 
                      variant="default" 
                      className="flex-1"
                      onClick={(e) => {
                        e.preventDefault();
                        // Open the job card instead of navigating to detail page
                        setSelectedJob(job);
                      }}
                    >
                      <i className="ri-settings-4-line mr-1"></i> Manage
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="flex-1"
                      onClick={(e) => {
                        e.preventDefault();
                        // Show cancel confirmation dialog
                        setCancelJobId(job.id);
                        setShowCancelDialog(true);
                      }}
                    >
                      <i className="ri-close-circle-line mr-1"></i> Cancel Job
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">No Jobs Posted Yet</h3>
              <p className="text-muted-foreground mb-6">Create your first job listing to start finding workers</p>
              <Button 
                className="bg-primary hover:bg-primary/90"
                onClick={() => {
                  togglePostedJobs(); // Close the drawer first
                  setTimeout(() => {
                    // Use the existing NewJobButton functionality
                    const newJobBtn = document.querySelector('[aria-label="Post a new job"]');
                    if (newJobBtn) {
                      (newJobBtn as HTMLElement).click();
                    }
                  }, 300);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Post Your First Job
              </Button>
            </div>
          )}
        </div>
        
        {/* Cancel Job Confirmation Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Job</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this job? This action cannot be undone.
                {cancelJobId && (
                  <p className="mt-2">
                    If payment was made for this job, a refund will be processed automatically.
                  </p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No, Keep Job</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleCancelJob}
                className="bg-destructive hover:bg-destructive/90"
              >
                Yes, Cancel Job{cancelJobMutation.isPending && (
                  <span className="ml-2 inline-block animate-spin">⟳</span>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };
  
  // My Posted Jobs button - positioned to the left of UserDrawer button
  const PostedJobsButton = () => {
    return (
      <div className="fixed top-4 right-16 z-[var(--z-controls)]">
        <Button 
          onClick={togglePostedJobs}
          className="bg-blue-600 text-white shadow-lg rounded-full w-10 h-10 flex items-center justify-center transition-all hover:scale-105 active:scale-95 p-0"
          aria-label="My Posted Jobs"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"></path><path d="M14 2v6"></path><path d="M10 2v6"></path><path d="M3 10h18"></path></svg>
          {(postedJobs && postedJobs.length > 0) ? (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
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
          searchCoordinates={searchParams.coordinates}
        />
        
        {/* Worker can view jobs they've posted */}
        <PostedJobsButton />
        <PostedJobsDrawer />
        
        {/* Add the NewJobButton component to allow users to post jobs */}
        <NewJobButton />
        
        {/* Square search box at the very bottom of the screen with no space */}
        <div className="fixed bottom-0 left-0 right-0 z-[50] w-full">
          <div className="bg-card border-t border-border shadow-lg">
            <div className="p-2">
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
  const [isJobDrawerOpen, setIsJobDrawerOpen] = useState(false);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="py-6 sm:px-6 lg:px-8">
      {/* New Job Drawer */}
      <PostJobDrawer 
        isOpen={isJobDrawerOpen} 
        onOpenChange={setIsJobDrawerOpen}
      />
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Job Poster Dashboard</h1>
        <Button onClick={() => setIsJobDrawerOpen(true)}>
          Post a New Job
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
                        job.status === 'open' ? 'bg-emerald-600 text-white' : 
                        job.status === 'assigned' ? 'bg-emerald-700 text-white' : 
                        'bg-emerald-800 text-white'
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
            <Button 
              className="mt-4" 
              onClick={() => setIsJobDrawerOpen(true)}
            >
              Post Your First Job
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
      
      {/* Mobile nav with Post Job+ button */}
      {(!user || user.accountType === 'worker') && <MobileNav />}
      
      {/* New job button now integrated in the MapSection component */}
    </div>
  );
}
