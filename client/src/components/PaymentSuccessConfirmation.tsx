import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { CheckCircle } from 'lucide-react';

interface PaymentSuccessConfirmationProps {
  title?: string;
  description?: string;
  amount?: number;
  jobId?: number;
  isJobPosting?: boolean;
  buttonText?: string;
  redirectPath?: string;
}

const PaymentSuccessConfirmation: React.FC<PaymentSuccessConfirmationProps> = ({
  title = "Payment Successful!",
  description = "Your payment has been processed successfully.",
  amount,
  jobId,
  isJobPosting = false,
  buttonText = "View Details",
  redirectPath
}) => {
  const [, navigate] = useLocation();

  const handleButtonClick = () => {
    if (redirectPath) {
      navigate(redirectPath);
    } else if (jobId) {
      navigate(`/job/${jobId}`);
    } else {
      navigate('/');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-green-100">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        <CardTitle className="text-2xl font-bold text-center">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-gray-600">{description}</p>
        
        {amount && (
          <div className="py-3 px-4 bg-green-50 rounded-lg text-center">
            <p className="text-gray-600 mb-1 text-sm">Total Amount</p>
            <p className="text-2xl font-semibold text-green-700">${amount.toFixed(2)}</p>
          </div>
        )}
        
        {isJobPosting && (
          <div className="space-y-2 text-center text-gray-600 text-sm">
            <p>Your job has been posted and is now visible to available workers.</p>
            <p>You'll receive notifications when workers apply for your job.</p>
          </div>
        )}
        
        <div className="pt-4">
          <Button 
            onClick={handleButtonClick} 
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {buttonText}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentSuccessConfirmation;