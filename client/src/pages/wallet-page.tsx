import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function WalletPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    // Parse URL parameters to check if this is a Stripe Connect return
    const urlParams = new URLSearchParams(window.location.search);
    const isStripeReturn = urlParams.get('stripe_return') === 'true';
    const status = urlParams.get('status');

    if (isStripeReturn) {
      // Handle Stripe Connect return
      setIsProcessing(true);
      
      // Show appropriate toast message based on status
      if (status === 'success') {
        toast({
          title: 'Stripe Connect Setup Complete!',
          description: 'Your payment account has been successfully connected. You can now receive payments.',
        });
      } else if (status === 'refresh') {
        toast({
          title: 'Additional Information Required',
          description: 'Please complete the remaining setup steps for your payment account.',
          variant: 'default',
        });
      }

      // Wait a moment to show the processing state, then redirect
      setTimeout(() => {
        setIsProcessing(false);
        // Redirect to home page where user can access wallet through drawer
        navigate('/?wallet=true');
      }, 2000);
    } else {
      // Not a Stripe return, redirect immediately
      navigate('/?wallet=true');
    }
  }, [navigate, toast]);

  if (isProcessing) {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {status === 'success' ? (
                <CheckCircle className="h-12 w-12 text-green-500" />
              ) : status === 'refresh' ? (
                <AlertCircle className="h-12 w-12 text-amber-500" />
              ) : (
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              )}
            </div>
            <CardTitle className="text-xl">
              {status === 'success' ? 'Setup Complete!' : 
               status === 'refresh' ? 'Setup in Progress' : 
               'Processing...'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              {status === 'success' ? 
                'Your Stripe Connect account is now active. Redirecting to your wallet...' :
                status === 'refresh' ?
                'Additional information may be required. Redirecting to your wallet...' :
                'Redirecting to your wallet...'}
            </p>
            <div className="flex justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback content (shouldn't be reached due to redirect)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Redirecting to your wallet...
          </p>
          <Button onClick={() => navigate('/?wallet=true')} className="w-full">
            Go to Wallet
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
