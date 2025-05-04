import React, { useState, useEffect } from 'react';
import { 
  loadStripe, 
  Stripe, 
  StripeElementsOptions, 
  PaymentIntent 
} from '@stripe/stripe-js';
import { 
  Elements, 
  PaymentElement, 
  useStripe, 
  useElements 
} from '@stripe/react-stripe-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Load stripe outside of render function
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PaymentFormProps {
  clientSecret: string;
  paymentId: number;
  jobId: number;
  onPaymentComplete: () => void;
  onCancel: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ 
  clientSecret, 
  paymentId,
  jobId,
  onPaymentComplete,
  onCancel 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ 
      paymentId, 
      paymentIntentId 
    }: { 
      paymentId: number; 
      paymentIntentId: string;
    }) => {
      const res = await apiRequest('POST', '/api/stripe/confirm-payment', {
        paymentId,
        paymentIntentId
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Payment successful',
        description: 'Your payment has been processed successfully.',
      });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/payments/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/earnings/worker'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId] });
      onPaymentComplete();
    },
    onError: (error: Error) => {
      toast({
        title: 'Payment confirmation failed',
        description: error.message,
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'An error occurred during payment processing.');
      setIsProcessing(false);
      toast({
        title: 'Payment failed',
        description: error.message || 'An error occurred during payment processing.',
        variant: 'destructive',
      });
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Payment succeeded, update our backend
      confirmPaymentMutation.mutate({ 
        paymentId, 
        paymentIntentId: paymentIntent.id 
      });
    } else {
      setErrorMessage('Unexpected payment status. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {errorMessage && (
        <div className="text-red-500 text-sm mt-2">{errorMessage}</div>
      )}
      
      <div className="flex justify-between mt-6">
        <Button 
          type="button" 
          variant="outline"
          disabled={isProcessing}
          onClick={onCancel}
        >
          Cancel
        </Button>
        
        <Button 
          type="submit" 
          disabled={!stripe || !elements || isProcessing}
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
      </div>
    </form>
  );
};

interface PaymentProcessorProps {
  jobId: number;
  amount: number;
  onPaymentComplete: () => void;
  onCancel: () => void;
}

const PaymentProcessor: React.FC<PaymentProcessorProps> = ({ 
  jobId,
  amount,
  onPaymentComplete,
  onCancel
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const { toast } = useToast();
  
  const createPaymentIntentMutation = useMutation({
    mutationFn: async (data: { jobId: number }) => {
      const res = await apiRequest('POST', '/api/stripe/create-payment-intent', data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create payment intent');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      setPaymentId(data.paymentId);
    },
    onError: (error: Error) => {
      toast({
        title: 'Payment initialization failed',
        description: error.message,
        variant: 'destructive',
      });
      onCancel();
    }
  });
  
  useEffect(() => {
    // Create payment intent when component mounts
    createPaymentIntentMutation.mutate({ jobId });
  }, [jobId]);
  
  const options: StripeElementsOptions = {
    clientSecret: clientSecret ?? undefined,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#0284c7', // sky-600
        colorBackground: '#ffffff',
        colorText: '#1e293b', // slate-800
        colorDanger: '#ef4444', // red-500
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '4px',
      },
    },
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-auto">
      <h2 className="text-xl font-bold mb-4">Process Payment</h2>
      <p className="mb-6">Total Amount: ${amount.toFixed(2)}</p>
      
      {createPaymentIntentMutation.isPending && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Initializing payment...</span>
        </div>
      )}
      
      {clientSecret && paymentId && (
        <Elements stripe={stripePromise} options={options}>
          <PaymentForm 
            clientSecret={clientSecret} 
            paymentId={paymentId}
            jobId={jobId}
            onPaymentComplete={onPaymentComplete}
            onCancel={onCancel}
          />
        </Elements>
      )}
    </div>
  );
};

export default PaymentProcessor;