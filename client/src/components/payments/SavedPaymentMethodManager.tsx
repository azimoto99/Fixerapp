import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, PlusCircle, Trash2, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PaymentMethod {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  isDefault?: boolean;
}

// Used to render the payment method form
function AddPaymentMethodForm() {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/payment-methods',
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Error Saving Card",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Card Saved",
          description: "Your payment method has been successfully saved.",
        });
        // Invalidate query to refresh the list
        queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
        // Close dialog (this will need to be handled by parent component)
        return true;
      }
    } catch (err: any) {
      toast({
        title: "Error Saving Card",
        description: err.message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
    
    return false;
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <PaymentElement />
        <Button 
          type="submit" 
          className="w-full" 
          disabled={!stripe || !elements || isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Payment Method'}
        </Button>
      </div>
    </form>
  );
}

export default function SavedPaymentMethodManager() {
  const { toast } = useToast();
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [setupIntentSecret, setSetupIntentSecret] = useState<string | null>(null);
  
  // Fetch saved payment methods
  const { data: paymentMethods = [], isLoading, error } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/payment-methods');
      const data = await response.json();
      return data.paymentMethods || [];
    }
  });

  // Delete payment method mutation
  const deletePaymentMethod = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await apiRequest('DELETE', `/api/payment-methods/${paymentMethodId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Method Removed",
        description: "Your payment method has been successfully removed."
      });
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error Removing Payment Method",
        description: error.message || "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Set default payment method mutation
  const setDefaultPaymentMethod = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await apiRequest('POST', `/api/payment-methods/default/${paymentMethodId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Default Payment Method Updated",
        description: "Your default payment method has been updated."
      });
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Default Payment Method",
        description: error.message || "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Create setup intent for adding a new payment method
  const createSetupIntent = async () => {
    try {
      const response = await apiRequest('POST', '/api/create-setup-intent');
      const data = await response.json();
      setSetupIntentSecret(data.clientSecret);
      setIsAddingCard(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not initiate payment setup: " + (error.message || "Unknown error"),
        variant: "destructive"
      });
    }
  };

  // Helper to format card expiration
  const formatExpiry = (month: number, year: number) => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  // Helper to get card brand name
  const getCardBrandName = (brand: string) => {
    const brands: Record<string, string> = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'American Express',
      discover: 'Discover',
      jcb: 'JCB',
      diners: 'Diners Club',
      unionpay: 'UnionPay'
    };
    
    return brands[brand.toLowerCase()] || brand;
  };

  // Close the add card dialog and reset state
  const handleCloseDialog = () => {
    setIsAddingCard(false);
    setSetupIntentSecret(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse bg-primary/5">
          <CardHeader>
            <div className="h-7 w-3/4 bg-primary/10 rounded"></div>
            <div className="h-5 w-1/2 bg-primary/10 rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="h-20 bg-primary/10 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Error Loading Payment Methods</CardTitle>
          <CardDescription>
            We encountered a problem loading your saved payment methods.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['payment-methods'] })}>
            Try Again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Your Payment Methods</h3>
        <Dialog open={isAddingCard} onOpenChange={setIsAddingCard}>
          <DialogTrigger asChild>
            <Button onClick={createSetupIntent}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Payment Method</DialogTitle>
              <DialogDescription>
                Add a new credit or debit card to your account for faster checkout.
              </DialogDescription>
            </DialogHeader>
            
            {setupIntentSecret && (
              <Elements stripe={stripePromise} options={{ clientSecret: setupIntentSecret }}>
                <AddPaymentMethodForm />
              </Elements>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {paymentMethods.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Payment Methods</CardTitle>
            <CardDescription>
              You haven't added any payment methods yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Add a payment method to easily pay for services without entering your card details each time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {paymentMethods.map((method: PaymentMethod) => (
            <Card key={method.id} className={method.isDefault ? "border-primary" : ""}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    <CardTitle className="text-lg">{getCardBrandName(method.card.brand)}</CardTitle>
                  </div>
                  {method.isDefault && (
                    <div className="flex items-center text-sm font-medium text-primary">
                      <Check className="h-4 w-4 mr-1" /> Default
                    </div>
                  )}
                </div>
                <CardDescription>
                  Ending in {method.card.last4} • Expires {formatExpiry(method.card.exp_month, method.card.exp_year)}
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-2">
                <div className="flex gap-2 ml-auto">
                  {!method.isDefault && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setDefaultPaymentMethod.mutate(method.id)}
                      disabled={setDefaultPaymentMethod.isPending}
                    >
                      Set as Default
                    </Button>
                  )}
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => deletePaymentMethod.mutate(method.id)}
                    disabled={deletePaymentMethod.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}