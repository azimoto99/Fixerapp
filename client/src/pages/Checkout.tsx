import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, CreditCard } from 'lucide-react';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ jobId, amount }: { jobId: number; amount: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-confirmation`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message || "An unexpected error occurred",
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setIsCompleted(true);
        toast({
          title: "Payment Successful",
          description: "Thank you for your payment!",
        });
        
        // Wait a moment before redirecting
        setTimeout(() => {
          navigate(`/job/${jobId}`);
        }, 2000);
      }
    } catch (err: any) {
      toast({
        title: "Payment Error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  if (isCompleted) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
        <h3 className="text-2xl font-bold">Payment Successful!</h3>
        <p className="text-muted-foreground mt-2">
          Your payment has been processed successfully.
        </p>
        <p className="text-muted-foreground mt-1">
          Redirecting you back to the job...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      <div className="pt-4">
        <Button 
          type="submit" 
          className="w-full" 
          size="lg"
          disabled={isProcessing || !stripe || !elements}
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
      </div>
    </form>
  );
};

export default function Checkout() {
  const [jobId, setJobId] = useState<number | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Extract amount and jobId from URL path params
    const pathParts = window.location.pathname.split('/');
    // Format is /checkout/amount/jobId
    const amountParam = pathParts[2];  // /checkout/:amount/:jobId
    const jobIdParam = pathParts[3];   // /checkout/:amount/:jobId
    
    if (!jobIdParam || !amountParam) {
      setError('Missing required parameters: amount and jobId');
      setIsLoading(false);
      return;
    }

    const parsedAmount = parseFloat(amountParam);
    const parsedJobId = parseInt(jobIdParam);

    if (isNaN(parsedJobId) || isNaN(parsedAmount)) {
      setError('Invalid parameters: jobId must be a number and amount must be a valid price');
      setIsLoading(false);
      return;
    }

    setJobId(parsedJobId);
    setAmount(parsedAmount);

    // Create PaymentIntent as soon as the page loads
    apiRequest("POST", "/api/create-payment-intent", { 
      jobId: parsedJobId,
      amount: parsedAmount
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.message || 'Failed to create payment intent');
          });
        }
        return res.json();
      })
      .then((data) => {
        setClientSecret(data.clientSecret);
        setIsLoading(false);
      })
      .catch((error) => {
        setError(error.message || 'Failed to initialize payment');
        setIsLoading(false);
        toast({
          title: "Payment Setup Failed",
          description: error.message || 'Failed to initialize payment',
          variant: "destructive",
        });
      });
  }, [toast]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center py-16">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Setting up payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center py-16">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-2">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-center">Payment Setup Failed</CardTitle>
            <CardDescription className="text-center text-destructive">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/')}
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-12">
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Payment</CardTitle>
          <CardDescription>
            Secure payment for Job #{jobId}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientSecret && jobId && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm jobId={jobId} amount={amount} />
            </Elements>
          )}
        </CardContent>
      </Card>
    </div>
  );
}