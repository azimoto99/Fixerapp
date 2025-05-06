import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
import { Button } from '@/components/ui/button';
import { Plus, Trash2, CreditCard, CheckCircle, Edit, Loader2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

// Form to add a new payment method
const AddPaymentMethodForm = ({ onSuccess }: { onSuccess: () => void }) => {
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
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/payment-methods',
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'An error occurred while setting up the payment method');
      } else {
        toast({
          title: 'Payment Method Added',
          description: 'Your new payment method has been added successfully.',
        });
        
        onSuccess();
      }
    } catch (err) {
      console.error('Payment method error:', err);
      setErrorMessage((err as Error).message || 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      {errorMessage && (
        <div className="rounded-md bg-destructive/10 p-3 text-destructive flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <div>{errorMessage}</div>
        </div>
      )}
      
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
          'Add Payment Method'
        )}
      </Button>
    </form>
  );
};

// Dialog for adding a new payment method
const AddPaymentMethodDialog = ({ onSuccess }: { onSuccess: () => void }) => {
  const [open, setOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const { toast } = useToast();

  // Create a setup intent when dialog opens
  const createSetupIntent = async () => {
    try {
      const res = await apiRequest('POST', '/api/stripe/create-setup-intent', {});
      
      if (!res.ok) {
        throw new Error('Failed to create setup intent');
      }
      
      const data = await res.json();
      setClientSecret(data.clientSecret);
    } catch (err) {
      console.error('Error creating setup intent:', err);
      toast({
        title: 'Error',
        description: 'Failed to initialize payment method setup. Please try again later.',
        variant: 'destructive',
      });
      setOpen(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      createSetupIntent();
    } else {
      setClientSecret(null);
    }
  };

  const handleSuccess = () => {
    setOpen(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Method
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Add a new credit card or debit card to your account.
          </DialogDescription>
        </DialogHeader>
        
        {clientSecret ? (
          <Elements 
            stripe={stripePromise} 
            options={{ clientSecret, appearance: { theme: 'stripe' } }}
          >
            <AddPaymentMethodForm onSuccess={handleSuccess} />
          </Elements>
        ) : (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Main payment methods manager component
interface PaymentMethodsManagerProps {
  userId: number;
}

const PaymentMethodsManager: React.FC<PaymentMethodsManagerProps> = ({ userId }) => {
  const { toast } = useToast();
  
  // Fetch payment methods from the API
  const { data: paymentMethods, isLoading, refetch } = useQuery({
    queryKey: ['/api/payment-methods', userId],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/payment-methods');
      if (!res.ok) throw new Error('Failed to fetch payment methods');
      return res.json();
    },
  });
  
  // Delete payment method mutation
  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const res = await apiRequest('DELETE', `/api/payment-methods/${paymentMethodId}`);
      if (!res.ok) throw new Error('Failed to delete payment method');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Payment Method Removed',
        description: 'Your payment method has been successfully removed.',
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to remove payment method: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Set default payment method mutation
  const setDefaultPaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const res = await apiRequest('POST', `/api/payment-methods/${paymentMethodId}/set-default`);
      if (!res.ok) throw new Error('Failed to set default payment method');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Default Payment Method Updated',
        description: 'Your default payment method has been updated.',
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update default payment method: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Get display info for card
  const getCardDisplay = (card: any) => {
    return {
      brand: card.brand,
      last4: card.last4,
      expiryMonth: card.exp_month,
      expiryYear: card.exp_year,
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
        <CardDescription>
          Manage the credit and debit cards you use for payment
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : paymentMethods && paymentMethods.length > 0 ? (
          <div className="space-y-4">
            {paymentMethods.map((method: any) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 border rounded-md bg-background"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-10 w-10 p-2 bg-primary/10 rounded-md text-primary" />
                  <div>
                    <p className="font-medium">
                      {method.card.brand.charAt(0).toUpperCase() + method.card.brand.slice(1)} •••• {method.card.last4}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Expires {method.card.exp_month}/{method.card.exp_year}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {method.isDefault ? (
                    <Badge className="flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
                      <CheckCircle className="h-3 w-3" />
                      Default
                    </Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDefaultPaymentMethodMutation.mutate(method.id)}
                      disabled={setDefaultPaymentMethodMutation.isPending}
                    >
                      {setDefaultPaymentMethodMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Set Default'
                      )}
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deletePaymentMethodMutation.mutate(method.id)}
                    disabled={deletePaymentMethodMutation.isPending}
                  >
                    {deletePaymentMethodMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 space-y-3">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No payment methods found</p>
            <p className="text-sm text-muted-foreground">
              Add a credit or debit card to use for payments
            </p>
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <AddPaymentMethodDialog onSuccess={refetch} />
      </CardFooter>
    </Card>
  );
};

export default PaymentMethodsManager;