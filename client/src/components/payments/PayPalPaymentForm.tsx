import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoaderIcon, AlertTriangleIcon, CreditCardIcon, CheckIcon } from 'lucide-react';

// PayPal SDK script loader
const loadPayPalScript = (clientId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (window.paypal) {
      resolve(window.paypal);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`;
    script.async = true;
    script.onload = () => {
      if (window.paypal) {
        resolve(window.paypal);
      } else {
        reject(new Error('PayPal SDK not loaded'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
    document.head.appendChild(script);
  });
};

// Declare PayPal types
declare global {
  interface Window {
    paypal: any;
  }
}

interface Job {
  id: number;
  title: string;
  payAmount: number;
  posterId: number;
  workerId: number | null;
  status: string;
}

interface PayPalOrder {
  orderId: string;
  approvalUrl: string;
}

// PayPal checkout component
const PayPalCheckout = ({ 
  job, 
  onSuccess, 
  onCancel 
}: { 
  job: Job; 
  onSuccess: () => void;
  onCancel: () => void;
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create PayPal order
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/payments/create-order', {
        amount: job.payAmount,
        currency: 'USD',
        jobId: job.id.toString(),
        description: `Payment for job: ${job.title}`
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create PayPal order');
      }
      return response.json();
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        variant: 'destructive',
        title: 'Payment Setup Failed',
        description: error.message,
      });
    }
  });

  // Capture PayPal order
  const captureOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest('POST', '/api/payments/capture', {
        orderId
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to capture PayPal payment');
      }
      return response.json();
    },
    onSuccess: async () => {
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['job', job.id] });

      toast({
        title: 'Payment Successful',
        description: 'Your payment has been processed successfully.',
      });
      onSuccess();
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        variant: 'destructive',
        title: 'Payment Failed',
        description: error.message,
      });
    }
  });

  useEffect(() => {
    const initializePayPal = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load PayPal SDK
        const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
        if (!clientId) {
          throw new Error('PayPal client ID not configured');
        }

        const paypal = await loadPayPalScript(clientId);

        // Render PayPal button
        paypal.Buttons({
          createOrder: async () => {
            const order = await createOrderMutation.mutateAsync();
            return order.orderId;
          },
          onApprove: async (data: any) => {
            await captureOrderMutation.mutateAsync(data.orderID);
          },
          onCancel: () => {
            toast({
              title: 'Payment Cancelled',
              description: 'You cancelled the payment process.',
            });
            onCancel();
          },
          onError: (err: any) => {
            console.error('PayPal error:', err);
            setError('PayPal payment failed. Please try again.');
            toast({
              variant: 'destructive',
              title: 'Payment Error',
              description: 'There was an error processing your payment.',
            });
          },
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            height: 40
          }
        }).render('#paypal-button-container');

        setIsLoading(false);
      } catch (err: any) {
        console.error('PayPal initialization error:', err);
        setError(err.message || 'Failed to initialize PayPal');
        setIsLoading(false);
      }
    };

    initializePayPal();
  }, [job.id, job.payAmount, job.title, createOrderMutation, captureOrderMutation, toast, onCancel, onSuccess]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoaderIcon className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading PayPal...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangleIcon className="h-4 w-4" />
        <AlertTitle>Payment Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Click the PayPal button below to complete your payment
        </p>
      </div>
      
      <div id="paypal-button-container" className="w-full"></div>
      
      <div className="text-center">
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={createOrderMutation.isPending || captureOrderMutation.isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

// Main PayPal payment form component
export default function PayPalPaymentForm({ 
  job, 
  onSuccess,
  onCancel
}: { 
  job: Job; 
  onSuccess: () => void;
  onCancel: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment for Job</CardTitle>
        <CardDescription>
          Complete payment for "{job.title}"
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Payment Summary</h3>
            <div className="bg-muted/50 p-4 rounded-md space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Job Amount:</span>
                <span>${(job.payAmount / 1.05).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Fee (5%):</span>
                <span>${(job.payAmount * 0.05 / 1.05).toFixed(2)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between font-medium">
                <span>Total:</span>
                <span>${job.payAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* PayPal Payment */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Pay with PayPal</h3>
            <div className="p-4 border rounded-md">
              <PayPalCheckout 
                job={job} 
                onSuccess={onSuccess} 
                onCancel={onCancel} 
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}