import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Loader2, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';

// Make sure to call loadStripe outside of a component's render to avoid recreating the Stripe object on every render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// The form that collects payment details
const CheckoutForm = ({ 
  jobAmount, 
  jobId, 
  workerId, 
  jobTitle,
  paymentSuccess,
  paymentError,
  isJobPoster
}: { 
  jobAmount: number;
  jobId: number;
  workerId?: number;
  jobTitle: string;
  paymentSuccess: (paymentId: number) => void;
  paymentError: (error: string) => void;
  isJobPoster: boolean;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveCard, setSaveCard] = useState(true);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    // Confirm payment
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-confirmation`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'An error occurred with your payment');
      setIsProcessing(false);
      paymentError(error.message || 'Payment failed');
      toast({
        variant: "destructive",
        title: "Payment failed",
        description: error.message || "There was a problem processing your payment",
      });
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Payment succeeded
      toast({
        title: "Payment successful",
        description: `Your payment of $${jobAmount.toFixed(2)} was successful!`,
      });
      
      // Update the job status on successful payment
      try {
        const response = await apiRequest('POST', `/api/jobs/${jobId}/payment-complete`, {
          paymentIntentId: paymentIntent.id,
        });
        
        const data = await response.json();
        if (data.success) {
          paymentSuccess(data.paymentId);
        }
      } catch (err) {
        console.error('Error updating job after payment:', err);
      }
      
      setIsProcessing(false);
    } else {
      setIsProcessing(false);
      setErrorMessage('Payment processing failed. Please try again.');
      paymentError('Payment processing failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <PaymentElement />
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="save-card"
            checked={saveCard}
            onCheckedChange={(checked) => setSaveCard(checked as boolean)}
          />
          <Label htmlFor="save-card">Save this card for future payments</Label>
        </div>
        
        {errorMessage && (
          <div className="text-red-500 flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4" />
            {errorMessage}
          </div>
        )}
      </div>
      
      <div className="mt-6">
        <Button
          type="submit"
          disabled={!stripe || isProcessing || !isJobPoster}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay ${jobAmount.toFixed(2)}
            </>
          )}
        </Button>
        
        {!isJobPoster && (
          <p className="text-sm text-muted-foreground mt-2">
            Only the job poster can make payments for this job.
          </p>
        )}
      </div>
    </form>
  );
};

// The wrapper component that fetches the payment intent and renders the form
interface JobPaymentFormProps {
  jobId: number;
  jobAmount: number;
  workerId?: number;
  jobTitle: string;
  isJobPoster: boolean;
  onPaymentSuccess: (paymentId: number) => void;
  onPaymentError: (error: string) => void;
}

const JobPaymentForm: React.FC<JobPaymentFormProps> = ({
  jobId,
  jobAmount,
  workerId,
  jobTitle,
  isJobPoster,
  onPaymentSuccess,
  onPaymentError
}) => {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Create payment intent mutation
  const createPaymentIntent = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/stripe/create-payment-intent', {
        amount: jobAmount,
        jobId,
        workerId,
        description: `Payment for job: ${jobTitle}`,
        savePaymentMethod: true
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment intent');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      setIsLoading(false);
    },
    onError: (error: Error) => {
      console.error('Error creating payment intent:', error);
      setError(error.message);
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Payment setup failed",
        description: error.message,
      });
    }
  });

  useEffect(() => {
    // Only create a payment intent if the user is the job poster
    if (isJobPoster && jobId && jobAmount > 0) {
      createPaymentIntent.mutate();
    } else {
      setIsLoading(false);
    }
  }, [jobId, jobAmount, isJobPoster]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Payment Form</CardTitle>
          <CardDescription>
            Setting up secure payment...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Error</CardTitle>
          <CardDescription>
            There was a problem setting up the payment form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Please try again later or contact support if the problem persists.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => window.location.reload()} variant="outline">
            Retry
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Your Payment</CardTitle>
        <CardDescription>
          Pay securely for your services using credit or debit card.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-muted-foreground">Job Service</span>
            <span className="text-sm font-medium">${(jobAmount - 2.50).toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-muted-foreground">Service Fee</span>
            <span className="text-sm font-medium">$2.50</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>${jobAmount.toFixed(2)}</span>
          </div>
        </div>
        
        {clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <CheckoutForm 
              jobAmount={jobAmount} 
              jobId={jobId} 
              workerId={workerId}
              jobTitle={jobTitle}
              paymentSuccess={onPaymentSuccess}
              paymentError={onPaymentError}
              isJobPoster={isJobPoster}
            />
          </Elements>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              {isJobPoster ? "Unable to set up payment form. Please try again." : "Only the job poster can make payments for this job."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JobPaymentForm;