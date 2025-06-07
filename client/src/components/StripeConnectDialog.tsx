import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CreditCard, ArrowRight } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface StripeConnectDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const StripeConnectDialog: React.FC<StripeConnectDialogProps> = ({
  open,
  onClose,
  onSuccess
}) => {  const handleSetupStripe = async () => {
    try {
      // Get the Stripe Connect onboarding URL
      const response = await apiRequest('POST', '/api/stripe/connect/create-account', {});
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create Stripe Connect account');
      }
      const data = await response.json();
      const url = data.accountLinkUrl || data.url;
      
      if (!url) {
        throw new Error('No onboarding URL received from server');
      }
      
      // Open Stripe Connect onboarding in a new window
      window.open(url, '_blank');
      
      // Close the dialog
      onClose();
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error setting up Stripe Connect:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Up Payments</DialogTitle>
          <DialogDescription>
            To post jobs and receive payments, you need to set up your payment account
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* Warning Alert */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">Payment Setup Required</h3>
                <p className="text-sm text-amber-700 mt-1">
                  You need to set up your payment account before you can post jobs or receive payments.
                </p>
              </div>
            </div>
          </div>
          
          {/* Setup Card */}
          <Card className="border-2 border-gray-100">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="bg-blue-100 rounded-full p-2 mr-3">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Stripe Connect Account</p>
                    <p className="text-sm text-gray-500">
                      Set up your payment account to start posting jobs
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="bg-green-100 rounded-full p-2 mr-3">
                    <ArrowRight className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Quick Setup Process</p>
                    <p className="text-sm text-gray-500">
                      Takes about 5 minutes to complete
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Security Notice */}
              <div className="mt-4 p-2 bg-blue-50 rounded-md text-xs text-blue-800">
                <p>Your payment information is securely handled by Stripe, a trusted payment processor.</p>
              </div>
            </CardContent>
          </Card>
          
          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-700" 
              onClick={handleSetupStripe}
            >
              Set Up Payments
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StripeConnectDialog; 