import { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, CreditCard, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// Load Stripe outside of component
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// The payment form component that uses Stripe Elements
const CheckoutForm = ({ amount, jobId }: { amount: number; jobId: number }) => {
  const [, setLocation] = useLocation();
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/payment-success',
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'An error occurred during payment');
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded locally - redirect to success page
        toast({
          title: 'Payment Successful',
          description: `Your payment of ${formatCurrency(amount)} has been processed.`,
        });
        
        setLocation('/payment-success');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setErrorMessage((err as Error).message || 'An error occurred during payment');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <PaymentElement />
      
        {errorMessage && (
          <div className="rounded-md bg-destructive/10 p-3 text-destructive flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>{errorMessage}</div>
          </div>
        )}
        
        <Button 
          type="submit" 
          className="w-full"
          disabled={isProcessing || !stripe || !elements}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ${formatCurrency(amount)}`
          )}
        </Button>
      </div>
    </form>
  );
};

// The main Checkout component
export default function Checkout() {
  const [, setLocation] = useLocation();
  const [_, params] = useRoute<{ amount: string, jobId: string }>('/checkout/:amount/:jobId');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const { toast } = useToast();

  // Parse parameters
  const amount = params ? parseFloat(params.amount) : 0;
  const jobId = params ? parseInt(params.jobId) : 0;

  // Create payment intent
  const { isLoading, error } = useQuery({
    queryKey: ['/api/create-payment-intent', amount, jobId],
    queryFn: async () => {
      try {
        const res = await apiRequest('POST', '/api/create-payment-intent', {
          amount,
          jobId,
        });

        if (!res.ok) {
          throw new Error('Failed to create payment intent');
        }

        const data = await res.json();
        setClientSecret(data.clientSecret);
        return data;
      } catch (err) {
        console.error('Error creating payment intent:', err);
        toast({
          title: 'Error',
          description: 'Failed to initialize payment. Please try again later.',
          variant: 'destructive',
        });
        throw err;
      }
    },
    enabled: amount > 0 && jobId > 0,
  });

  // If parameters are invalid, show error
  if (!params || amount <= 0 || jobId <= 0) {
    return (
      <div className="container max-w-md mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>Invalid Checkout</CardTitle>
            <CardDescription>
              The checkout information provided is invalid.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-destructive/10 rounded-md p-4 text-destructive">
              <p>Please ensure you have a valid amount and job ID to proceed with checkout.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setLocation('/')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto py-12">
      <Card>
        <CardHeader>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-2 -ml-2 w-fit"
            onClick={() => setLocation(`/job/${jobId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Job
          </Button>
          <CardTitle>Checkout</CardTitle>
          <CardDescription>
            Complete your payment to confirm your job
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">{formatCurrency(amount)}</span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted-foreground">Payment method:</span>
              <span className="flex items-center">
                <CreditCard className="h-4 w-4 mr-1 text-primary" />
                Credit Card
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="rounded-md bg-destructive/10 p-4 text-destructive">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>Error initializing payment</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm amount={amount} jobId={jobId} />
            </Elements>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}