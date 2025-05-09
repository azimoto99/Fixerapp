import React, { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Check, CreditCard, AlertCircle, Loader2, Lock } from 'lucide-react';

// Make sure to load Stripe outside of a component
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PaymentSummaryProps {
  amount: number;
  serviceFee: number;
  jobTitle: string;
}

const PaymentSummary: React.FC<PaymentSummaryProps> = ({ amount, serviceFee, jobTitle }) => {
  const total = amount + serviceFee;
  
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">Payment Summary</CardTitle>
        <CardDescription>Details of your payment</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Job</span>
            <span className="font-medium truncate max-w-[200px]">{jobTitle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-medium">${amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service Fee</span>
            <span className="font-medium">${serviceFee.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="font-semibold">Total</span>
            <span className="font-semibold">${total.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const PaymentForm: React.FC<{
  clientSecret: string;
  jobId: number;
  amount: number;
  jobTitle: string;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ clientSecret, jobId, amount, jobTitle, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }
    
    setIsProcessing(true);
    setPaymentError(null);
    
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-confirmation?jobId=${jobId}`,
        },
        redirect: 'if_required',
      });
      
      if (error) {
        setPaymentError(error.message || 'An error occurred during payment processing');
        toast({
          title: "Payment Failed",
          description: error.message || 'An error occurred during payment processing',
          variant: "destructive"
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment successful
        toast({
          title: "Payment Successful",
          description: "Your payment was processed successfully",
        });
        onSuccess();
      } else {
        // Payment requires additional steps, will redirect
        toast({
          title: "Redirecting",
          description: "You will be redirected to complete your payment",
        });
      }
    } catch (err) {
      console.error('Payment error:', err);
      setPaymentError('An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {paymentError && (
          <div className="bg-destructive/10 p-3 rounded-md text-destructive flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{paymentError}</span>
          </div>
        )}
        
        <div className="bg-card/50 rounded-lg p-4 backdrop-blur-sm border border-border/50">
          <PaymentElement className="mb-4" />
          
          <div className="flex items-center text-xs text-muted-foreground mt-3">
            <Lock className="h-3 w-3 mr-1" />
            <span>Payments are securely processed by Stripe</span>
          </div>
        </div>
        
        <PaymentSummary 
          amount={amount} 
          serviceFee={2.50} 
          jobTitle={jobTitle} 
        />
        
        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={!stripe || isProcessing}
            className="min-w-[120px]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay Now
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};

export const StripeCheckout: React.FC<{
  jobId: number;
  amount: number;
  jobTitle: string;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ jobId, amount, jobTitle, onSuccess, onCancel }) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    // Create a payment intent when the component mounts
    const createPaymentIntent = async () => {
      try {
        const res = await apiRequest('POST', '/api/stripe/create-payment-intent', {
          jobId,
          amount
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to create payment intent');
        }
        
        const data = await res.json();
        setClientSecret(data.clientSecret);
        setIsLoading(false);
      } catch (err) {
        console.error('Error creating payment intent:', err);
        setError((err as Error).message || 'Failed to initialize payment');
        setIsLoading(false);
        toast({
          title: "Payment Setup Failed",
          description: (err as Error).message || 'Failed to initialize payment',
          variant: "destructive"
        });
      }
    };
    
    createPaymentIntent();
  }, [jobId, amount, toast]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Setting up secure payment...</p>
      </div>
    );
  }
  
  if (error || !clientSecret) {
    return (
      <div className="rounded-lg bg-destructive/10 p-6 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Payment Setup Failed</h3>
        <p className="text-muted-foreground mb-4">{error || 'Unable to initialize payment'}</p>
        <Button variant="default" onClick={onCancel}>
          Go Back
        </Button>
      </div>
    );
  }
  
  // Configure Stripe Elements appearance
  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#10b981',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      borderRadius: '8px',
    },
  };
  
  const options = {
    clientSecret,
    appearance,
  };
  
  return (
    <Card className="w-full max-w-2xl mx-auto border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <CreditCard className="mr-2 h-5 w-5" />
          Secure Payment
        </CardTitle>
        <CardDescription>
          Complete your payment to finalize this job
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise} options={options}>
          <PaymentForm
            clientSecret={clientSecret}
            jobId={jobId}
            amount={amount}
            jobTitle={jobTitle}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      </CardContent>
    </Card>
  );
};

// Payment Success Component with vector style
export const PaymentSuccess: React.FC<{
  amount: number;
  jobTitle: string;
  onContinue: () => void;
}> = ({ amount, jobTitle, onContinue }) => {
  return (
    <Card className="w-full max-w-lg mx-auto border-border/50 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <CardTitle className="text-xl">Payment Successful</CardTitle>
        <CardDescription>
          Your payment has been processed successfully
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground">Amount Paid</span>
            <span className="font-medium">${amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Job</span>
            <span className="font-medium truncate max-w-[200px]">{jobTitle}</span>
          </div>
        </div>
        
        <Button onClick={onContinue} className="w-full">
          Continue
        </Button>
      </CardContent>
    </Card>
  );
};

export default StripeCheckout;