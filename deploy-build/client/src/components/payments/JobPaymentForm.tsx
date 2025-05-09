import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { 
  CreditCard, 
  DollarSign, 
  ChevronsUpDown, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { 
  useStripe, 
  useElements, 
  CardElement, 
  Elements 
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Load Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Form schema for payment details
const paymentFormSchema = z.object({
  amount: z.coerce.number().min(5, "Minimum payment is $5").max(10000, "Maximum payment is $10,000"),
  description: z.string().min(5, "Please provide a brief description").max(200, "Description is too long"),
  saveCard: z.boolean().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

// Saved payment method type
interface SavedPaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  isDefault: boolean;
}

// Payment form for saved payment methods
const SavedPaymentMethodForm: React.FC<{
  jobId: number;
  amount: number;
  description: string;
  paymentMethods: SavedPaymentMethod[];
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ jobId, amount, description, paymentMethods, onSuccess, onCancel }) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Set default payment method if available
  useEffect(() => {
    const defaultMethod = paymentMethods.find(m => m.isDefault);
    if (defaultMethod) {
      setSelectedPaymentMethod(defaultMethod.id);
    } else if (paymentMethods.length > 0) {
      setSelectedPaymentMethod(paymentMethods[0].id);
    }
  }, [paymentMethods]);

  // Mutation for processing payment with saved method
  const processPaymentMutation = useMutation({
    mutationFn: async (data: { jobId: number; paymentMethodId: string; amount: number; description: string }) => {
      const res = await apiRequest('POST', '/api/payments/process-saved', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({
        title: "Payment Successful",
        description: "Your payment has been processed successfully.",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Failed",
        description: error.message || "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPaymentMethod) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method to continue.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    processPaymentMutation.mutate({
      jobId,
      paymentMethodId: selectedPaymentMethod,
      amount,
      description
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Payment Method</label>
        <div className="space-y-2">
          {paymentMethods.map(method => (
            <div 
              key={method.id}
              className={`
                border rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors
                ${selectedPaymentMethod === method.id ? 'border-primary bg-primary/5' : 'hover:bg-accent'}
              `}
              onClick={() => setSelectedPaymentMethod(method.id)}
            >
              <div className={`
                p-2 rounded-full 
                ${selectedPaymentMethod === method.id ? 'bg-primary text-white' : 'bg-muted'}
              `}>
                <CreditCard className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{method.card?.brand?.toUpperCase() || 'Card'} •••• {method.card?.last4}</p>
                <p className="text-xs text-muted-foreground">Expires {method.card?.exp_month}/{method.card?.exp_year}</p>
              </div>
              {selectedPaymentMethod === method.id && (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-muted/30 p-4 rounded-lg space-y-2">
        <div className="flex justify-between">
          <span className="text-sm">Amount:</span>
          <span className="font-medium">{formatCurrency(amount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm">Service Fee:</span>
          <span className="text-muted-foreground">{formatCurrency(amount * 0.05)}</span>
        </div>
        <Separator className="my-2" />
        <div className="flex justify-between">
          <span className="font-medium">Total:</span>
          <span className="font-medium">{formatCurrency(amount * 1.05)}</span>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-2">
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
          disabled={!selectedPaymentMethod || isProcessing}
        >
          {isProcessing ? (
            <>
              <ChevronsUpDown className="mr-2 h-4 w-4 animate-spin" />
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

// New card payment form
const NewCardPaymentForm: React.FC<{
  jobId: number;
  amount: number;
  description: string;
  saveCard: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ jobId, amount, description, saveCard, onSuccess, onCancel }) => {
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
      // Create payment method
      const { error: createError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement)!,
      });

      if (createError) {
        throw new Error(createError.message || 'Failed to process your card');
      }

      // Process payment with the new card
      const response = await apiRequest('POST', '/api/payments/process', {
        jobId,
        paymentMethodId: paymentMethod.id,
        amount,
        description,
        saveCard
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payment failed');
      }

      toast({
        title: 'Payment Successful',
        description: 'Your payment has been processed successfully.',
      });

      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred');
      toast({
        title: 'Payment Failed',
        description: err.message || 'There was an error processing your payment',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Card Information</label>
        <div className="border rounded-md p-3">
          <CardElement 
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>

      <div className="bg-muted/30 p-4 rounded-lg space-y-2">
        <div className="flex justify-between">
          <span className="text-sm">Amount:</span>
          <span className="font-medium">{formatCurrency(amount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm">Service Fee:</span>
          <span className="text-muted-foreground">{formatCurrency(amount * 0.05)}</span>
        </div>
        <Separator className="my-2" />
        <div className="flex justify-between">
          <span className="font-medium">Total:</span>
          <span className="font-medium">{formatCurrency(amount * 1.05)}</span>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-destructive/10 p-3 rounded-md text-sm text-destructive flex items-start">
          <AlertCircle className="h-4 w-4 mr-2 mt-0.5" />
          {errorMessage}
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-2">
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
          disabled={!stripe || isProcessing}
        >
          {isProcessing ? (
            <>
              <ChevronsUpDown className="mr-2 h-4 w-4 animate-spin" />
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

// Main payment form component
export const JobPaymentForm: React.FC<{
  jobId: number;
  onSuccess: () => void;
  defaultAmount?: number;
  defaultDescription?: string;
}> = ({ jobId, onSuccess, defaultAmount = 0, defaultDescription = '' }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [paymentStage, setPaymentStage] = useState<'form' | 'payment'>('form');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [useExistingCard, setUseExistingCard] = useState(true);
  
  // Form setup
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: defaultAmount,
      description: defaultDescription,
      saveCard: true,
    },
  });
  
  // Query saved payment methods
  const { data: paymentMethods, isLoading: isLoadingPaymentMethods } = useQuery<SavedPaymentMethod[]>({
    queryKey: ['/api/payment-methods'],
    enabled: !!user,
  });
  
  // Check if user has saved payment methods
  const hasSavedPaymentMethods = !!paymentMethods && paymentMethods.length > 0;
  
  // Set up payment intent when going to payment stage
  useEffect(() => {
    if (paymentStage === 'payment' && !useExistingCard && !clientSecret) {
      const setupIntent = async () => {
        try {
          const response = await apiRequest('POST', '/api/payments/setup-intent', {});
          const data = await response.json();
          setClientSecret(data.clientSecret);
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Failed to prepare payment form',
            variant: 'destructive',
          });
          setPaymentStage('form');
        }
      };

      setupIntent();
    }
  }, [paymentStage, useExistingCard, clientSecret, toast]);
  
  // Handle form submission
  function onSubmit(values: PaymentFormValues) {
    setPaymentStage('payment');
  }
  
  // Handle payment success
  const handlePaymentSuccess = () => {
    form.reset();
    setPaymentStage('form');
    setClientSecret(null);
    onSuccess();
  };
  
  // Handle cancellation
  const handleCancel = () => {
    setPaymentStage('form');
    setClientSecret(null);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Make a Payment</CardTitle>
        <CardDescription>
          Pay for services securely using Stripe
        </CardDescription>
      </CardHeader>
      <CardContent>
        {paymentStage === 'form' ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          className="pl-10" 
                          {...field}
                          min={5}
                          step={0.01} 
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Enter the amount to pay for this job
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
                        placeholder="Payment for job completion"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter a brief description for this payment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {hasSavedPaymentMethods && (
                <FormField
                  control={form.control}
                  name="saveCard"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Select
                            value={useExistingCard ? "existing" : "new"}
                            onValueChange={(value) => setUseExistingCard(value === "existing")}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select payment type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="existing">Use saved card</SelectItem>
                              <SelectItem value="new">Use a new card</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
              
              <div className="flex justify-end">
                <Button type="submit">Continue to Payment</Button>
              </div>
            </form>
          </Form>
        ) : (
          <>
            {hasSavedPaymentMethods && useExistingCard ? (
              <SavedPaymentMethodForm
                jobId={jobId}
                amount={form.getValues('amount')}
                description={form.getValues('description')}
                paymentMethods={paymentMethods || []}
                onSuccess={handlePaymentSuccess}
                onCancel={handleCancel}
              />
            ) : clientSecret ? (
              <Elements 
                stripe={stripePromise} 
                options={{ clientSecret }}
              >
                <NewCardPaymentForm
                  jobId={jobId}
                  amount={form.getValues('amount')}
                  description={form.getValues('description')}
                  saveCard={!!form.getValues('saveCard')}
                  onSuccess={handlePaymentSuccess}
                  onCancel={handleCancel}
                />
              </Elements>
            ) : (
              <div className="py-8 text-center">
                <ChevronsUpDown className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Preparing payment form...</p>
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex items-center text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 mr-1" />
          Your payment is secured by Stripe.
        </div>
      </CardFooter>
    </Card>
  );
};

export default JobPaymentForm;