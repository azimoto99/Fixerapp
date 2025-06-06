import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

interface PaymentFlowState {
  isProcessing: boolean;
  currentStep: 'setup' | 'payment' | 'confirmation' | 'complete';
  error: string | null;
}

export function usePaymentFlow() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [flowState, setFlowState] = useState<PaymentFlowState>({
    isProcessing: false,
    currentStep: 'setup',
    error: null
  });

  // Get user's payment methods
  const { data: paymentMethods = [], isLoading: loadingPaymentMethods } = useQuery({
    queryKey: ['/api/payment-methods'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/payment-methods');
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!user
  });

  // Get Stripe Connect status
  const { data: connectStatus } = useQuery({
    queryKey: ['/api/stripe/connect/account-status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/stripe/connect/account-status');
      if (!response.ok) return null;
      return await response.json();
    },
    enabled: !!user
  });

  // Create setup intent for adding payment methods
  const createSetupIntentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/stripe/create-setup-intent');
      if (!response.ok) {
        throw new Error('Failed to create setup intent');
      }
      return await response.json();
    }
  });

  // Process payment for job
  const processPaymentMutation = useMutation({
    mutationFn: async ({ 
      jobId, 
      amount, 
      paymentMethodId 
    }: { 
      jobId: number; 
      amount: number; 
      paymentMethodId: string; 
    }) => {
      setFlowState(prev => ({ ...prev, isProcessing: true, currentStep: 'payment' }));
      
      const response = await apiRequest('POST', '/api/payment/process-payment', {
        jobId,
        amount,
        paymentMethodId,
        paymentType: 'fixed'
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Payment processing failed');
      }
      
      return await response.json();
    },
    onSuccess: (result) => {
      setFlowState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        currentStep: 'complete',
        error: null 
      }));
      
      toast({
        title: "Payment successful!",
        description: "Your payment has been processed and the job is now active.",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
    },
    onError: (error: Error) => {
      setFlowState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: error.message 
      }));
      
      toast({
        title: "Payment failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Create payment intent for immediate payment
  const createPaymentIntentMutation = useMutation({
    mutationFn: async ({ 
      amount, 
      jobId, 
      description 
    }: { 
      amount: number; 
      jobId?: number; 
      description?: string; 
    }) => {
      const response = await apiRequest('POST', '/api/stripe/create-payment-intent', {
        amount,
        jobId,
        description,
        return_url: `${window.location.origin}/payment-success`
      });
      
      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }
      
      return await response.json();
    }
  });

  // Set up Stripe Connect account
  const setupStripeConnectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/stripe/connect/create-account');
      if (!response.ok) {
        throw new Error('Failed to create Stripe Connect account');
      }
      return await response.json();
    },
    onSuccess: (result) => {
      const url = result.accountLinkUrl || result.url;
      if (url) {
        // Redirect to Stripe onboarding
        window.location.href = url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to setup payment account",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Add payment method using Stripe Elements
  const addPaymentMethod = useCallback(async (elements: any, cardElement: any) => {
    try {
      setFlowState(prev => ({ ...prev, isProcessing: true }));
      
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe not loaded');

      // Create setup intent
      const { clientSecret } = await createSetupIntentMutation.mutateAsync();

      // Confirm setup intent with card
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: user?.fullName || user?.username,
            email: user?.email,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (setupIntent?.status === 'succeeded') {
        toast({
          title: "Payment method added!",
          description: "Your payment method has been saved successfully.",
        });
        
        // Refresh payment methods
        queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
        
        setFlowState(prev => ({ 
          ...prev, 
          isProcessing: false, 
          error: null 
        }));
        
        return setupIntent.payment_method;
      }
    } catch (error: any) {
      setFlowState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: error.message 
      }));
      
      toast({
        title: "Failed to add payment method",
        description: error.message,
        variant: "destructive",
      });
      
      throw error;
    }
  }, [user, createSetupIntentMutation, queryClient, toast]);

  // Process payment with confirmation
  const processPaymentWithConfirmation = useCallback(async ({
    amount,
    jobId,
    paymentMethodId,
    requiresConfirmation = false
  }: {
    amount: number;
    jobId?: number;
    paymentMethodId?: string;
    requiresConfirmation?: boolean;
  }) => {
    try {
      setFlowState(prev => ({ ...prev, isProcessing: true, currentStep: 'payment' }));
      
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe not loaded');

      // Create payment intent
      const { clientSecret, paymentIntentId } = await createPaymentIntentMutation.mutateAsync({
        amount,
        jobId,
        description: jobId ? `Payment for job #${jobId}` : 'Service payment'
      });

      let result;
      
      if (paymentMethodId) {
        // Use existing payment method
        result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: paymentMethodId
        });
      } else {
        // This would be used with Stripe Elements for new payment method
        throw new Error('Payment method required');
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      if (result.paymentIntent?.status === 'succeeded') {
        setFlowState(prev => ({ 
          ...prev, 
          isProcessing: false, 
          currentStep: 'complete',
          error: null 
        }));
        
        toast({
          title: "Payment successful!",
          description: "Your payment has been processed successfully.",
        });
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
        queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
        
        return result.paymentIntent;
      }
    } catch (error: any) {
      setFlowState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: error.message 
      }));
      
      toast({
        title: "Payment failed",
        description: error.message,
        variant: "destructive",
      });
      
      throw error;
    }
  }, [createPaymentIntentMutation, queryClient, toast]);

  // Remove payment method
  const removePaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await apiRequest('DELETE', `/api/payment-methods/${paymentMethodId}`);
      if (!response.ok) {
        throw new Error('Failed to remove payment method');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment method removed",
        description: "The payment method has been removed from your account.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove payment method",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Reset flow state
  const resetFlow = useCallback(() => {
    setFlowState({
      isProcessing: false,
      currentStep: 'setup',
      error: null
    });
  }, []);

  return {
    // State
    flowState,
    paymentMethods,
    connectStatus,
    loadingPaymentMethods,
    
    // Actions
    addPaymentMethod,
    processPayment: processPaymentMutation.mutate,
    processPaymentWithConfirmation,
    setupStripeConnect: setupStripeConnectMutation.mutate,
    removePaymentMethod: removePaymentMethodMutation.mutate,
    resetFlow,
    
    // Mutations for direct access
    processPaymentMutation,
    createPaymentIntentMutation,
    setupStripeConnectMutation,
    removePaymentMethodMutation
  };
}