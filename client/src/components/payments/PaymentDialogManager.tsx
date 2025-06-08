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
console.log('Loading Stripe with public key:', STRIPE_PUBLIC_KEY ? `Key present (${STRIPE_PUBLIC_KEY.substring(0, 7)}...)` : 'Key missing');

if (!STRIPE_PUBLIC_KEY) {
  console.error('STRIPE_PUBLIC_KEY is missing! Check your .env file.');
}

// Initialize Stripe with better error handling
const stripePromise = STRIPE_PUBLIC_KEY ? 
  loadStripe(STRIPE_PUBLIC_KEY).then(stripe => {
    if (!stripe) {
      console.error('Failed to load Stripe. Check your public key and network connection.');
    } else {
      console.log('Stripe loaded successfully');
    }
    return stripe;
  }).catch(error => {
    console.error('Error loading Stripe:', error);
    return null;
  }) : 
  Promise.resolve(null);

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
  const [isStripeReady, setIsStripeReady] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const { toast } = useToast();

  // Monitor Stripe readiness
  useEffect(() => {
    console.log('AddPaymentMethodForm mounted');
    console.log('Stripe instance:', stripe ? 'Available' : 'Not Available');
    console.log('Elements instance:', elements ? 'Available' : 'Not Available');
    
    if (stripe && elements) {
      setIsStripeReady(true);
      setLoadingTimeout(false);
      console.log('Stripe and Elements are ready');
      
      // Check if PaymentElement is available after a short delay
      setTimeout(() => {
        const paymentElement = elements.getElement('payment');
        console.log('PaymentElement found:', paymentElement ? 'Yes' : 'No');
      }, 1000);
    } else {
      setIsStripeReady(false);
    }
  }, [stripe, elements]);

  // Set a timeout for Stripe loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!stripe || !elements) {
        setLoadingTimeout(true);
        console.warn('Stripe loading timeout reached');
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timer);
  }, [stripe, elements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      console.log('Stripe or elements not ready:', { stripe: !!stripe, elements: !!elements });
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

  // Show loading state while Stripe is initializing
  if (!isStripeReady) {
    return (
      <div className="space-y-4">
        {!STRIPE_PUBLIC_KEY ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuration Error</AlertTitle>
            <AlertDescription>
              Stripe public key is not configured. Please set VITE_STRIPE_PUBLIC_KEY in your environment variables.
            </AlertDescription>
          </Alert>
        ) : !stripe || !elements ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {loadingTimeout ? 'Payment system is taking longer than expected...' : 'Loading payment system...'}
            </p>
            <p className="text-xs text-gray-400">
              {loadingTimeout ? 'Please check your connection and try again' : 'This may take a few seconds'}
            </p>
          </div>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Payment Setup Error</AlertTitle>
            <AlertDescription>
              Stripe payment system failed to initialize. Please check:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Your internet connection</li>
                <li>Stripe public key is valid</li>
                <li>No browser extensions are blocking Stripe</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="text-xs text-gray-500 p-3 bg-gray-100 rounded">
          <strong>Debug Info:</strong><br/>
          Stripe Public Key: {STRIPE_PUBLIC_KEY ? `${STRIPE_PUBLIC_KEY.substring(0, 7)}...` : 'Missing'}<br/>
          Stripe Instance: {stripe ? 'Available' : 'Not Available'}<br/>
          Elements Instance: {elements ? 'Available' : 'Not Available'}
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            className="flex-1"
          >
            Reload Page
          </Button>
          {STRIPE_PUBLIC_KEY && (
            <Button 
              onClick={() => setIsStripeReady(true)} 
              variant="default" 
              className="flex-1"
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Payment Information
          </label>
          <div className="border border-gray-300 rounded-lg p-4 bg-white">
            <PaymentElement 
              id="payment-element"
              options={{
                layout: 'tabs',
                fields: {
                  billingDetails: 'never'
                },
                terms: {
                  card: 'never'
                }
              }}
            />
          </div>
        </div>
        
        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        
        <Button 
          type="submit" 
          disabled={!stripe || !elements || isProcessing} 
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
    </div>
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
      
      // Always create a fresh setup intent when opening the dialog
      // This ensures we have a valid client secret
      setupIntent.mutate();
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
    // Reset client secret so we get a fresh one next time
    setClientSecret(null);
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

  // Debug logging for clientSecret
  useEffect(() => {
    if (clientSecret) {
      console.log('Client secret received:', clientSecret.substring(0, 20) + '...');
      console.log('Stripe promise:', stripePromise);
    }
  }, [clientSecret]);

  // Debug logging for dialog state
  useEffect(() => {
    console.log('Payment dialog state:', {
      isOpen: isAddPaymentMethodOpen,
      isPending: setupIntent.isPending,
      isError: setupIntent.isError,
      hasClientSecret: !!clientSecret
    });
  }, [isAddPaymentMethodOpen, setupIntent.isPending, setupIntent.isError, clientSecret]);

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
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Setting up payment form...</p>
            </div>
          ) : setupIntent.isError ? (
            <div className="py-6 text-center space-y-4">
              <div className="text-destructive">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm font-medium">Failed to initialize payment form</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {setupIntent.error?.message || 'Please try again'}
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={closeAddPaymentMethod}
                >
                  Cancel
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => setupIntent.mutate()} 
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : clientSecret ? (
            STRIPE_PUBLIC_KEY ? (
              <Elements 
                stripe={stripePromise} 
                options={{ 
                  clientSecret,
                  appearance: { 
                    theme: 'stripe'
                  }
                }}
              >
                <AddPaymentMethodForm onSuccess={handleSuccess} />
              </Elements>
            ) : (
              <div className="py-6 text-center space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <AlertTitle>Configuration Error</AlertTitle>
                  <AlertDescription>
                    Stripe public key is not configured. Please set VITE_STRIPE_PUBLIC_KEY in your environment variables.
                  </AlertDescription>
                </Alert>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={closeAddPaymentMethod}
                >
                  Close
                </Button>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Initializing payment form...</p>
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
                onClick={() => {
                  closeSelectPaymentMethod();
                  openAddPaymentMethod();
                }}
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