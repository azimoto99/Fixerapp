import React from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import { useLocation } from 'wouter';

interface PayButtonProps {
  jobId: number;
  jobTitle: string;
  amount: number;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  onPaymentComplete?: () => void;
}

const PayButton: React.FC<PayButtonProps> = ({
  jobId,
  jobTitle,
  amount,
  disabled = false,
  variant = 'default',
  onPaymentComplete
}) => {
  const [, navigate] = useLocation();

  const handlePayClick = () => {
    // Redirect to the new checkout page with job ID and amount as URL parameters
    navigate(`/checkout?jobId=${jobId}&amount=${amount}`);
  };

  return (
    <Button
      variant={variant}
      disabled={disabled}
      onClick={handlePayClick}
      className="flex items-center"
    >
      <CreditCard className="mr-2 h-4 w-4" />
      Process Payment
    </Button>
  );
};

export default PayButton;