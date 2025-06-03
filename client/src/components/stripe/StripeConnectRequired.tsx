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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useSessionMonitor } from '@/hooks/use-session-monitor';
import { useStripeConnectMonitor } from '@/hooks/use-stripe-connect-monitor';

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
  const [criticalError, setCriticalError] = React.useState<string | null>(null);
  const [showRetry, setShowRetry] = React.useState(false);
  const { sessionHealth, checkSessionHealth } = useSessionMonitor({
    checkInterval: 30000, // Check every 30 seconds during setup
    autoRedirect: true
  });

  const { accountStatus, refreshAccountStatus } = useStripeConnectMonitor({
    pollInterval: 10000 // Poll every 10 seconds during setup
  });

  const createStripeConnectAccount = async () => {
    setCriticalError(null);
    setShowRetry(false);
    try {
      setIsCreating(true);
      
      // Check session health first
      const sessionValid = await checkSessionHealth();
      if (!sessionValid || !sessionHealth?.isAuthenticated || !sessionHealth?.userVerified) {
        throw new Error('Please log in again to continue');
      }
      
      // Check if we already have a pending account
      if (accountStatus?.requiresAttention) {
        // Redirect to existing account update
        const res = await apiRequest('POST', '/api/stripe/connect/account-link', {});
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to create account link');
        }
        const data = await res.json();
        window.open(data.url, '_blank');
        return;
      }
      
      const res = await apiRequest('POST', '/api/stripe/connect/create-account', {});
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create Stripe account');
      }
      
      const data = await res.json();
      
      // Handle both success cases
      const url = data.accountLinkUrl || data.url;
      if (!url) {
        throw new Error('No onboarding URL received from server');
      }
      
      setIsNavigating(true);
        // Store the account creation attempt in localStorage with additional metadata
      const timestamp = new Date().toISOString();
      localStorage.setItem('stripe-connect-pending', 'true');
      localStorage.setItem('stripe-connect-timestamp', timestamp);
      localStorage.setItem('stripe-connect-session', sessionHealth?.sessionId || '');
      
      // Open Stripe Connect onboarding in new tab
      const stripeWindow = window.open(url, '_blank');
      
      // Monitor if window was blocked
      if (!stripeWindow) {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }
      
      // Start monitoring account status
      await refreshAccountStatus();
      
      // Set up window focus listener to check status when user returns
      const handleFocus = async () => {
        await refreshAccountStatus();
        // If account is now active, clean up and complete
        if (accountStatus?.isActive) {
          window.removeEventListener('focus', handleFocus);
          localStorage.removeItem('stripe-connect-pending');
          localStorage.removeItem('stripe-connect-timestamp');
          localStorage.removeItem('stripe-connect-session');
          if (onComplete) {
            onComplete();
          }
        }
      };
      window.addEventListener('focus', handleFocus);
      
      toast({
        title: 'Stripe Connect Setup Started',
        description: 'Please complete the setup in the new tab. We\'ll monitor the status and guide you through any required steps.',
      });
      
      if (onComplete) {
        onComplete();
      }} catch (error) {
      console.error('Error creating Stripe Connect account:', error);
      
      // Extract error details
      let errorMessage = 'Failed to create Stripe Connect account. Please try again later.';
      let shouldRetry = false;
      
      try {
        const errorData = error.response?.data || {};
        switch (errorData.code) {
          case 'AUTH_REQUIRED':
            errorMessage = 'Please log in again to continue.';
            // Trigger re-authentication
            window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
            break;
          case 'USER_NOT_FOUND':
            errorMessage = 'Your account was not found. Please log in again.';
            break;
          case 'EMAIL_REQUIRED':
            errorMessage = 'Please add an email address to your profile before connecting Stripe.';
            break;
          case 'DB_ERROR':
            errorMessage = 'Service temporarily unavailable. Please try again in a few minutes.';
            shouldRetry = true;
            setCriticalError(errorMessage);
            setShowRetry(true);
            break;
          case 'STRIPE_ERROR':
            errorMessage = errorData.message || 'Error connecting to Stripe. Please try again.';
            break;
        }
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        action: shouldRetry ? {
          label: 'Retry',
          onClick: () => createStripeConnectAccount()
        } : undefined
      });
    } finally {
      setIsCreating(false);
      setIsNavigating(false);
    }
  };
  return (
    <Dialog open={true} onOpenChange={() => onSkip && onSkip()}>
      <DialogContent className="sm:max-w-[475px]">
        <DialogHeader>
          <DialogTitle>Set Up Payment Account</DialogTitle>
          <DialogDescription>
            To receive payments through our platform, you need to set up a Stripe Connect account.
            This is a secure payment account that allows us to send your earnings directly to you.
          </DialogDescription>
        </DialogHeader>
        
        {accountStatus?.requiresAttention && (
          <Alert className="mb-4" variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription>
              Your Stripe account needs attention. Some requirements need to be completed.
              Click "Set Up Payment Account" to review and complete the requirements.
            </AlertDescription>
          </Alert>
        )}

        {criticalError && (
          <Alert className="mb-4" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Service Unavailable</AlertTitle>
            <AlertDescription>
              {criticalError}
              {showRetry && (
                <div className="mt-2">
                  <Button onClick={createStripeConnectAccount} disabled={isCreating || isNavigating}>
                    Retry
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex flex-col space-y-4 py-4">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-sm">
            <h4 className="font-medium text-primary-foreground mb-2">Why is this required?</h4>
            <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
              <li>Receive payments securely and quickly</li>
              <li>Your banking details are stored safely by Stripe</li>
              <li>We never see or store your banking information</li>
              <li>One-time setup that takes only a few minutes</li>
            </ul>
          </div>
          
          <div className="rounded-lg border p-4 text-sm">
            <h4 className="font-medium mb-2">What to expect during setup:</h4>
            <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground">
              <li>You'll be redirected to Stripe's secure platform</li>
              <li>You'll need to provide basic personal information</li>
              <li>Add your bank account details for receiving payments</li>
              <li>Upload a photo ID for identity verification</li>
              <li>You can return to your application after completion</li>
            </ol>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
          <div className="flex flex-col-reverse sm:flex-row gap-2 w-full">
            {showSkip && (
              <Button 
                variant="outline" 
                onClick={() => {
                  // Store in local storage that user has dismissed this
                  localStorage.setItem('stripe-connect-dismissed', 'true');
                  toast({
                    title: "Setup Postponed",
                    description: "You can complete your Stripe Connect setup later from the Payments tab.",
                  });
                  if (onSkip) onSkip();
                }}
                disabled={isCreating || isNavigating}
                className="sm:flex-1"
              >
                Set Up Later
              </Button>
            )}
            <Button 
              onClick={createStripeConnectAccount}
              disabled={isCreating || isNavigating}
              className="sm:flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary"
              size="lg"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : isNavigating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Redirecting to Stripe...
                </>
              ) : (
                'Set Up Payment Account'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StripeConnectRequired;