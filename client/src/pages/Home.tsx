import * as React from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import JobSearch from '@/components/JobSearch';
import ViewToggle from '@/components/ViewToggle';
import JobListSection from '@/components/JobListSection';
import MapSection from '@/components/MapSection';
import NewJobButton from '@/components/NewJobButton';
import PostJobDrawer from '@/components/PostJobDrawer';
import { MessagingDrawer } from '@/components/MessagingDrawer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";

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
  
  // Keep all custom hook calls after useState hooks
  const { user } = useAuth();
  const { userLocation } = useGeolocation();
  const { jobs, isLoading } = useJobs({
    nearbyOnly: true,
    radiusMiles: 2
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
                      // Navigate to job detail page
                      window.location.href = `/job/${job.id}`;
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
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get jobs posted by this user (if any)
  const { data: postedJobs } = useQuery<Job[]>({
    queryKey: ['/api/jobs', { posterId: user?.id }],
    enabled: !!user?.id
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

      {/* Job Details Dialog */}
      <Dialog open={showJobDetails} onOpenChange={setShowJobDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedJob?.title}</DialogTitle>
            <DialogDescription>
              Posted on {selectedJob?.datePosted ? new Date(selectedJob.datePosted).toLocaleDateString() : 'Unknown date'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Location</h4>
              <p className="text-sm">{selectedJob?.location}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-1">Description</h4>
              <p className="text-sm">{selectedJob?.description}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-1">Payment</h4>
              <p className="text-sm">${selectedJob?.paymentAmount?.toFixed(2)} ({selectedJob?.paymentType})</p>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-1">Status</h4>
              <p className="text-sm capitalize">{selectedJob?.status}</p>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button type="button" variant="secondary">Close</Button>
            </DialogClose>
            <Button 
              type="button" 
              variant="default"
              onClick={() => {
                window.location.href = `/job/${selectedJob?.id}`;
              }}
            >
              View Full Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      
      {/* Posted Jobs Drawer */}
      {showPostedJobs && (
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
          
          <div className="overflow-y-auto h-full pb-32 pt-0">
            {!postedJobs ? (
              <div className="flex justify-center items-center h-32">
                <div className="h-6 w-6 text-primary animate-spin">⟳</div>
              </div>
            ) : postedJobs.length > 0 ? (
              <div className="divide-y divide-border">
                {postedJobs.map(job => (
                  <div key={job.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between mb-1">
                      <h4 className="font-medium truncate flex-1">{job.title}</h4>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${job.status === 'open' ? 'bg-green-100 text-green-800' : job.status === 'assigned' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{job.location}</p>
                    <p className="text-sm line-clamp-2 mb-3">{job.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <span>Posted: {new Date(job.datePosted).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>${job.paymentAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-xs"
                        onClick={() => {
                          // Show job details in a dialog/card instead of navigating
                          setSelectedJob(job);
                          setShowJobDetails(true);
                        }}
                      >
                        Details
                      </Button>
                      <Button 
                        variant="destructive" 
                        className="flex-1 text-xs"
                        onClick={async () => {
                          if (confirm(`Are you sure you want to cancel this job: ${job.title}?`)) {
                            try {
                              const response = await fetch(`/api/jobs/${job.id}`, {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ status: 'cancelled' })
                              });
                              
                              if (response.ok) {
                                toast({
                                  title: "Job Cancelled",
                                  description: "The job has been cancelled successfully",
                                });
                                // Refresh the job list
                                queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
                              } else {
                                toast({
                                  title: "Error",
                                  description: "Failed to cancel the job",
                                  variant: "destructive"
                                });
                              }
                            } catch (error) {
                              console.error("Error cancelling job:", error);
                              toast({
                                title: "Error",
                                description: "Failed to cancel the job",
                                variant: "destructive"
                              });
                            }
                          }
                        }}
                      >
                        Cancel Job
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
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
                  Post a Job
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}