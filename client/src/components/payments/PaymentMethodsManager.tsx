import React, { useState } from 'react';
import { useStripe, useElements, Elements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
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
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, CreditCard, Plus, Trash2, CheckCircle, Star, StarIcon, AlertCircle } from 'lucide-react';

// Initialize Stripe outside the component to avoid recreating on every render
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// The setup form component with Stripe Elements
function SetupForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { error: setupError } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });
      
      if (setupError) {
        setError(setupError.message || 'An error occurred');
        toast({
          title: 'Setup Error',
          description: setupError.message || 'An error occurred while setting up your payment method',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Your payment method has been added successfully',
        });
        onSuccess();
      }
    } catch (err) {
      setError('An unexpected error occurred');
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
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
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
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
            'Save Payment Method'
          )}
        </Button>
      </div>
    </form>
  );
}

// The dialog for adding a new payment method
function AddPaymentMethodDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Create a setup intent when the dialog opens
  const createSetupIntentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/stripe/payment-methods/create-setup-intent');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create setup intent');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create setup intent',
        variant: 'destructive',
      });
      setOpen(false);
    }
  });
  
  const handleOpen = () => {
    setOpen(true);
    createSetupIntentMutation.mutate();
  };
  
  const handleSuccess = () => {
    setOpen(false);
    onSuccess();
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={handleOpen}>
          <Plus className="mr-2 h-4 w-4" />
          Add Payment Method
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Add a credit card or other payment method to your account.
          </DialogDescription>
        </DialogHeader>
        
        {createSetupIntentMutation.isPending ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : clientSecret ? (
          <Elements 
            stripe={stripePromise} 
            options={{ 
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#0099FF',
                },
              },
            }}
          >
            <SetupForm onSuccess={handleSuccess} />
          </Elements>
        ) : (
          <div className="text-center py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>Failed to initialize payment form</AlertDescription>
            </Alert>
          </div>
        )}
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={createSetupIntentMutation.isPending}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PaymentMethodsManagerProps {
  userId: number;
}

export default function PaymentMethodsManager({ userId }: PaymentMethodsManagerProps) {
  const { toast } = useToast();
  
  // Get all payment methods for the user
  const { 
    data: paymentMethods, 
    isLoading, 
    refetch: refetchPaymentMethods,
  } = useQuery({
    queryKey: ['/api/stripe/payment-methods'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/stripe/payment-methods');
      if (!res.ok) {
        if (res.status === 404) {
          return { data: [] };
        }
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch payment methods');
      }
      return res.json();
    },
  });
  
  // Set a payment method as default
  const setDefaultMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const res = await apiRequest('POST', '/api/stripe/payment-methods/set-default', {
        paymentMethodId,
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to set default payment method');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Default Updated',
        description: 'Your default payment method has been updated',
      });
      refetchPaymentMethods();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to set default payment method',
        variant: 'destructive',
      });
    }
  });
  
  // Delete a payment method
  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const res = await apiRequest('DELETE', `/api/stripe/payment-methods/${paymentMethodId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete payment method');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Payment Method Deleted',
        description: 'Your payment method has been deleted',
      });
      refetchPaymentMethods();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete payment method',
        variant: 'destructive',
      });
    }
  });
  
  // Handle setting a payment method as default
  const handleSetDefault = (paymentMethodId: string) => {
    setDefaultMutation.mutate(paymentMethodId);
  };
  
  // Handle deleting a payment method
  const handleDelete = (paymentMethodId: string) => {
    deletePaymentMethodMutation.mutate(paymentMethodId);
  };
  
  // Display credit card brand icon/name
  const getCardBrandDisplay = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return 'Visa';
      case 'mastercard':
        return 'Mastercard';
      case 'amex':
        return 'American Express';
      case 'discover':
        return 'Discover';
      default:
        return brand.charAt(0).toUpperCase() + brand.slice(1);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const methods = paymentMethods?.data || [];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Your Payment Methods</h3>
          <p className="text-sm text-muted-foreground">
            Manage the payment methods associated with your account
          </p>
        </div>
        <AddPaymentMethodDialog onSuccess={refetchPaymentMethods} />
      </div>
      
      <Separator />
      
      {methods.length === 0 ? (
        <div className="text-center py-8">
          <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No Payment Methods</h3>
          <p className="text-sm text-muted-foreground mb-4">
            You haven't added any payment methods yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {methods.map((method: any) => (
            <Card key={method.id}>
              <CardHeader className="py-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2 text-primary" />
                    <CardTitle className="text-base">
                      {getCardBrandDisplay(method.card.brand)}
                      {method.isDefault && (
                        <Badge variant="outline" className="ml-2 bg-primary/10 text-primary">
                          Default
                        </Badge>
                      )}
                    </CardTitle>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDelete(method.id)}
                    disabled={deletePaymentMethodMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <CardDescription className="flex items-center">
                  •••• •••• •••• {method.card.last4}
                  <span className="mx-2">|</span>
                  Expires {method.card.exp_month}/{method.card.exp_year}
                </CardDescription>
              </CardHeader>
              <CardFooter className="py-2">
                {!method.isDefault && (
                  <div className="flex items-center">
                    <Switch 
                      id={`default-${method.id}`}
                      checked={method.isDefault}
                      onCheckedChange={() => handleSetDefault(method.id)}
                      disabled={setDefaultMutation.isPending}
                    />
                    <Label 
                      htmlFor={`default-${method.id}`}
                      className="ml-2 text-sm cursor-pointer"
                    >
                      Make Default
                    </Label>
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      <div className="text-sm text-muted-foreground">
        <p className="flex items-center mb-1">
          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
          Your payment information is securely stored by Stripe
        </p>
        <p className="flex items-center">
          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
          We never store your full card details on our servers
        </p>
      </div>
    </div>
  );
}