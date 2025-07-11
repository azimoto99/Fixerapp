import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

// Import PayPal component for payment processing
import PayPalPaymentForm from '@/components/payments/PayPalPaymentForm';

interface PaymentDetailsFormProps {
  amount: number;
  jobTitle: string;
  jobId: number;
  onPaymentSuccess: () => void;
  onPaymentCancel: () => void;
}

const PaymentDetailsForm = ({ 
  amount, 
  jobTitle, 
  jobId,
  onPaymentSuccess, 
  onPaymentCancel 
}: PaymentDetailsFormProps) => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
        <CardDescription>
          Complete payment for "{jobTitle}"
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              You'll be redirected to PayPal to complete your payment securely. 
              PayPal accepts credit cards, debit cards, and bank accounts.
            </AlertDescription>
          </Alert>

          <div className="bg-muted/50 p-4 rounded-md">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Amount:</span>
              <span className="text-lg font-bold">${amount.toFixed(2)}</span>
            </div>
          </div>

          <PayPalPaymentForm
            job={job}
            onSuccess={onPaymentSuccess}
            onCancel={onPaymentCancel}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" onClick={onPaymentCancel} className="w-full">
          Cancel Payment
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PaymentDetailsForm;