import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import PayPalPaymentForm from "@/components/payments/PayPalPaymentForm";

interface Job {
  id: number;
  title: string;
  payAmount: number;
  posterId: number;
  workerId: number | null;
  status: string;
  paymentAmount?: number;
  serviceFee?: number;
}

export default function Checkout() {
  const [jobData, setJobData] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  
  // Get job ID from URL params or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('jobId') || localStorage.getItem('checkoutJobId');

  useEffect(() => {
    if (!jobId) {
      setError("No job ID provided for checkout");
      setIsLoading(false);
      return;
    }

    // Store jobId in localStorage as a backup
    localStorage.setItem('checkoutJobId', jobId);

    // Get job details
    const fetchJobDetails = async () => {
      try {
        const jobResponse = await apiRequest('GET', `/api/jobs/${jobId}`);
        if (!jobResponse.ok) {
          throw new Error('Failed to load job details');
        }
        
        const jobDetails = await jobResponse.json();
        // Map the job data to match the Job interface
        const mappedJobData: Job = {
          id: jobDetails.id,
          title: jobDetails.title,
          payAmount: jobDetails.paymentAmount || jobDetails.payAmount,
          posterId: jobDetails.posterId,
          workerId: jobDetails.workerId,
          status: jobDetails.status,
          paymentAmount: jobDetails.paymentAmount,
          serviceFee: jobDetails.serviceFee || 2.5
        };
        setJobData(mappedJobData);
      } catch (err) {
        console.error('Error in checkout process:', err);
        setError((err as Error).message || 'An error occurred during checkout');
        toast({
          title: "Checkout Error",
          description: (err as Error).message || 'Failed to process checkout',
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobDetails();
  }, [jobId, toast]);

  const handlePaymentSuccess = () => {
    localStorage.removeItem('checkoutJobId');
    toast({
      title: "Payment Successful",
      description: "Your payment has been processed successfully.",
    });
    navigate('/payment-success');
  };

  const handlePaymentCancel = () => {
    toast({
      title: "Payment Cancelled",
      description: "You cancelled the payment process.",
    });
    navigate('/jobs');
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-lg">Preparing your checkout...</p>
        </div>
      </div>
    );
  }

  if (error || !jobData) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              Checkout Error
            </CardTitle>
            <CardDescription>We encountered a problem with your checkout</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error || 'Unable to load job details for checkout'}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/jobs')} className="w-full">
              Return to Jobs
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <PayPalPaymentForm 
        job={jobData} 
        onSuccess={handlePaymentSuccess} 
        onCancel={handlePaymentCancel}
      />
    </div>
  );
}