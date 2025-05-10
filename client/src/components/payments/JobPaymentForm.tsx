import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { type ToastProps } from '@/components/ui/toast';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Make sure to load Stripe outside of component rendering
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Form schema
const paymentFormSchema = z.object({
  jobId: z.number().optional(),
  workerId: z.number().optional(),
  amount: z.number().min(5, 'Minimum payment amount is $5'),
  description: z.string().min(5, 'Please provide a brief description'),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

// Payment form component (to be wrapped in Elements)
const PaymentForm = ({ 
  jobId, 
  workerId, 
  onSuccess, 
  isExistingJob = false 
}: { 
  jobId?: number; 
  workerId?: number; 
  onSuccess: () => void;
  isExistingJob?: boolean;
}) => {
  const { toast } = useToast();
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form with default values
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      jobId: jobId,
      workerId: workerId,
      amount: 0,
      description: '',
    },
  });

  const handleSubmit = async (data: PaymentFormValues) => {
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
          return_url: window.location.origin + '/payment-confirmation',
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'An error occurred during payment');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded - update payment record on server
        const res = await apiRequest('PATCH', `/api/payments/${paymentIntent.id}/status`, {
          status: 'completed',
          transactionId: paymentIntent.id
        });

        if (!res.ok) {
          throw new Error('Failed to update payment status');
        }

        toast({
          title: 'Payment Successful',
          description: `You have successfully paid ${formatCurrency(data.amount)}`,
        });

        // Invalidate cache to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/payments/user'] });
        
        // Call success callback
        onSuccess();
      }
    } catch (err) {
      console.error('Payment error:', err);
      setErrorMessage((err as Error).message || 'An error occurred during payment');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Amount field */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Amount</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="5"
                    className="pl-8"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </div>
              </FormControl>
              <FormDescription>
                Enter the amount you wish to pay
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description field */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter a description for this payment"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Payment element */}
        <div className="space-y-2">
          <FormLabel>Card Details</FormLabel>
          <PaymentElement />
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="rounded-md bg-destructive/10 p-3 text-destructive flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Submit button */}
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
            `Pay ${form.watch('amount') ? formatCurrency(form.watch('amount')) : '$0.00'}`
          )}
        </Button>
      </form>
    </Form>
  );
};

// Payment form wrapper component that fetches client secret
interface JobPaymentFormProps {
  jobId?: number;
  workerId?: number;
  onSuccess: () => void;
  isExistingJob?: boolean;
}

const JobPaymentForm: React.FC<JobPaymentFormProps> = ({
  jobId,
  workerId,
  onSuccess,
  isExistingJob = false,
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const { toast } = useToast();

  // Create a payment intent when component mounts
  const { isLoading, error } = useQuery({
    queryKey: ['/api/stripe/create-payment-intent', jobId],
    queryFn: async () => {
      try {
        const res = await apiRequest('POST', '/api/stripe/create-payment-intent', {
          amount: 100, // Initial amount - will be updated by form
          jobId,
          workerId,
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
    enabled: !!jobId || !!workerId, // Only run if we have either jobId or workerId
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
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
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm
        jobId={jobId}
        workerId={workerId}
        onSuccess={onSuccess}
        isExistingJob={isExistingJob}
      />
    </Elements>
  );
};

export default JobPaymentForm;