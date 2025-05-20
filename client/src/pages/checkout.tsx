import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ jobData }: { jobData: any }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [_, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/payment-success',
      },
    });

    if (error) {
      setErrorMessage(error.message || 'An unexpected error occurred');
      toast({
        title: "Payment Failed",
        description: error.message || 'Payment processing failed',
        variant: "destructive",
      });
      setIsProcessing(false);
    } else {
      // The page will redirect to return_url on success
      toast({
        title: "Processing Payment",
        description: "Your payment is being processed...",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Payment Details</h3>
        <PaymentElement />
      </div>
      
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Pay ${jobData?.paymentAmount?.toFixed(2)}
          </>
        )}
      </Button>
    </form>
  );
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const [jobData, setJobData] = useState<any>(null);
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

    // Get job details and create payment intent
    const fetchJobAndCreatePaymentIntent = async () => {
      try {
        // First get job details
        const jobResponse = await apiRequest('GET', `/api/jobs/${jobId}`);
        if (!jobResponse.ok) {
          throw new Error('Failed to load job details');
        }
        
        const jobDetails = await jobResponse.json();
        setJobData(jobDetails);
        
        // Then create payment intent
        const paymentResponse = await apiRequest('POST', '/api/stripe/create-payment-intent', { 
          amount: jobDetails.paymentAmount,
          description: `Payment for job: ${jobDetails.title}`,
          jobId: jobDetails.id,
          metadata: {
            jobId: jobDetails.id,
            jobTitle: jobDetails.title,
          }
        });
        
        if (!paymentResponse.ok) {
          const errorData = await paymentResponse.json();
          throw new Error(errorData.message || 'Failed to create payment');
        }
        
        const paymentData = await paymentResponse.json();
        setClientSecret(paymentData.clientSecret);
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

    fetchJobAndCreatePaymentIntent();
  }, [jobId, toast]);

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

  if (!clientSecret) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  // Make SURE to wrap the form in <Elements> which provides the stripe context.
  return (
    <div className="max-w-md mx-auto mt-12">
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Payment</CardTitle>
          <CardDescription>
            Job: {jobData.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex justify-between mb-1">
              <span className="text-sm">Job Fee</span>
              <span className="text-sm font-medium">${jobData.paymentAmount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-sm">Service Fee</span>
              <span className="text-sm font-medium">${jobData.serviceFee?.toFixed(2) || '2.50'}</span>
            </div>
            <div className="border-t pt-1 mt-1">
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>${((jobData.paymentAmount || 0) + (jobData.serviceFee || 2.5)).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm jobData={jobData} />
          </Elements>
        </CardContent>
      </Card>
    </div>
  );
}