import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  User,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Send,
  Edit,
  PlayCircle,
  StopCircle,
  Award,
  Star
} from 'lucide-react';
import { useLocation } from 'wouter';

interface JobDetailsCardProps {
  jobId: number;
  isOpen: boolean;
  onClose: () => void;
}

const JobDetailsCard: React.FC<JobDetailsCardProps> = ({ jobId, isOpen, onClose }) => {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(true);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [proposedRate, setProposedRate] = useState('');
  const [expectedDuration, setExpectedDuration] = useState('');
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);

  // Fetch job details
  const { data: job, isLoading, error } = useQuery({
    queryKey: ['/api/jobs', jobId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }
      return response.json();
    },
    enabled: isOpen && !!jobId,
  });

  // Fetch application status if user is a worker
  const { data: application } = useQuery({
    queryKey: ['/api/applications', jobId, user?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/jobs/${jobId}/applications/worker/${user?.id}`);
      if (!response.ok) {
        return null;
      }
      return response.json();
    },
    enabled: isOpen && !!jobId && !!user && user.accountType === 'worker',
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['/api/jobs', jobId, 'tasks'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/jobs/${jobId}/tasks`);
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    enabled: isOpen && !!jobId,
  });

  // Apply for job mutation
  const applyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/jobs/${jobId}/apply`, {
        workerId: user?.id,
        message: applicationMessage,
        hourlyRate: parseFloat(proposedRate),
        expectedDuration: expectedDuration
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to apply for job');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Application Submitted',
        description: 'Your application has been sent to the job poster',
      });
      setShowApplyDialog(false);
      setApplicationMessage('');
      setProposedRate('');
      setExpectedDuration('');
      queryClient.invalidateQueries({ queryKey: ['/api/applications', jobId, user?.id] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Application Failed',
        description: error.message || 'Failed to apply for this job',
      });
    }
  });

  // Start job mutation
  const startJobMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', `/api/jobs/${jobId}/start`, {
        workerId: user?.id
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start job');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Job Started',
        description: 'You have started working on this job',
      });
      setIsWorking(true);
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Start Failed',
        description: error.message || 'Failed to start this job',
      });
    }
  });

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiRequest('PATCH', `/api/tasks/${taskId}/complete`, {
        completedBy: user?.id
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete task');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Task Completed',
        description: 'Task has been marked as completed',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId, 'tasks'] });
      
      // Check if all tasks are completed
      const allCompleted = tasks.every(task => task.isCompleted || selectedTaskIds.includes(task.id));
      if (allCompleted) {
        toast({
          title: 'All Tasks Completed',
          description: 'You have completed all tasks for this job',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to Complete Task',
        description: error.message,
      });
    }
  });

  // Complete job mutation
  const completeJobMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', `/api/jobs/${jobId}/complete`, {
        workerId: user?.id
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete job');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Job Completed',
        description: 'Great job! The poster will be notified',
      });
      setShowCompleteDialog(false);
      setIsWorking(false);
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId] });
      // Show review dialog after completion
      setShowReviewDialog(true);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Completion Failed',
        description: error.message || 'Failed to complete the job',
      });
    }
  });

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      if (!job) return;
      
      const response = await apiRequest('POST', `/api/reviews`, {
        jobId: job.id,
        reviewerId: user?.id,
        revieweeId: job.posterId,
        rating: rating,
        comment: reviewComment
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit review');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Review Submitted',
        description: 'Thank you for your feedback!',
      });
      setShowReviewDialog(false);
      setReviewComment('');
      setRating(5);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to Submit Review',
        description: error.message,
      });
    }
  });

  // Handle applying for job
  const handleApply = () => {
    applyMutation.mutate();
  };

  // Handle starting a job
  const handleStartJob = () => {
    startJobMutation.mutate();
  };

  // Handle task completion
  const handleTaskComplete = (taskId: number) => {
    if (selectedTaskIds.includes(taskId)) {
      // Already selected, remove it
      setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
    } else {
      // Not selected, add it
      setSelectedTaskIds(prev => [...prev, taskId]);
      
      // Mark the task as complete
      completeTaskMutation.mutate(taskId);
    }
  };

  // Handle job completion
  const handleCompleteJob = () => {
    completeJobMutation.mutate();
  };

  // Handle submitting a review
  const handleSubmitReview = () => {
    submitReviewMutation.mutate();
  };

  // Determine card animation variants
  const variants = {
    hidden: { y: '100%', opacity: 0 },
    visible: { 
      y: isExpanded ? '0%' : '85%', 
      opacity: 1,
      transition: { 
        type: 'spring',
        damping: 25,
        stiffness: 300
      }
    },
    exit: { y: '100%', opacity: 0 }
  };

  // Calculate job progress
  const calculateProgress = () => {
    if (!tasks || tasks.length === 0) return 100;
    
    const completedCount = tasks.filter(task => task.isCompleted).length;
    return Math.round((completedCount / tasks.length) * 100);
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'open': return 'secondary';
      case 'assigned': return 'secondary';
      case 'in_progress': return 'default';
      case 'completed': return 'secondary';
      case 'canceled': return 'destructive';
      case 'pending_payment': return 'outline';
      default: return 'outline';
    }
  };

  // Get status badge class for custom styling
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      case 'pending_payment': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get application badge class
  const getApplicationClass = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Clear state when component unmounts or job changes
  useEffect(() => {
    if (!isOpen) {
      setApplicationMessage('');
      setSelectedTaskIds([]);
      setIsExpanded(true);
    }
  }, [isOpen, jobId]);

  // If the card is closed, don't render anything
  if (!isOpen) return null;

  if (isLoading) {
    return (
      <AnimatePresence>
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 flex justify-center"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={variants}
        >
          <Card className="w-full max-w-md shadow-xl">
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-6 bg-slate-200 rounded mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded mb-4"></div>
                <div className="h-10 bg-slate-200 rounded mb-4"></div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (error || !job) {
    return (
      <AnimatePresence>
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 flex justify-center"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={variants}
        >
          <Card className="w-full max-w-md shadow-xl border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                Error Loading Job
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>There was a problem loading the job details. Please try again.</p>
            </CardContent>
            <CardFooter>
              <Button onClick={onClose} className="w-full">Close</Button>
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>
    );
  }

  const isJobPoster = user?.id === job.posterId;
  const isAssignedWorker = user?.id === job.workerId;
  const hasApplied = !!application;
  const isPendingPayment = job.status === 'pending_payment';
  const isJobOpen = job.status === 'open';
  const isAssigned = job.status === 'assigned';
  const isInProgress = job.status === 'in_progress';
  const isCompleted = job.status === 'completed';
  const progress = calculateProgress();

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 flex justify-center"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={variants}
      >
        <Card className="w-full max-w-md shadow-xl">
          <div 
            className="absolute top-2 right-2 p-2 cursor-pointer" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronDown /> : <ChevronUp />}
          </div>
          
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <Badge variant="outline" className={getStatusClass(job.status)}>
                  {job.status === 'pending_payment' ? 'Pending Payment' : 
                   job.status === 'in_progress' ? 'In Progress' : 
                   job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </Badge>
                
                {hasApplied && (
                  <Badge variant="outline" className={`ml-2 ${getApplicationClass(application.status)}`}>
                    Application: {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                  </Badge>
                )}
              </div>
            </div>
            
            <CardTitle className="text-xl mt-2">{job.title}</CardTitle>
          </CardHeader>
          
          <CardContent>
            {isExpanded && (
              <>
                <div className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-gray-600">{job.location}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Date Needed</p>
                      <p className="text-sm text-gray-600">
                        {job.dateNeeded ? format(new Date(job.dateNeeded), 'MMM d, yyyy') : 'Flexible'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <DollarSign className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Payment</p>
                      <p className="text-sm text-gray-600">
                        ${job.paymentAmount.toFixed(2)} ({job.paymentType === 'hourly' ? 'Hourly Rate' : 'Fixed Price'})
                      </p>
                    </div>
                  </div>
                  
                  {job.requiredSkills && job.requiredSkills.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Required Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {job.requiredSkills.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm font-medium mb-1">Description</p>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{job.description}</p>
                  </div>
                  
                  {tasks && tasks.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-sm font-medium">Tasks</p>
                        <span className="text-xs text-gray-500">
                          {tasks.filter(task => task.isCompleted).length} of {tasks.length} completed
                        </span>
                      </div>
                      
                      <Progress value={progress} className="h-2 mb-3" />
                      
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {tasks.map((task) => (
                          <div 
                            key={task.id} 
                            className={`p-2 rounded-md flex items-start space-x-2 ${
                              task.isCompleted ? 'bg-green-50' : 'bg-gray-50'
                            }`}
                          >
                            {isAssignedWorker && isInProgress ? (
                              <div 
                                className="cursor-pointer mt-0.5" 
                                onClick={() => handleTaskComplete(task.id)}
                              >
                                {task.isCompleted ? (
                                  <CheckSquare className="h-5 w-5 text-green-600" />
                                ) : (
                                  <Square className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                            ) : (
                              <div className="mt-0.5">
                                {task.isCompleted ? (
                                  <CheckSquare className="h-5 w-5 text-green-600" />
                                ) : (
                                  <Square className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                            )}
                            
                            <div className="flex-1">
                              <p className={`text-sm ${task.isCompleted ? 'line-through text-gray-500' : 'font-medium'}`}>
                                {task.description}
                              </p>
                              {task.location && (
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {task.location}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-2">
            {/* Job poster actions */}
            {isJobPoster && (
              <div className="w-full">
                {isPendingPayment && (
                  <Button 
                    className="w-full" 
                    onClick={() => navigate(`/checkout?jobId=${job.id}`)}
                  >
                    Complete Payment to Publish
                  </Button>
                )}
                
                {isOpen && (
                  <Button className="w-full" variant="outline" onClick={() => navigate(`/job/${job.id}/applications`)}>
                    View Applications
                  </Button>
                )}
                
                {isAssigned && (
                  <div className="space-y-2 w-full">
                    <Button className="w-full" variant="outline" onClick={() => navigate(`/job/${job.id}/manage`)}>
                      Manage Job
                    </Button>
                  </div>
                )}
                
                {isInProgress && (
                  <div className="space-y-2 w-full">
                    <p className="text-sm text-center mb-2">
                      <User className="inline-block h-4 w-4 mr-1" />
                      Worker in progress
                    </p>
                    <Button className="w-full" variant="outline" onClick={() => navigate(`/job/${job.id}/manage`)}>
                      Manage Job
                    </Button>
                  </div>
                )}
                
                {isCompleted && (
                  <div className="space-y-2 w-full">
                    <p className="text-sm text-center text-green-600 mb-2">
                      <CheckCircle2 className="inline-block h-4 w-4 mr-1" />
                      Job completed
                    </p>
                    <Button variant="outline" className="w-full" onClick={() => navigate(`/job/${job.id}/details`)}>
                      View Details
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Worker actions */}
            {!isJobPoster && (
              <div className="w-full">
                {isAssignedWorker && (
                  <div className="space-y-2 w-full">
                    {isAssigned && !isInProgress && (
                      <Button onClick={handleStartJob} className="w-full">
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Start Job
                      </Button>
                    )}
                    
                    {isInProgress && (
                      <Button 
                        onClick={() => setShowCompleteDialog(true)} 
                        className="w-full"
                        disabled={tasks.length > 0 && progress < 100}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark Job Complete
                      </Button>
                    )}
                  </div>
                )}
                
                {!isAssignedWorker && isJobOpen && !hasApplied && (
                  <Button onClick={() => setShowApplyDialog(true)} className="w-full">Apply for Job</Button>
                )}
                
                {!isAssignedWorker && hasApplied && application.status === 'pending' && (
                  <p className="text-sm text-center text-yellow-600">
                    <Clock className="inline-block h-4 w-4 mr-1" />
                    Application pending
                  </p>
                )}
                
                {!isAssignedWorker && hasApplied && application.status === 'accepted' && (
                  <div className="space-y-2">
                    <p className="text-sm text-center text-green-600">
                      <CheckCircle2 className="inline-block h-4 w-4 mr-1" />
                      Application accepted!
                    </p>
                    <Button onClick={handleStartJob} className="w-full">
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Clock In / Start Work
                    </Button>
                  </div>
                )}
                
                {!isAssignedWorker && hasApplied && application.status === 'rejected' && (
                  <p className="text-sm text-center text-red-600">
                    <AlertCircle className="inline-block h-4 w-4 mr-1" />
                    Application was not accepted
                  </p>
                )}
              </div>
            )}
            
            <Button variant="ghost" onClick={onClose} className="w-full">
              Close
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
      
      {/* Apply for job dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for Job</DialogTitle>
            <DialogDescription>
              Submit your application with details about why you're a good fit for this job.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label htmlFor="hourly-rate" className="text-sm font-medium">Your Hourly Rate ($)</label>
              <input
                id="hourly-rate"
                type="number"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="25"
                value={proposedRate}
                onChange={(e) => setProposedRate(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="expected-duration" className="text-sm font-medium">Expected Duration (e.g., "2 hours", "1 day")</label>
              <input
                id="expected-duration"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="3 hours"
                value={expectedDuration}
                onChange={(e) => setExpectedDuration(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="cover-letter" className="text-sm font-medium">Cover Letter</label>
              <Textarea
                id="cover-letter"
                placeholder="Explain why you're interested in this job and what makes you qualified..."
                className="min-h-[120px]"
                value={applicationMessage}
                onChange={(e) => setApplicationMessage(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleApply} 
              disabled={!applicationMessage.trim() || !proposedRate || !expectedDuration || applyMutation.isPending}
            >
              {applyMutation.isPending ? 'Applying...' : 'Submit Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Complete job dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this job as complete? 
              This will notify the job poster that you've finished all tasks.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleCompleteJob} 
              disabled={completeJobMutation.isPending}
            >
              {completeJobMutation.isPending ? 'Submitting...' : 'Mark Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Review dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
            <DialogDescription>
              How was your experience with this job poster?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Rating</p>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-8 w-8 cursor-pointer ${
                      star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                    }`}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2">Comments</p>
              <Textarea
                placeholder="Share your experience working on this job..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>Skip</Button>
            <Button 
              onClick={handleSubmitReview} 
              disabled={!reviewComment.trim() || submitReviewMutation.isPending}
            >
              {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
};

export default JobDetailsCard;