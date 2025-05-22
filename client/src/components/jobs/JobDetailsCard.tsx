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
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle2,
  User,
  ChevronDown,
  ChevronUp,
  Send,
  Edit,
  PlayCircle,
  CheckCheck,
  X,
  ThumbsUp,
  Loader2,
  Check,
  Briefcase,
  Timer,
  AlertCircle,
  MapIcon,
  Navigation,
  Compass
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useGeolocation } from '@/hooks/use-geolocation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import application management tab
import JobApplicationsTab from './JobApplicationsTab';
import '../jobcard-fix.css';
import { useEffect as useWindowEffect } from 'react';
import { cn } from '@/lib/utils';

interface JobDetailsCardProps {
  jobId: number;
  isOpen: boolean;
  onClose: () => void;
}

const JobDetailsCard: React.FC<JobDetailsCardProps> = ({ jobId, isOpen, onClose }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { userLocation } = useGeolocation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [proposedRate, setProposedRate] = useState('');
  const [expectedDuration, setExpectedDuration] = useState('');
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [showLocationVerificationError, setShowLocationVerificationError] = useState(false);
  const [distanceToJob, setDistanceToJob] = useState<number | null>(null);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [showWorkerMap, setShowWorkerMap] = useState(false);

  // Fetch job details
  const { data: job, isLoading } = useQuery({
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
  
  // Fetch all applications for the job if user is the job poster
  const { data: applications = [] } = useQuery({
    queryKey: ['/api/jobs', jobId, 'applications'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/jobs/${jobId}/applications`);
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    enabled: isOpen && !!jobId && !!user && (user.accountType === 'poster' || user.id === job?.posterId),
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

  // Job status update mutation
  const updateJobStatusMutation = useMutation({
    mutationFn: async (data: { 
      status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'canceled';
      workerLocation?: { latitude: number; longitude: number };
    }) => {
      const response = await apiRequest('PUT', `/api/jobs/${jobId}/status`, data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update job status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate job queries to reflect updated status
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId] });
      
      setIsCheckingLocation(false);
      setShowLocationVerificationError(false);
      
      toast({
        title: 'Job Updated',
        description: 'Job status has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      setIsCheckingLocation(false);
      
      // Special handling for location verification errors
      if (error.message.includes('within 500 feet')) {
        setShowLocationVerificationError(true);
        const distanceMatch = error.message.match(/distance: (\d+)/);
        if (distanceMatch && distanceMatch[1]) {
          setDistanceToJob(parseInt(distanceMatch[1]));
        }
      } else {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    },
  });
  
  // Worker location update mutation
  const updateWorkerLocationMutation = useMutation({
    mutationFn: async (data: { 
      latitude: number; 
      longitude: number;
    }) => {
      const response = await apiRequest('POST', `/api/jobs/${jobId}/worker-location`, data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update worker location');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Successfully updated worker location
      console.log('Worker location updated');
    },
    onError: (error: Error) => {
      console.error('Failed to update worker location:', error);
    },
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

  // Handle applying for job
  const handleApply = () => {
    applyMutation.mutate();
  };

  // Function to calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    // Earth's radius in feet
    const R = 20902231; // 3959 miles * 5280 feet

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return Math.round(distance);
  };

  // Get user's current location
  const refreshLocation = (): Promise<{latitude: number, longitude: number}> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve({ latitude, longitude });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  // Verify worker location against job location
  const verifyWorkerLocation = async (): Promise<boolean> => {
    if (!job || !job.latitude || !job.longitude) {
      toast({
        title: "Location Error", 
        description: "Job location information is missing",
        variant: "destructive"
      });
      return false;
    }

    try {
      const location = await refreshLocation();
      const distance = calculateDistance(
        location.latitude, 
        location.longitude, 
        job.latitude, 
        job.longitude
      );
      
      setDistanceToJob(distance);
      
      // Worker must be within 500 feet of the job location
      if (distance <= 500) {
        return true;
      } else {
        setShowLocationVerificationError(true);
        return false;
      }
    } catch (error) {
      toast({
        title: "Location Error", 
        description: "Unable to get your current location. Please enable location services.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Handle starting a job with location verification
  const handleStartJob = async () => {
    setIsCheckingLocation(true);
    try {
      const isLocationValid = await verifyWorkerLocation();
      
      if (isLocationValid) {
        const location = await refreshLocation();
        updateJobStatusMutation.mutate({
          status: 'in_progress',
          workerLocation: location
        });
      }
    } catch (error) {
      toast({
        title: "Location Error",
        description: "Unable to verify your location. Please try again.",
        variant: "destructive"
      });
    }
    setIsCheckingLocation(false);
  };
  
  // Handle job completion
  const handleCompleteJob = () => {
    setShowCompleteDialog(true);
  };
  
  // Confirm job completion and update status
  const confirmCompleteJob = () => {
    updateJobStatusMutation.mutate({
      status: 'completed'
    });
    setShowCompleteDialog(false);
  };

  // Clear state when component unmounts or job changes
  useEffect(() => {
    if (!isOpen) {
      setApplicationMessage('');
      setIsExpanded(true);
      setActiveTab('details');
    }
  }, [isOpen, jobId]);

  // Determine if user is job poster
  const isJobPoster = user && job && user.id === job.posterId;
  
  // Determine if user has applied
  const hasApplied = !!application;

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
          <Card className="w-full max-w-3xl shadow-lg border rounded-xl overflow-hidden relative">
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading job details...</span>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (!job) {
    return (
      <AnimatePresence>
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 flex justify-center"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={variants}
        >
          <Card className="w-full max-w-3xl shadow-lg border rounded-xl overflow-hidden relative">
            <CardContent className="py-8">
              <div className="text-center">
                <X className="h-12 w-12 mx-auto mb-2 text-destructive" />
                <h3 className="text-lg font-medium">Job Not Found</h3>
                <p className="text-muted-foreground mt-1">The job you're looking for doesn't exist or has been removed.</p>
                <Button onClick={onClose} className="mt-4">Close</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 flex justify-center"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={variants}
      >
        <Card className="w-full max-w-3xl shadow-lg border rounded-xl overflow-hidden relative">
          {/* Expand/Collapse Handle */}
          <div 
            className="absolute right-4 top-3 z-10 cursor-pointer rounded-full bg-background/80 backdrop-blur-sm p-1 shadow-sm border"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          
          {/* Close Button */}
          <div 
            className="absolute right-12 top-3 z-10 cursor-pointer rounded-full bg-background/80 backdrop-blur-sm p-1 shadow-sm border"
            onClick={onClose}
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </div>
          
          {/* Job Status Bar */}
          <div className="bg-muted/30 py-1 px-4 border-b flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-xs text-muted-foreground mr-2">Status:</span>
              <Badge variant={getStatusVariant(job.status)} className={getStatusClass(job.status)}>
                {job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('_', ' ')}
              </Badge>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Job #{job.id}
            </div>
          </div>
          
          {/* Header with title and badges */}
          <CardHeader className="pb-2">
            <div className="flex flex-wrap gap-1 mb-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                {job.category}
              </Badge>
              
              <Badge variant="outline" className="bg-muted/50">
                <MapPin className="h-3 w-3 mr-1" /> {job.location?.city || job.location}
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
                {/* Tab Navigation */}
                <div className="flex border-b mb-4">
                  <button
                    className={`px-3 py-2 ${activeTab === 'details' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'} transition-colors`}
                    onClick={() => setActiveTab('details')}
                  >
                    Details
                  </button>
                  <button
                    className={`px-3 py-2 ${activeTab === 'tasks' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'} transition-colors`}
                    onClick={() => setActiveTab('tasks')}
                  >
                    Tasks {tasks.length > 0 && `(${tasks.filter(t => t.isCompleted).length}/${tasks.length})`}
                  </button>
                  {isJobPoster && (
                    <button
                      className={`px-3 py-2 ${activeTab === 'applications' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'} transition-colors`}
                      onClick={() => setActiveTab('applications')}
                    >
                      Applications {applications.length > 0 && `(${applications.length})`}
                    </button>
                  )}
                </div>
                
                {/* Details Tab Content */}
                {activeTab === 'details' && (
                  <div className="space-y-4">
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
                          <Clock className="h-4 w-4 mr-2 text-primary" />
                          <span className="text-sm font-medium">Duration</span>
                        </div>
                        <div className="text-lg font-bold">
                          {job.duration || 'Flexible'}
                        </div>
                      </div>
                      
                      <div className="bg-muted/50 rounded-lg p-3 border shadow-sm">
                        <div className="flex items-center mb-1">
                          <Calendar className="h-4 w-4 mr-2 text-primary" />
                          <span className="text-sm font-medium">Timing</span>
                        </div>
                        <div className="text-md font-medium">
                          {job.startDate ? format(new Date(job.startDate), 'MMM d, yyyy') : 'Flexible start'}
                        </div>
                      </div>
                      
                      <div className="bg-muted/50 rounded-lg p-3 border shadow-sm">
                        <div className="flex items-center mb-1">
                          <MapPin className="h-4 w-4 mr-2 text-primary" />
                          <span className="text-sm font-medium">Location</span>
                        </div>
                        <div className="text-md font-medium">
                          {job.location?.address || job.location || 'Remote'}
                          {job.latitude && job.longitude && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="mt-2 h-8 px-2 text-xs flex items-center bg-primary/10 hover:bg-primary/20 text-primary"
                              onClick={() => {
                                // Center map on this job's location
                                window.dispatchEvent(new CustomEvent('center-map-on-job', { 
                                  detail: { 
                                    jobId: job.id,
                                    latitude: job.latitude, 
                                    longitude: job.longitude 
                                  }
                                }));
                                // Close the job details card
                                if (onClose) onClose();
                              }}
                            >
                              <MapPin className="h-3 w-3 mr-1" />
                              Show on Map
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Job description */}
                    <div className="mt-4">
                      <h3 className="text-md font-medium mb-2">Description</h3>
                      <div className="bg-muted/30 rounded-lg p-4 border">
                        <p className="whitespace-pre-line text-sm">
                          {job.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Tasks Tab Content */}
                {activeTab === 'tasks' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-md font-medium">Task List</h3>
                        <p className="text-sm text-muted-foreground">
                          {tasks.length === 0 ? 'No tasks defined for this job' : `${tasks.filter(t => t.isCompleted).length} of ${tasks.length} tasks completed`}
                        </p>
                      </div>
                      
                      <Progress value={calculateProgress()} className="w-1/3 h-2" />
                    </div>
                    
                    {tasks.length === 0 ? (
                      <div className="bg-muted/30 rounded-lg p-6 border text-center">
                        <CheckCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                        <p className="text-muted-foreground">No tasks have been added to this job yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {tasks.map((task) => (
                          <div key={task.id} className="flex items-start p-3 bg-muted/30 rounded-lg border">
                            <div className="mt-0.5 mr-3">
                              {task.isCompleted ? (
                                <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                                  <Check className="h-3 w-3" />
                                </div>
                              ) : (
                                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                              )}
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Applications Tab Content */}
                {activeTab === 'applications' && isJobPoster && (
                  <JobApplicationsTab applications={applications} jobId={job.id} />
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
                    {job.location?.city || job.location || 'Remote'}
                  </div>
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex justify-between gap-2">
                {user && user.accountType === 'worker' && (
                  <>
                    {/* Worker Actions */}
                    {!hasApplied && job.status === 'open' && (
                      <Button
                        className="flex-1"
                        onClick={() => setShowApplyDialog(true)}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Apply Now
                      </Button>
                    )}
                    
                    {job.workerId === user.id && job.status === 'assigned' && (
                      <Button
                        className="flex-1" 
                        onClick={handleStartJob}
                        disabled={isCheckingLocation}
                      >
                        {isCheckingLocation ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Verifying Location...
                          </>
                        ) : (
                          <>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Clock In & Start Job
                          </>
                        )}
                      </Button>
                    )}
                    
                    {job.workerId === user.id && job.status === 'in_progress' && (
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white" 
                        onClick={handleCompleteJob}
                      >
                        <CheckCheck className="h-4 w-4 mr-2" />
                        Job Done
                      </Button>
                    )}
                  </>
                )}
                
                {user && user.accountType === 'poster' && user.id === job.posterId && (
                  <>
                    {/* Job Poster Actions */}
                    {job.status === 'open' && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => console.log('Edit job')}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Job
                      </Button>
                    )}
                    
                    {job.status === 'in_progress' && (
                      <Button
                        variant="default"
                        className="flex-1"
                        onClick={() => setShowWorkerMap(!showWorkerMap)}
                      >
                        <MapIcon className="h-4 w-4 mr-2" />
                        {showWorkerMap ? 'Hide Worker Location' : 'Track Worker Location'}
                      </Button>
                    )}
                    
                    {job.status === 'completed' && (
                      <Button
                        variant="default"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Process Payment
                      </Button>
                    )}
                  </>
                )}
                
                <Button
                  variant="outline"
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>
            </div>
          </CardFooter>
          
          {/* Apply Dialog */}
          <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
            <DialogContent className="sm:max-w-md !z-[100] relative">
              <DialogHeader>
                <DialogTitle>Apply for Job</DialogTitle>
                <DialogDescription>
                  Submit your application for "{job.title}"
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="hourly-rate" className="text-sm font-medium">
                    Your Hourly Rate (USD)
                  </label>
                  <Input
                    id="hourly-rate"
                    type="number"
                    placeholder="25.00"
                    value={proposedRate}
                    onChange={(e) => setProposedRate(e.target.value)}
                  />
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="duration" className="text-sm font-medium">
                    Expected Duration
                  </label>
                  <Input
                    id="duration"
                    placeholder="e.g. 2-3 hours"
                    value={expectedDuration}
                    onChange={(e) => setExpectedDuration(e.target.value)}
                  />
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="message" className="text-sm font-medium">
                    Message to Job Poster
                  </label>
                  <Textarea
                    id="message"
                    placeholder="Introduce yourself and explain why you're a good fit for this job..."
                    value={applicationMessage}
                    onChange={(e) => setApplicationMessage(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleApply} disabled={applyMutation.isPending}>
                  {applyMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Application
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Location Verification Error Dialog */}
          <AlertDialog open={showLocationVerificationError} onOpenChange={setShowLocationVerificationError}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-destructive" />
                  Location Verification Failed
                </AlertDialogTitle>
                <AlertDialogDescription>
                  You need to be physically at the job location to start work. 
                  {distanceToJob && (
                    <div className="mt-2">
                      <span className="font-medium">You are currently:</span> {distanceToJob} feet away
                      <br/>
                      <span className="font-medium">Required distance:</span> Within 500 feet
                    </div>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction onClick={() => setShowLocationVerificationError(false)}>
                  OK
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          {/* Job Completion Confirmation Dialog */}
          <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-2 text-green-600" />
                  Complete Job
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to mark this job as completed? This will notify the job poster and initiate the payment process.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={confirmCompleteJob}
                >
                  Yes, Complete Job
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          {/* Worker Location Map Component (would need to be implemented with a mapping library) */}
          {showWorkerMap && job?.status === 'in_progress' && (
            <div className="absolute inset-x-0 bottom-0 left-0 right-0 bg-background border-t border-border p-4 rounded-t-lg shadow-lg z-50" style={{height: '200px'}}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium flex items-center">
                  <Navigation className="h-4 w-4 mr-2 text-primary" />
                  Worker Location
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowWorkerMap(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="bg-muted h-[120px] rounded-md flex items-center justify-center">
                <div className="text-center text-muted-foreground text-sm">
                  <Compass className="h-6 w-6 mx-auto mb-2" />
                  <p>Worker location tracking would appear here</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default JobDetailsCard;