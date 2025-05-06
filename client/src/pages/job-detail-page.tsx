import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRoute, useLocation } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  MapPin, 
  Calendar, 
  DollarSign, 
  Clock, 
  User, 
  ArrowLeft, 
  Briefcase,
  CheckCircle2,
  AlertCircle,
  FileText,
  MessageSquare,
  ClipboardList,
  Send,
  Loader2
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import ApplicationForm from '@/components/applications/ApplicationForm';
import ApplicationsManager from '@/components/applications/ApplicationsManager';
import TaskManager from '@/components/tasks/TaskManager';
import PaymentDetailsCard from '@/components/payments/PaymentDetailsCard';
import JobPaymentForm from '@/components/payments/JobPaymentForm';

const JobDetailPage: React.FC = () => {
  const [, params] = useRoute<{ id: string }>('/jobs/:id');
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('details');
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);

  // Get job ID from URL params
  const jobId = params ? parseInt(params.id) : 0;

  // Fetch job details
  const { data: job, isLoading: isLoadingJob, error: jobError } = useQuery({
    queryKey: ['/api/jobs', jobId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/jobs/${jobId}`);
      if (!res.ok) throw new Error('Failed to fetch job details');
      return res.json();
    },
    enabled: !!jobId,
  });

  // Determine user roles for this job
  const isPoster = job && user ? job.posterId === user.id : false;
  const isWorker = job && user ? job.workerId === user.id : false;
  const isAssigned = !!job?.workerId;
  const isCompleted = job?.status === 'completed';
  
  // Check if the current user has already applied
  const { data: userApplications } = useQuery({
    queryKey: ['/api/applications/worker', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await apiRequest('GET', `/api/applications/worker/${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch applications');
      return res.json();
    },
    enabled: !!user && !isPoster && !isWorker,
  });
  
  const hasApplied = userApplications?.some((app: any) => app.jobId === jobId);
  
  // Complete job mutation
  const completeJobMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/jobs/${jobId}/complete`, {});
      if (!res.ok) throw new Error('Failed to complete job');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Job Completed',
        description: 'The job has been marked as completed successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to complete job: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Handle applying for a job
  const handleApplySuccess = () => {
    setApplyDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/applications/worker', user?.id] });
    toast({
      title: 'Application Submitted',
      description: 'Your application has been submitted successfully.',
    });
  };
  
  // Handle payment success
  const handlePaymentSuccess = () => {
    setPayDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId] });
    toast({
      title: 'Payment Successful',
      description: 'Payment has been processed successfully.',
    });
  };
  
  // Handle job completion
  const handleCompleteJob = () => {
    completeJobMutation.mutate();
  };

  // If job is loading, show loading state
  if (isLoadingJob) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // If job error or not found, show error state
  if (jobError || !job) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {jobError ? (jobError as Error).message : 'Job not found'}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      {/* Back button and status indicator */}
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>
        
        <div className="flex items-center gap-2">
          <Badge 
            variant={
              job.status === 'completed' ? 'default' :
              job.status === 'assigned' ? 'secondary' :
              'outline'
            }
            className="capitalize"
          >
            {job.status === 'completed' ? (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            ) : job.status === 'assigned' ? (
              <User className="h-3 w-3 mr-1" />
            ) : (
              <Clock className="h-3 w-3 mr-1" />
            )}
            {job.status}
          </Badge>
          
          {job.paymentType && (
            <Badge variant="outline" className="capitalize">
              <DollarSign className="h-3 w-3 mr-1" />
              {job.paymentType} Rate
            </Badge>
          )}
        </div>
      </div>
      
      {/* Job details header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{job.title}</h1>
        <div className="flex flex-wrap gap-4 mt-2 text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{job.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Needed by {formatDate(job.dateNeeded)}</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span>{formatCurrency(job.paymentAmount)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Briefcase className="h-4 w-4" />
            <span>{job.category}</span>
          </div>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        {!isPoster && !isWorker && !isCompleted && !hasApplied && (
          <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Apply for Job
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Apply for "{job.title}"</DialogTitle>
                <DialogDescription>
                  Tell the job poster why you're a good fit for this job
                </DialogDescription>
              </DialogHeader>
              <ApplicationForm 
                jobId={jobId} 
                onSuccess={handleApplySuccess} 
                onCancel={() => setApplyDialogOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        )}
        
        {hasApplied && !isWorker && !isCompleted && (
          <Button variant="outline" disabled>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Applied
          </Button>
        )}
        
        {isPoster && job.status === 'completed' && (
          <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <DollarSign className="h-4 w-4 mr-2" />
                Pay Worker
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Make Payment</DialogTitle>
                <DialogDescription>
                  Pay the worker for completing this job
                </DialogDescription>
              </DialogHeader>
              <JobPaymentForm 
                jobId={jobId} 
                workerId={job.workerId} 
                onSuccess={handlePaymentSuccess} 
                isExistingJob={true}
              />
            </DialogContent>
          </Dialog>
        )}
        
        {isWorker && job.status === 'assigned' && (
          <Button 
            onClick={handleCompleteJob} 
            disabled={completeJobMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {completeJobMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Mark as Complete
          </Button>
        )}
      </div>
      
      {/* Main content tabs */}
      <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="details">
            <FileText className="h-4 w-4 mr-2" />
            Details
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <ClipboardList className="h-4 w-4 mr-2" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="applications">
            <MessageSquare className="h-4 w-4 mr-2" />
            Applications
          </TabsTrigger>
        </TabsList>
        
        {/* Details tab */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-stone dark:prose-invert max-w-none">
                <p>{job.description}</p>
              </div>
              
              {job.requiredSkills && job.requiredSkills.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.requiredSkills.map((skill: string) => (
                      <Badge key={skill} variant="outline" className="capitalize">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Equipment</h3>
                <p>
                  {job.equipmentProvided 
                    ? "Equipment will be provided for this job."
                    : "Worker is expected to provide their own equipment."}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Job Poster</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  {job.poster?.avatarUrl ? (
                    <AvatarImage src={job.poster.avatarUrl} alt={job.poster?.username || 'Job Poster'} />
                  ) : null}
                  <AvatarFallback>
                    {job.poster?.username?.charAt(0).toUpperCase() || 'P'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{job.poster?.fullName || job.poster?.username || `User #${job.posterId}`}</h3>
                  <p className="text-sm text-muted-foreground">
                    Posted on {formatDate(job.datePosted)}
                  </p>
                </div>
              </div>
              
              {job.poster?.bio && (
                <div className="mt-4">
                  <p className="text-sm">{job.poster.bio}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {isWorker && (
            <PaymentDetailsCard 
              payment={{
                id: `job-${job.id}`,
                amount: job.paymentAmount,
                status: job.status === 'completed' ? 'completed' : 'pending',
                description: `Payment for job: ${job.title}`,
                jobId: job.id,
                createdAt: job.datePosted,
                type: 'payout',
              }}
              showActions={false}
            />
          )}
        </TabsContent>
        
        {/* Tasks tab */}
        <TabsContent value="tasks">
          <TaskManager 
            jobId={jobId} 
            mode={isPoster ? 'poster' : 'worker'}
          />
        </TabsContent>
        
        {/* Applications tab */}
        <TabsContent value="applications">
          {isPoster ? (
            <ApplicationsManager 
              userId={user?.id || 0} 
              mode="poster"
              initialJobId={jobId}
            />
          ) : isWorker ? (
            <div className="text-center py-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium">You're working on this job</h3>
              <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
                Your application has been accepted. You can now view and complete tasks for this job.
              </p>
            </div>
          ) : hasApplied ? (
            <ApplicationsManager 
              userId={user?.id || 0} 
              mode="worker"
              className="mt-4"
            />
          ) : (
            <div className="text-center py-12 border rounded-md">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Send className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">Apply for this job</h3>
              <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
                Submit an application to express your interest in this job.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setApplyDialogOpen(true)} 
                className="mt-4"
              >
                <Send className="h-4 w-4 mr-2" />
                Apply Now
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default JobDetailPage;