import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface CheckoutFormProps {
  amount: number;
  jobId?: number;
  description: string;
  onSuccess?: () => void;
}

const CheckoutForm = ({ amount, jobId, description, onSuccess }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/payment-success',
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
        setIsSubmitting(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({
          title: "Payment Successful",
          description: "Thank you for your payment!",
        });
        
        // Navigate to the success page with payment information
        navigate(`/payment-success?paymentId=${paymentIntent.id}&amount=${amount}&jobId=${jobId || ''}`);
        
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement 
        options={{
          layout: {
            type: 'tabs',
            defaultCollapsed: false
          }
        }}
      />
      <Button 
        type="submit" 
        className="w-full" 
        size="lg"
        disabled={!stripe || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing
          </>
        ) : (
          `Pay $${amount.toFixed(2)}`
        )}
      </Button>
    </form>
  );
};

interface CheckoutPageProps {
  jobId?: string;
  amount?: string;
  description?: string;
  returnUrl?: string;
}

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<{
    amount: number;
    jobId?: number;
    description: string;
    jobTitle?: string;
  }>({
    amount: 0,
    description: ''
  });

  // Get query parameters
  const queryParams = new URLSearchParams(window.location.search);
  const amount = queryParams.get('amount');
  const jobId = queryParams.get('jobId'); 
  const description = queryParams.get('description') || 'Payment for services';

  useEffect(() => {
    if (!amount) {
      console.error('Missing amount parameter');
      return;
    }

    const amountValue = parseFloat(amount);
    
    if (isNaN(amountValue) || amountValue <= 0) {
      console.error('Invalid amount value');
      return;
    }
    
    // Set payment details
    setPaymentDetails({
      amount: amountValue,
      jobId: jobId ? parseInt(jobId) : undefined,
      description: description || 'Payment for services',
      jobTitle: queryParams.get('jobTitle') || undefined
    });
    
    // Create PaymentIntent as soon as the page loads
    setIsLoading(true);
    
    apiRequest("POST", "/api/create-payment-intent", { 
      amount: amountValue,
      jobId: jobId ? parseInt(jobId) : undefined,
      description: description
    })
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error creating payment intent:', error);
        setIsLoading(false);
      });
  }, [amount, jobId, description]);

  if (isLoading || !clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Processing Payment</CardTitle>
            <CardDescription>Please wait while we prepare your payment...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Make SURE to wrap the form in <Elements> which provides the stripe context.
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Secure Payment</CardTitle>
          <CardDescription>
            {paymentDetails.jobTitle 
              ? `Payment for job: ${paymentDetails.jobTitle}`
              : 'Complete your payment securely'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">${paymentDetails.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Description:</span>
              <span className="font-medium">{paymentDetails.description}</span>
            </div>
          </div>
          
          <Elements 
            stripe={stripePromise} 
            options={{ 
              clientSecret,
              appearance: {
                theme: 'flat',
                variables: {
                  colorPrimary: '#0ea5e9',
                  colorBackground: 'transparent',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }
              }
            }}
          >
            <CheckoutForm 
              amount={paymentDetails.amount}
              jobId={paymentDetails.jobId}
              description={paymentDetails.description}
            />
          </Elements>
        </CardContent>
        <CardFooter className="flex justify-center text-xs text-muted-foreground">
          <p>Your payment is secured with 256-bit SSL encryption</p>
        </CardFooter>
      </Card>
    </div>
  );
};