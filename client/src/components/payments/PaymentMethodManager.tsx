import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement, CardElement } from '@stripe/react-stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  PlusCircle, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  ShieldCheck
} from 'lucide-react';

// Load Stripe outside of components
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Payment method type definition
interface PaymentMethodDisplay {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault?: boolean;
}

// Add Payment Method Form
const AddPaymentMethodForm: React.FC<{
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Setup payment method mutation
  const setupPaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const res = await apiRequest('POST', '/api/stripe/payment-methods/setup', {
        paymentMethodId
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to setup payment method');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Method Added",
        description: "Your payment method has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/payment-methods'] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add Payment Method",
        description: error.message,
        variant: "destructive"
      });
      setErrorMessage(error.message);
      setIsSubmitting(false);
    }
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Create the payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement)!,
      });

      if (error) {
        throw new Error(error.message || 'Failed to create payment method');
      }

      if (paymentMethod) {
        // Send the payment method ID to the server
        await setupPaymentMethodMutation.mutate(paymentMethod.id);
      }
    } catch (err) {
      console.error('Error adding payment method:', err);
      setErrorMessage((err as Error).message || 'An error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div className="rounded-md bg-destructive/10 p-3 text-destructive flex items-center text-sm">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          {errorMessage}
        </div>
      )}
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Card Information</label>
        <div className="rounded-md border border-input bg-background p-3">
          <CardElement 
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground flex items-center mt-2">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Your payment information is processed securely by Stripe
        </p>
      </div>
      
      <div className="flex justify-end space-x-3 pt-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : 'Add Payment Method'}
        </Button>
      </div>
    </form>
  );
};

// Add Payment Method Dialog
const AddPaymentMethodDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}> = ({ open, onOpenChange, onSuccess }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Add a new credit or debit card to your account
          </DialogDescription>
        </DialogHeader>
        
        <Elements stripe={stripePromise}>
          <AddPaymentMethodForm 
            onSuccess={() => {
              onSuccess();
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        </Elements>
      </DialogContent>
    </Dialog>
  );
};

// Payment Method Card
const PaymentMethodCard: React.FC<{
  method: PaymentMethodDisplay;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}> = ({ method, onSetDefault, onDelete, isDeleting }) => {
  // Function to get card brand icon/name
  const getCardBrandDisplay = (brand: string) => {
    // Simplified display - could be enhanced with actual SVG icons for each card brand
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

  return (
    <div className={`rounded-md border p-4 ${method.isDefault ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center">
          <div className="rounded-md bg-muted/50 p-2 mr-3">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">{getCardBrandDisplay(method.brand)} •••• {method.last4}</p>
            <p className="text-sm text-muted-foreground">
              Expires {method.expMonth.toString().padStart(2, '0')}/{method.expYear.toString().slice(-2)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {method.isDefault ? (
            <span className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Default
            </span>
          ) : (
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs h-8"
              onClick={() => onSetDefault(method.id)}
            >
              Set Default
            </Button>
          )}
          
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-destructive h-8 w-8 p-0"
            onClick={() => onDelete(method.id)}
            disabled={isDeleting || method.isDefault}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main Payment Method Manager component
export const PaymentMethodManager: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch payment methods
  const { data: paymentMethods, isLoading, error } = useQuery({
    queryKey: ['/api/stripe/payment-methods'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/stripe/payment-methods');
      
      if (!res.ok) {
        throw new Error('Failed to fetch payment methods');
      }
      
      const data = await res.json();
      return data.map((pm: any) => ({
        id: pm.id,
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
        isDefault: pm.isDefault,
      })) as PaymentMethodDisplay[];
    }
  });

  // Set default payment method mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const res = await apiRequest('POST', `/api/stripe/payment-methods/${paymentMethodId}/set-default`);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to set default payment method');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Default Updated",
        description: "Your default payment method has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/payment-methods'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
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
    onMutate: (paymentMethodId: string) => {
      setDeletingId(paymentMethodId);
    },
    onSuccess: () => {
      toast({
        title: "Payment Method Removed",
        description: "Your payment method has been removed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/payment-methods'] });
      setDeletingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive"
      });
      setDeletingId(null);
    }
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="mr-2 h-5 w-5" />
          Payment Methods
        </CardTitle>
        <CardDescription>
          Manage your payment methods for job payments
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-md bg-destructive/10 p-4 text-destructive flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>Failed to load payment methods</span>
          </div>
        ) : paymentMethods && paymentMethods.length > 0 ? (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <PaymentMethodCard 
                key={method.id} 
                method={method} 
                onSetDefault={(id) => setDefaultMutation.mutate(id)}
                onDelete={(id) => deletePaymentMethodMutation.mutate(id)}
                isDeleting={deletingId === method.id}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mb-4">
              <CreditCard className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg mb-2">No Payment Methods</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Add a payment method to easily pay for jobs and services within the platform.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={() => setShowAddDialog(true)} className="flex items-center">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Payment Method
        </Button>
      </CardFooter>

      <AddPaymentMethodDialog 
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/stripe/payment-methods'] });
        }}
      />
    </Card>
  );
};

export default PaymentMethodManager;