import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Loader2, CreditCard, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface StripeConnectRequiredProps {
  onSkip?: () => void;
  onComplete?: () => void;
  showSkip?: boolean;
}

const StripeConnectRequired: React.FC<StripeConnectRequiredProps> = ({ 
  onSkip, 
  onComplete,
  showSkip = true 
}) => {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Create a Connect account
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/stripe/connect/create-account');
      return await res.json();
    },
    onSuccess: (data) => {
      // Redirect to the account link URL
      if (data.accountLinkUrl) {
        setIsRedirecting(true);
        window.location.href = data.accountLinkUrl;
        if (onComplete) {
          onComplete();
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating Stripe Connect account',
        description: error.message || 'Please try again later',
        variant: 'destructive',
      });
    }
  });

  const handleSetupAccount = () => {
    createAccountMutation.mutate();
  };

  const handleSkipForNow = () => {
    if (onSkip) {
      onSkip();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Payment Account Required
          </CardTitle>
          <CardDescription>
            Set up a payment account to receive earnings from completed jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm">
              To receive payments for jobs you complete on The Job platform, you need to connect
              a Stripe payment account. This is a simple process that takes just a few minutes.
            </p>
            
            <div className="bg-primary/10 p-4 rounded-md border border-primary/20">
              <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Benefits of connecting your account:
              </h3>
              <ul className="text-sm space-y-2 ml-6 list-disc">
                <li>Receive direct deposits for completed jobs</li>
                <li>Track all your earnings in one place</li>
                <li>Get paid faster with secure transfers</li>
                <li>Required for applying to certain jobs</li>
              </ul>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button 
            onClick={handleSetupAccount} 
            className="w-full" 
            disabled={createAccountMutation.isPending || isRedirecting}
          >
            {createAccountMutation.isPending || isRedirecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                Set Up Payment Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          
          {showSkip && (
            <Button 
              variant="ghost" 
              className="w-full text-gray-500" 
              onClick={handleSkipForNow}
            >
              Skip for now
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default StripeConnectRequired;