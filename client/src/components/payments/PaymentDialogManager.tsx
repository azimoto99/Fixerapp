import * as React from 'react';
import { useState, createContext, useContext } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  PaymentDialog,
  PaymentDialogContent,
  PaymentDialogDescription,
  PaymentDialogHeader,
  PaymentDialogTitle
} from '@/components/payments/PaymentDialog';

// Import PayPal component for payment processing
import PayPalPaymentForm from '@/components/payments/PayPalPaymentForm';

// Create context for payment dialog
type PaymentDialogContextType = {
  openPaymentDialog: (options: { 
    job: any;
    onSuccess: () => void;
    onClose: () => void; 
  }) => void;
};

const PaymentDialogContext = createContext<PaymentDialogContextType | null>(null);

// Hook for components to use the payment dialog
export const usePaymentDialog = () => {
  const context = useContext(PaymentDialogContext);
  if (!context) {
    throw new Error('usePaymentDialog must be used within a PaymentDialogProvider');
  }
  return context;
};

// PayPal payment dialog component
const PayPalPaymentDialog = ({ 
  job, 
  isOpen, 
  onClose, 
  onSuccess 
}: { 
  job: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!job) return null;

  return (
    <PaymentDialog open={isOpen} onOpenChange={onClose}>
      <PaymentDialogContent>
        <PaymentDialogHeader>
          <PaymentDialogTitle>Complete Payment</PaymentDialogTitle>
          <PaymentDialogDescription>
            Pay for job: {job.title}
          </PaymentDialogDescription>
        </PaymentDialogHeader>
        <div className="space-y-4">
          <PayPalPaymentForm
            job={job}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </PaymentDialogContent>
    </PaymentDialog>
  );
};

// Provider component
export const PaymentDialogProvider = ({ children }: { children: React.ReactNode }) => {
  const [paymentDialog, setPaymentDialog] = useState<{
    isOpen: boolean;
    job: any;
    onSuccess: () => void;
    onClose: () => void;
  }>({
    isOpen: false,
    job: null,
    onSuccess: () => {},
    onClose: () => {}
  });

  const openPaymentDialog = (options: { 
    job: any;
    onSuccess: () => void;
    onClose: () => void; 
  }) => {
    setPaymentDialog({
      isOpen: true,
      job: options.job,
      onSuccess: options.onSuccess,
      onClose: options.onClose
    });
  };

  const closePaymentDialog = () => {
    setPaymentDialog(prev => ({ ...prev, isOpen: false }));
    paymentDialog.onClose();
  };

  const contextValue: PaymentDialogContextType = {
    openPaymentDialog
  };

  return (
    <PaymentDialogContext.Provider value={contextValue}>
      {children}
      <PayPalPaymentDialog
        job={paymentDialog.job}
        isOpen={paymentDialog.isOpen}
        onClose={closePaymentDialog}
        onSuccess={paymentDialog.onSuccess}
      />
    </PaymentDialogContext.Provider>
  );
};

// Export default
export default PaymentDialogProvider;