import React, { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Trash2, Check, CreditCard, Plus, Loader2 } from 'lucide-react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Load the Stripe.js library once
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required environment variable: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Payment method interface
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

// SavedPaymentMethodList component - displays list of saved payment methods
const SavedPaymentMethodList = ({
  paymentMethods,
  isLoading,
  onSetDefault,
  onDelete,
  onAddNew
}: {
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {paymentMethods.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-muted-foreground mb-4">No payment methods saved yet</p>
          <Button onClick={onAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Method
          </Button>
        </div>
      ) : (
        <>
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className="border rounded-md p-4 flex items-center justify-between"
            >
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 mr-3 text-muted-foreground" />
                <div>
                  <div className="font-medium flex items-center">
                    {method.card.brand.charAt(0).toUpperCase() + method.card.brand.slice(1)} •••• {method.card.last4}
                    {method.isDefault && (
                      <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20">
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Expires {method.card.exp_month}/{method.card.exp_year}
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                {!method.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSetDefault(method.id)}
                    title="Set as default"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(method.id)}
                  title="Remove"
                  className="text-destructive border-destructive/20 hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={onAddNew} className="w-full mt-2">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Payment Method
          </Button>
        </>
      )}
    </div>
  );
};

// AddPaymentMethodForm component - form for adding a new payment method
const AddPaymentMethodForm = ({
  onCancel,
  onSuccess
}: {
  onCancel: () => void;
  onSuccess: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Use setupIntent to save the card without charging immediately
      const result = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/payment-methods`,
        },
      });

      if (result.error) {
        setError(result.error.message || 'Failed to save payment method');
        toast({
          title: 'Error',
          description: result.error.message || 'Failed to save payment method',
          variant: 'destructive',
        });
      } else {
        // Payment method saved successfully
        toast({
          title: 'Success',
          description: 'Payment method saved successfully',
        });
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      toast({
        title: 'Error',
        description: err.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <PaymentElement />
      
      <div className="flex justify-end space-x-2 pt-2">
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
              Saving...
            </>
          ) : (
            'Save Payment Method'
          )}
        </Button>
      </div>
    </form>
  );
};

// AddPaymentMethodWrapper component - wrapper for the add payment method form
const AddPaymentMethodWrapper = ({
  onCancel,
  onSuccess
}: {
  onCancel: () => void;
  onSuccess: () => void;
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getSetupIntent = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest('POST', '/api/stripe/create-setup-intent');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create setup intent');
        }
        
        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize payment form');
        toast({
          title: 'Error',
          description: err.message || 'Failed to initialize payment form',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    getSetupIntent();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error || 'Failed to initialize payment form'}
          <Button 
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onCancel}
          >
            Go Back
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <AddPaymentMethodForm onCancel={onCancel} onSuccess={onSuccess} />
    </Elements>
  );
};

// Main component
export default function SavedPaymentMethodManager() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const fetchPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('GET', '/api/stripe/payment-methods');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch payment methods');
      }
      
      const data = await response.json();
      setPaymentMethods(data.paymentMethods || []);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to load payment methods',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, [toast]);

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      const response = await apiRequest('POST', '/api/stripe/set-default-payment-method', {
        paymentMethodId
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to set default payment method');
      }
      
      toast({
        title: 'Success',
        description: 'Default payment method updated',
      });
      
      // Refresh the list
      fetchPaymentMethods();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to set default payment method',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }
    
    try {
      const response = await apiRequest('DELETE', '/api/stripe/payment-methods/' + paymentMethodId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete payment method');
      }
      
      toast({
        title: 'Success',
        description: 'Payment method removed',
      });
      
      // Refresh the list
      fetchPaymentMethods();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to remove payment method',
        variant: 'destructive',
      });
    }
  };

  const handleAddSuccess = () => {
    setIsAdding(false);
    fetchPaymentMethods();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Payment Methods</CardTitle>
        <CardDescription>
          Manage your saved payment methods for faster checkout
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isAdding ? (
          <AddPaymentMethodWrapper
            onCancel={() => setIsAdding(false)}
            onSuccess={handleAddSuccess}
          />
        ) : (
          <SavedPaymentMethodList
            paymentMethods={paymentMethods}
            isLoading={isLoading}
            onSetDefault={handleSetDefault}
            onDelete={handleDelete}
            onAddNew={() => setIsAdding(true)}
          />
        )}
      </CardContent>
    </Card>
  );
}