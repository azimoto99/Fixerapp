import { useState, useEffect } from 'react';
import { Earning, Job } from '@shared/schema';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface PaymentNotificationProps {
  earning: Earning & { job?: Job };
  onDismiss: () => void;
}

export default function PaymentNotification({ earning, onDismiss }: PaymentNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    // Auto-dismiss after 10 seconds
    const timer = setTimeout(() => {
      handleDismiss();
    }, 10000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const handleDismiss = () => {
    setIsVisible(false);
    // Small delay to allow animation to complete
    setTimeout(onDismiss, 300);
  };
  
  if (!isVisible) return null;
  
  return (
    <motion.div
      className="fixed bottom-20 left-0 right-0 z-50 flex justify-center px-4"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <Card className="w-full max-w-md bg-green-50 border-green-100 shadow-lg">
        <div className="absolute top-2 right-2">
          <Button
            variant="ghost"
            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <CardContent className="pt-6 pb-4">
          <div className="flex items-start">
            <CheckCircle className="h-10 w-10 text-green-600 mr-4 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-medium text-green-800">
                You earned {formatCurrency(earning.amount)}!
              </h3>
              <p className="text-sm text-green-700 mt-1">
                Great job completing "{earning.job?.title || `Job #${earning.jobId}`}". Your payment has been processed.
              </p>
              <div className="text-xs text-green-600 mt-3">
                <span className="font-medium">Note:</span> A service fee of {formatCurrency(2.50)} applies to all transactions. Payments can be withdrawn once they reach the {formatCurrency(10.00)} threshold.
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="pt-0 pb-4 flex justify-end">
          <Button
            variant="outline"
            className="bg-white hover:bg-green-50 text-green-600 border-green-200"
            onClick={() => {
              window.location.href = '/earnings';
              handleDismiss();
            }}
          >
            View Earnings
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}