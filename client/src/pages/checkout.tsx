import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CreditCard, AlertCircle } from 'lucide-react';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ amount, jobId }: { amount: number, jobId: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
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
        toast({
          title: 'Payment Successful',
          description: 'Your payment has been processed successfully',
        });
        navigate('/payment-success?payment_intent=' + paymentIntent.id);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setErrorMessage((err as Error).message || 'An error occurred');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {errorMessage && (
        <div className="rounded-md bg-destructive/10 p-3 text-destructive flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <div>{errorMessage}</div>
        </div>
      )}
      
      <Button
        type="submit"
        disabled={isProcessing || !stripe || !elements}
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
            Pay ${amount.toFixed(2)}
          </>
        )}
      </Button>
    </form>
  );
};

export default function Checkout() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Extract amount and jobId from URL parameters
  const amount = params.amount ? parseFloat(params.amount) : 0;
  const jobId = params.jobId ? parseInt(params.jobId, 10) : 0;

  useEffect(() => {
    if (isLoadingAuth) return;
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to complete this payment",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }
    
    if (!amount || !jobId) {
      setError("Invalid payment information. Please go back and try again.");
      setIsLoading(false);
      return;
    }

    // Create PaymentIntent as soon as the page loads
    const fetchPaymentIntent = async () => {
      try {
        const res = await apiRequest("POST", "/api/create-payment-intent", { 
          amount: amount,
          jobId: jobId
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Failed to create payment intent");
        }
        
        const data = await res.json();
        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error("Payment intent error:", err);
        setError((err as Error).message || "Could not process payment. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentIntent();
  }, [amount, jobId, user, isLoadingAuth, navigate, toast]);

  const handleBack = () => {
    navigate(`/jobs/${jobId}`);
  };

  if (isLoadingAuth || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Preparing payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-md mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>Payment Error</CardTitle>
            <CardDescription>
              There was a problem setting up your payment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-destructive/10 p-4 text-destructive mb-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <div>{error}</div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleBack} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Job
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Make SURE to wrap the form in <Elements> which provides the stripe context.
  return (
    <div className="container max-w-md mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Payment</CardTitle>
          <CardDescription>
            Secure payment for job #{jobId}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm amount={amount} jobId={jobId} />
            </Elements>
          ) : (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleBack} 
            variant="ghost" 
            size="sm" 
            className="w-full mt-2"
            disabled={isLoading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to job
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}