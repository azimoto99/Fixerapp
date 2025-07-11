import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

// Import PayPal component for payment processing
import PayPalPaymentForm from '@/components/payments/PayPalPaymentForm';

interface Job {
  id: number;
  title: string;
  payAmount: number;
  posterId: number;
  workerId: number | null;
  status: string;
}

interface JobPaymentFormProps {
  job: Job;
  onSuccess: () => void;
  onCancel: () => void;
}

// Job Payment Form using PayPal
const JobPaymentForm = ({ job, onSuccess, onCancel }: JobPaymentFormProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Job Payment</CardTitle>
          <CardDescription>
            Complete payment for "{job.title}"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              You'll be redirected to PayPal to complete your payment securely. 
              PayPal accepts credit cards, debit cards, and bank accounts.
            </AlertDescription>
          </Alert>

          <PayPalPaymentForm
            job={job}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default JobPaymentForm;