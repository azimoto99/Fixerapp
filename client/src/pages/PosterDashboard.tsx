import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  PlusCircle, 
  Users, 
  DollarSign, 
  Clock, 
  MapPin,
  Eye,
  MessageSquare,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import MapSection from '@/components/MapSection';
import { NewJobButton } from '@/components/NewJobButton';

interface Job {
  id: number;
  title: string;
  status: string;
  paymentAmount: number;
  location: string;
  dateNeeded: string;
  applicationCount?: number;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
}

interface Application {
  id: number;
  jobId: number;
  workerId: number;
  workerName: string;
  status: string;
  dateApplied: string;
  hourlyRate?: number;
  message?: string;
}

export default function PosterDashboard() {
  const { user } = useAuth();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch poster's jobs
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['/api/jobs/posted'],
    enabled: !!user && user.accountType === 'poster',
  });

  // Fetch applications for poster's jobs
  const { data: applications = [], isLoading: applicationsLoading } = useQuery({
    queryKey: ['/api/applications/poster'],
    enabled: !!user && user.accountType === 'poster',
  });

  // Calculate dashboard stats
  const stats = {
    totalJobs: jobs.length,
    activeJobs: jobs.filter((job: Job) => job.status === 'open').length,
    completedJobs: jobs.filter((job: Job) => job.status === 'completed').length,
    totalSpent: jobs.reduce((sum: number, job: Job) => sum + job.paymentAmount, 0),
    pendingApplications: applications.filter((app: Application) => app.status === 'pending').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-purple-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
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

  if (!user || user.accountType !== 'poster') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">This dashboard is only available for job posters.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Job Poster Dashboard</h1>
              <p className="text-muted-foreground">
                Manage your jobs and find the perfect workers
              </p>
            </div>
            <NewJobButton />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="jobs">My Jobs</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="map">Map View</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                  <PlusCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalJobs}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeJobs}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completedJobs}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.totalSpent.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingApplications}</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Jobs */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Jobs</CardTitle>
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
                    <NewJobButton />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {jobs.slice(0, 5).map((job: Job) => (
                      <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{job.title}</h3>
                            <Badge className={getStatusColor(job.status)}>
                              {getStatusText(job.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {job.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${job.paymentAmount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {job.applicationCount || 0} applications
                            </span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>My Posted Jobs</CardTitle>
                    <CardDescription>Manage all your job postings</CardDescription>
                  </div>
                  <NewJobButton />
                </div>
              </CardHeader>
              <CardContent>
                {jobsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-24 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="text-center py-12">
                    <PlusCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No jobs posted yet</h3>
                    <p className="text-muted-foreground mb-6">Start by posting your first job to find skilled workers</p>
                    <NewJobButton />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {jobs.map((job: Job) => (
                      <div key={job.id} className="border rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-medium">{job.title}</h3>
                              <Badge className={getStatusColor(job.status)}>
                                {getStatusText(job.status)}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground mb-3">{job.description}</p>
                            <div className="flex items-center gap-6 text-sm">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {job.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                ${job.paymentAmount}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {new Date(job.dateNeeded).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {job.applicationCount || 0} applications
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Messages
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Job Applications</CardTitle>
                <CardDescription>Review and manage applications to your jobs</CardDescription>
              </CardHeader>
              <CardContent>
                {applicationsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : applications.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No applications yet</h3>
                    <p className="text-muted-foreground">Applications will appear here when workers apply to your jobs</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.map((application: Application) => (
                      <div key={application.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{application.workerName}</h4>
                              <Badge variant={application.status === 'pending' ? 'secondary' : 'default'}>
                                {application.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Applied on {new Date(application.dateApplied).toLocaleDateString()}
                            </p>
                            {application.hourlyRate && (
                              <p className="text-sm">
                                <span className="font-medium">Proposed rate:</span> ${application.hourlyRate}/hour
                              </p>
                            )}
                            {application.message && (
                              <p className="text-sm mt-2 p-2 bg-muted rounded">
                                "{application.message}"
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm">Accept</Button>
                            <Button variant="outline" size="sm">Decline</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Map Tab */}
          <TabsContent value="map" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Job Locations</CardTitle>
                <CardDescription>View your jobs on the map</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[600px] rounded-lg overflow-hidden">
                  <MapSection 
                    jobs={jobs || []}
                    selectedJob={selectedJob}
                    onSelectJob={setSelectedJob}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}