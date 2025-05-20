import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { CheckCircle2, ArrowRight, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface PostJobSuccessModalProps {
  open: boolean;
  onClose: () => void;
  jobId: number;
  jobTitle: string;
  isPaymentError?: boolean;
  errorMessage?: string;
}

const PostJobSuccessModal: React.FC<PostJobSuccessModalProps> = ({
  open,
  onClose,
  jobId,
  jobTitle,
  isPaymentError = false,
  errorMessage = "Payment could not be processed",
}) => {
  const [, navigate] = useLocation();
  const [jobStatus, setJobStatus] = useState<string>('pending');
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  // Fetch the latest job status when the modal opens
  useEffect(() => {
    if (open && jobId) {
      fetchJobStatus();
    }
  }, [open, jobId]);

  const fetchJobStatus = async () => {
    if (!jobId) return;
    
    setIsLoadingStatus(true);
    try {
      const response = await apiRequest('GET', `/api/jobs/${jobId}`);
      if (response.ok) {
        const jobData = await response.json();
        setJobStatus(jobData.status);
      }
    } catch (error) {
      console.error('Error fetching job status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleViewJob = () => {
    // First close the modal
    onClose();
    
    // Use setTimeout to ensure the modal is fully closed before navigation
    setTimeout(() => {
      // Open job details via JobDetailsCard component
      window.dispatchEvent(new CustomEvent('open-job-details', { 
        detail: { jobId: jobId }
      }));
    }, 100);
  };

  const handleFindMore = () => {
    navigate('/');
    onClose();
  };

  const handleRetryPayment = () => {
    // First close the modal
    onClose();
    
    // Use setTimeout to ensure the modal is fully closed before navigation
    setTimeout(() => {
      // Open payment methods dialog for the job
      window.dispatchEvent(new CustomEvent('retry-job-payment', { 
        detail: { jobId: jobId }
      }));
    }, 100);
  };

  // Determine if this is a payment success or error
  const isSuccess = !isPaymentError && (jobStatus === 'open' || jobStatus === 'assigned');
  const isFailure = isPaymentError || jobStatus === 'payment_failed';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <div className="space-y-6 pt-4">
          {/* Header Icon - Different for success vs failure */}
          <div className="flex items-center justify-center">
            <div className={`rounded-full ${isSuccess ? 'bg-green-100' : 'bg-red-100'} p-3`}>
              {isSuccess ? (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
            </div>
          </div>
          
          {/* Title and description - Different for success vs failure */}
          <div className="text-center">
            {isSuccess ? (
              <>
                <h3 className="text-xl font-semibold text-green-700">Job Posted Successfully!</h3>
                <p className="mt-2 text-gray-600">
                  "{jobTitle}" has been posted and is now available for workers to view and apply
                </p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-red-700">Payment Failed</h3>
                <p className="mt-2 text-gray-600">
                  Your job "{jobTitle}" was created but the payment could not be processed
                </p>
                <p className="mt-1 text-red-500 text-sm">
                  {errorMessage}
                </p>
              </>
            )}
          </div>
          
          {/* Status Card - Different for success vs failure */}
          <Card className="p-4 bg-gray-50 border border-gray-200">
            <div className="space-y-4">
              {/* Payment Status */}
              <div className="flex items-center">
                <div className={`${isSuccess ? 'bg-green-100' : 'bg-red-100'} rounded-full p-1.5 mr-3`}>
                  {isSuccess ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Payment {isSuccess ? 'Processed' : 'Failed'}</p>
                  <p className="text-sm text-gray-500">
                    {isSuccess 
                      ? 'Your payment has been securely processed' 
                      : 'Your card was declined. Please try another payment method'
                    }
                  </p>
                </div>
              </div>
              
              {/* Job Status */}
              <div className="flex items-center">
                {isLoadingStatus ? (
                  <div className="bg-blue-100 rounded-full p-1.5 mr-3">
                    <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                  </div>
                ) : (
                  <div className={`${isSuccess ? 'bg-green-100' : 'bg-amber-100'} rounded-full p-1.5 mr-3`}>
                    {isSuccess ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    )}
                  </div>
                )}
                <div>
                  <p className="font-medium">Job Status: {jobStatus.replace('_', ' ').toUpperCase()}</p>
                  <p className="text-sm text-gray-500">
                    {isSuccess 
                      ? 'Your job is now visible to potential workers' 
                      : 'Your job is on hold until payment is complete'
                    }
                  </p>
                </div>
              </div>
              
              {/* Next Steps */}
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-full p-1.5 mr-3">
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">
                    {isSuccess ? 'Next: Review Applications' : 'Next: Complete Payment'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {isSuccess 
                      ? 'You\'ll be notified when workers apply' 
                      : 'Update your payment method to activate your job posting'
                    }
                  </p>
                </div>
              </div>
              
              {/* Show fee info */}
              <div className="mt-3 p-2 bg-blue-50 rounded-md text-xs text-blue-800">
                <p>Your payment includes the job cost plus a $2.50 service fee to help maintain the platform.</p>
              </div>
            </div>
          </Card>
          
          {/* Different buttons for success vs failure */}
          <div className="flex space-x-3 pt-2">
            {isSuccess ? (
              <>
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={handleFindMore}
                >
                  Go to Home
                </Button>
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700" 
                  onClick={handleViewJob}
                >
                  View Job Details
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={onClose}
                >
                  Close
                </Button>
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700" 
                  onClick={handleRetryPayment}
                >
                  Update Payment Method
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostJobSuccessModal;