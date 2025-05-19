import * as React from 'react';
import { useState, useEffect, createContext, useContext } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
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

// Import from our environment helper that works across platforms
import { STRIPE_PUBLIC_KEY } from '@/lib/env';

// Load Stripe outside of component render for better performance
const stripePromise = loadStripe(STRIPE_PUBLIC_KEY);

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
    
    // Fetch payment methods if needed
    queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    
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
    const isAnyDialogOpen = isAddPaymentMethodOpen || isSelectPaymentMethodOpen;
    
    if (isAnyDialogOpen) {
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    } else {
      document.body.style.overflow = ''; // Restore scrolling
    }
    
    return () => {
      document.body.style.overflow = ''; // Clean up
    };
  }, [isAddPaymentMethodOpen, isSelectPaymentMethodOpen]);

  // Payment methods query 
  const paymentMethodsQuery = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/stripe/payment-methods');
      if (!response.ok) {
        throw new Error('Failed to load payment methods');
      }
      return response.json();
    }
  });

  return (
    <PaymentDialogContext.Provider value={{ openAddPaymentMethod, openPaymentMethodsDialog }}>
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

      {/* Payment Method Selection Dialog */}
      <PaymentDialog open={isSelectPaymentMethodOpen} onOpenChange={closeSelectPaymentMethod}>
        <PaymentDialogContent className="sm:max-w-md">
          <PaymentDialogHeader>
            <PaymentDialogTitle>Select Payment Method</PaymentDialogTitle>
            <PaymentDialogDescription>
              Select a payment method to use for this transaction
            </PaymentDialogDescription>
          </PaymentDialogHeader>
          
          {/* Payment methods list */}
          <div className="py-4">
            <div className="space-y-4">
              {paymentMethodsQuery.isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : paymentMethodsQuery.isError ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Failed to load payment methods.</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => paymentMethodsQuery.refetch()} 
                    className="mt-2"
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                <>
                  {paymentMethodsQuery.data?.length > 0 ? (
                    paymentMethodsQuery.data.map((method: any) => (
                      <Button
                        key={method.id}
                        onClick={() => handlePaymentMethodSelect(method.id)}
                        className="w-full justify-start text-left font-normal"
                        variant="outline"
                      >
                        <span className="flex items-center">
                          <svg
                            className="h-4 w-6 mr-2"
                            viewBox="0 0 40 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <rect width="40" height="24" rx="4" fill="#252525" />
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M14.5 11.75H11.75V15.25H14.5V11.75Z"
                              fill="#FF5F00"
                            />
                            <path
                              d="M12.125 8.5C10.8 8.5 9.625 9.05 8.75 9.925C9.7 10.875 10.25 12.2 10.25 13.525C10.25 14.85 9.7 16.175 8.75 17.125C9.625 18 10.8 18.55 12.125 18.55C14.775 18.55 16.75 16.3 16.75 13.525C16.75 10.75 14.775 8.5 12.125 8.5Z"
                              fill="#EB001B"
                            />
                            <path
                              d="M27.875 8.5C26.55 8.5 25.375 9.05 24.5 9.925C25.45 10.875 26 12.2 26 13.525C26 14.85 25.45 16.175 24.5 17.125C25.375 18 26.55 18.55 27.875 18.55C30.525 18.55 32.5 16.3 32.5 13.525C32.5 10.75 30.525 8.5 27.875 8.5Z"
                              fill="#F79E1B"
                            />
                          </svg>
                          
                          <span>
                            <span className="font-medium">{method.card?.brand || 'Card'}</span>
                            <span className="text-muted-foreground ml-2">•••• {method.card?.last4 || '****'}</span>
                          </span>
                        </span>
                      </Button>
                    ))
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-sm text-muted-foreground mb-2">No payment methods found.</p>
                    </div>
                  )}
                </>
              )}
              
              <Button
                onClick={() => openAddPaymentMethod()}
                className="w-full"
                variant="outline"
              >
                + Add New Payment Method
              </Button>
            </div>
          </div>
        </PaymentDialogContent>
      </PaymentDialog>
    </PaymentDialogContext.Provider>
  );
};