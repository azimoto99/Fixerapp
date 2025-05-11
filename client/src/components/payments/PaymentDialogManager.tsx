import React, { useState, useEffect, createContext, useContext } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  PaymentDialog,
  PaymentDialogContent,
  PaymentDialogDescription,
  PaymentDialogHeader,
  PaymentDialogTitle
} from '@/components/payments/PaymentDialog';

// Load Stripe outside of component render for better performance
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Create context for payment dialog
type PaymentDialogContextType = {
  openAddPaymentMethod: () => void;
  openPaymentMethodsDialog: (options: { 
    onSelect: (paymentMethodId: string) => void; 
    onClose: () => void; 
  }) => void;
};

const PaymentDialogContext = createContext<PaymentDialogContextType | null>(null);

// Hook for components to use the payment dialog
export const usePaymentDialog = () => {
  const context = useContext(PaymentDialogContext);
  if (!context) {
    throw new Error('usePaymentDialog must be used within a PaymentDialogProvider');
  }
  return context;
};

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

// Provider component that will wrap the application
export const PaymentDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddPaymentMethodOpen, setIsAddPaymentMethodOpen] = useState(false);
  const [isSelectPaymentMethodOpen, setIsSelectPaymentMethodOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentMethodSelectCallbacks, setPaymentMethodSelectCallbacks] = useState<{
    onSelect: (paymentMethodId: string) => void;
    onClose: () => void;
  } | null>(null);

  // Access user drawer state via a custom event
  const closeUserDrawer = () => {
    // Dispatch a custom event to notify the app to close the user drawer
    const event = new CustomEvent('close-user-drawer');
    window.dispatchEvent(event);
  };
  
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
      closeAddPaymentMethod();
    }
  });

  const openAddPaymentMethod = () => {
    // Close the user drawer first
    closeUserDrawer();
    
    // Then open the payment dialog
    setTimeout(() => {
      setIsAddPaymentMethodOpen(true);
      
      // Only create setup intent if we don't already have one
      if (!clientSecret) {
        setupIntent.mutate();
      }
    }, 300); // Slight delay to allow drawer to close
  };
  
  // Open the payment methods selection dialog
  const openPaymentMethodsDialog = (options: { 
    onSelect: (paymentMethodId: string) => void; 
    onClose: () => void; 
  }) => {
    // Close the user drawer first
    closeUserDrawer();
    
    // Store callbacks
    setPaymentMethodSelectCallbacks(options);
    
    // Then open payment methods dialog
    setTimeout(() => {
      setIsSelectPaymentMethodOpen(true);
    }, 300);
  };

  const closeAddPaymentMethod = () => {
    setIsAddPaymentMethodOpen(false);
  };
  
  const closeSelectPaymentMethod = () => {
    setIsSelectPaymentMethodOpen(false);
    
    // Call onClose callback if provided
    if (paymentMethodSelectCallbacks?.onClose) {
      paymentMethodSelectCallbacks.onClose();
    }
    
    // Clear callbacks
    setPaymentMethodSelectCallbacks(null);
  };
  
  const handlePaymentMethodSelect = (paymentMethodId: string) => {
    // Call onSelect callback
    if (paymentMethodSelectCallbacks?.onSelect) {
      paymentMethodSelectCallbacks.onSelect(paymentMethodId);
    }
    
    // Close dialog
    closeSelectPaymentMethod();
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    closeAddPaymentMethod();
  };

  // When modal is opened/closed, handle body scroll
  useEffect(() => {
    if (isAddPaymentMethodOpen) {
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    } else {
      document.body.style.overflow = ''; // Restore scrolling
    }
    
    return () => {
      document.body.style.overflow = ''; // Clean up
    };
  }, [isAddPaymentMethodOpen]);

  return (
    <PaymentDialogContext.Provider value={{ openAddPaymentMethod }}>
      {children}

      {/* Add Payment Method Dialog - at the root level */}
      <PaymentDialog open={isAddPaymentMethodOpen} onOpenChange={closeAddPaymentMethod}>
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
    </PaymentDialogContext.Provider>
  );
};