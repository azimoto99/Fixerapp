import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Trash2,
  CreditCard,
  PlusCircle,
  Loader2,
  CheckCircle,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Add Card Form Component
function AddCardForm({ onSuccess }: { onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        throw new Error('Card element not found');
      }
      
      // Create payment method
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });
      
      if (stripeError) {
        throw new Error(stripeError.message);
      }
      
      if (!paymentMethod) {
        throw new Error('Failed to create payment method');
      }
      
      // Save payment method to server
      const response = await apiRequest('POST', '/api/stripe/payment-methods', {
        paymentMethodId: paymentMethod.id,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save payment method');
      }
      
      toast({
        title: 'Card Added',
        description: 'Your card has been saved successfully',
      });
      
      // Clear the form
      cardElement.clear();
      
      // Invalidate payment methods query to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/payment-methods'] });
      
      // Call success callback
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      toast({
        title: 'Error Adding Card',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
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
                  color: '#EF4444',
                },
              },
            }}
          />
        </div>
        
        {error && (
          <div className="text-sm text-destructive flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            {error}
          </div>
        )}
        
        <Button 
          type="submit" 
          disabled={!stripe || isLoading} 
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Add Card
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// Add Card Dialog Component
function AddCardDialog() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Card
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Enter your card details below to save a new payment method
          </DialogDescription>
        </DialogHeader>
        
        <Elements stripe={stripePromise}>
          <AddCardForm onSuccess={() => setIsOpen(false)} />
        </Elements>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PaymentMethodsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch saved payment methods
  const { data: paymentMethods, isLoading, isError } = useQuery({
    queryKey: ['/api/stripe/payment-methods'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/stripe/payment-methods');
      if (!res.ok) {
        if (res.status === 404) return { data: [] };
        throw new Error('Failed to fetch payment methods');
      }
      return res.json();
    },
  });
  
  // Delete payment method mutation
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
        title: 'Payment Method Removed',
        description: 'Your payment method has been removed successfully',
      });
      
      // Invalidate payment methods query to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/payment-methods'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove payment method',
        variant: 'destructive',
      });
    },
  });
  
  // Set as default payment method mutation
  const setDefaultPaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const res = await apiRequest('POST', `/api/stripe/payment-methods/default`, {
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
        title: 'Default Payment Method Updated',
        description: 'Your default payment method has been updated',
      });
      
      // Invalidate payment methods query to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/payment-methods'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update default payment method',
        variant: 'destructive',
      });
    },
  });
  
  // Handle delete payment method
  const handleDelete = (paymentMethodId: string) => {
    if (confirm('Are you sure you want to remove this payment method?')) {
      deletePaymentMethodMutation.mutate(paymentMethodId);
    }
  };
  
  // Handle set as default payment method
  const handleSetDefault = (paymentMethodId: string) => {
    setDefaultPaymentMethodMutation.mutate(paymentMethodId);
  };
  
  // Render content based on loading/error state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>
            Manage your saved payment methods
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>
            Manage your saved payment methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <h3 className="font-medium">Failed to load payment methods</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Please try again later
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Convert paymentMethods to array if it's not already
  const paymentMethodsArray = Array.isArray(paymentMethods?.data) 
    ? paymentMethods.data 
    : [];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
        <CardDescription>
          Manage your saved payment methods
        </CardDescription>
      </CardHeader>
      <CardContent>
        {paymentMethodsArray.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CreditCard className="h-8 w-8 text-muted-foreground mb-2" />
            <h3 className="font-medium">No Payment Methods</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              You haven't added any payment methods yet
            </p>
            <AddCardDialog />
          </div>
        ) : (
          <div className="space-y-4">
            {paymentMethodsArray.map((method: any) => (
              <div 
                key={method.id} 
                className={`flex items-center justify-between p-4 border rounded-md ${
                  method.isDefault ? 'bg-primary/5 border-primary/20' : ''
                }`}
              >
                <div className="flex items-center">
                  <div className="bg-primary/10 rounded-full p-2 mr-3">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {method.card.brand.charAt(0).toUpperCase() + method.card.brand.slice(1)}
                      {' '}•••• {method.card.last4}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Expires {method.card.exp_month}/{method.card.exp_year.toString().slice(-2)}
                      {method.isDefault && (
                        <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!method.isDefault && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleSetDefault(method.id)}
                            disabled={setDefaultPaymentMethodMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Set as default</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(method.id)}
                          disabled={deletePaymentMethodMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Remove card</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        {paymentMethodsArray.length > 0 && (
          <AddCardDialog />
        )}
      </CardFooter>
    </Card>
  );
}