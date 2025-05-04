import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Elements, 
  PaymentElement, 
  useStripe, 
  useElements,
  StripeElementsOptions
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// The actual form component that uses the Stripe hooks
const PaymentForm: React.FC<{
  clientSecret: string;
  paymentId: number;
  jobId: number;
  onPaymentComplete: () => void;
  onCancel: () => void;
}> = ({ clientSecret, paymentId, jobId, onPaymentComplete, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Handle confirmation of payment
  const confirmPaymentMutation = useMutation({
    mutationFn: async (paymentIntentId: string) => {
      const res = await apiRequest('POST', '/api/stripe/confirm-payment', {
        paymentId,
        paymentIntentId
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Successful",
        description: "Your payment has been processed successfully!"
      });
      onPaymentComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Confirmation Failed",
        description: error.message,
        variant: "destructive"
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

    // Confirm the payment with Stripe
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: `${window.location.origin}/job/${jobId}`,
      }
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive"
      });
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Update our backend about the successful payment
      confirmPaymentMutation.mutate(paymentIntent.id);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <PaymentElement />
      </div>
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
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : 'Pay Now'}
        </Button>
      </div>
    </form>
  );
};

// The wrapper component that handles fetching the payment intent
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Create a payment intent when the component mounts
  const createPaymentIntentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/stripe/create-payment-intent', {
        jobId,
        amount
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create payment intent');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      setPaymentId(data.paymentId);
      setLoading(false);
    },
    onError: (error: Error) => {
      setError(error.message);
      setLoading(false);
      toast({
        title: "Payment Setup Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    createPaymentIntentMutation.mutate();
  }, [jobId, amount]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button variant="outline" onClick={onCancel}>Go Back</Button>
      </div>
    );
  }

  if (!clientSecret || !paymentId) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">Unable to initialize payment. Please try again.</p>
        <Button variant="outline" onClick={onCancel}>Go Back</Button>
      </div>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#10b981',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        borderRadius: '8px',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm 
        clientSecret={clientSecret}
        paymentId={paymentId}
        jobId={jobId}
        onPaymentComplete={onPaymentComplete}
        onCancel={onCancel}
      />
    </Elements>
  );
};

export default PaymentProcessor;