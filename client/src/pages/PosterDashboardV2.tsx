import React, { useState, useEffect, useMemo } from 'react';
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
  Trash2,
  LogOut,
  Bell,
  Activity
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

// Default stats to prevent undefined access
const defaultStats: PosterStats = {
  totalJobs: 0,
  activeJobs: 0,
  completedJobs: 0,
  totalSpent: 0,
  pendingApplications: 0,
  averageRating: 0,
  totalApplications: 0,
  hiredWorkers: 0,
};

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
  const { user, logoutMutation } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [showJobWizard, setShowJobWizard] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobFilter, setJobFilter] = useState<'all' | 'open' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Add real-time notifications for new applications
  const [lastApplicationCount, setLastApplicationCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + R for refresh
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        handleRefresh();
      }
      // Ctrl/Cmd + N for new job
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        setShowJobWizard(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle sign out with proper navigation
  const handleSignOut = async () => {
    try {
      await logoutMutation.mutateAsync();
      // Clear any local state
      queryClient.clear();
      // Navigate to home page
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
      // Force navigation even if logout fails
      window.location.href = '/';
    }
  };

  // Fetch poster's jobs with better error handling
  const { 
    data: jobs = [], 
    isLoading: jobsLoading, 
    error: jobsError,
    refetch: refetchJobs 
  } = useQuery({
    queryKey: ['/api/jobs', { posterId: user?.id }],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      try {
        const response = await apiRequest('GET', `/api/jobs?posterId=${user.id}`);
        // Handle both direct array response and paginated response
        if (Array.isArray(response)) {
          return response;
        } else if (response && response.results && Array.isArray(response.results)) {
          return response.results;
        } else {
          return [];
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
        toast({
          title: 'Error Loading Jobs',
          description: 'Failed to load your jobs. Please try refreshing.',
          variant: 'destructive',
        });
        return [];
      }
    },
    enabled: !!user && user.accountType === 'poster',
    refetchInterval: 30000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch applications for poster's jobs with better error handling
  const { 
    data: applications = [], 
    isLoading: applicationsLoading,
    error: applicationsError,
    refetch: refetchApplications 
  } = useQuery({
    queryKey: ['/api/applications/poster', user?.id],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/applications/poster`);
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error('Error fetching applications:', error);
        toast({
          title: 'Error Loading Applications',
          description: 'Failed to load applications. Please try refreshing.',
          variant: 'destructive',
        });
        return [];
      }
    },
    enabled: !!user && user.accountType === 'poster',
    refetchInterval: 15000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const deleteJobMutation = useMutation({
    mutationFn: (jobId: number) => apiRequest('DELETE', `/api/jobs/${jobId}`),
    onSuccess: () => {
      toast({ 
        title: 'Job Deleted', 
        description: 'The job has been successfully deleted and removed from the platform.' 
      });
      refetchJobs();
      setIsDeleteDialogOpen(false);
      setJobToDelete(null);
    },
    onError: (error: Error) => {
      console.error('Delete job error:', error);
      toast({
        title: 'Error Deleting Job',
        description: error.message || 'Failed to delete the job. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchJobs(),
        refetchApplications()
      ]);
      toast({
        title: 'Data Refreshed',
        description: 'Your dashboard data has been updated.',
      });
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Update last updated time when data refreshes (moved after useQuery declarations)
  useEffect(() => {
    if (!jobsLoading && !applicationsLoading) {
      setLastUpdated(new Date());
    }
  }, [jobsLoading, applicationsLoading]);

  // Real-time notifications for new applications (moved after useQuery declarations)
  useEffect(() => {
    const currentApplicationCount = applications?.length || 0;
    const previousCount = lastApplicationCount || 0;
    
    if (currentApplicationCount > previousCount && previousCount > 0) {
      setShowNotification(true);
      const newApplicationsCount = currentApplicationCount - previousCount;
      toast({
        title: 'New Application Received!',
        description: `You have ${newApplicationsCount} new application(s) to review.`,
        action: (
          <Button size="sm" onClick={() => setActiveTab('applications')}>
            View
          </Button>
        ),
      });
      setTimeout(() => setShowNotification(false), 5000);
    }
    setLastApplicationCount(currentApplicationCount);
  }, [applications?.length, lastApplicationCount, setActiveTab]);

  // Calculate dashboard stats with safe defaults
  const stats: PosterStats = useMemo(() => {
    // Return default stats if data is not available
    if (!jobs && !applications) {
      return defaultStats;
    }
    
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
  const filteredJobs = useMemo(() => {
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
    
    const jobTitle = newOrUpdatedJob?.title || 'Untitled Job';
    toast({
      title: selectedJob ? 'Job Updated' : 'Job Posted Successfully',
      description: selectedJob 
        ? `"${jobTitle}" has been updated.`
        : `"${jobTitle}" is now live and accepting applications.`,
    });
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
                  Fixer Dashboard
                </h1>
                <div className="flex items-center gap-4">
                  <p className="text-muted-foreground">
                    Manage your jobs and find the perfect workers
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Activity className="h-3 w-3 text-green-500" />
                    <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
              <AccountTypeSwitcher />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Refresh dashboard data (Ctrl+R)"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              
              {/* Notification Bell */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('applications')}
                className="relative"
                title={`${stats?.pendingApplications || 0} pending applications`}
              >
                <Bell className="h-4 w-4" />
                {(stats?.pendingApplications || 0) > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {(stats?.pendingApplications || 0) > 9 ? '9+' : (stats?.pendingApplications || 0)}
                  </Badge>
                )}
              </Button>
              
              <Button 
                onClick={() => setShowJobWizard(true)}
                title="Create a new job posting (Ctrl+N)"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Post New Job
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                disabled={logoutMutation.isPending}
                className="flex items-center gap-2"
                title="Sign out of your account"
              >
                {logoutMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Signing Out...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </>
                )}
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
              {(stats?.activeJobs || 0) > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {stats?.activeJobs || 0}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="applications">
              Applications
              {(stats?.pendingApplications || 0) > 0 && (
                <Badge variant="default" className="ml-2">
                  {stats?.pendingApplications || 0}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {(jobsError || applicationsError) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {jobsError && "Failed to load jobs. "}
                  {applicationsError && "Failed to load applications. "}
                  Please try refreshing the page.
                </AlertDescription>
              </Alert>
            )}

            {(stats?.totalJobs || 0) === 0 && !jobsLoading ? (
              <Alert>
                <Star className="h-4 w-4" />
                <AlertDescription>
                  Welcome to Fixer! 🎉 You're all set to start posting jobs and finding skilled workers. 
                  Click "Post New Job" to get started, or explore the platform to see how it works.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Welcome back! You have {stats?.activeJobs || 0} active jobs and {stats?.pendingApplications || 0} pending applications to review.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Jobs Posted</CardTitle>
                  <PlusCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {jobsLoading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{stats?.totalJobs || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats?.activeJobs || 0} currently active
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {applicationsLoading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{stats?.totalApplications || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats?.pendingApplications || 0} pending review
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {jobsLoading ? (
                    <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">${(stats?.totalSpent || 0).toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">
                        Across {stats?.completedJobs || 0} completed jobs
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {applicationsLoading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold flex items-center gap-1">
                        {stats?.averageRating || 0}
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        From {stats?.hiredWorkers || 0} hired workers
                      </p>
                    </>
                  )}
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
                        <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
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
                          <div key={application.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
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
                          View All Applications ({(stats?.pendingApplications || 0)})
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                    onClick={() => setShowJobWizard(true)}
                  >
                    <PlusCircle className="h-6 w-6" />
                    <span className="text-sm">Post New Job</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                    onClick={() => setActiveTab('applications')}
                  >
                    <Users className="h-6 w-6" />
                    <span className="text-sm">Review Applications</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                    onClick={() => setActiveTab('analytics')}
                  >
                    <BarChart3 className="h-6 w-6" />
                    <span className="text-sm">View Analytics</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
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
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Briefcase className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || jobFilter !== 'all'
                    ? 'Try adjusting your search or filters.'
                    : "You haven't posted any jobs yet. Get started by posting your first job!"}
                </p>
                {(!searchQuery && jobFilter === 'all') && (
                  <Button onClick={() => setShowJobWizard(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Post Your First Job
                  </Button>
                )}
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
            <PosterAnalytics />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <PosterSettings />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer with shortcuts and info */}
      <div className="border-t bg-muted/30 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-6">
              <span>Keyboard shortcuts:</span>
              <span><kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+N</kbd> New Job</span>
              <span><kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+R</kbd> Refresh</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Need help? Contact support</span>
              <Button variant="ghost" size="sm">
                Help
              </Button>
            </div>
          </div>
        </div>
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
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Delete Job Confirmation
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>Are you sure you want to delete this job?</p>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">"{jobToDelete?.title}"</p>
                <p className="text-sm text-muted-foreground">
                  {jobToDelete?.location} • ${jobToDelete?.paymentAmount}
                </p>
              </div>
              <p className="text-sm text-destructive">
                This action cannot be undone. The job will be permanently removed from the platform
                and all associated applications will be cancelled.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteJobMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteJob} 
              disabled={deleteJobMutation.isPending}
              className="flex items-center gap-2"
            >
              {deleteJobMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Job
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedJob?.title}</span>
              <Badge variant={getStatusColor(selectedJob?.status || '')}>
                {getStatusText(selectedJob?.status || '')}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-6 py-4">
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedJob.description}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </h4>
                  <p>{selectedJob.location}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Payment
                  </h4>
                  <p>${selectedJob.paymentAmount} ({selectedJob.paymentType})</p>
                </div>
                {selectedJob.dateNeeded && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date Needed
                    </h4>
                    <p>{new Date(selectedJob.dateNeeded).toLocaleDateString()}</p>
                  </div>
                )}
                <div>
                  <h4 className="font-semibold mb-2">Category</h4>
                  <p>{selectedJob.category}</p>
                </div>
                {selectedJob.estimatedHours && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Estimated Hours
                    </h4>
                    <p>{selectedJob.estimatedHours} hours</p>
                  </div>
                )}
                <div>
                  <h4 className="font-semibold mb-2">Equipment Provided</h4>
                  <p>{selectedJob.equipmentProvided ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {(selectedJob.shiftStartTime || selectedJob.shiftEndTime) && (
                <div>
                  <h4 className="font-semibold mb-2">Shift Times</h4>
                  <p>
                    {selectedJob.shiftStartTime} - {selectedJob.shiftEndTime}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Posted: {selectedJob.datePosted ? new Date(selectedJob.datePosted).toLocaleDateString() : 'N/A'}
                </div>
                <div className="flex gap-2">
                  {selectedJob.status === 'open' && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsViewDialogOpen(false);
                        handleEditJob(selectedJob);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Job
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    onClick={() => setActiveTab('applications')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    View Applications
                  </Button>
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