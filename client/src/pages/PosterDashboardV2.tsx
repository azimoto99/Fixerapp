import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  PlusCircle, 
  Users, 
  DollarSign, 
  Clock, 
  MapPin,
  Eye,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  Star,
  Settings,
  UserPlus,
  Briefcase,
  BarChart3,
  Filter,
  Search,
  RefreshCw,
  Edit,
  Trash2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Job } from '@/types';
import AccountTypeSwitcher from '@/components/AccountTypeSwitcher';
import JobPostingWizard from '@/components/jobs/JobPostingWizard';
import ApplicationsManager from '@/components/applications/ApplicationsManager';
import PosterAnalytics from '@/components/analytics/PosterAnalytics';
import JobManagementCard from '@/components/jobs/JobManagementCard';
import PosterSettings from '@/components/settings/PosterSettings';
import { toast } from '@/components/ui/use-toast';

interface PosterStats {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  totalSpent: number;
  pendingApplications: number;
  averageRating: number;
  totalApplications: number;
  hiredWorkers: number;
}

interface Application {
  id: number;
  jobId: number;
  workerId: number;
  workerName: string;
  workerRating: number;
  status: string;
  dateApplied: string;
  hourlyRate?: number;
  message?: string;
  job: {
    id: number;
    title: string;
    paymentAmount: number;
  };
}

export default function PosterDashboardV2() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [showJobWizard, setShowJobWizard] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobFilter, setJobFilter] = useState<'all' | 'open' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Fetch poster's jobs
  const { 
    data: jobs = [], 
    isLoading: jobsLoading, 
    refetch: refetchJobs 
  } = useQuery({
    queryKey: ['/api/jobs', { posterId: user?.id }],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/jobs?posterId=${user?.id}`);
      return Array.isArray(response) ? response : [];
    },
    enabled: !!user && user.accountType === 'poster',
    refetchInterval: 30000,
  });

  // Fetch applications for poster's jobs
  const { 
    data: applications = [], 
    isLoading: applicationsLoading,
    refetch: refetchApplications 
  } = useQuery({
    queryKey: ['/api/applications/poster', user?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/applications/poster`);
      return Array.isArray(response) ? response : [];
    },
    enabled: !!user && user.accountType === 'poster',
    refetchInterval: 15000,
  });

  const deleteJobMutation = useMutation({
    mutationFn: (jobId: number) => apiRequest('DELETE', `/api/jobs/${jobId}`),
    onSuccess: () => {
      toast({ title: 'Job Deleted', description: 'The job has been successfully deleted.' });
      refetchJobs();
      setIsDeleteDialogOpen(false);
      setJobToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Deleting Job',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });

  // Calculate dashboard stats
  const stats: PosterStats = React.useMemo(() => {
    const jobsArray = Array.isArray(jobs) ? jobs : [];
    const applicationsArray = Array.isArray(applications) ? applications : [];
    
    const totalJobs = jobsArray.length;
    const activeJobs = jobsArray.filter((job: Job) => job.status === 'open').length;
    const completedJobs = jobsArray.filter((job: Job) => job.status === 'completed').length;
    const totalSpent = jobsArray.reduce((sum: number, job: Job) => sum + (job.paymentAmount || 0), 0);
    const pendingApplications = applicationsArray.filter((app: Application) => app.status === 'pending').length;
    const totalApplications = applicationsArray.length;
    const hiredWorkers = applicationsArray.filter((app: Application) => app.status === 'accepted').length;
    
    const averageRating = 4.2;

    return {
      totalJobs,
      activeJobs,
      completedJobs,
      totalSpent,
      pendingApplications,
      averageRating,
      totalApplications,
      hiredWorkers
    };
  }, [jobs, applications]);

  // Filter jobs based on current filter and search
  const filteredJobs = React.useMemo(() => {
    const jobsArray = Array.isArray(jobs) ? jobs : [];
    let filtered = jobsArray;
    
    if (jobFilter !== 'all') {
      filtered = filtered.filter((job: Job) => job.status === jobFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((job: Job) => 
        (job.title || '').toLowerCase().includes(query) ||
        (job.description || '').toLowerCase().includes(query) ||
        (job.location || '').toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [jobs, jobFilter, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'default';
      case 'in_progress': return 'secondary';
      case 'completed': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Open';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const handleJobCreated = (newOrUpdatedJob: Job) => {
    setShowJobWizard(false);
    setSelectedJob(null);
    refetchJobs();
    setActiveTab('jobs');
  };

  const handleApplicationUpdate = () => {
    refetchApplications();
    refetchJobs();
  };

  const handleViewJob = (job: Job) => {
    setSelectedJob(job);
    setIsViewDialogOpen(true);
  };

  const handleEditJob = (job: Job) => {
    setSelectedJob(job);
    setShowJobWizard(true);
  };

  const handleDeleteJob = (job: Job) => {
    setJobToDelete(job);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteJob = () => {
    if (jobToDelete) {
      deleteJobMutation.mutate(jobToDelete.id);
    }
  };

  if (!user || user.accountType !== 'poster') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">This dashboard is only available for job posters.</p>
          <AccountTypeSwitcher className="mt-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Briefcase className="h-6 w-6" />
                  Job Poster Dashboard
                </h1>
                <p className="text-muted-foreground">
                  Manage your jobs and find the perfect workers
                </p>
              </div>
              <AccountTypeSwitcher />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchJobs();
                  refetchApplications();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => setShowJobWizard(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Post New Job
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="jobs">
              My Jobs
              {stats.activeJobs > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {stats.activeJobs}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="applications">
              Applications
              {stats.pendingApplications > 0 && (
                <Badge variant="default" className="ml-2">
                  {stats.pendingApplications}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Welcome to your poster dashboard! You have {stats.activeJobs} active jobs and {stats.pendingApplications} pending applications to review.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Jobs Posted</CardTitle>
                  <PlusCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalJobs}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeJobs} currently active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalApplications}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.pendingApplications} pending review
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.totalSpent.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Across {stats.completedJobs} completed jobs
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-center gap-1">
                    {stats.averageRating}
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From {stats.hiredWorkers} hired workers
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Jobs
                  </CardTitle>
                  <CardDescription>Your most recently posted jobs</CardDescription>
                </CardHeader>
                <CardContent>
                  {jobsLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : (Array.isArray(jobs) ? jobs : []).length === 0 ? (
                    <div className="text-center py-8">
                      <PlusCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No jobs posted yet</p>
                      <Button onClick={() => setShowJobWizard(true)}>
                        Post Your First Job
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(Array.isArray(jobs) ? jobs : []).slice(0, 3).map((job: Job) => (
                        <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{job.title}</h4>
                              <Badge variant={getStatusColor(job.status)} className="text-xs">
                                {getStatusText(job.status)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>${job.paymentAmount}</span>
                              <span>•</span>
                              <span>{job.location}</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleViewJob(job)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {(Array.isArray(jobs) ? jobs : []).length > 3 && (
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          onClick={() => setActiveTab('jobs')}
                        >
                          View All Jobs ({(Array.isArray(jobs) ? jobs : []).length})
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Pending Applications
                  </CardTitle>
                  <CardDescription>Applications waiting for your review</CardDescription>
                </CardHeader>
                <CardContent>
                  {applicationsLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : (Array.isArray(applications) ? applications : []).filter((app: Application) => app.status === 'pending').length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No pending applications</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(Array.isArray(applications) ? applications : [])
                        .filter((app: Application) => app.status === 'pending')
                        .slice(0, 3)
                        .map((application: Application) => (
                          <div key={application.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-sm">{application.workerName}</h4>
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs">{application.workerRating}</span>
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Applied to: {application.job.title}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setActiveTab('applications')}>
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      {(Array.isArray(applications) ? applications : []).filter((app: Application) => app.status === 'pending').length > 3 && (
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          onClick={() => setActiveTab('applications')}
                        >
                          View All Applications ({stats.pendingApplications})
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="jobs" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">My Posted Jobs</h2>
              <p className="text-muted-foreground">Manage all your job postings</p>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, description, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Tabs defaultValue="all" onValueChange={(value) => setJobFilter(value as any)} className="w-auto">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="open">Open</TabsTrigger>
                  <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {jobsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader><div className="h-6 w-3/4 bg-muted animate-pulse rounded" /></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="h-4 w-full bg-muted animate-pulse rounded" />
                      <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                      <div className="h-8 w-1/2 bg-muted animate-pulse rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">No jobs found</h3>
                <p>
                  {searchQuery || jobFilter !== 'all'
                    ? 'Try adjusting your search or filters.'
                    : "You haven't posted any jobs yet."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredJobs.map((job) => (
                  <JobManagementCard
                    key={job.id}
                    job={job}
                    onView={handleViewJob}
                    onEdit={handleEditJob}
                    onDelete={handleDeleteJob}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="applications" className="space-y-6">
            <ApplicationsManager 
              applications={Array.isArray(applications) ? applications : []}
              isLoading={applicationsLoading}
              onApplicationUpdate={handleApplicationUpdate}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <PosterAnalytics 
              jobs={Array.isArray(jobs) ? jobs : []}
              applications={Array.isArray(applications) ? applications : []}
              stats={stats}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <PosterSettings />
          </TabsContent>
        </Tabs>
      </div>

      <JobPostingWizard
        isOpen={showJobWizard}
        onClose={() => {
          setShowJobWizard(false);
          setSelectedJob(null);
        }}
        onJobCreated={handleJobCreated}
        jobToEdit={selectedJob}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to delete this job?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              "{jobToDelete?.title}" job and remove it from our servers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteJob} disabled={deleteJobMutation.isPending}>
              {deleteJobMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedJob?.title}</DialogTitle>
            <DialogDescription>
              <Badge variant={getStatusColor(selectedJob?.status || '')}>
                {getStatusText(selectedJob?.status || '')}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">{selectedJob.description}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Location</h4>
                  <p>{selectedJob.location}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Payment</h4>
                  <p>${selectedJob.paymentAmount} ({selectedJob.paymentType})</p>
                </div>
                {selectedJob.dateNeeded && (
                  <div>
                    <h4 className="font-semibold">Date Needed</h4>
                    <p>{new Date(selectedJob.dateNeeded).toLocaleDateString()}</p>
                  </div>
                )}
                <div>
                  <h4 className="font-semibold">Category</h4>
                  <p>{selectedJob.category}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}