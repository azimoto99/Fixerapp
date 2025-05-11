import React, { useState, Suspense } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { formatDate } from '@/lib/utils';
import {
  Check,
  X,
  Clock,
  MoreVertical,
  Eye,
  MessageSquare,
  Loader2,
  Search,
  Filter,
  User,
  Briefcase,
  AlertCircle,
  ArrowRight,
  MapPin,
  Calendar,
  Check as CheckIcon,
  XCircle,
} from 'lucide-react';
import WorkerHistory from './WorkerHistory';

interface ApplicationsManagerProps {
  userId: number;
  mode?: 'worker' | 'poster';
  className?: string;
  initialJobId?: number;
  onSelectApplication?: (application: any) => void;
  compact?: boolean;
}

const ApplicationsManager: React.FC<ApplicationsManagerProps> = ({
  userId,
  mode,
  className = '',
  initialJobId,
  onSelectApplication,
  compact = false,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedJobId, setSelectedJobId] = useState<number | null>(initialJobId || null);
  const userMode = mode || (user?.accountType === 'worker' ? 'worker' : 'poster');
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [viewApplicationDetails, setViewApplicationDetails] = useState(false);

  // Fetch worker's applications
  const { data: workerApplications, isLoading: isLoadingWorkerApps } = useQuery({
    queryKey: ['/api/applications/worker', userId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/applications/worker/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch applications');
      return res.json();
    },
    enabled: userMode === 'worker',
  });

  // Fetch poster's job applications 
  const { data: posterApplications, isLoading: isLoadingPosterApps } = useQuery({
    queryKey: ['/api/applications/job', selectedJobId],
    queryFn: async () => {
      if (!selectedJobId) return [];
      const res = await apiRequest('GET', `/api/applications/job/${selectedJobId}`);
      if (!res.ok) throw new Error('Failed to fetch applications for job');
      return res.json();
    },
    enabled: userMode === 'poster' && !!selectedJobId,
  });

  // Fetch poster's jobs
  const { data: posterJobs, isLoading: isLoadingPosterJobs } = useQuery({
    queryKey: ['/api/jobs'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/jobs');
      if (!res.ok) throw new Error('Failed to fetch jobs');
      return res.json();
    },
    enabled: userMode === 'poster',
  });

  // Update application status mutation
  const updateApplicationMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const res = await apiRequest('PATCH', `/api/applications/${id}`, { status });
      if (!res.ok) throw new Error('Failed to update application status');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Application Updated',
        description: 'The application status has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/applications/worker'] });
      queryClient.invalidateQueries({ queryKey: ['/api/applications/job'] });
      if (viewApplicationDetails) {
        setViewApplicationDetails(false);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update application: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Handler for when a job is selected in poster mode
  const handleJobSelect = (jobId: number) => {
    setSelectedJobId(jobId);
  };

  // Handler for viewing application details
  const handleViewApplication = (application: any) => {
    setSelectedApplication(application);
    setViewApplicationDetails(true);
    
    if (onSelectApplication) {
      onSelectApplication(application);
    }
  };

  // Handler for accepting an application
  const handleAcceptApplication = (applicationId: number) => {
    updateApplicationMutation.mutate({ id: applicationId, status: 'accepted' });
  };

  // Handler for rejecting an application
  const handleRejectApplication = (applicationId: number) => {
    updateApplicationMutation.mutate({ id: applicationId, status: 'rejected' });
  };

  // Filter applications based on search and status
  const filteredApplications = () => {
    const applications = userMode === 'worker' ? workerApplications : posterApplications;
    
    if (!applications) return [];
    
    return applications.filter((app: any) => {
      const matchesSearch = 
        searchTerm === '' || 
        (app.job?.title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (app.message?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = 
        statusFilter === 'all' || 
        app.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  };

  // Helper to get application status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'accepted':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-600"><Check className="h-3 w-3" /> Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1"><X className="h-3 w-3" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // If it's compact mode, render a simplified version for embedding
  if (compact) {
    const applications = filteredApplications();
    const isLoading = (userMode === 'worker' && isLoadingWorkerApps) || 
                      (userMode === 'poster' && isLoadingPosterApps);
    
    return (
      <div className={className}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {userMode === 'worker' 
              ? "You haven't applied to any jobs yet"
              : "No applications received for this job yet"}
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((application: any) => (
              <div 
                key={application.id}
                className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => handleViewApplication(application)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-sm">{application.job?.title || 'Job Application'}</h4>
                    <p className="text-xs text-muted-foreground">
                      Applied on {formatDate(application.dateApplied)}
                    </p>
                  </div>
                  {getStatusBadge(application.status)}
                </div>
                {application.message && (
                  <p className="text-sm line-clamp-2 text-muted-foreground">
                    {application.message}
                  </p>
                )}
                <div className="flex justify-end mt-2">
                  <Button variant="ghost" size="sm" className="h-8 gap-1">
                    View Details <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full applications management interface
  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>
            {userMode === 'worker' ? 'Your Job Applications' : 'Job Applications'}
          </CardTitle>
          <CardDescription>
            {userMode === 'worker' 
              ? 'Track and manage your applications for jobs'
              : 'Review and manage applications from workers'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Job selector for poster mode */}
          {userMode === 'poster' && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Select a Job</h3>
              {isLoadingPosterJobs ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading your jobs...
                </div>
              ) : posterJobs && posterJobs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {posterJobs.map((job: any) => (
                    <div 
                      key={job.id}
                      className={`border rounded-md p-3 cursor-pointer hover:bg-muted/50 transition-colors ${selectedJobId === job.id ? 'border-primary bg-primary/5' : ''}`}
                      onClick={() => handleJobSelect(job.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-sm">{job.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            Posted: {formatDate(job.datePosted)}
                          </p>
                        </div>
                        {job.status === 'open' ? (
                          <Badge variant="outline" className="ml-2">Open</Badge>
                        ) : (
                          <Badge className="ml-2">{job.status}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 border rounded-md">
                  <p className="text-muted-foreground">You haven't posted any jobs yet</p>
                </div>
              )}
            </div>
          )}

          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search applications..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={statusFilter === 'all' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setStatusFilter('all')}
                className="h-10"
              >
                All
              </Button>
              <Button 
                variant={statusFilter === 'pending' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setStatusFilter('pending')}
                className="h-10"
              >
                Pending
              </Button>
              <Button 
                variant={statusFilter === 'accepted' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setStatusFilter('accepted')}
                className="h-10"
              >
                Accepted
              </Button>
            </div>
          </div>

          {/* Applications table */}
          {(userMode === 'worker' && isLoadingWorkerApps) || 
           (userMode === 'poster' && (isLoadingPosterApps || !selectedJobId)) ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredApplications().length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">
                      {userMode === 'worker' ? 'Job' : 'Applicant'}
                    </TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-[120px]">Date Applied</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications().map((application: any) => (
                    <TableRow key={application.id}>
                      <TableCell className="font-medium">
                        {userMode === 'worker' ? (
                          <div>
                            <div className="font-medium">{application.job?.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Job #{application.jobId}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium">{application.worker?.username}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              ID: {application.workerId}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {application.message || <span className="text-muted-foreground italic">No message</span>}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(application.dateApplied)}</TableCell>
                      <TableCell>{getStatusBadge(application.status)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleViewApplication(application)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {userMode === 'poster' && application.status === 'pending' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleAcceptApplication(application.id)}
                                disabled={updateApplicationMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleRejectApplication(application.id)}
                                disabled={updateApplicationMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-16 border rounded-md">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                {userMode === 'worker' ? (
                  <Briefcase className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <User className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <h3 className="text-lg font-medium">No applications found</h3>
              <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
                {userMode === 'worker' 
                  ? "You haven't applied to any jobs yet. Browse available jobs and submit applications to get started."
                  : selectedJobId 
                    ? "This job doesn't have any applications yet."
                    : "Select a job to view its applications."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Application Details Dialog */}
      <Dialog open={viewApplicationDetails} onOpenChange={setViewApplicationDetails}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              {userMode === 'worker' 
                ? 'Details of your job application'
                : 'Review applicant details and qualifications'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedApplication && (
            <Tabs defaultValue="details" className="mt-2">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="details">
                  {userMode === 'worker' ? 'Job Details' : 'Application Details'}
                </TabsTrigger>
                <TabsTrigger value="history">
                  {userMode === 'worker' ? 'Application Status' : 'Worker History'}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4 pt-4">
                {/* Job/Applicant info */}
                <div className="space-y-1.5">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {userMode === 'worker' ? 'Job' : 'Applicant'}
                  </h3>
                  <div className="bg-muted/50 p-4 rounded-md">
                    {userMode === 'worker' ? (
                      <div>
                        <div className="font-medium text-lg">{selectedApplication.job?.title}</div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {selectedApplication.job?.category || 'Uncategorized'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {selectedApplication.job?.paymentType === 'hourly' 
                              ? `$${selectedApplication.job?.paymentAmount}/hr` 
                              : `$${selectedApplication.job?.paymentAmount} fixed`}
                          </Badge>
                        </div>
                        <div className="text-sm mt-3">
                          {selectedApplication.job?.description?.substring(0, 200)}
                          {selectedApplication.job?.description?.length > 200 ? '...' : ''}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {selectedApplication.job?.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(selectedApplication.job?.dateNeeded)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <User className="h-8 w-8" />
                          </div>
                          <div>
                            <div className="font-medium text-lg">{selectedApplication.worker?.fullName || selectedApplication.worker?.username}</div>
                            <div className="text-sm text-muted-foreground">
                              Member ID: {selectedApplication.workerId}
                            </div>
                            {selectedApplication.worker?.skills && selectedApplication.worker.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {selectedApplication.worker.skills.map((skill: string, index: number) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Application details */}
                <div className="space-y-1.5">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Application Details
                  </h3>
                  <div className="bg-muted/50 p-4 rounded-md">
                    <div className="flex flex-col space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <div className="text-xs text-muted-foreground">Status</div>
                          <div>{getStatusBadge(selectedApplication.status)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Date Applied</div>
                          <div className="text-sm">{formatDate(selectedApplication.dateApplied)}</div>
                        </div>
                      </div>
                      {selectedApplication.message && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Message from Applicant</div>
                          <div className="text-sm border p-3 rounded-md bg-card">
                            {selectedApplication.message}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Required skills match (for poster view) */}
                {userMode === 'poster' && selectedApplication.job?.requiredSkills && selectedApplication.worker?.skills && (
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Skills Match
                    </h3>
                    <div className="bg-muted/50 p-4 rounded-md">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Required Skills</div>
                          <div className="flex flex-wrap gap-1">
                            {selectedApplication.job.requiredSkills.map((skill: string, index: number) => (
                              <Badge key={index} variant={
                                selectedApplication.worker.skills?.includes(skill) 
                                  ? "default" 
                                  : "outline"
                              } className="text-xs">
                                {skill}
                                {selectedApplication.worker.skills?.includes(skill) && (
                                  <Check className="h-3 w-3 ml-1" />
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Match Rate</div>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const requiredSkills = selectedApplication.job.requiredSkills || [];
                              const workerSkills = selectedApplication.worker.skills || [];
                              const matchCount = requiredSkills.filter(
                                (skill: string) => workerSkills.includes(skill)
                              ).length;
                              const matchRate = requiredSkills.length ? 
                                Math.round((matchCount / requiredSkills.length) * 100) : 0;
                              
                              return (
                                <>
                                  <Progress value={matchRate} className="h-2 flex-1" />
                                  <span className="text-sm font-medium">{matchRate}%</span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Actions section */}
                <div className="pt-3">
                  {userMode === 'poster' && selectedApplication.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1"
                        onClick={() => handleAcceptApplication(selectedApplication.id)}
                        disabled={updateApplicationMutation.isPending}
                      >
                        {updateApplicationMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckIcon className="h-4 w-4 mr-2" />
                            Accept Application
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleRejectApplication(selectedApplication.id)}
                        disabled={updateApplicationMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Decline
                      </Button>
                    </div>
                  )}
                  
                  {userMode === 'worker' && selectedApplication.status === 'accepted' && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                      <div className="flex items-start gap-2">
                        <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-500 mt-0.5" />
                        <div>
                          <div className="font-medium text-green-800 dark:text-green-300">
                            Your application was accepted!
                          </div>
                          <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                            The job poster has accepted your application. You can now view the job details and start working.
                          </p>
                          <Button 
                            variant="outline"
                            size="sm" 
                            className="mt-2"
                            onClick={() => {
                              setViewApplicationDetails(false);
                              // Navigate to job detail page
                              window.location.href = `/jobs/${selectedApplication.jobId}`;
                            }}
                          >
                            <Briefcase className="h-3 w-3 mr-1" />
                            View Job Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {userMode === 'worker' && selectedApplication.status === 'rejected' && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500 mt-0.5" />
                        <div>
                          <div className="font-medium text-red-800 dark:text-red-300">
                            Your application was not accepted
                          </div>
                          <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                            The job poster has declined your application. You can view other available jobs or apply for different positions.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="history" className="pt-4">
                {userMode === 'poster' ? (
                  // Show worker history for job posters to evaluate applicants
                  <WorkerHistory workerId={selectedApplication.workerId} 
                    onHire={() => handleAcceptApplication(selectedApplication.id)} 
                  />
                ) : (
                  // Show application timeline for workers
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Application Timeline</h3>
                    
                    <div className="relative border-l border-muted pl-6 py-2 space-y-6">
                      {/* Application submitted */}
                      <div className="relative">
                        <div className="absolute -left-[25px] h-4 w-4 rounded-full bg-primary"></div>
                        <div className="text-sm font-medium">Application Submitted</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(selectedApplication.dateApplied)}
                        </div>
                        <div className="text-sm mt-1">
                          You submitted your application for this job
                        </div>
                      </div>
                      
                      {/* Application reviewed/pending */}
                      <div className="relative">
                        <div className={`absolute -left-[25px] h-4 w-4 rounded-full ${
                          selectedApplication.status === 'pending' 
                            ? 'bg-yellow-500 animate-pulse' 
                            : 'bg-muted'
                        }`}></div>
                        <div className="text-sm font-medium">Under Review</div>
                        <div className="text-xs text-muted-foreground">
                          {selectedApplication.status === 'pending' 
                            ? 'Current status' 
                            : 'Completed'}
                        </div>
                        <div className="text-sm mt-1">
                          {selectedApplication.status === 'pending'
                            ? 'Your application is being reviewed by the job poster'
                            : 'The job poster has reviewed your application'}
                        </div>
                      </div>
                      
                      {/* Application accepted/rejected */}
                      <div className="relative">
                        <div className={`absolute -left-[25px] h-4 w-4 rounded-full ${
                          selectedApplication.status === 'accepted' 
                            ? 'bg-green-500' 
                            : selectedApplication.status === 'rejected'
                            ? 'bg-red-500'
                            : 'bg-muted-foreground/20'
                        }`}></div>
                        <div className="text-sm font-medium">
                          {selectedApplication.status === 'accepted' 
                            ? 'Application Accepted' 
                            : selectedApplication.status === 'rejected'
                            ? 'Application Declined'
                            : 'Awaiting Decision'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedApplication.status === 'pending' 
                            ? 'Pending' 
                            : 'Final status'}
                        </div>
                        <div className="text-sm mt-1">
                          {selectedApplication.status === 'accepted'
                            ? 'Congratulations! You were selected for this job.'
                            : selectedApplication.status === 'rejected'
                            ? 'Your application was not selected for this position.'
                            : 'The job poster will make a decision soon.'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter className="flex sm:justify-between mt-4">
            <Button variant="outline" onClick={() => setViewApplicationDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplicationsManager;