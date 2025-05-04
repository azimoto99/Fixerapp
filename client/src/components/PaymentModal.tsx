import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import PaymentProcessor from './PaymentProcessor';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: number;
  jobTitle: string;
  amount: number;
  onPaymentComplete?: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  amount,
  onPaymentComplete
}) => {
  const handlePaymentComplete = () => {
    if (onPaymentComplete) {
      onPaymentComplete();
    }
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
          <DialogDescription>
            Complete the payment for job: {jobTitle}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <PaymentProcessor
            jobId={jobId}
            amount={amount}
            onPaymentComplete={handlePaymentComplete}
            onCancel={handleCancel}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;