import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface StripeConnectRequiredProps {
  onComplete?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

const StripeConnectRequired: React.FC<StripeConnectRequiredProps> = ({ 
  onComplete, 
  onSkip,
  showSkip = true
}) => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = React.useState(false);
  const [isNavigating, setIsNavigating] = React.useState(false);

  const createStripeConnectAccount = async () => {
    try {
      setIsCreating(true);
      const res = await apiRequest('POST', '/api/stripe/connect/create-account', {});
      const data = await res.json();
      
      if (data.url) {
        setIsNavigating(true);
        
        // Open the Stripe Connect onboarding link in a new tab
        window.open(data.url, '_blank');
        
        // Invalidate account status queries so they refresh when user returns
        queryClient.invalidateQueries({ queryKey: ['/api/stripe/connect/account-status'] });
        
        toast({
          title: 'Stripe Connect Setup Started',
          description: 'Please complete the setup in the new tab. You can close this dialog and continue your application afterward.',
        });
        
        if (onComplete) {
          onComplete();
        }
      }
    } catch (error) {
      console.error('Error creating Stripe Connect account:', error);
      toast({
        title: 'Error',
        description: 'Failed to create Stripe Connect account. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
      setIsNavigating(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onSkip && onSkip()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect Payment Account Required</DialogTitle>
          <DialogDescription>
            To apply for jobs and receive payments through our platform, you need to set up a Stripe Connect account.
            This is a secure payment account that allows us to send your earnings directly to you.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-2 py-4">
          <div className="bg-gray-100 rounded-lg p-4 text-sm">
            <h4 className="font-medium text-black mb-2">Why is this required?</h4>
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              <li>Receive payments securely and quickly</li>
              <li>Your banking details are stored safely by Stripe</li>
              <li>We never see or store your banking information</li>
              <li>One-time setup that takes only a few minutes</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {showSkip && (
            <Button 
              variant="outline" 
              onClick={onSkip}
              disabled={isCreating || isNavigating}
            >
              Skip for Now
            </Button>
          )}
          <Button 
            onClick={createStripeConnectAccount}
            disabled={isCreating || isNavigating}
            className="flex-1"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : isNavigating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Redirecting...
              </>
            ) : (
              'Set Up Payment Account'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StripeConnectRequired;