import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  RefreshCw
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Job } from '@/types';
import AccountTypeSwitcher from '@/components/AccountTypeSwitcher';
import JobPostingWizard from '@/components/jobs/JobPostingWizard';
import ApplicationsManager from '@/components/applications/ApplicationsManager';
import PosterAnalytics from '@/components/analytics/PosterAnalytics';
import JobManagementCard from '@/components/jobs/JobManagementCard';

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
  const [activeTab, setActiveTab] = useState('overview');
  const [showJobWizard, setShowJobWizard] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobFilter, setJobFilter] = useState<'all' | 'open' | 'in_progress' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch poster's jobs
  const { 
    data: jobs = [], 
    isLoading: jobsLoading, 
    refetch: refetchJobs 
  } = useQuery({
    queryKey: ['/api/jobs', { posterId: user?.id }],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/jobs?posterId=${user?.id}`);
      return response || [];
    },
    enabled: !!user && user.accountType === 'poster',
    refetchInterval: 30000, // Refresh every 30 seconds
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
      return response || [];
    },
    enabled: !!user && user.accountType === 'poster',
    refetchInterval: 15000, // Refresh every 15 seconds for applications
  });

  // Calculate dashboard stats
  const stats: PosterStats = React.useMemo(() => {
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter((job: Job) => job.status === 'open').length;
    const completedJobs = jobs.filter((job: Job) => job.status === 'completed').length;
    const totalSpent = jobs.reduce((sum: number, job: Job) => sum + job.paymentAmount, 0);
    const pendingApplications = applications.filter((app: Application) => app.status === 'pending').length;
    const totalApplications = applications.length;
    const hiredWorkers = applications.filter((app: Application) => app.status === 'accepted').length;
    
    // Calculate average rating from completed jobs (placeholder)
    const averageRating = 4.2; // This would come from actual reviews

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
    let filtered = jobs;
    
    if (jobFilter !== 'all') {
      filtered = filtered.filter((job: Job) => job.status === jobFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((job: Job) => 
        job.title.toLowerCase().includes(query) ||
        job.description.toLowerCase().includes(query) ||
        job.location.toLowerCase().includes(query)
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

  // Handle job creation success
  const handleJobCreated = (newJob: Job) => {
    setShowJobWizard(false);
    refetchJobs();
    setActiveTab('jobs');
  };

  // Handle application status update
  const handleApplicationUpdate = () => {
    refetchApplications();
    refetchJobs();
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
      {/* Header */}
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

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Welcome Message */}
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Welcome to your poster dashboard! You have {stats.activeJobs} active jobs and {stats.pendingApplications} pending applications to review.
              </AlertDescription>
            </Alert>

            {/* Stats Cards */}
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

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent Jobs */}
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
                  ) : jobs.length === 0 ? (
                    <div className="text-center py-8">
                      <PlusCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No jobs posted yet</p>
                      <Button onClick={() => setShowJobWizard(true)}>
                        Post Your First Job
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {jobs.slice(0, 3).map((job: Job) => (
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
                          <Button variant="ghost" size="sm">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {jobs.length > 3 && (
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          onClick={() => setActiveTab('jobs')}
                        >
                          View All Jobs ({jobs.length})
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pending Applications */}
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
                  ) : applications.filter((app: Application) => app.status === 'pending').length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No pending applications</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {applications
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
                            <Button variant="ghost" size="sm">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      {applications.filter((app: Application) => app.status === 'pending').length > 3 && (
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

          {/* Jobs Tab - Will be implemented in next part */}
          <TabsContent value="jobs" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">My Posted Jobs</h2>
                <p className="text-muted-foreground">Manage all your job postings</p>
              </div>
              <Button onClick={() => setShowJobWizard(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Post New Job
              </Button>
            </div>
            
            {/* Job filters and search will be added here */}
            <div className="text-center py-12 text-muted-foreground">
              Jobs management interface will be implemented next...
            </div>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6">
            <ApplicationsManager 
              applications={applications}
              isLoading={applicationsLoading}
              onApplicationUpdate={handleApplicationUpdate}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <PosterAnalytics 
              jobs={jobs}
              applications={applications}
              stats={stats}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="text-center py-12 text-muted-foreground">
              Settings interface will be implemented next...
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Job Posting Wizard Modal */}
      <JobPostingWizard
        isOpen={showJobWizard}
        onClose={() => setShowJobWizard(false)}
        onJobCreated={handleJobCreated}
      />
    </div>
  );
}
