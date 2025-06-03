import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CreditCard, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import StripeConnectDialog from '@/components/StripeConnectDialog';

export default function PaymentSettings() {
  const { toast } = useToast();
  const [hasStripeConnect, setHasStripeConnect] = useState<boolean | null>(null);
  const [accountStatus, setAccountStatus] = useState<'active' | 'pending' | null>(null);
  const [showStripeConnectDialog, setShowStripeConnectDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkStripeConnectStatus();
  }, []);

  const checkStripeConnectStatus = async () => {
    try {
      const response = await apiRequest('GET', '/api/stripe/check-connect-status');
      const data = await response.json();
      setHasStripeConnect(data.hasStripeConnect);
      setAccountStatus(data.accountStatus);
    } catch (error) {
      console.error('Error checking Stripe Connect status:', error);
      toast({
        title: "Error",
        description: "Failed to check payment account status",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStripeConnectSuccess = () => {
    checkStripeConnectStatus();
    toast({
      title: "Success",
      description: "Your payment account has been set up successfully",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Account</CardTitle>
          <CardDescription>
            Set up your payment account to receive payments for completed jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status Section */}
              <div className="flex items-center space-x-4">
                <div className={`rounded-full p-2 ${
                  hasStripeConnect 
                    ? accountStatus === 'active' 
                      ? 'bg-green-100' 
                      : 'bg-amber-100'
                    : 'bg-red-100'
                }`}>
                  {hasStripeConnect ? (
                    accountStatus === 'active' ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-amber-600" />
                    )
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium">
                    {hasStripeConnect 
                      ? accountStatus === 'active'
                        ? 'Payment Account Active'
                        : 'Payment Account Pending'
                      : 'No Payment Account'
                    }
                  </h3>
                  <p className="text-sm text-gray-500">
                    {hasStripeConnect 
                      ? accountStatus === 'active'
                        ? 'Your payment account is ready to receive payments'
                        : 'Your payment account is being reviewed'
                      : 'Set up your payment account to receive payments'
                    }
                  </p>
                </div>
              </div>

              {/* Action Button */}
              {(!hasStripeConnect || accountStatus === 'pending') && (
                <Button
                  onClick={() => setShowStripeConnectDialog(true)}
                  className="w-full sm:w-auto"
                >
                  {hasStripeConnect ? 'Update Payment Account' : 'Set Up Payment Account'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stripe Connect Dialog */}
      <StripeConnectDialog
        open={showStripeConnectDialog}
        onClose={() => setShowStripeConnectDialog(false)}
        onSuccess={handleStripeConnectSuccess}
      />
    </div>
  );
} 