import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import JobDetailsCard from '@/components/JobDetailsCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Job } from '@/types';

// Define Task interface
interface Task {
  id: number;
  description: string;
  isCompleted: boolean;
  isOptional: boolean;
  position: number;
  location?: string;
  completedBy?: number;
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MapPin,
  Calendar,
  Clock,
  User,
  Users,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Clipboard,
  ClipboardCheck,
  AlertCircle,
  CalendarDays,
} from 'lucide-react';
import { format } from 'date-fns';

export default function JobManage() {
  const { id } = useParams<{ id: string }>();
  const jobId = parseInt(id);
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Fetch job details
  const { data: job, isLoading: isJobLoading } = useQuery({
    queryKey: ['/api/jobs', jobId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }
      return response.json();
    },
    enabled: !!jobId,
  });

  // Fetch applications for this job
  const { data: applications = [], isLoading: isAppsLoading } = useQuery({
    queryKey: ['/api/jobs', jobId, 'applications'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/jobs/${jobId}/applications`);
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    enabled: !!jobId,
  });

  // Fetch tasks for this job
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['/api/jobs', jobId, 'tasks'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/jobs/${jobId}/tasks`);
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    enabled: !!jobId,
  });

  // Mutation to assign job to worker
  const assignJobMutation = useMutation({
    mutationFn: async () => {
      if (!selectedApplicant) return;
      
      const response = await apiRequest('PATCH', `/api/jobs/${jobId}/assign`, {
        workerId: selectedApplicant.workerId,
        status: 'assigned'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign worker');
      }
      
      // Also update the application status
      const appResponse = await apiRequest('PATCH', `/api/applications/${selectedApplicant.id}`, {
        status: 'accepted'
      });
      
      if (!appResponse.ok) {
        console.error('Failed to update application status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Worker Assigned',
        description: 'The selected worker has been assigned to this job',
      });
      setShowAssignDialog(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId, 'applications'] });
      
      // Create notification for the worker
      if (selectedApplicant) {
        createNotification({
          userId: selectedApplicant.workerId,
          title: 'Job Assignment',
          message: `You have been assigned to the job: ${job?.title}`,
          type: 'job_assigned',
          sourceId: jobId,
          sourceType: 'job'
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Assignment Failed',
        description: error.message || 'Failed to assign worker',
      });
    }
  });

  // Mutation to cancel job
  const cancelJobMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', `/api/jobs/${jobId}`, {
        status: 'canceled',
        cancellationReason: cancelReason
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel job');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Job Canceled',
        description: 'This job has been canceled',
      });
      setShowCancelDialog(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId] });
      
      // Notify assigned worker if there is one
      if (job?.workerId) {
        createNotification({
          userId: job.workerId,
          title: 'Job Canceled',
          message: `The job "${job.title}" has been canceled by the poster`,
          type: 'job_canceled',
          sourceId: jobId,
          sourceType: 'job'
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Cancellation Failed',
        description: error.message || 'Failed to cancel job',
      });
    }
  });

  // Helper function to create a notification
  const createNotification = async (notificationData: any) => {
    try {
      const response = await apiRequest('POST', '/api/notifications', notificationData);
      if (!response.ok) {
        console.error('Failed to create notification');
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Check if the user is the job poster
  const isJobPoster = user?.id === job?.posterId;

  // Redirect if not the job poster
  useEffect(() => {
    if (!isJobLoading && job && !isJobPoster) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You do not have permission to manage this job',
      });
      navigate('/jobs');
    }
  }, [job, isJobPoster, isJobLoading, navigate, toast]);

  // Helper for job status badge
  const getStatusBadge = (status: string) => {
    let variant = 'default';
    let label = status;
    
    switch (status) {
      case 'open':
        variant = 'default';
        label = 'Open';
        break;
      case 'assigned':
        variant = 'secondary';
        label = 'Assigned';
        break;
      case 'in_progress':
        variant = 'secondary';
        label = 'In Progress';
        break;
      case 'completed':
        variant = 'success';
        label = 'Completed';
        break;
      case 'canceled':
        variant = 'destructive';
        label = 'Canceled';
        break;
      case 'pending_payment':
        variant = 'warning';
        label = 'Pending Payment';
        break;
    }
    
    return <Badge variant={variant as any}>{label}</Badge>;
  };

  // Helper for application status badge
  const getApplicationBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isJobLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-4 border-t-primary border-primary/30 animate-spin"></div>
          <p className="mt-4 text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col items-center justify-center h-64">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Job Not Found</h2>
          <p className="mt-2 text-muted-foreground">The job you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button className="mt-4" onClick={() => navigate('/jobs')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  const isOpen = job.status === 'open';
  const isAssigned = job.status === 'assigned';
  const isInProgress = job.status === 'in_progress';
  const isCompleted = job.status === 'completed';
  const isCanceled = job.status === 'canceled';
  const isPendingPayment = job.status === 'pending_payment';
  
  // Calculate completion progress
  const calculateProgress = () => {
    if (!tasks || tasks.length === 0) return 100;
    
    const completedCount = tasks.filter((task: Task) => task.isCompleted).length;
    return Math.round((completedCount / tasks.length) * 100);
  };
  
  const progress = calculateProgress();

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/jobs')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Jobs
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(job.status)}
              <Badge variant="outline">${job.paymentAmount.toFixed(2)} {job.paymentType === 'hourly' ? '/hr' : ''}</Badge>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap md:flex-nowrap">
            <Button 
              variant="outline"
              onClick={() => setShowJobDetails(true)}
            >
              <Clipboard className="mr-2 h-4 w-4" />
              View Job Card
            </Button>
            
            {isOpen && (
              <Button
                variant="destructive"
                onClick={() => setShowCancelDialog(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Job
              </Button>
            )}
            
            {isPendingPayment && (
              <Button onClick={() => navigate(`/checkout?jobId=${job.id}`)}>
                Complete Payment
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-3 md:w-[400px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="applications">Applications {applications.length > 0 && `(${applications.length})`}</TabsTrigger>
          <TabsTrigger value="tasks">Tasks {tasks.length > 0 && `(${tasks.length})`}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-2">
                  <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{job.location}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Date Needed</p>
                    <p className="text-sm text-muted-foreground">
                      {job.dateNeeded ? format(new Date(job.dateNeeded), 'MMM d, yyyy') : 'Flexible'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <CalendarDays className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Date Posted</p>
                    <p className="text-sm text-muted-foreground">
                      {job.datePosted ? format(new Date(job.datePosted), 'MMM d, yyyy') : 'Unknown'}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{job.description}</p>
                </div>
                
                {job.requiredSkills && job.requiredSkills.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Required Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {job.requiredSkills.map((skill: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status & Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-2">
                  <User className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Assigned Worker</p>
                    {job.workerId ? (
                      <p className="text-sm text-muted-foreground">
                        Worker ID: {job.workerId} {/* Ideally show worker name here */}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">None assigned yet</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Users className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Applicants</p>
                    <p className="text-sm text-muted-foreground">{applications.length} workers applied</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-sm font-medium mb-1">Payment</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Base Amount</span>
                    <span className="font-medium">${job.paymentAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-muted-foreground">Service Fee</span>
                    <span className="font-medium">${job.serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1 pt-1 border-t">
                    <span className="text-sm font-medium">Total</span>
                    <span className="font-medium">${job.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-1">Payment Status</p>
                  <Badge variant={isPendingPayment ? 'warning' : 'success'}>
                    {isPendingPayment ? 'Pending Payment' : 'Paid'}
                  </Badge>
                </div>
                
                {job.status === 'canceled' && job.cancellationReason && (
                  <div>
                    <p className="text-sm font-medium mb-1">Cancellation Reason</p>
                    <p className="text-sm text-muted-foreground">{job.cancellationReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="applications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Applications</CardTitle>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="mt-4 text-muted-foreground">No applications yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((app: any) => (
                    <div key={app.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={app.worker?.avatarUrl} />
                            <AvatarFallback>{app.worker?.fullName?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium">{app.worker?.fullName || `Worker #${app.workerId}`}</h3>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              Applied {app.dateApplied && format(new Date(app.dateApplied), 'MMM d, yyyy')}
                            </div>
                          </div>
                        </div>
                        <div>
                          {getApplicationBadge(app.status)}
                        </div>
                      </div>
                      
                      {app.message && (
                        <div className="mt-3 text-sm bg-muted p-3 rounded-md">
                          {app.message}
                        </div>
                      )}
                      
                      {app.status === 'pending' && isOpen && (
                        <div className="mt-4 flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setSelectedApplicant(app);
                              setShowAssignDialog(true);
                            }}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Assign Job
                          </Button>
                          <Button 
                            variant="ghost" 
                            onClick={async () => {
                              try {
                                const response = await apiRequest('PATCH', `/api/applications/${app.id}`, {
                                  status: 'rejected'
                                });
                                
                                if (response.ok) {
                                  toast({
                                    title: 'Application Rejected',
                                    description: 'The worker has been notified',
                                  });
                                  queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId, 'applications'] });
                                } else {
                                  throw new Error('Failed to reject application');
                                }
                              } catch (error) {
                                toast({
                                  variant: 'destructive',
                                  title: 'Failed to Reject',
                                  description: 'There was an error rejecting this application',
                                });
                              }
                            }}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="mt-4 text-muted-foreground">No tasks added to this job</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      {tasks.filter((task: Task) => task.isCompleted).length} of {tasks.length} tasks completed
                    </p>
                    <Badge variant={progress === 100 ? 'success' : 'secondary'}>
                      {progress}% complete
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {tasks.map((task: Task) => (
                      <div 
                        key={task.id} 
                        className={`p-3 rounded-md ${
                          task.isCompleted ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {task.isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          ) : (
                            <Clipboard className="h-5 w-5 text-gray-400 mt-0.5" />
                          )}
                          
                          <div className="flex-1">
                            <p className={`${task.isCompleted ? 'line-through text-green-700' : 'text-gray-800'}`}>
                              {task.description}
                            </p>
                            
                            {task.location && (
                              <div className="flex items-center text-xs text-muted-foreground mt-1">
                                <MapPin className="h-3 w-3 mr-1" />
                                {task.location}
                              </div>
                            )}
                            
                            {task.isCompleted && task.completedBy && (
                              <div className="flex items-center text-xs text-green-600 mt-1">
                                <User className="h-3 w-3 mr-1" />
                                Completed by Worker #{task.completedBy}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Job Details Card */}
      <JobDetailsCard 
        jobId={jobId} 
        isOpen={showJobDetails} 
        onClose={() => setShowJobDetails(false)} 
      />
      
      {/* Assign Worker Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Worker</DialogTitle>
            <DialogDescription>
              Are you sure you want to assign this worker to the job? 
              This will give them access to the job details and tasks.
            </DialogDescription>
          </DialogHeader>
          
          {selectedApplicant && (
            <div className="p-4 border rounded-lg bg-muted">
              <div className="flex items-center gap-3 mb-2">
                <Avatar>
                  <AvatarImage src={selectedApplicant.worker?.avatarUrl} />
                  <AvatarFallback>{selectedApplicant.worker?.fullName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{selectedApplicant.worker?.fullName || `Worker #${selectedApplicant.workerId}`}</h3>
                </div>
              </div>
              
              {selectedApplicant.message && (
                <div className="mt-1 text-sm">
                  <p className="font-medium mb-1">Application Message:</p>
                  <p className="text-muted-foreground">{selectedApplicant.message}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => assignJobMutation.mutate()}
              disabled={assignJobMutation.isPending}
            >
              {assignJobMutation.isPending ? 'Assigning...' : 'Assign Worker'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Cancel Job Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this job? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid gap-2">
              <label htmlFor="reason" className="text-sm font-medium">
                Reason for cancellation (optional)
              </label>
              <textarea
                id="reason"
                className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                placeholder="Please explain why you're canceling this job..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Go Back
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => cancelJobMutation.mutate()}
              disabled={cancelJobMutation.isPending}
            >
              {cancelJobMutation.isPending ? 'Canceling...' : 'Cancel Job'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}