import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PaymentProcessor from './PaymentProcessor';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: number;
  jobTitle: string;
  amount: number;
  onPaymentComplete: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  amount,
  onPaymentComplete,
}) => {
  const handlePaymentComplete = () => {
    onPaymentComplete();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment for Job</DialogTitle>
          <DialogDescription>
            {jobTitle} - ${amount.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <PaymentProcessor
            jobId={jobId}
            amount={amount}
            onPaymentComplete={handlePaymentComplete}
            onCancel={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;