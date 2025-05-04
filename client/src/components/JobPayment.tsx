import React from 'react';
import { Job } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';
import PayButton from './PayButton';

interface JobPaymentProps {
  job: Job;
  onPaymentComplete?: () => void;
}

const JobPayment: React.FC<JobPaymentProps> = ({ job, onPaymentComplete }) => {
  const {
    id: jobId,
    title,
    paymentAmount,
    serviceFee = 2.50,
    totalAmount = paymentAmount + serviceFee
  } = job;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-md font-semibold mb-3">Process Worker Payment</h3>
      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Payment amount:</span>
          <span className="font-medium">{formatCurrency(paymentAmount)}</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Service fee:</span>
          <span className="font-medium">{formatCurrency(serviceFee)}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
          <span className="text-sm font-medium">Total:</span>
          <span className="font-bold text-green-600">{formatCurrency(totalAmount)}</span>
        </div>
      </div>
      
      <div className="flex justify-end">
        <PayButton
          jobId={jobId}
          jobTitle={title}
          amount={totalAmount}
          onPaymentComplete={onPaymentComplete}
        />
      </div>
    </div>
  );
};

export default JobPayment;