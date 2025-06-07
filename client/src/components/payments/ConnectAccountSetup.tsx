import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  BanknoteIcon, 
  CheckCircle2, 
  ExternalLink, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw,
  Loader2
} from 'lucide-react';

// Types for Stripe Connect account status
interface ConnectAccountStatus {
  exists: boolean;
  message?: string;
  accountId?: string;
  accountStatus?: 'pending' | 'active' | 'restricted' | 'incomplete';
  detailsSubmitted?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  accountLinkUrl?: string;
  requirements?: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pendingVerification: string[];
  };
}

// Component to display the current status of Connect setup
const AccountStatusDisplay = ({ status }: { status: ConnectAccountStatus }) => {
  if (!status.exists || !status.accountId) {
    return (
      <Alert variant="default" className="bg-muted/50 border-muted mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Connect account</AlertTitle>
        <AlertDescription>
          You haven't set up your payment account yet. Set up a Stripe Connect account to receive payments.
        </AlertDescription>
      </Alert>
    );
  }

  let statusDisplay = null;
  let color = '';
  
  switch (status.accountStatus) {
    case 'active':
      statusDisplay = 'Your account is active and ready to receive payments';
      color = 'text-green-500 dark:text-green-400';
      break;
    case 'pending':
      statusDisplay = 'Your account is pending verification';
      color = 'text-yellow-500 dark:text-yellow-400';
      break;
    case 'restricted':
      statusDisplay = 'Your account has restrictions';
      color = 'text-red-500 dark:text-red-400';
      break;
    case 'incomplete':
      statusDisplay = 'Your account setup is incomplete';
      color = 'text-yellow-500 dark:text-yellow-400';
      break;
    default:
      statusDisplay = 'Your account status is unknown';
      color = 'text-muted-foreground';
  }

  return (
    <div className="space-y-4">
      <Alert
        variant={status.accountStatus === 'active' ? 'default' : 'destructive'}
        className={status.accountStatus === 'active' 
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        }
      >
        {status.accountStatus === 'active' 
          ? <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" /> 
          : <AlertCircle className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
        }
        <AlertTitle>
          {status.accountStatus === 'active' 
            ? 'Your account is ready' 
            : 'Action required'
          }
        </AlertTitle>
        <AlertDescription className={color}>
          {statusDisplay}
        </AlertDescription>
      </Alert>

      {status.requirements && (status.requirements.currentlyDue.length > 0 || status.requirements.eventuallyDue.length > 0) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Requirements</h4>
          
          {status.requirements.currentlyDue.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Required now:</p>
              <ul className="list-disc list-inside text-sm space-y-1 text-red-600 dark:text-red-400">
                {status.requirements.currentlyDue.map((req, i) => (
                  <li key={`current-${i}`}>{formatRequirement(req)}</li>
                ))}
              </ul>
            </div>
          )}
          
          {status.requirements.eventuallyDue.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Required soon:</p>
              <ul className="list-disc list-inside text-sm space-y-1 text-amber-600 dark:text-amber-400">
                {status.requirements.eventuallyDue.map((req, i) => (
                  <li key={`eventual-${i}`}>{formatRequirement(req)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Format Stripe requirement keys into readable text
function formatRequirement(req: string): string {
  return req
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\./, ': ');
}

// Setup progress component
const SetupProgress = ({ status }: { status: ConnectAccountStatus }) => {
  let progress = 0;
  
  if (!status.exists) {
    progress = 0;
  } else if (status.accountStatus === 'active') {
    progress = 100;
  } else if (status.detailsSubmitted) {
    progress = 75;
  } else if (status.accountId) {
    progress = 25;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Setup Progress</span>
        <span>{progress}%</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
};

// Main Connect Account setup component
export default function ConnectAccountSetup() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isWorker, setIsWorker] = useState(false);

  useEffect(() => {
    if (user?.accountType === 'worker') {
      setIsWorker(true);
    }
  }, [user]);

  // Check if the account exists
  const { 
    data: accountStatus,
    isLoading: isStatusLoading,
    isError: isStatusError,
    refetch: refetchStatus
  } = useQuery({
    queryKey: ['stripe-connect-status'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/stripe/connect/account-status');
        if (!response.ok) {
          throw new Error('Failed to fetch account status');
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching Connect account status:', error);
        return { exists: false, message: 'Error fetching account status' };
      }
    },
    enabled: !!user && isWorker
  });

  // Create a new Connect account
  const createAccount = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/stripe/connect/create-account');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create Connect account');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Account Created',
        description: 'Your Stripe Connect account has been created. You will now be redirected to complete your setup.',
      });
      
      // Redirect to Stripe Connect onboarding      const url = data.accountLinkUrl || data.url;  // Support both formats
      if (url) {
        window.open(url, '_blank');
        toast({
          title: 'Opening Stripe Connect Setup',
          description: 'Please complete the account setup in the new tab. You may need to refresh this page after completion.',
        });
      } else {
        throw new Error('No account setup URL received from server');
      }
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Setup Failed',
        description: error.message || 'There was a problem setting up your Connect account. Please try again.',
      });
    }
  });
  // Create login link for existing account
  const createLoginLink = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/stripe/connect/create-link');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create login link');
      }
      return response.json();
    },
    onSuccess: (data) => {      const url = data.accountLinkUrl || data.url;  // Support both formats
      if (!url) {
        throw new Error('No URL received from server');
      }
      // For better UX, open in new tab instead of redirecting
      window.open(url, '_blank');
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Access Failed',
        description: error.message || 'There was a problem accessing your Connect account. Please try again.',
      });
    }
  });

  // Handle refreshing account status
  const handleRefresh = () => {
    refetchStatus();
  };

  // Handle creating a new Connect account
  const handleCreateAccount = () => {
    if (!termsAccepted) {
      toast({
        variant: 'destructive',
        title: 'Terms Required',
        description: 'You must accept the terms to continue.',
      });
      return;
    }
    
    createAccount.mutate();
  };

  // Handle accessing existing account
  const handleAccessAccount = () => {
    if (accountStatus?.accountLinkUrl) {
      // If we already have an account link URL (for incomplete accounts)
      window.location.href = accountStatus.accountLinkUrl;
    } else {
      // Create a new login link for account management
      createLoginLink.mutate();
    }
  };

  if (!isWorker) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Receive Payments</CardTitle>
          <CardDescription>
            Connect account setup is only available for worker accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            To set up a payment account, please switch to a worker account.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isStatusLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Checking Payment Status</CardTitle>
          <CardDescription>
            Checking your Stripe Connect account status...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Payment Account</CardTitle>
            <CardDescription>
              Set up your Stripe Connect account to receive payments
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isStatusLoading}
            className="flex-shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${isStatusLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Account Status Display */}
        {accountStatus && <AccountStatusDisplay status={accountStatus} />}
        
        {/* Setup Progress Bar */}
        {accountStatus && <SetupProgress status={accountStatus} />}
      
        {/* Terms acceptance for new account creation */}
        {(!accountStatus?.exists || !accountStatus?.accountId) && (
          <div className="space-y-4 mt-4">
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="terms" 
                checked={termsAccepted} 
                onCheckedChange={() => setTermsAccepted(!termsAccepted)} 
              />
              <Label htmlFor="terms" className="text-sm leading-tight">
                I agree to the Stripe <a href="https://stripe.com/connect-account/legal" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                  Connected Account Agreement
                </a>, which includes the <a href="https://stripe.com/legal" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                  Stripe Terms of Service
                </a>.
              </Label>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col-reverse sm:flex-row justify-end gap-2">
        {(accountStatus?.exists && accountStatus?.accountId) ? (
          <Button
            variant="default"
            onClick={handleAccessAccount}
            disabled={createLoginLink.isPending}
            className="w-full sm:w-auto"
          >
            {createLoginLink.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Manage Account
                <ExternalLink className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        ) : (
          <Button
            variant="default"
            onClick={handleCreateAccount}
            disabled={createAccount.isPending || !termsAccepted}
            className="w-full sm:w-auto"
          >
            {createAccount.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                Set up Payments
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}