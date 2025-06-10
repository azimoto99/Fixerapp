import * as React from 'react';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import JobSearch from '@/components/JobSearch';
// ViewToggle and JobListSection removed - using unified modal approach
import MapSection from '@/components/MapSection';
import NewJobButton from '@/components/NewJobButton';
import PostJobDrawer from '@/components/PostJobDrawer';
import { MessagingDrawer } from '@/components/MessagingDrawer';
// Dialog imports removed - using unified JobDetailsCard modal

import { useJobs } from '@/hooks/useJobs';
import { Job } from '@shared/schema';
import { useGeolocation } from '@/lib/geolocation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, X, Briefcase, MapPin, Calendar, DollarSign, Clock, ExternalLink, Edit, Trash2 } from 'lucide-react';
import { EditJobModal } from '@/components/EditJobModal';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

// Import the new connection system
import { useAppConnections } from '@/hooks/useAppConnections';

// Worker Dashboard Component
const WorkerDashboard = () => {
  // Keep all useState calls together and in the same order every render
  const [view, setView] = useState<'list' | 'map'>('map');
  const [selectedJob, setSelectedJob] = useState<Job | undefined>(undefined);
  const [cancelJobId, setCancelJobId] = useState<number | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [searchParams, setSearchParams] = useState({
    query: '',
    searchMode: 'description' as 'location' | 'description',
    coordinates: undefined as { latitude: number; longitude: number } | undefined
  });
  
  // Keep all custom hook calls after useState hooks
  const { user } = useAuth();
  const { userLocation } = useGeolocation();
  // When in worker view, we want to show all available jobs EXCEPT our own
  // This ensures workers see jobs from other users on the map
  const { jobs, isLoading } = useJobs({
    nearbyOnly: searchParams.searchMode === 'location',
    radiusMiles: 5,
    poster: false // Never filter by poster in worker view to ensure jobs appear on map
  }, searchParams);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Job cancellation mutation
  const cancelJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      return apiRequest('DELETE', `/api/jobs/${jobId}`, { 
        withRefund: true // Request a refund when canceling
      })
      .then(res => {
        if (!res.ok) throw new Error('Failed to cancel job');
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Job cancelled",
        description: "Your job has been cancelled and payment has been refunded.",
      });
      setShowCancelDialog(false);
      setCancelJobId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error cancelling job",
        description: error.message,
        variant: "destructive"
      });
      setShowCancelDialog(false);
      setCancelJobId(null);
    }
  });

  const handleSearch = (params: {
    query: string;
    searchMode?: 'location' | 'description';
    coordinates?: { latitude: number; longitude: number };
    radiusMiles?: number;
  }) => {
    // Preserve existing searchMode if not provided
    const newSearchMode = params.searchMode || searchParams.searchMode;

    setSearchParams({
      query: params.query,
      searchMode: newSearchMode,
      coordinates: params.coordinates
    });
  };

  const handleSelectJob = (job: Job) => {
    setSelectedJob(job);
  };
  
  // Handle job cancellation
  const handleCancelJobClick = (jobId: number) => {
    setCancelJobId(jobId);
    setShowCancelDialog(true);
  };
  
  const handleCancelJob = () => {
    if (cancelJobId) {
      cancelJobMutation.mutate(cancelJobId);
    }
  };

  const handleViewChange = (newView: 'list' | 'map') => {
    setView(newView);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
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
          
          {/* Post Job Button positioned beneath UserDrawerV2 with lower z-index */}
          <div className="fixed top-20 right-4 z-[30]">
            <NewJobButton />
          </div>
          
          {/* Search Bar at bottom with proper mobile spacing */}
          <div className="mobile-search-container md:hidden">
            <div className="p-3 pb-4">
              <JobSearch onSearch={handleSearch} />
            </div>
          </div>

          {/* Desktop search positioning */}
          <div className="hidden md:block fixed bottom-4 left-4 right-4 z-[30] max-w-md mx-auto">
            <div className="bg-card border border-border shadow-lg rounded-lg">
              <div className="p-4">
                <JobSearch onSearch={handleSearch} />
              </div>
            </div>
          </div>
        </div>
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
    </>
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
        <h1 className="text-2xl font-bold tracking-tight">My Jobs</h1>
        <Button onClick={() => setIsJobDrawerOpen(true)}>
          Post a Job
        </Button>
      </div>

      {/* When no jobs exist */}
      {!jobs || jobs.length === 0 ? (
        <Card className="w-full text-center py-8">
          <CardContent>
            <div className="mx-auto w-16 h-16 rounded-full bg-muted text-muted-foreground flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="18" x2="12" y2="12"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">No Jobs Posted Yet</h3>
            <p className="text-muted-foreground mb-6">Start by posting your first job to find workers.</p>
            <Button onClick={() => setIsJobDrawerOpen(true)}>Post Your First Job</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className="mb-4 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{job.title}</CardTitle>
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    job.status === 'open' ? 'bg-emerald-600 text-white' : 
                    job.status === 'assigned' ? 'bg-emerald-700 text-white' : 
                    job.status === 'completed' ? 'bg-emerald-800 text-white' :
                    'bg-emerald-600 text-white'
                  }`}>
                    {job.status ? job.status.charAt(0).toUpperCase() + job.status.slice(1) : 'Open'}
                  </span>
                  {job.paymentAmount && (
                    <span className="text-sm">
                      ${job.paymentAmount} {job.paymentType === 'hourly' ? '/hr' : ''}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {job.description}
                </p>
                <div className="mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mr-2"
                    onClick={() => {
                      // Use the new JobDetailsCard instead
                      window.dispatchEvent(new CustomEvent('open-job-details', { 
                        detail: { jobId: job.id }
                      }));
                    }}
                  >
                    Manage
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      // Code for cancelling or removing job would go here
                    }}
                  >
                    Cancel Job
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'worker' | 'poster'>('worker');
  const [showPostedJobs, setShowPostedJobs] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  // showJobDetails and selectedJob removed - using unified JobDetailsCard modal
  const [showEditJob, setShowEditJob] = useState(false);
  const [jobToEdit, setJobToEdit] = useState<Job | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Initialize the comprehensive connection system
  const {
    isConnected,
    connectionStatus,
    notifications,
    unreadCount,
    jobLifecycle,
    paymentFlow,
    joinJobRoom,
    leaveJobRoom,
    handleJobCreated,
    handleJobCompleted
  } = useAppConnections();
  
  // Check for wallet query parameter and auto-open wallet drawer
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldOpenWallet = urlParams.get('wallet') === 'true';
    
    if (shouldOpenWallet) {
      // Clear the query parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Open the wallet drawer after a short delay to ensure components are mounted
      setTimeout(() => {
        // First, find and click a UserDrawerV2 trigger to open the drawer
        const drawerTrigger = document.querySelector('.user-drawer-trigger');
        if (drawerTrigger) {
          (drawerTrigger as HTMLElement).click();
          
          // Then switch to wallet tab after drawer is open
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('switch-user-drawer-tab', { detail: 'wallet' }));
          }, 300);
        }
      }, 500);
    }
  }, []);
  
  // Check for wallet query parameter and auto-open wallet drawer
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldOpenWallet = urlParams.get('wallet') === 'true';
    
    if (shouldOpenWallet) {
      // Clear the query parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Open the wallet drawer after a short delay to ensure components are mounted
      setTimeout(() => {
        // First, find and click a UserDrawerV2 trigger to open the drawer
        const drawerTrigger = document.querySelector('.user-drawer-trigger');
        if (drawerTrigger) {
          (drawerTrigger as HTMLElement).click();
          
          // Then switch to wallet tab after drawer is open
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('switch-user-drawer-tab', { detail: 'wallet' }));
          }, 300);
        }
      }, 500);
    }
  }, []);
  
  // Get jobs posted by this user with enhanced security and real-time updates
  const { data: postedJobs, isLoading: postedJobsLoading, refetch: refetchPostedJobs } = useQuery({
    queryKey: ['/api/jobs/my-posted-jobs', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.warn('No user ID available for fetching posted jobs');
        return [];
      }

      try {
        const response = await apiRequest('GET', `/api/jobs?posterId=${user.id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch posted jobs: ${response.status}`);
        }
        const jobs = await response.json();

        // Client-side security check - ensure all jobs belong to current user
        const userJobs = jobs.filter((job: Job) => job.posterId === user.id);
        if (userJobs.length !== jobs.length) {
          console.error('Security warning: Server returned jobs not belonging to current user');
        }

        return userJobs;
      } catch (error) {
        console.error('Error fetching posted jobs:', error);
        throw error;
      }
    },
    enabled: !!user?.id, // Only fetch when user is authenticated
    refetchInterval: showPostedJobs ? 5000 : false, // Poll every 5 seconds when drawer is open
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Delete job mutation
  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const response = await apiRequest('DELETE', `/api/jobs/${jobId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete job');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Job Deleted",
        description: "Your job has been deleted successfully",
      });
      // Refresh the posted jobs list
      refetchPostedJobs();
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const togglePostedJobs = () => {
    setShowPostedJobs(!showPostedJobs);
  };
  
  const toggleMessaging = () => {
    setShowMessaging(!showMessaging);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        selectedRole={selectedRole}
        onRoleChange={setSelectedRole}
        onTogglePostedJobs={togglePostedJobs}
        onToggleMessaging={toggleMessaging}
        postedJobsCount={postedJobs?.length || 0}
      />

      <main className="flex-1 container max-w-7xl mx-auto px-2 sm:px-4">
        {selectedRole === 'worker' ? (
          <WorkerDashboard />
        ) : (
          <PosterDashboard />
        )}
      </main>

      {/* Job Details Dialog removed - using unified JobDetailsCard modal */}

      {/* Only show mobile nav when not in worker map view to avoid cluttering the map interface */}
      {!(selectedRole === 'worker') && (
        <MobileNav 
          selectedTab={selectedRole} 
          onTabChange={(tab: any) => {
            if (tab === 'worker' || tab === 'poster') {
              setSelectedRole(tab);
            }
          }} 
        />
      )}
      
      {/* Messaging Drawer */}
      <MessagingDrawer
        open={showMessaging}
        onOpenChange={setShowMessaging}
      />

      {/* Edit Job Modal */}
      <EditJobModal
        job={jobToEdit}
        open={showEditJob}
        onOpenChange={(open) => {
          setShowEditJob(open);
          if (!open) {
            setJobToEdit(null);
          }
        }}
      />

      {/* Posted Jobs Drawer */}
      {showPostedJobs && user && (
        <div className="fixed top-0 right-0 h-full w-80 bg-background/95 backdrop-blur-xl shadow-2xl z-50 transform transition-transform duration-300 animate-in slide-in-from-right border-l border-border/50">
          {/* Close button with modern design */}
          <button
            onClick={togglePostedJobs}
            className="absolute -left-12 top-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg rounded-full w-10 h-10 flex items-center justify-center transform transition-all hover:scale-105 active:scale-95 p-0"
            aria-label="Close posted jobs panel"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Modern header with gradient and icons */}
          <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-4 border-b border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-foreground/20 rounded-lg backdrop-blur-sm">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">My Posted Jobs</h3>
                  <p className="text-primary-foreground/80 text-sm">
                    {postedJobs?.length || 0} job{(postedJobs?.length || 0) !== 1 ? 's' : ''} posted
                  </p>
                </div>
              </div>
              {postedJobsLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground"></div>
              )}
            </div>
          </div>
          
          {/* Jobs list */}
          <div className="overflow-y-auto h-[calc(100%-4rem)]">
            {postedJobsLoading ? (
              <div className="flex flex-col items-center justify-center h-64 px-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/30 border-t-primary mb-4"></div>
                <p className="text-muted-foreground">Loading your posted jobs...</p>
              </div>
            ) : postedJobs && postedJobs.length > 0 ? (
              <div className="divide-y divide-border">
                {postedJobs.map((job: Job) => (
                  <div
                    key={job.id}
                    className="p-4 hover:bg-accent/50 transition-colors border-l-4 border-l-transparent hover:border-l-primary/50"
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          // Use unified JobDetailsCard modal directly
                          window.dispatchEvent(new CustomEvent('open-job-details', {
                            detail: { jobId: job.id }
                          }));
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-foreground line-clamp-2">{job.title}</h4>
                          <Badge
                            variant={
                              job.status === 'open' ? 'default' :
                              job.status === 'in_progress' ? 'secondary' :
                              job.status === 'completed' ? 'outline' : 'destructive'
                            }
                            className="ml-2 shrink-0"
                          >
                            {job.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {job.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${job.paymentAmount?.toFixed(2) || '0.00'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Posted {job.datePosted ? new Date(job.datePosted).toLocaleDateString() : 'Recently'}
                            </span>
                            {job.dateNeeded && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Due {new Date(job.dateNeeded).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-3">
                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-950"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Use unified JobDetailsCard modal directly
                              window.dispatchEvent(new CustomEvent('open-job-details', {
                                detail: { jobId: job.id }
                              }));
                            }}
                            title="View job details"
                          >
                            <ExternalLink className="h-3 w-3 text-blue-600" />
                          </Button>

                          {job.status === 'open' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-green-50 dark:hover:bg-green-950"
                              onClick={(e) => {
                                e.stopPropagation();
                                setJobToEdit(job);
                                setShowEditJob(true);
                              }}
                              title="Edit job"
                            >
                              <Edit className="h-3 w-3 text-green-600" />
                            </Button>
                          )}

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                disabled={deleteJobMutation.isPending}
                                onClick={(e) => e.stopPropagation()}
                                title="Delete job"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Job</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{job.title}"? This action cannot be undone.
                                  {job.status !== 'open' && ' Note: This job has applications or is in progress.'}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteJobMutation.mutate(job.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={deleteJobMutation.isPending}
                                >
                                  {deleteJobMutation.isPending ? 'Deleting...' : 'Delete'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 px-8 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mb-6 shadow-lg">
                  <Briefcase className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">No Jobs Posted Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm leading-relaxed">
                  Ready to find skilled workers? Create your first job listing and connect with talented professionals in your area.
                </p>
                <div className="space-y-3">
                  <Button
                    className="bg-primary hover:bg-primary/90 shadow-md transition-all hover:scale-105"
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
                    <Briefcase className="h-4 w-4 mr-2" />
                    Post Your First Job
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    It only takes a few minutes to get started
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}