import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import PaymentModal from './PaymentModal';

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
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const handlePaymentComplete = () => {
    setIsPaymentModalOpen(false);
    if (onPaymentComplete) {
      onPaymentComplete();
    }
  };

  return (
    <>
      <Button
        variant={variant}
        disabled={disabled}
        onClick={() => setIsPaymentModalOpen(true)}
        className="flex items-center"
      >
        <CreditCard className="mr-2 h-4 w-4" />
        Process Payment
      </Button>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        jobId={jobId}
        jobTitle={jobTitle}
        amount={amount}
        onPaymentComplete={handlePaymentComplete}
      />
    </>
  );
};

export default PayButton;