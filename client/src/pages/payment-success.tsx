import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, ArrowRight, Receipt, MapPin } from 'lucide-react';

export default function PaymentSuccess() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [payment, setPayment] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Get the payment_intent from URL
  const urlParams = new URLSearchParams(window.location.search);
  const paymentIntentId = urlParams.get('payment_intent');
  const paymentIntentClientSecret = urlParams.get('payment_intent_client_secret');
  const redirectStatus = urlParams.get('redirect_status');

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        if (!paymentIntentId) {
          setError('No payment information found');
          setIsLoading(false);
          return;
        }

        // Clear any stored checkout job ID as the payment is complete
        localStorage.removeItem('checkoutJobId');

        // Verify the payment with our server
        const paymentResponse = await apiRequest('GET', `/api/stripe/payment-status?payment_intent=${paymentIntentId}`);
        
        if (!paymentResponse.ok) {
          throw new Error('Failed to verify payment status');
        }
        
        const paymentData = await paymentResponse.json();
        setPayment(paymentData);
        
        // If payment has a job ID, fetch the job details
        if (paymentData.jobId) {
          const jobResponse = await apiRequest('GET', `/api/jobs/${paymentData.jobId}`);
          
          if (jobResponse.ok) {
            const jobData = await jobResponse.json();
            setJob(jobData);

            // If the job payment status needs updating, do that
            if (jobData.paymentStatus !== 'paid' && redirectStatus === 'succeeded') {
              try {
                await apiRequest('PATCH', `/api/jobs/${jobData.id}`, {
                  paymentStatus: 'paid'
                });
              } catch (updateError) {
                console.error('Failed to update job payment status:', updateError);
              }
            }
          }
        }
        
        // Show success toast
        if (redirectStatus === 'succeeded') {
          toast({
            title: "Payment Successful!",
            description: "Your payment has been processed successfully.",
          });
        }
      } catch (err) {
        console.error('Error fetching payment details:', err);
        setError((err as Error).message || 'An error occurred while retrieving payment details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [paymentIntentId, toast, redirectStatus]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-lg">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card>
          <CardHeader>
            <CardTitle>Payment Verification Failed</CardTitle>
            <CardDescription>
              We couldn't verify your payment status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error || 'Unable to retrieve payment information'}</p>
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
      <Card className="border-green-100">
        <CardHeader className="bg-green-50 border-b border-green-100">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-center text-green-800">Payment Successful!</CardTitle>
          <CardDescription className="text-center text-green-700">
            Your payment has been processed successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {job && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Job Details</h3>
              <div className="bg-slate-50 p-4 rounded-md">
                <p className="font-semibold text-lg">{job.title}</p>
                <p className="text-sm text-slate-500 mb-2">{job.category}</p>
                
                <div className="flex items-start mt-2 text-sm">
                  <MapPin className="h-4 w-4 mr-2 mt-0.5 text-slate-400" />
                  <span>{job.location}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-lg font-medium mb-2">Payment Summary</h3>
            
            <div className="flex justify-between">
              <span className="text-slate-600">Payment ID:</span>
              <span className="font-medium">{payment.id}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-600">Amount:</span>
              <span className="font-medium">${payment.amount?.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-600">Date:</span>
              <span className="font-medium">
                {new Date(payment.createdAt || Date.now()).toLocaleDateString()}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-600">Status:</span>
              <span className="font-medium text-green-600">
                {payment.status === 'succeeded' || payment.status === 'completed' 
                  ? 'Completed' 
                  : payment.status}
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button 
            onClick={() => navigate(job ? `/jobs/${job.id}` : '/jobs')} 
            className="w-full mb-2"
          >
            {job ? 'View Job Details' : 'View All Jobs'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')} 
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}