import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';

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

  // Get user's payment history (PayPal doesn't store payment methods client-side)
  const { data: paymentHistory = [], isLoading: loadingPaymentHistory } = useQuery({
    queryKey: ['/api/payment-history'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/payment-history');
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!user
  });

  // Get PayPal account status
  const { data: paypalStatus } = useQuery({
    queryKey: ['/api/paypal/account-status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/paypal/account-status');
      if (!response.ok) return null;
      return await response.json();
    },
    enabled: !!user
  });

  // Process payment for job using PayPal
  const processPaymentMutation = useMutation({
    mutationFn: async ({ 
      jobId, 
      amount, 
      paypalOrderId 
    }: { 
      jobId: number; 
      amount: number; 
      paypalOrderId: string; 
    }) => {
      setFlowState(prev => ({ ...prev, isProcessing: true, currentStep: 'payment' }));
      
      const response = await apiRequest('POST', '/api/payments/process', {
        jobId,
        amount,
        paypalOrderId,
        paymentType: 'paypal'
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

  // Create PayPal order for immediate payment
  const createPayPalOrderMutation = useMutation({
    mutationFn: async ({ 
      amount, 
      jobId, 
      description 
    }: { 
      amount: number; 
      jobId?: number; 
      description?: string; 
    }) => {
      const response = await apiRequest('POST', '/api/payments/create-order', {
        amount,
        jobId,
        description,
        currency: 'USD'
      });
      
      if (!response.ok) {
        throw new Error('Failed to create PayPal order');
      }
      
      return await response.json();
    }
  });

  // Capture PayPal order
  const capturePayPalOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest('POST', '/api/payments/capture', {
        orderId
      });
      
      if (!response.ok) {
        throw new Error('Failed to capture PayPal order');
      }
      
      return await response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Payment captured!",
        description: "Your payment has been successfully captured.",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to capture payment",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Process payment with PayPal confirmation
  const processPaymentWithConfirmation = useCallback(async ({
    amount,
    jobId,
    description = 'Service payment'
  }: {
    amount: number;
    jobId?: number;
    description?: string;
  }) => {
    try {
      setFlowState(prev => ({ ...prev, isProcessing: true, currentStep: 'payment' }));
      
      // Create PayPal order
      const { orderId } = await createPayPalOrderMutation.mutateAsync({
        amount,
        jobId,
        description
      });

      // In a real implementation, this would redirect to PayPal
      // For now, we'll simulate a successful payment
      const captureResult = await capturePayPalOrderMutation.mutateAsync(orderId);
      
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
      
      return captureResult;
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
  }, [createPayPalOrderMutation, capturePayPalOrderMutation, toast]);

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
    paymentHistory,
    paypalStatus,
    loadingPaymentHistory,
    
    // Actions
    processPayment: processPaymentMutation.mutate,
    processPaymentWithConfirmation,
    createPayPalOrder: createPayPalOrderMutation.mutate,
    capturePayPalOrder: capturePayPalOrderMutation.mutate,
    resetFlow,
    
    // Mutations for direct access
    processPaymentMutation,
    createPayPalOrderMutation,
    capturePayPalOrderMutation
  };
}