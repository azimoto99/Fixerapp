import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDistance, formatDateTime, getCategoryIcon, getCategoryColor } from '@/lib/utils';
import { Job, Earning, Review } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import TaskList from './TaskList';
import ReviewForm from './ReviewForm';
import ReviewsList from './ReviewsList';
import PaymentNotification from './PaymentNotification';
import JobPayment from './JobPayment';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, CheckCircle2, MessageCircle, Star } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface JobDetailProps {
  job: Job;
  distance?: number;
  onClose?: () => void;
}

const JobDetail: React.FC<JobDetailProps> = ({ job, distance = 0.5, onClose }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isApplying, setIsApplying] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('details');
  
  const {
    id: jobId,
    title,
    description,
    category,
    paymentType,
    paymentAmount,
    serviceFee = 2.50, // Default service fee if not provided
    totalAmount = paymentAmount + serviceFee, // Calculate total if not provided
    location,
    dateNeeded,
    requiredSkills,
    equipmentProvided,
    posterId,
    status
  } = job;

  const categoryColor = getCategoryColor(category);
  const categoryIcon = getCategoryIcon(category);
  
  // Determine if user is assigned worker
  const isAssignedWorker = user?.id === job.workerId;
  
  // Determine if user is job poster
  const isJobPoster = user?.id === job.posterId;
  
  // Determine if job is in progress (assigned to worker but not completed)
  const isJobInProgress = status === 'in_progress' || status === 'assigned';
  
  // Determine if job is completed
  const isJobCompleted = status === 'completed';
  
  // Check if the current user has already reviewed this job
  const { data: hasReviewed } = useQuery({
    queryKey: ['/api/reviews/job', job.id, 'user-has-reviewed', user?.id],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', `/api/reviews/job/${job.id}`);
        const reviews = await res.json();
        return reviews.some((review: Review) => review.reviewerId === user?.id);
      } catch (error) {
        return false;
      }
    },
    enabled: !!(user && isJobCompleted && (isAssignedWorker || isJobPoster)),
  });
  
  // Apply for job mutation
  const handleApply = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to apply for this job",
        variant: "destructive"
      });
      return;
    }
    
    if (user.accountType !== 'worker') {
      toast({
        title: "Worker Account Required",
        description: "You need a worker account to apply for jobs",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsApplying(true);
      await apiRequest('POST', '/api/applications', {
        jobId: job.id,
        workerId: user.id,
        message: "I'm interested in this job!"
      });
      
      toast({
        title: "Application Submitted",
        description: "Your application has been submitted successfully"
      });
    } catch (error) {
      toast({
        title: "Application Failed",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsApplying(false);
    }
  };
  
  // Complete job mutation
  const completeJobMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PATCH', `/api/jobs/${jobId}`, {
        status: 'completed'
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      
      toast({
        title: "Job Completed",
        description: "The job has been marked as completed. Your payment will be processed soon.",
      });
      
      // Create an earning record for this job
      createEarningMutation.mutate();
      
      // Show the review form
      setShowReviewForm(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error Completing Job",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // State for payment notification
  const [showPaymentNotification, setShowPaymentNotification] = useState(false);
  const [earnedPayment, setEarnedPayment] = useState<(Earning & { job?: Job }) | null>(null);
  
  // Create earning mutation
  const createEarningMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/earnings', {
        jobId: job.id,
        workerId: user?.id,
        amount: paymentAmount,
        status: 'pending'
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/earnings/worker', user?.id] });
      
      // Show the payment notification with the job details
      setEarnedPayment({ ...data, job });
      setShowPaymentNotification(true);
    },
    onError: (error: Error) => {
      console.error("Error creating earning record:", error);
      // We don't show this error to the user since the job was already marked complete
    }
  });

  return (
    <div className="bg-white">
      {/* Payment notification overlay */}
      {showPaymentNotification && earnedPayment && (
        <PaymentNotification
          earning={earnedPayment}
          onDismiss={() => setShowPaymentNotification(false)}
        />
      )}
      
      {showReviewForm ? (
        <div className="p-4">
          <ReviewForm 
            job={job} 
            onComplete={() => setShowReviewForm(false)}
          />
        </div>
      ) : (
        <div>
          {/* Tabs for job details and reviews */}
          <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
            <div className="px-5 pt-3">
              <TabsList className="w-full mb-2">
                <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                <TabsTrigger value="reviews" className="flex-1">Reviews</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="details" className="px-5 py-3">
              {/* Title and location */}
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                
                {/* Status badge */}
                <Badge 
                  className={`${
                    isJobCompleted 
                      ? 'bg-green-100 text-green-800' 
                      : isJobInProgress 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {isJobCompleted 
                    ? 'Completed' 
                    : isJobInProgress 
                      ? 'In Progress' 
                      : 'Open'}
                </Badge>
              </div>
              
              <div className="flex items-center mb-3">
                <span 
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full mr-1 animate-bounce-in"
                  style={{ backgroundColor: categoryColor || '#3b82f6' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                    {categoryIcon}
                  </svg>
                </span>
                <span className="text-sm text-gray-600">{category}</span>
                <span className="mx-2 text-gray-300">•</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-500 mr-1">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="text-sm text-gray-600">{formatDistance(distance)} away</span>
              </div>
              
              {/* Payment info in a card - DoorDash-style */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100 animate-bounce-in">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-gray-500">Payment</div>
                    <div className="font-bold text-lg text-gray-900">
                      {formatCurrency(paymentAmount)}{paymentType === 'hourly' ? '/hr' : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Service Fee</div>
                    <div className="font-medium text-gray-700">
                      {formatCurrency(serviceFee)}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                  <div className="text-sm font-medium text-gray-600">
                    Total
                  </div>
                  <div className="font-bold text-green-600">
                    {formatCurrency(totalAmount)}{paymentType === 'hourly' ? '/hr' : ''}
                  </div>
                </div>
              </div>
              
              {/* Complete Job button for assigned worker */}
              {isAssignedWorker && isJobInProgress && (
                <div className="mb-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        className="w-full"
                        variant="default"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark Job as Complete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Job Completion</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to mark this job as complete? This will notify the job poster and process your payment.
                          Make sure you have completed all required tasks.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => completeJobMutation.mutate()}
                          disabled={completeJobMutation.isPending}
                        >
                          {completeJobMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            "Yes, Mark Complete"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
              
              {/* Payment section for job poster */}
              {isJobPoster && isJobInProgress && (
                <div className="mb-4">
                  <JobPayment 
                    job={job}
                    onPaymentComplete={() => {
                      // Refresh job data
                      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}`] });
                      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
                      
                      // Show the review form when payment is complete
                      setShowReviewForm(true);
                    }}
                  />
                </div>
              )}
              
              {/* Leave Review button for completed jobs */}
              {isJobCompleted && (isAssignedWorker || isJobPoster) && !hasReviewed && (
                <div className="mb-4">
                  <Button 
                    className="w-full"
                    variant="outline"
                    onClick={() => setShowReviewForm(true)}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Leave a Review
                  </Button>
                </div>
              )}
              
              {/* Date and time */}
              <div className="flex items-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-500 mr-2">
                  <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1.5" />
                  <path d="M16 2v4" />
                  <path d="M8 2v4" />
                  <path d="M3 10h18" />
                  <path d="M18 14v4h-4" />
                  <path d="M15 14h3v3" />
                </svg>
                <div className="text-sm text-gray-700">{formatDateTime(dateNeeded)}</div>
              </div>
              
              {/* Job description */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Description</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
              </div>
              
              {/* Location */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Location</h4>
                <div className="bg-gray-50 rounded-lg overflow-hidden h-24 flex items-center justify-center mb-1">
                  <div className="text-sm text-gray-500">Map location preview</div>
                </div>
                <p className="text-sm text-gray-700">{location}</p>
              </div>
              
              {/* Skills tags */}
              {requiredSkills && requiredSkills.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Skills Required</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {requiredSkills.map((skill, index) => (
                      <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Equipment */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Equipment</h4>
                <div className="flex items-center text-sm text-gray-700">
                  {equipmentProvided ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-green-500 mr-2">
                        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
                        <path d="m9 12 2 2 4-4"/>
                      </svg>
                      All equipment provided by job poster
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-amber-500 mr-2">
                        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
                        <path d="M12 8v4"/>
                        <path d="M12 16h.01"/>
                      </svg>
                      Worker must provide equipment
                    </>
                  )}
                </div>
              </div>
              
              {/* Task checklist */}
              <div className="mb-12"> {/* Extra margin at bottom for the fixed Apply button */}
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Job Tasks</h4>
                <TaskList 
                  jobId={job.id} 
                  isJobPoster={isJobPoster}
                  isWorker={isAssignedWorker}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="reviews" className="px-5 py-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Reviews</h3>
                {isJobCompleted && (isAssignedWorker || isJobPoster) && !hasReviewed && (
                  <Button 
                    size="sm"
                    onClick={() => setShowReviewForm(true)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Write a Review
                  </Button>
                )}
              </div>
              <ReviewsList jobId={job.id} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default JobDetail;
