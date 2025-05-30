import React from 'react';
import { Earning, Job } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, CheckCircle2 } from 'lucide-react';

interface PaymentNotificationProps {
  earning: Earning & { job?: Job };
  onDismiss: () => void;
}

const PaymentNotification: React.FC<PaymentNotificationProps> = ({ earning, onDismiss }) => {
  const { amount, job } = earning;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-[2500] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full shadow-lg animate-in zoom-in-95 duration-300">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-col">
              <h3 className="text-xl font-bold text-gray-900">Payment Complete</h3>
              <p className="text-gray-600">The job has been marked as completed.</p>
            </div>
            <button 
              onClick={onDismiss}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          
          <div className="mb-6 flex items-center justify-center">
            <div className="bg-green-100 text-green-600 rounded-full p-4 inline-flex mb-3">
              <CheckCircle2 className="h-12 w-12" />
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Job</span>
              <span className="font-medium">{job?.title || 'Completed Job'}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Amount earned</span>
              <span className="font-bold text-green-600">{formatCurrency(amount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Status</span>
              <span className="font-medium text-green-600">Pending payment</span>
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button onClick={onDismiss} className="min-w-[120px]">Got it</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentNotification;