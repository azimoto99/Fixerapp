import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from 'wouter';
import { Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/payment-success',
      },
      redirect: 'if_required'
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      toast({
        title: "Payment Successful",
        description: "Thank you for your payment!",
      });
      setLocation('/payment-success');
    } else {
      toast({
        title: "Payment Processing",
        description: "Your payment is being processed.",
      });
      setIsProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
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
          'Pay Now'
        )}
      </Button>
    </form>
  );
};

export default function Checkout() {
  const [match, params] = useRoute<{ amount: string, jobId: string }>('/checkout/:amount/:jobId');
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!match || !params) {
      setError("Invalid checkout parameters");
      setIsLoading(false);
      return;
    }

    const amount = parseFloat(params.amount);
    const jobId = parseInt(params.jobId);
    
    if (isNaN(amount) || amount <= 0 || isNaN(jobId) || jobId <= 0) {
      setError("Invalid amount or job ID");
      setIsLoading(false);
      return;
    }

    // Create PaymentIntent as soon as the page loads
    const createPaymentIntent = async () => {
      try {
        setIsLoading(true);
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
        console.error("Payment setup error:", err);
        setError((err as Error).message || "Failed to set up payment");
        toast({
          title: "Payment Setup Failed",
          description: (err as Error).message || "Unable to process your payment at this time",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [match, params, toast]);

  if (error) {
    return (
      <div className="container max-w-md mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Payment Error</CardTitle>
            <CardDescription>We encountered a problem setting up your payment</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setLocation('/jobs')} variant="outline" className="w-full">
              Return to Jobs
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isLoading || !clientSecret) {
    return (
      <div className="container h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Setting up your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Payment</CardTitle>
          <CardDescription>
            Your payment information is processed securely by Stripe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm />
          </Elements>
        </CardContent>
      </Card>
    </div>
  );
}