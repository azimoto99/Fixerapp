import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  PaymentDialog,
  PaymentDialogContent,
  PaymentDialogDescription,
  PaymentDialogHeader,
  PaymentDialogTitle,
  PaymentDialogTrigger 
} from '@/components/payments/PaymentDialog';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Check, 
  ArrowRight, 
  CheckCircle2, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Load Stripe outside of component render for better performance
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Interface for payment method
interface PaymentMethod {
  id: string;
  card: {
    brand: string;
    exp_month: number;
    exp_year: number;
    last4: string;
    country: string;
  };
}

// Component for adding a new payment method
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

    // Confirm card setup
    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-confirmation`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'An error occurred while setting up your card.');
      toast({
        variant: 'destructive',
        title: 'Setup Failed',
        description: error.message || 'Failed to save your payment method.',
      });
      setIsProcessing(false);
    } else {
      // Success
      toast({
        title: 'Card Saved',
        description: 'Your payment method has been successfully saved.',
      });
      setIsProcessing(false);
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Save Card
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
};

// Modal for adding a new payment method
const AddPaymentMethodModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  
  // Access user drawer state via a custom event
  const closeUserDrawer = () => {
    // Dispatch a custom event to notify the app to close the user drawer
    const event = new CustomEvent('close-user-drawer');
    window.dispatchEvent(event);
  };
  
  // When the modal opens, close the user drawer
  React.useEffect(() => {
    if (isOpen) {
      closeUserDrawer();
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    } else {
      document.body.style.overflow = ''; // Restore scrolling
    }
    
    return () => {
      document.body.style.overflow = ''; // Clean up
    };
  }, [isOpen]);
  
  // Create setup intent for adding a new card
  const setupIntent = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/stripe/create-setup-intent');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create setup intent');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Setup Failed',
        description: error.message || 'Failed to initiate card setup.',
      });
      onClose();
    }
  });

  // Create setup intent when modal opens
  React.useEffect(() => {
    if (isOpen && !clientSecret) {
      setupIntent.mutate();
    }
  }, [isOpen]);

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    onClose();
  };

  return (
    <PaymentDialog open={isOpen} onOpenChange={onClose}>
      <PaymentDialogContent className="sm:max-w-md">
        <PaymentDialogHeader>
          <PaymentDialogTitle>Add Payment Method</PaymentDialogTitle>
          <PaymentDialogDescription>
            Add a new payment method to your account for faster checkout.
          </PaymentDialogDescription>
        </PaymentDialogHeader>
        
        {setupIntent.isPending ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : clientSecret ? (
          <Elements 
            stripe={stripePromise} 
            options={{ 
              clientSecret,
              appearance: { theme: 'stripe' },
            }}
          >
            <AddPaymentMethodForm onSuccess={handleSuccess} />
          </Elements>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">Failed to initialize payment form.</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setupIntent.mutate()} 
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}
      </PaymentDialogContent>
    </PaymentDialog>
  );
};

// Format card brand to capitalize first letter
const formatCardBrand = (brand: string): string => {
  return brand.charAt(0).toUpperCase() + brand.slice(1);
};

// Get card brand icon based on brand name
const getCardIcon = (brand: string) => {
  return <CreditCard className="h-4 w-4" />;
};

// Main payment methods manager component
export default function PaymentMethodsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addModalOpen, setAddModalOpen] = useState(false);
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
      const json = await response.json();
      return json.data || [];
    },
  });

  // Set default payment method
  const setDefaultMethod = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await apiRequest('POST', `/api/stripe/payment-methods/${paymentMethodId}/set-default`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to set default payment method');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Default Updated',
        description: 'Your default payment method has been updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Failed to update default payment method.',
      });
    }
  });

  // Delete payment method
  const deleteMethod = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await apiRequest('DELETE', `/api/stripe/payment-methods/${paymentMethodId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete payment method');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Card Removed',
        description: 'Your payment method has been removed.',
      });
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.message || 'Failed to delete payment method.',
      });
    }
  });

  const handleSetDefault = (id: string) => {
    setSelectedMethod(id);
    setDefaultMethod.mutate(id);
  };

  const handleDeleteMethod = (id: string) => {
    deleteMethod.mutate(id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
        <CardDescription>
          Manage your saved payment methods
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to load payment methods'}
            </AlertDescription>
          </Alert>
        ) : paymentMethods && paymentMethods.length > 0 ? (
          <RadioGroup
            value={selectedMethod}
            onValueChange={handleSetDefault}
            className="space-y-3"
          >
            {paymentMethods.map((method: PaymentMethod) => (
              <div 
                key={method.id}
                className="flex items-center justify-between space-x-2 rounded-md border border-border p-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={method.id} id={method.id} />
                  <Label htmlFor={method.id} className="flex items-center cursor-pointer">
                    <div className="mr-2">
                      {getCardIcon(method.card.brand)}
                    </div>
                    <div>
                      <span className="font-medium">{formatCardBrand(method.card.brand)}</span>
                      <span className="ml-2">•••• {method.card.last4}</span>
                      <span className="text-muted-foreground ml-2 text-sm">
                        Expires {method.card.exp_month}/{method.card.exp_year % 100}
                      </span>
                    </div>
                  </Label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteMethod(method.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <div className="text-center py-8 space-y-2 border border-dashed rounded-md p-6">
            <CreditCard className="mx-auto h-8 w-8 opacity-30" />
            <p className="text-muted-foreground">No payment methods saved yet</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => setAddModalOpen(true)}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Payment Method
        </Button>
      </CardFooter>

      {/* Add payment method modal */}
      <AddPaymentMethodModal 
        isOpen={addModalOpen} 
        onClose={() => setAddModalOpen(false)} 
      />
    </Card>
  );
}