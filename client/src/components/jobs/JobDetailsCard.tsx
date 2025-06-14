import React, { useState, useEffect } from 'react';
import Portal from '@/components/Portal';
import { createPortal } from 'react-dom';
import { MessagingInterface } from '@/components/MessagingInterface';
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
  CheckCircle,
  XCircle,
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
  Compass,
  MessageSquare,
  Phone,
  Video,
  FileText,
  Save,
  Star,
  TrendingUp,
  Users,
  Bell
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
import { useGeolocation } from '@/hooks/use-react-geolocated';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import application management tab
import JobApplicationsTab from './JobApplicationsTab';
import { InstantApplyButton } from '../applications/InstantApplyButton';
import { RealTimeApplicationsDashboard } from '../applications/RealTimeApplicationsDashboard';
import '../jobcard-fix.css';
import '../ui/dialog-fix.css';
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
  const { userLocation, refreshLocation } = useGeolocation();
  const [isExpanded, setIsExpanded] = useState(true);

  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [showLocationVerificationError, setShowLocationVerificationError] = useState(false);
  const [distanceToJob, setDistanceToJob] = useState<number | null>(null);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [showWorkerMap, setShowWorkerMap] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    paymentAmount: '',
    estimatedHours: '',
    location: ''
  });

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

  // Fetch poster details
  const { data: poster } = useQuery({
    queryKey: ['/api/users', job?.posterId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/users/${job?.posterId}`);
      if (!response.ok) {
        return null;
      }
      return response.json();
    },
    enabled: isOpen && !!job?.posterId,
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
    queryKey: [`/api/applications/job/${jobId}`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/applications/job/${jobId}`);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return data.applications || [];
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
    onSuccess: (data, variables) => {
      // Invalidate job queries to reflect updated status
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId] });
      
      setIsCheckingLocation(false);
      setShowLocationVerificationError(false);
      
      // Different toast messages based on the status transition
      let title, description;
      
      switch(variables.status) {
        case 'in_progress':
          title = 'Job Started';
          description = 'You have started working on this job';
          break;
        case 'completed':
          title = 'Job Completed';
          description = 'You have marked this job as complete';
          break;
        default:
          title = 'Job Updated';
          description = 'Job status has been updated successfully.';
      }
      
      toast({ title, description });
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
  


  // Application management mutations
  const acceptApplicationMutation = useMutation({
    mutationFn: async (applicationId: number) => {
      const response = await apiRequest('PATCH', `/api/applications/${applicationId}/status`, {
        status: 'accepted'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to accept application');
      }
      return response.json();
    },
    onSuccess: (data, applicationId) => {
      const application = applications.find(app => app.id === applicationId);
      if (application) {
        toast({
          title: "🎉 Application Accepted!",
          description: `You've selected ${application.worker?.fullName || application.worker?.username} for this job!`,
          duration: 5000,
        });
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/applications/job/${jobId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Accept",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const rejectApplicationMutation = useMutation({
    mutationFn: async (applicationId: number) => {
      const response = await apiRequest('PATCH', `/api/applications/${applicationId}/status`, {
        status: 'rejected'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reject application');
      }
      return response.json();
    },
    onSuccess: (data, applicationId) => {
      toast({
        title: "Application Rejected",
        description: "The application has been rejected.",
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/applications/job/${jobId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Reject",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Initialize edit form data when job loads
  useEffect(() => {
    if (job && user?.id === job.posterId) {
      setEditFormData({
        title: job.title || '',
        description: job.description || '',
        paymentAmount: job.paymentAmount?.toString() || '',
        estimatedHours: job.estimatedHours?.toString() || '',
        location: job.location || ''
      });
    }
  }, [job, user?.id]);

  // Edit job mutation
  const editJobMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PUT', `/api/jobs/${jobId}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update job');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId] });
      setShowEditForm(false);
      toast({
        title: "Job Updated Successfully",
        description: "Your job details have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSaveEditJob = () => {
    const updatedData = {
      title: editFormData.title,
      description: editFormData.description,
      paymentAmount: parseFloat(editFormData.paymentAmount),
      estimatedHours: editFormData.estimatedHours ? parseFloat(editFormData.estimatedHours) : null,
      location: editFormData.location
    };
    editJobMutation.mutate(updatedData);
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
      const distanceInMiles = calculateDistance(
        location.latitude,
        location.longitude,
        job.latitude,
        job.longitude
      );

      // Convert miles to feet for comparison
      const distanceInFeet = Math.round(distanceInMiles * 5280);
      setDistanceToJob(distanceInFeet);

      // Worker must be within 500 feet of the job location
      if (distanceInFeet <= 500) {
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
  
  // Handle job completion - show confirmation dialog
  const handleCompleteJob = () => {
    setShowCompleteDialog(true);
  };
  
  // Confirm job completion and update status after user confirmation
  const confirmCompleteJob = () => {
    updateJobStatusMutation.mutate({
      status: 'completed'
    });
    setShowCompleteDialog(false);
  };

  // Clear state when component unmounts or job changes
  useEffect(() => {
    if (!isOpen) {
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
    
    const completedCount = tasks.filter((task: { isCompleted: boolean }) => task.isCompleted).length;
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
    <>
      <AnimatePresence>
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 flex justify-center"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={variants}
        >
        <Card className="w-full max-w-3xl shadow-lg border rounded-xl overflow-hidden relative">
          {/* Single Close Button */}
          <div 
            className="absolute right-4 top-3 z-10 cursor-pointer rounded-full bg-background/80 backdrop-blur-sm p-1 shadow-sm border"
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
                    <>
                      <button
                        className={`px-3 py-2 ${activeTab === 'applications' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'} transition-colors`}
                        onClick={() => setActiveTab('applications')}
                      >
                        Applications {applications.length > 0 && `(${applications.length})`}
                      </button>
                      <button
                        className={`px-3 py-2 ${activeTab === 'manage' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'} transition-colors`}
                        onClick={() => setActiveTab('manage')}
                      >
                        <Briefcase className="h-4 w-4 mr-1" />
                        Manage
                      </button>
                    </>
                  )}
                  {/* Enhanced worker view tabs */}
                  {!isJobPoster && user?.accountType === 'worker' && (
                    <>
                      {/* Messages tab available to all workers */}
                      <button
                        className={`px-3 py-2 ${activeTab === 'messages' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'} transition-colors`}
                        onClick={() => setActiveTab('messages')}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Messages
                      </button>

                      {/* Worker info tab only for applied/assigned workers */}
                      {(hasApplied || (job?.workerId && job.workerId === user?.id)) && (
                        <button
                          className={`px-3 py-2 ${activeTab === 'worker-info' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'} transition-colors`}
                          onClick={() => setActiveTab('worker-info')}
                        >
                          <Briefcase className="h-4 w-4 mr-1" />
                          My Work
                        </button>
                      )}
                    </>
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
                          
                          {job.paymentType === 'hourly' && job.shiftStartTime && job.shiftEndTime && (
                            <div className="mt-1 text-sm">
                              <span className="text-muted-foreground">Shift: </span>
                              {job.shiftStartTime} - {job.shiftEndTime}
                            </div>
                          )}
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
                                // Center map on this job's location without breaking pin functionality
                                window.dispatchEvent(new CustomEvent('center-map-on-location', { 
                                  detail: { 
                                    latitude: job.latitude, 
                                    longitude: job.longitude 
                                  }
                                }));
                                // Don't close the job details card - keep it open
                              }}
                            >
                              <MapPin className="h-3 w-3 mr-1" />
                              Show on Map
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Posted By Section */}
                    <div className="mt-4">
                      <h3 className="text-md font-medium mb-2">Posted By</h3>
                      <div className="bg-muted/30 rounded-lg p-4 border flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {poster?.fullName || poster?.username || `User #${job.posterId}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Job Poster
                            </p>
                          </div>
                        </div>
                        {user && user.id !== job.posterId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Switch to messages tab to enable job-based messaging
                              setActiveTab('messages');
                            }}
                            className="text-xs"
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Message
                          </Button>
                        )}
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
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Applications
                        {applications.length > 0 && (
                          <Badge variant="secondary">{applications.length}</Badge>
                        )}
                      </h3>

                      {applications.filter(app => app.status === 'pending').length > 0 && (
                        <Badge className="bg-blue-100 text-blue-800">
                          <Bell className="h-3 w-3 mr-1" />
                          {applications.filter(app => app.status === 'pending').length} pending
                        </Badge>
                      )}
                    </div>

                    {applications.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-medium mb-2">No applications yet</h3>
                        <p className="text-sm text-muted-foreground">
                          Applications will appear here as workers apply for your job.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Pending Applications */}
                        {applications.filter(app => app.status === 'pending').map((application) => (
                          <Card key={application.id} className="border-l-4 border-l-blue-400">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-6 w-6 text-primary" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-medium">
                                        {application.worker?.fullName || application.worker?.username || 'Worker'}
                                      </h4>
                                      {application.worker?.rating && (
                                        <div className="flex items-center gap-1">
                                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                          <span className="text-xs text-muted-foreground">
                                            {application.worker.rating.toFixed(1)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {application.coverLetter || application.message || 'No message provided'}
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <DollarSign className="h-3 w-3" />
                                        ${application.hourlyRate}/hour
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {application.expectedDuration}
                                      </span>
                                      <span>
                                        Applied {format(new Date(application.dateApplied), 'MMM d, h:mm a')}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2 ml-4">
                                  <Button
                                    size="sm"
                                    onClick={() => acceptApplicationMutation.mutate(application.id)}
                                    disabled={acceptApplicationMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => rejectApplicationMutation.mutate(application.id)}
                                    disabled={rejectApplicationMutation.isPending}
                                    className="border-red-200 text-red-600 hover:bg-red-50"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}

                        {/* Accepted Applications */}
                        {applications.filter(app => app.status === 'accepted').length > 0 && (
                          <div className="pt-4">
                            <h4 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              Accepted
                            </h4>
                            {applications.filter(app => app.status === 'accepted').map((application) => (
                              <Card key={application.id} className="border-l-4 border-l-green-400">
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                      <CheckCircle className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                      <h4 className="font-medium">
                                        {application.worker?.fullName || application.worker?.username || 'Worker'}
                                      </h4>
                                      <p className="text-sm text-muted-foreground">
                                        Accepted • ${application.hourlyRate}/hour
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}

                        {/* Rejected Applications */}
                        {applications.filter(app => app.status === 'rejected').length > 0 && (
                          <div className="pt-4">
                            <h4 className="font-medium text-muted-foreground mb-2 flex items-center gap-2">
                              <XCircle className="h-4 w-4" />
                              Rejected
                            </h4>
                            {applications.filter(app => app.status === 'rejected').map((application) => (
                              <Card key={application.id} className="border-l-4 border-l-gray-300 opacity-60">
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                      <XCircle className="h-5 w-5 text-gray-500" />
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-muted-foreground">
                                        {application.worker?.fullName || application.worker?.username || 'Worker'}
                                      </h4>
                                      <p className="text-sm text-muted-foreground">
                                        Rejected • ${application.hourlyRate}/hour
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Messages Tab Content - Real-time job conversations for all workers */}
                {activeTab === 'messages' && user && !isJobPoster && user.accountType === 'worker' && job && poster && (
                  <div className="h-96 border rounded-lg overflow-hidden">
                    <MessagingInterface
                      key={job.id}
                      jobId={job.id}
                      recipientId={job.posterId}
                      recipientName={poster.fullName || poster.username}
                      recipientAvatar={poster.avatarUrl}
                      currentUserId={user.id}
                      className="h-full"
                    />
                  </div>
                )}

                {/* Manage Tab Content - Enhanced job poster controls */}
                {activeTab === 'manage' && isJobPoster && (
                  <div className="space-y-6">
                    {/* Job Status Overview */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Applications</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{applications.length}</p>
                          </div>
                          <User className="h-8 w-8 text-blue-500" />
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-700 dark:text-green-300">Status</p>
                            <p className="text-lg font-bold text-green-900 dark:text-green-100 capitalize">{job.status}</p>
                          </div>
                          <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <Edit className="h-5 w-5 mr-2 text-primary" />
                        Quick Actions
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {job.status === 'open' && !job.workerId && (
                          <>
                            <Button 
                              variant="outline" 
                              className="w-full" 
                              onClick={() => setShowEditForm(true)}
                              disabled={editJobMutation.isPending}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Job Details
                            </Button>
                            <Button variant="outline" className="w-full" onClick={() => {
                              toast({
                                title: "Job Boosted!",
                                description: "Your job visibility has been increased for 24 hours.",
                              });
                            }}>
                              <TrendingUp className="h-4 w-4 mr-2" />
                              Boost Visibility
                            </Button>
                          </>
                        )}
                        
                        {job.status === 'assigned' && (
                          <Button variant="outline" className="w-full" onClick={() => setShowWorkerMap(true)}>
                            <MapIcon className="h-4 w-4 mr-2" />
                            Track Worker
                          </Button>
                        )}
                        
                        <Button variant="outline" className="w-full" onClick={() => {
                          toast({
                            title: "Analytics Dashboard",
                            description: "Detailed job analytics coming soon in the next update!",
                          });
                        }}>
                          <Timer className="h-4 w-4 mr-2" />
                          View Analytics
                        </Button>
                      </div>
                    </div>

                    {/* Job Performance Metrics */}
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <CheckCircle2 className="h-5 w-5 mr-2 text-primary" />
                        Performance Metrics
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Posted</span>
                          <span className="text-sm font-medium">{format(new Date(job.datePosted), 'MMM d, yyyy')}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Days Active</span>
                          <span className="text-sm font-medium">
                            {Math.floor((new Date().getTime() - new Date(job.datePosted).getTime()) / (1000 * 60 * 60 * 24))} days
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Applications Rate</span>
                          <span className="text-sm font-medium">
                            {applications.length > 0 ? `${applications.length} received` : 'No applications yet'}
                          </span>
                        </div>
                        
                        {tasks.length > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Task Progress</span>
                            <span className="text-sm font-medium">
                              {tasks.filter(t => t.isCompleted).length}/{tasks.length} completed
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment & Budget Tracking */}
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <DollarSign className="h-5 w-5 mr-2 text-primary" />
                        Payment & Budget
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Job Budget</span>
                          <span className="text-lg font-bold text-green-600">
                            ${job.paymentAmount.toFixed(2)} {job.paymentType === 'hourly' ? '/hour' : 'total'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Payment Status</span>
                          <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>
                            {job.status === 'completed' ? 'Payment Due' : 'Pending Completion'}
                          </Badge>
                        </div>
                        
                        {job.estimatedHours && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Estimated Total</span>
                            <span className="text-sm font-medium">
                              ${(job.paymentAmount * job.estimatedHours).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Advanced Controls */}
                    {job.status === 'open' && applications.length === 0 && (
                      <div className="border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">No Applications Yet</h4>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                              Consider adjusting your job details or payment to attract more workers.
                            </p>
                            <div className="mt-3 flex space-x-2">
                              <Button size="sm" variant="outline" className="text-yellow-700 border-yellow-300 hover:bg-yellow-100">
                                Edit Payment
                              </Button>
                              <Button size="sm" variant="outline" className="text-yellow-700 border-yellow-300 hover:bg-yellow-100">
                                Update Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Worker Information Tab - Dedicated worker dashboard */}
                {activeTab === 'worker-info' && !isJobPoster && user?.accountType === 'worker' && (
                  <div className="space-y-6">
                    {/* Application Status Overview */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">My Status</p>
                            <p className="text-lg font-bold text-purple-900 dark:text-purple-100 capitalize">
                              {job.workerId === user?.id ? 'Assigned' : hasApplied ? 'Applied' : 'Available'}
                            </p>
                          </div>
                          <User className="h-8 w-8 text-purple-500" />
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-orange-700 dark:text-orange-300">My Earnings</p>
                            <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                              ${job.paymentAmount.toFixed(2)}
                            </p>
                          </div>
                          <DollarSign className="h-8 w-8 text-orange-500" />
                        </div>
                      </div>
                    </div>

                    {/* Work Progress Tracking */}
                    {job.workerId === user?.id && (
                      <div className="border rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                          <CheckCircle2 className="h-5 w-5 mr-2 text-primary" />
                          Work Progress
                        </h3>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Job Status</span>
                            <Badge variant={job.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                              {job.status}
                            </Badge>
                          </div>
                          
                          {tasks.length > 0 && (
                            <>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Tasks Completed</span>
                                <span className="text-sm font-medium">
                                  {tasks.filter(t => t.isCompleted).length} / {tasks.length}
                                </span>
                              </div>
                              
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                                  style={{ 
                                    width: `${tasks.length > 0 ? (tasks.filter(t => t.isCompleted).length / tasks.length) * 100 : 0}%` 
                                  }}
                                ></div>
                              </div>
                            </>
                          )}
                          
                          {job.startedAt && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Started</span>
                              <span className="text-sm font-medium">
                                {format(new Date(job.startedAt), 'MMM d, yyyy h:mm a')}
                              </span>
                            </div>
                          )}
                          
                          {job.paymentType === 'hourly' && job.startedAt && job.status === 'in_progress' && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Time Elapsed</span>
                              <span className="text-sm font-medium text-blue-600">
                                {Math.floor((new Date().getTime() - new Date(job.startedAt).getTime()) / (1000 * 60))} minutes
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Application Details */}
                    {hasApplied && applications.find((app: any) => app.workerId === user?.id) && (
                      <div className="border rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                          <FileText className="h-5 w-5 mr-2 text-primary" />
                          My Application
                        </h3>
                        
                        <div className="space-y-3">
                          {(() => {
                            const userApp = applications.find((app: any) => app.workerId === user?.id);
                            return (
                              <>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">Applied On</span>
                                  <span className="text-sm font-medium">
                                    {userApp?.dateApplied ? format(new Date(userApp.dateApplied), 'MMM d, yyyy') : 'Recently'}
                                  </span>
                                </div>
                                
                                {userApp?.hourlyRate && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">My Rate</span>
                                    <span className="text-sm font-medium">${userApp.hourlyRate}/hour</span>
                                  </div>
                                )}
                                
                                {userApp?.expectedDuration && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Expected Duration</span>
                                    <span className="text-sm font-medium">{userApp.expectedDuration}</span>
                                  </div>
                                )}
                                
                                {userApp?.coverLetter && (
                                  <div className="mt-3">
                                    <span className="text-sm text-muted-foreground">Cover Letter</span>
                                    <p className="text-sm mt-1 p-3 bg-muted/50 rounded border text-muted-foreground">
                                      {userApp.coverLetter}
                                    </p>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Payment Information */}
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <DollarSign className="h-5 w-5 mr-2 text-primary" />
                        Payment Details
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Payment Type</span>
                          <Badge variant="outline" className="capitalize">
                            {job.paymentType}
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Amount</span>
                          <span className="text-lg font-bold text-green-600">
                            ${job.paymentAmount.toFixed(2)} {job.paymentType === 'hourly' ? '/hour' : 'total'}
                          </span>
                        </div>
                        
                        {job.estimatedHours && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Estimated Earnings</span>
                            <span className="text-sm font-medium">
                              ${(job.paymentAmount * job.estimatedHours).toFixed(2)}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Payment Status</span>
                          <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>
                            {job.status === 'completed' ? 'Payment Pending' : 'Not Due Yet'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Quick Worker Actions */}
                    {job.workerId === user?.id && job.status === 'in_progress' && (
                      <div className="border rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                          <Clock className="h-5 w-5 mr-2 text-primary" />
                          Quick Actions
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <Button variant="outline" className="w-full" onClick={() => setShowWorkerMap(true)}>
                            <MapIcon className="h-4 w-4 mr-2" />
                            Update Location
                          </Button>
                          <Button variant="outline" className="w-full" onClick={() => setActiveTab('messages')}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Contact Poster
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Performance Tips for Workers */}
                    {!hasApplied && job.workerId !== user?.id && (
                      <div className="border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">Ready to Apply?</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                              Make sure to write a personalized cover letter and set competitive rates to increase your chances!
                            </p>
                          </div>
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
                    {job.location?.city || job.location || 'Remote'}
                  </div>
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex justify-between gap-2">
                {user && user.accountType === 'worker' && !isJobPoster && (
                  <>
                    {/* Worker Actions */}
                    {!hasApplied && job.status === 'open' && (
                      <div className="flex-1">
                        <InstantApplyButton
                          job={job}
                          variant="default"
                          className="w-full"
                        />
                      </div>
                    )}
                    
                    {job.workerId === user.id && job.status === 'assigned' && (
                      <Button
                        className="flex-1 relative z-10 bg-green-600 hover:bg-green-700 text-white font-semibold"
                        onClick={handleStartJob}
                        disabled={isCheckingLocation}
                        size="lg"
                      >
                        {isCheckingLocation ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Verifying Location...
                          </>
                        ) : (
                          <>
                            <PlayCircle className="h-5 w-5 mr-2" />
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

    {/* Render AlertDialogs using portals to ensure they appear above job card */}
    {showLocationVerificationError && createPortal(
      <AlertDialog open={showLocationVerificationError} onOpenChange={setShowLocationVerificationError}>
        <AlertDialogContent className="critical-dialog" style={{ zIndex: 10000 }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-destructive" />
              Location Verification Failed
            </AlertDialogTitle>
            <AlertDialogDescription>
              You need to be physically at the job location to start work.
              {distanceToJob && (
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Current distance:</span>
                    <span className="text-destructive font-bold">{distanceToJob.toLocaleString()} feet</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="font-medium">Required distance:</span>
                    <span className="text-green-600 font-bold">Within 500 feet</span>
                  </div>
                </div>
              )}
              <div className="mt-3 text-sm text-muted-foreground">
                Please move closer to the job location and try again.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel onClick={() => setShowLocationVerificationError(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowLocationVerificationError(false);
                // Retry location verification
                setTimeout(() => handleStartJob(), 500);
              }}
              className="bg-primary hover:bg-primary/90"
            >
              Try Again
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
      document.body
    )}

    {/* Job Completion Confirmation Dialog */}
    {showCompleteDialog && createPortal(
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent className="critical-dialog" style={{ zIndex: 10000 }}>
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
      </AlertDialog>,
      document.body
    )}
  </>
  );
};

export default JobDetailsCard;