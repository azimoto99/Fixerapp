import React, { useState, useEffect } from 'react';
import { useStripe, useElements, Elements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle } from 'lucide-react';

// Load Stripe outside of component render to avoid re-creating Stripe object on every render
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Form schema for job payment
const jobPaymentSchema = z.object({
  amount: z.number().min(5, "Minimum payment is $5"),
  description: z.string().min(3, "Description is required").max(255),
});

type JobPaymentFormValues = z.infer<typeof jobPaymentSchema>;

interface CheckoutFormProps {
  clientSecret: string;
  paymentIntentId: string;
  onSuccess: () => void;
}

// Internal checkout form component with stripe context
function CheckoutForm({ clientSecret, paymentIntentId, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Handle form submission and payment confirmation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href, // Use the current URL for redirection
        },
        redirect: 'if_required', // Only redirect if 3D Secure is required
      });

      if (submitError) {
        setError(submitError.message || 'Payment failed');
        toast({
          title: 'Payment Failed',
          description: submitError.message || 'There was an error processing your payment',
          variant: 'destructive',
        });
      } else {
        // Payment succeeded
        toast({
          title: 'Payment Successful',
          description: 'Your payment has been processed successfully',
        });
        onSuccess();
      }
    } catch (err) {
      setError('An unexpected error occurred');
      toast({
        title: 'Payment Error',
        description: 'An unexpected error occurred while processing your payment',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <PaymentElement />
        
        {error && (
          <div className="text-destructive text-sm">{error}</div>
        )}
        
        <Button 
          type="submit" 
          disabled={!stripe || !elements || isLoading} 
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing
            </>
          ) : (
            'Pay Now'
          )}
        </Button>
      </div>
    </form>
  );
}

interface JobPaymentFormProps {
  jobId: number;
  workerId?: number;
  initialAmount?: number;
  onSuccess?: () => void;
}

/**
 * JobPaymentForm Component
 * 
 * A form that allows users to pay for jobs using Stripe
 */
export default function JobPaymentForm({
  jobId,
  workerId,
  initialAmount = 0,
  onSuccess = () => {}
}: JobPaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const { toast } = useToast();
  
  // Fetch job details to get worker info if not provided
  const { data: jobData, isLoading: isLoadingJob } = useQuery({
    queryKey: ['/api/jobs', jobId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/jobs/${jobId}`);
      if (!res.ok) throw new Error('Failed to fetch job details');
      return res.json();
    }
  });
  
  // Get worker ID from job if not provided
  useEffect(() => {
    if (!workerId && jobData?.workerId) {
      // Set worker ID from job data if available
      // This is a controlled component, so we don't modify props directly
    }
  }, [workerId, jobData]);
  
  // Set up form with default values
  const form = useForm<JobPaymentFormValues>({
    resolver: zodResolver(jobPaymentSchema),
    defaultValues: {
      amount: initialAmount || 0,
      description: `Payment for Job #${jobId}`,
    },
  });
  
  // Create payment intent mutation
  const createPaymentIntentMutation = useMutation({
    mutationFn: async (data: JobPaymentFormValues) => {
      const payload = {
        ...data,
        jobId,
        workerId: workerId || jobData?.workerId,
      };
      
      const res = await apiRequest('POST', '/api/stripe/create-payment-intent', payload);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create payment intent');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to set up payment',
        variant: 'destructive',
      });
    }
  });
  
  // Handle form submission to create payment intent
  const onSubmit = (values: JobPaymentFormValues) => {
    createPaymentIntentMutation.mutate(values);
  };
  
  // Handle successful payment
  const handlePaymentSuccess = () => {
    setPaymentSuccess(true);
    
    // Invalidate relevant queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId] });
    queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
    
    if (onSuccess) {
      onSuccess();
    }
  };
  
  // If payment was successful, show success message
  if (paymentSuccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            Payment Successful
          </CardTitle>
          <CardDescription>
            Your payment has been processed successfully
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Thank you for your payment. The worker has been notified.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => setPaymentSuccess(false)} variant="outline" className="w-full">
            Make Another Payment
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // If client secret is set, show the payment form
  if (clientSecret) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Payment</CardTitle>
          <CardDescription>
            Please enter your payment details to complete the transaction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Elements 
            stripe={stripePromise} 
            options={{ 
              clientSecret,
              appearance: { 
                theme: 'stripe',
                variables: {
                  colorPrimary: '#0099FF',
                }
              }
            }}
          >
            <CheckoutForm 
              clientSecret={clientSecret} 
              paymentIntentId={paymentIntentId!}
              onSuccess={handlePaymentSuccess} 
            />
          </Elements>
        </CardContent>
      </Card>
    );
  }
  
  // Initial payment form to set amount and description
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment for Job #{jobId}</CardTitle>
        <CardDescription>
          Enter payment details for your job
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      placeholder="0.00"
                      min="5"
                      step="0.01"
                      value={field.value || ''}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the payment amount in USD
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Payment for services rendered"
                    />
                  </FormControl>
                  <FormDescription>
                    Enter a brief description for this payment
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {createPaymentIntentMutation.isError && (
              <div className="text-destructive text-sm">
                {createPaymentIntentMutation.error instanceof Error
                  ? createPaymentIntentMutation.error.message
                  : 'An unknown error occurred'
                }
              </div>
            )}
            
            <Button 
              type="submit" 
              disabled={createPaymentIntentMutation.isPending || !form.formState.isValid}
              className="w-full"
            >
              {createPaymentIntentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up payment...
                </>
              ) : (
                'Continue to Payment'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}