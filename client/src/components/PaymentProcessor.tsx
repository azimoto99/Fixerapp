import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Import PayPal component for payment processing
import PayPalPaymentForm from '@/components/payments/PayPalPaymentForm';

interface PaymentProcessorProps {
  paymentId: number;
  jobId: number;
  jobTitle: string;
  amount: number;
  onPaymentComplete: () => void;
  onCancel: () => void;
}

const PaymentProcessor: React.FC<PaymentProcessorProps> = ({
  paymentId,
  jobId,
  jobTitle,
  amount,
  onPaymentComplete,
  onCancel
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Create job object for PayPal component
  const job = {
    id: jobId,
    title: jobTitle,
    payAmount: amount,
    posterId: 0, // Will be set by backend
    workerId: null,
    status: 'pending'
  };

  // Handle payment confirmation
  const confirmPaymentMutation = useMutation({
    mutationFn: async (paypalOrderId: string) => {
      const res = await apiRequest('POST', '/api/payments/confirm-payment', {
        paymentId,
        paypalOrderId
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Successful",
        description: "Your payment has been processed successfully!"
      });
      onPaymentComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Confirmation Failed",
        description: error.message || "There was an error confirming your payment.",
        variant: "destructive"
      });
    }
  });

  const handlePaymentSuccess = () => {
    setIsProcessing(true);
    toast({
      title: "Processing Payment",
      description: "Your payment is being processed..."
    });
    
    // In a real implementation, you would get the PayPal order ID from the payment flow
    // For now, we'll just complete the payment
    setTimeout(() => {
      setIsProcessing(false);
      onPaymentComplete();
    }, 1000);
  };

  const handlePaymentCancel = () => {
    toast({
      title: "Payment Cancelled",
      description: "You cancelled the payment process."
    });
    onCancel();
  };

  if (isProcessing) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You'll be redirected to PayPal to complete your payment securely. 
          PayPal accepts credit cards, debit cards, and bank accounts.
        </AlertDescription>
      </Alert>

      <div className="bg-muted/50 p-4 rounded-md">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium">Job:</span>
          <span>{jobTitle}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium">Total Amount:</span>
          <span className="text-lg font-bold">${amount.toFixed(2)}</span>
        </div>
      </div>

      <PayPalPaymentForm
        job={job}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
      />
    </div>
  );
};

export default PaymentProcessor;