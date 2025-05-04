import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, CheckCircle } from 'lucide-react';
import PaymentModal from './PaymentModal';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Job } from '@shared/schema';

interface JobPaymentProps {
  job: Job;
  onPaymentComplete?: () => void;
}

const JobPayment: React.FC<JobPaymentProps> = ({ job, onPaymentComplete }) => {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const markJobCompletedMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const response = await apiRequest('PATCH', `/api/jobs/${jobId}`, {
        status: 'completed'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to mark job as completed');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Job marked as completed and payment processed successfully!',
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', job.id] });
      
      if (onPaymentComplete) {
        onPaymentComplete();
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to complete job: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const handlePaymentComplete = () => {
    // Mark the job as completed after payment is done
    markJobCompletedMutation.mutate(job.id);
  };

  // For jobs that are already paid or not ready for payment
  if (job.status === 'completed') {
    return (
      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
          <span className="text-green-800">Payment Completed</span>
        </div>
        <div className="text-green-800 font-semibold">
          ${job.totalAmount.toFixed(2)}
        </div>
      </div>
    );
  }

  // Only show payment option for assigned jobs
  if (job.status !== 'assigned') {
    return null;
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-lg">Complete Job & Process Payment</h3>
          <p className="text-sm text-gray-500">
            Total payment: ${job.totalAmount.toFixed(2)} 
            <span className="text-xs ml-1">
              (includes ${job.serviceFee.toFixed(2)} service fee)
            </span>
          </p>
        </div>
        
        <Button 
          onClick={() => setIsPaymentModalOpen(true)}
          className="w-full sm:w-auto flex items-center"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          Pay Now
        </Button>
      </div>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        jobId={job.id}
        jobTitle={job.title}
        amount={job.totalAmount}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  );
};

export default JobPayment;