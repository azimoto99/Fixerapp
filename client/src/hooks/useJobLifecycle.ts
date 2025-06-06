import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Job, Application } from '@shared/schema';

interface JobLifecycleHooks {
  // Job posting flow
  createJobWithPayment: (jobData: any, paymentData: any) => Promise<Job>;
  
  // Application flow
  applyToJob: (jobId: number, applicationData: any) => Promise<Application>;
  acceptApplication: (applicationId: number) => Promise<Application>;
  rejectApplication: (applicationId: number) => Promise<Application>;
  
  // Job execution flow
  startJob: (jobId: number, location?: { latitude: number; longitude: number }) => Promise<Job>;
  completeJob: (jobId: number) => Promise<Job>;
  cancelJob: (jobId: number, reason?: string) => Promise<void>;
  
  // Payment flow
  processJobPayment: (jobId: number, paymentMethodId: string) => Promise<any>;
  releasePaymentToWorker: (jobId: number) => Promise<any>;
  
  // Review flow
  submitReview: (jobId: number, reviewData: any) => Promise<any>;
}

export function useJobLifecycle(): JobLifecycleHooks {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Job creation with payment integration
  const createJobWithPaymentMutation = useMutation({
    mutationFn: async ({ jobData, paymentData }: { jobData: any; paymentData: any }) => {
      // Step 1: Create the job
      const jobResponse = await apiRequest('POST', '/api/jobs/payment-first', {
        ...jobData,
        paymentMethodId: paymentData.paymentMethodId,
        amount: jobData.paymentAmount
      });
      
      if (!jobResponse.ok) {
        const error = await jobResponse.text();
        throw new Error(error || 'Failed to create job');
      }
      
      return await jobResponse.json();
    },
    onSuccess: (job) => {
      toast({
        title: "Job posted successfully!",
        description: `Your job "${job.title}" is now live and workers can apply.`,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to post job",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Job application flow
  const applyToJobMutation = useMutation({
    mutationFn: async ({ jobId, applicationData }: { jobId: number; applicationData: any }) => {
      const response = await apiRequest('POST', '/api/applications', {
        jobId,
        workerId: user?.id,
        ...applicationData
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to apply to job');
      }
      
      return await response.json();
    },
    onSuccess: (application) => {
      toast({
        title: "Application submitted!",
        description: "Your application has been sent to the job poster.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to apply",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Accept application
  const acceptApplicationMutation = useMutation({
    mutationFn: async (applicationId: number) => {
      const response = await apiRequest('PATCH', `/api/applications/${applicationId}`, {
        status: 'accepted'
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to accept application');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application accepted!",
        description: "The worker has been notified and the job has been assigned.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to accept application",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Reject application
  const rejectApplicationMutation = useMutation({
    mutationFn: async (applicationId: number) => {
      const response = await apiRequest('PATCH', `/api/applications/${applicationId}`, {
        status: 'rejected'
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to reject application');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application rejected",
        description: "The worker has been notified.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject application",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Start job
  const startJobMutation = useMutation({
    mutationFn: async ({ jobId, location }: { jobId: number; location?: { latitude: number; longitude: number } }) => {
      const response = await apiRequest('PUT', `/api/jobs/${jobId}/status`, {
        status: 'in_progress',
        workerLocation: location
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to start job');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Job started!",
        description: "You can now begin working on this job.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start job",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Complete job
  const completeJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const response = await apiRequest('POST', `/api/jobs/${jobId}/complete`);
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to complete job');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Job completed!",
        description: "The job poster has been notified. Payment will be processed automatically.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/earnings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to complete job",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Cancel job
  const cancelJobMutation = useMutation({
    mutationFn: async ({ jobId, reason }: { jobId: number; reason?: string }) => {
      const response = await apiRequest('DELETE', `/api/jobs/${jobId}`, {
        withRefund: true,
        reason
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to cancel job');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Job cancelled",
        description: "The job has been cancelled and any payments have been refunded.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to cancel job",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Process job payment
  const processJobPaymentMutation = useMutation({
    mutationFn: async ({ jobId, paymentMethodId }: { jobId: number; paymentMethodId: string }) => {
      const response = await apiRequest('POST', '/api/payment/process-payment', {
        jobId,
        paymentMethodId,
        amount: 0 // Amount will be determined by the job
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to process payment');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment processed!",
        description: "Your payment has been processed successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Payment failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Release payment to worker
  const releasePaymentMutation = useMutation({
    mutationFn: async (jobId: number) => {
      // This would typically be called automatically when a job is completed
      // But can also be manually triggered by job poster
      const response = await apiRequest('POST', `/api/jobs/${jobId}/release-payment`);
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to release payment');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment released!",
        description: "Payment has been sent to the worker.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/earnings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to release payment",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Submit review
  const submitReviewMutation = useMutation({
    mutationFn: async ({ jobId, reviewData }: { jobId: number; reviewData: any }) => {
      const response = await apiRequest('POST', '/api/reviews', {
        jobId,
        reviewerId: user?.id,
        ...reviewData
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to submit review');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Review submitted!",
        description: "Thank you for your feedback.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit review",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return {
    createJobWithPayment: (jobData: any, paymentData: any) => 
      createJobWithPaymentMutation.mutateAsync({ jobData, paymentData }),
    
    applyToJob: (jobId: number, applicationData: any) => 
      applyToJobMutation.mutateAsync({ jobId, applicationData }),
    
    acceptApplication: (applicationId: number) => 
      acceptApplicationMutation.mutateAsync(applicationId),
    
    rejectApplication: (applicationId: number) => 
      rejectApplicationMutation.mutateAsync(applicationId),
    
    startJob: (jobId: number, location?: { latitude: number; longitude: number }) => 
      startJobMutation.mutateAsync({ jobId, location }),
    
    completeJob: (jobId: number) => 
      completeJobMutation.mutateAsync(jobId),
    
    cancelJob: (jobId: number, reason?: string) => 
      cancelJobMutation.mutateAsync({ jobId, reason }),
    
    processJobPayment: (jobId: number, paymentMethodId: string) => 
      processJobPaymentMutation.mutateAsync({ jobId, paymentMethodId }),
    
    releasePaymentToWorker: (jobId: number) => 
      releasePaymentMutation.mutateAsync(jobId),
    
    submitReview: (jobId: number, reviewData: any) => 
      submitReviewMutation.mutateAsync({ jobId, reviewData })
  };
}