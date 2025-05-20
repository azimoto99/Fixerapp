import React, { useState, useEffect } from 'react';
import './JobCardFixOverlay.css';
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
import { Input } from '@/components/ui/input';
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
  Star,
  MessageCircle,
  Settings
} from 'lucide-react';
import { useLocation } from 'wouter';

interface JobDetailsCardProps {
  jobId: number;
  isOpen: boolean;
  onClose: () => void;
}

const JobDetailsCard: React.FC<JobDetailsCardProps> = ({ jobId, isOpen, onClose }) => {
  
  // Listen for the custom event to open job details from other components
  useEffect(() => {
    const handleOpenJobDetails = (event: CustomEvent<{ jobId: number }>) => {
      if (event.detail && event.detail.jobId) {
        // Only trigger if the job ID matches this component's job ID or if this is a reusable component
        if (event.detail.jobId === jobId || jobId === 0) {
          onClose(); // First close it (to reset state if needed)
          setTimeout(() => {
            // Then reopen with the new job ID
            window.dispatchEvent(new CustomEvent('set-job-id', { 
              detail: { jobId: event.detail.jobId }
            }));
          }, 50);
        }
      }
    };
    
    // Add event listener
    window.addEventListener('open-job-details', handleOpenJobDetails as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('open-job-details', handleOpenJobDetails as EventListener);
    };
  }, [jobId, onClose]);
  
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
      case 'open': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'assigned': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'completed': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'canceled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'pending_payment': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  // Get application badge class
  const getApplicationClass = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300 border-gray-200 dark:border-gray-700';
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
        <Card className="w-full max-w-md shadow-xl border-t-4 border-primary">
          {/* Card Toggle */}
          <div 
            className="absolute top-2 right-2 p-2 cursor-pointer bg-background/80 backdrop-blur-sm rounded-full hover:bg-accent transition-colors" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </div>
          
          {/* Card Header */}
          <CardHeader className="pb-2">
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant="outline" className={getStatusClass(job.status)}>
                {job.status === 'pending_payment' ? 'Pending Payment' : 
                 job.status === 'in_progress' ? 'In Progress' : 
                 job.status.charAt(0).toUpperCase() + job.status.slice(1)}
              </Badge>
              
              {hasApplied && (
                <Badge variant="outline" className={getApplicationClass(application.status)}>
                  {application.status.charAt(0).toUpperCase() + application.status.slice(1)} Application
                </Badge>
              )}
              
              {job.equipmentProvided && (
                <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Equipment Provided
                </Badge>
              )}
            </div>
            
            <CardTitle className="text-2xl font-bold">{job.title}</CardTitle>
          </CardHeader>
          
          {/* Main Content */}
          <CardContent>
            {isExpanded && (
              <div className="space-y-5">
                {/* Key details in modern card-based layout */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 border shadow-sm">
                    <div className="flex items-center mb-1">
                      <DollarSign className="h-4 w-4 mr-2 text-primary" />
                      <span className="text-sm font-medium">Payment</span>
                    </div>
                    <div className="text-lg font-bold">
                      ${job.paymentAmount.toFixed(2)} 
                      <span className="text-xs text-muted-foreground ml-1">
                        {job.paymentType === 'hourly' ? '/hr' : 'fixed'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-3 border shadow-sm">
                    <div className="flex items-center mb-1">
                      <Calendar className="h-4 w-4 mr-2 text-primary" />
                      <span className="text-sm font-medium">Needed By</span>
                    </div>
                    <div className="text-lg font-bold">
                      {job.dateNeeded ? format(new Date(job.dateNeeded), 'MMM d, yyyy') : 'Flexible'}
                    </div>
                  </div>
                </div>
                
                {/* Location with interactive map link */}
                <div className="bg-muted/50 rounded-lg p-3 border shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-primary" />
                      <span className="text-sm font-medium">Location</span>
                    </div>
                    
                    {(job.latitude && job.longitude) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={() => window.open(`https://maps.google.com/?q=${job.latitude},${job.longitude}`, '_blank')}
                      >
                        <MapPin className="h-3 w-3 mr-1" /> View Map
                      </Button>
                    )}
                  </div>
                  <div className="font-semibold mt-1">{job.location || "No specific location"}</div>
                </div>
                
                {/* Description section */}
                <div className="bg-muted/50 rounded-lg p-3 border shadow-sm">
                  <div className="flex items-center mb-2">
                    <span className="text-sm font-medium">Description</span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{job.description}</p>
                </div>
                
                {/* Required Skills section */}
                {job.requiredSkills && job.requiredSkills.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 border shadow-sm">
                    <div className="flex items-center mb-2">
                      <Award className="h-4 w-4 mr-2 text-primary" />
                      <span className="text-sm font-medium">Required Skills</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {job.requiredSkills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="px-2 py-1">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Tasks Progress */}
                {tasks && tasks.length > 0 && (
                  <div className="space-y-3">
                    <div className="bg-muted/50 rounded-lg p-3 border shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <CheckSquare className="h-4 w-4 mr-2 text-primary" />
                          <span className="text-sm font-medium">Task Progress</span>
                        </div>
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {progress}% Complete
                        </span>
                      </div>
                      <Progress value={progress} className="h-2.5 rounded-full" />
                      <div className="text-xs text-right mt-1 text-muted-foreground">
                        {tasks.filter(t => t.isCompleted).length} of {tasks.length} tasks completed
                      </div>
                    </div>
                    
                    {/* Interactive Task List */}
                    {isInProgress && isAssignedWorker && (
                      <div className="bg-muted/50 rounded-lg p-3 border shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium">Tasks</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-xs"
                            onClick={() => {
                              tasks.filter(t => !t.isCompleted).forEach(task => {
                                handleTaskComplete(task.id);
                              });
                            }}
                            disabled={tasks.every(t => t.isCompleted)}
                          >
                            Complete All
                          </Button>
                        </div>
                        
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                          {tasks.map(task => (
                            <div 
                              key={task.id} 
                              className={`flex items-center gap-2 p-2.5 rounded-md transition-colors ${
                                task.isCompleted 
                                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
                                  : "border border-border hover:bg-accent"
                              }`}
                            >
                              <Checkbox
                                checked={task.isCompleted}
                                onCheckedChange={() => !task.isCompleted && handleTaskComplete(task.id)}
                                disabled={task.isCompleted}
                                className="data-[state=checked]:bg-green-600 data-[state=checked]:text-white"
                              />
                              
                              <div className="flex-1">
                                <p className={`text-sm ${task.isCompleted ? "text-muted-foreground line-through" : "font-medium"}`}>
                                  {task.description}
                                </p>
                                
                                {task.location && (
                                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {task.location}
                                    
                                    {(task.latitude && task.longitude) && (
                                      <Button 
                                        variant="link" 
                                        size="sm" 
                                        className="h-4 p-0 ml-1 text-xs underline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(`https://maps.google.com/?q=${task.latitude},${task.longitude}`, '_blank');
                                        }}
                                      >
                                        map
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {task.bonusAmount > 0 && (
                                <Badge variant="outline" className="bg-primary/10 text-primary">
                                  +${task.bonusAmount}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Posted by information */}
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <div className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    <span>Posted by #{job.posterId}</span>
                  </div>
                  <div>
                    <Clock className="h-3 w-3 inline mr-1" />
                    {format(new Date(job.datePosted), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          
          {/* Action Buttons */}
          <CardFooter className="bg-muted/30 pt-3 pb-4 px-4">
            <div className="w-full space-y-2">
              {/* Quick stats when collapsed */}
              {!isExpanded && (
                <div className="flex justify-between text-sm mb-2">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-1 text-primary" />
                    ${job.paymentAmount.toFixed(2)} {job.paymentType === 'hourly' ? '/hr' : 'fixed'}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-primary" />
                    {job.location ? job.location.split(',')[0] : "No location"}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                {/* Worker Actions */}
                {user?.accountType === 'worker' && !isAssignedWorker && isJobOpen && !hasApplied && (
                  <Button 
                    onClick={() => setShowApplyDialog(true)} 
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    <Send className="h-4 w-4 mr-2" /> Apply Now
                  </Button>
                )}
                
                {user?.accountType === 'worker' && isAssignedWorker && isInProgress && (
                  <Button 
                    variant="default" 
                    onClick={() => setShowCompleteDialog(true)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Complete Job
                  </Button>
                )}
                
                {user?.accountType === 'worker' && isAssignedWorker && !isInProgress && isAssigned && (
                  <Button 
                    variant="default" 
                    onClick={handleStartJob}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <PlayCircle className="h-4 w-4 mr-2" /> Start Working
                  </Button>
                )}
                
                {/* Job Poster Actions */}
                {isJobPoster && (
                  <>
                    {isPendingPayment && (
                      <Button 
                        className="w-full bg-primary hover:bg-primary/90" 
                        onClick={() => navigate(`/checkout?jobId=${job.id}`)}
                      >
                        <DollarSign className="h-4 w-4 mr-2" /> Complete Payment
                      </Button>
                    )}
                    
                    {(isJobOpen || isAssigned || isInProgress) && (
                      <Button 
                        variant="outline" 
                        onClick={() => navigate(`/job/${job.id}/applications`)}
                        className="w-full"
                      >
                        <User className="h-4 w-4 mr-2" /> View Applications
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      className="w-full border-primary/30 text-primary hover:bg-primary/10"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" /> Message
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => navigate(`/job/${job.id}/manage`)}
                      className="w-full"
                    >
                      <Settings className="h-4 w-4 mr-2" /> Manage
                    </Button>
                  </>
                )}
                
                {/* Close button - always show for all users */}
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className={isJobPoster ? "w-full" : "w-full"}
                >
                  Close
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
      
      {/* Apply Job Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for "{job.title}"</DialogTitle>
            <DialogDescription>
              Submit your proposal to work on this job
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-sm font-medium mb-2 flex items-center">
                <DollarSign className="h-4 w-4 mr-1 text-primary" /> Your Hourly Rate
              </p>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="25.00"
                  value={proposedRate}
                  onChange={(e) => setProposedRate(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2 flex items-center">
                <Clock className="h-4 w-4 mr-1 text-primary" /> Expected Duration
              </p>
              <Input
                type="text"
                placeholder="e.g. 2-3 hours, 1 day, etc."
                value={expectedDuration}
                onChange={(e) => setExpectedDuration(e.target.value)}
              />
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2 flex items-center">
                <Send className="h-4 w-4 mr-1 text-primary" /> Cover Letter
              </p>
              <Textarea
                placeholder="Tell the job poster why you're the best fit for this job..."
                value={applicationMessage}
                onChange={(e) => setApplicationMessage(e.target.value)}
                className="min-h-[120px] resize-none"
              />
            </div>
          </div>
          
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleApply} 
              disabled={!proposedRate || !applicationMessage.trim() || applyMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Complete Job Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Job</DialogTitle>
            <DialogDescription>
              Are you sure you've finished all required tasks for this job?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            {tasks && tasks.length > 0 && (
              <div className="bg-muted/50 p-4 rounded-lg border">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium flex items-center">
                    <CheckSquare className="h-4 w-4 mr-2 text-primary" /> Task Status
                  </p>
                  <Badge variant={progress === 100 ? "success" : "secondary"} className="text-xs">
                    {progress}% Complete
                  </Badge>
                </div>
                <Progress value={progress} className="h-2.5 rounded-full" />
                <p className="text-xs text-right mt-1 text-muted-foreground">
                  {tasks.filter(t => t.isCompleted).length} of {tasks.length} tasks completed
                </p>
                
                {progress < 100 && (
                  <div className="mt-2 p-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 inline mr-1" />
                    <span className="text-amber-700 dark:text-amber-400">
                      There are incomplete tasks. Are you sure you want to complete the job?
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleCompleteJob} 
              disabled={completeJobMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {completeJobMutation.isPending ? 'Completing...' : 'Mark as Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
            <DialogDescription>
              How was your experience with this job poster?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-sm font-medium mb-2 flex items-center">
                <Star className="h-4 w-4 mr-1 text-primary" /> Rating
              </p>
              <div className="flex space-x-2 bg-muted/50 p-3 rounded-lg justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-8 w-8 cursor-pointer transition-all hover:scale-110 ${
                      star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'
                    }`}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
              <p className="text-center text-sm mt-1 text-muted-foreground">
                {rating} out of 5 stars
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2 flex items-center">
                <Send className="h-4 w-4 mr-1 text-primary" /> Your Feedback
              </p>
              <Textarea
                placeholder="Share your experience working on this job..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="min-h-[120px] resize-none"
              />
            </div>
          </div>
          
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>Skip</Button>
            <Button 
              onClick={handleSubmitReview} 
              disabled={!reviewComment.trim() || submitReviewMutation.isPending}
              className="bg-primary hover:bg-primary/90"
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