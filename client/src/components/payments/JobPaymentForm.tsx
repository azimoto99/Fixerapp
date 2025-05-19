import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CheckIcon, InfoIcon, CreditCardIcon, LoaderIcon, AlertTriangleIcon } from 'lucide-react';

// Load Stripe outside of component render for better performance
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface Job {
  id: number;
  title: string;
  payAmount: number;
  posterId: number;
  workerId: number | null;
  status: string;
}

interface PaymentParams {
  jobId: number;
  payAmount: number;
  useExistingCard?: boolean;
}

// Checkout form component using saved cards or new card
const CheckoutForm = ({ 
  jobId, 
  payAmount, 
  onSuccess,
  onCancel 
}: { 
  jobId: number; 
  payAmount: number; 
  onSuccess: () => void;
  onCancel: () => void;
}) => {
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
      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-confirmation`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'An error occurred while processing your payment.');
        toast({
          variant: 'destructive',
          title: 'Payment Failed',
          description: error.message || 'There was an issue processing your payment.',
        });
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // The payment succeeded!
        toast({
          title: 'Payment Successful',
          description: 'Your payment has been successfully processed.',
        });
        setIsProcessing(false);
        onSuccess();
      } else if (paymentIntent) {
        // The payment requires additional action
        toast({
          variant: 'destructive',
          title: 'Additional Action Required',
          description: `Payment status: ${paymentIntent.status}. Please complete the payment process.`,
        });
        setIsProcessing(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'An unexpected error occurred during payment processing.',
      });
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      {errorMessage && (
        <Alert variant="destructive">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertTitle>Payment Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-4 justify-end">
        <Button 
          type="button" 
          variant="outline" 
          disabled={isProcessing} 
          onClick={onCancel}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || isProcessing} 
          className="w-full sm:w-auto"
        >
          {isProcessing ? (
            <>
              <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Pay ${payAmount.toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

// Saved payment methods section for job payment
const SavedPaymentMethods = ({ 
  onSelectSaved, 
  onAddNew 
}: { 
  onSelectSaved: () => void; 
  onAddNew: () => void; 
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  // Fetch payment methods
  const { 
    data: paymentMethods, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/stripe/payment-methods');
      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }
      return response.json();
    },
  });

  // Format card brand and get expiration date
  const formatCard = (method: any) => {
    const brand = method.card.brand.charAt(0).toUpperCase() + method.card.brand.slice(1);
    return `${brand} •••• ${method.card.last4} (expires ${method.card.exp_month}/${method.card.exp_year % 100})`;
  };

  const handleContinue = () => {
    if (selectedMethod) {
      onSelectSaved();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <LoaderIcon className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to load payment methods'}
            </AlertDescription>
          </Alert>
        ) : !paymentMethods || paymentMethods.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">No saved payment methods found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Select a payment method</Label>
            <div className="space-y-2">
              {paymentMethods.map((method: any) => (
                <div
                  key={method.id}
                  className={`flex items-center justify-between p-3 border rounded-md cursor-pointer ${
                    selectedMethod === method.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  }`}
                  onClick={() => setSelectedMethod(method.id)}
                >
                  <div className="flex items-center space-x-2">
                    <CreditCardIcon className="h-5 w-5 text-muted-foreground" />
                    <span>{formatCard(method)}</span>
                  </div>
                  {selectedMethod === method.id && (
                    <CheckIcon className="h-5 w-5 text-primary" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-between gap-2 sm:gap-4">
        <Button
          variant="outline"
          onClick={onAddNew}
          className="w-full sm:w-auto"
        >
          Use New Card
        </Button>
        {paymentMethods && paymentMethods.length > 0 && (
          <Button
            onClick={handleContinue}
            disabled={!selectedMethod}
            className="w-full sm:w-auto"
          >
            Continue with Selected Card
          </Button>
        )}
      </div>
    </div>
  );
};

// Main job payment form component
export default function JobPaymentForm({ 
  job, 
  onSuccess,
  onCancel
}: { 
  job: Job; 
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<'saved' | 'new'>('saved');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create payment intent for the job
  const createPaymentIntent = useMutation({
    mutationFn: async (params: PaymentParams) => {
      setIsCreatingIntent(true);
      const response = await apiRequest('POST', '/api/stripe/create-payment-intent', params);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create payment intent');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      setIsCreatingIntent(false);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Payment Setup Failed',
        description: error.message || 'There was a problem setting up the payment.',
      });
      setIsCreatingIntent(false);
    }
  });

  // Create payment intent when user selects to pay with saved card
  const handleSavedCardContinue = () => {
    createPaymentIntent.mutate({
      jobId: job.id,
      payAmount: job.payAmount,
      useExistingCard: true
    });
  };

  // Create payment intent for new card
  const handleUseNewCard = () => {
    setPaymentMethod('new');
    createPaymentIntent.mutate({
      jobId: job.id,
      payAmount: job.payAmount,
      useExistingCard: false
    });
  };

  // Handle payment success
  const handlePaymentSuccess = async () => {
    try {
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['job', job.id] });

      toast({
        title: 'Payment Complete',
        description: 'Your job has been successfully paid for.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Payment Confirmation Error',
        description: error.message || 'Failed to confirm payment completion.',
      });
    }

    // Call success callback
    onSuccess();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment for Job</CardTitle>
        <CardDescription>
          Complete payment for "{job.title}"
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Payment Summary</h3>
            <div className="bg-muted/50 p-4 rounded-md space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Job Amount:</span>
                <span>${job.payAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total:</span>
                <span>${job.payAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Method Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Payment Method</h3>

            {paymentMethod === 'saved' && !clientSecret ? (
              <SavedPaymentMethods
                onSelectSaved={handleSavedCardContinue}
                onAddNew={handleUseNewCard}
              />
            ) : isCreatingIntent ? (
              <div className="flex justify-center py-8">
                <LoaderIcon className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : clientSecret ? (
              <Elements 
                stripe={stripePromise} 
                options={{ 
                  clientSecret,
                  appearance: { theme: 'stripe' }
                }}
              >
                <CheckoutForm 
                  jobId={job.id} 
                  payAmount={job.payAmount} 
                  onSuccess={handlePaymentSuccess} 
                  onCancel={onCancel}
                />
              </Elements>
            ) : (
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Payment Setup</AlertTitle>
                <AlertDescription>
                  Loading payment options...
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}