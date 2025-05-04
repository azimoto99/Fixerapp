import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface ConnectAccountStatus {
  accountId: string;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  accountLinkUrl: string | null;
  defaultCurrency: string;
  country: string;
  accountStatus: 'active' | 'restricted' | 'incomplete';
}

const StripeConnectSetup: React.FC = () => {
  const { toast } = useToast();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Check if user has a Connect account
  const { data: accountStatus, isLoading, isError, error, refetch } = useQuery<ConnectAccountStatus>({
    queryKey: ['/api/stripe/connect/account-status'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/stripe/connect/account-status');
        return await res.json();
      } catch (error) {
        // If error is 404, it means the user doesn't have a Connect account yet
        if ((error as any).status === 404) {
          return null;
        }
        throw error;
      }
    },
    // Don't show error toasts for 404 errors (no account yet)
    retry: (failureCount, error: any) => {
      return failureCount < 3 && error.status !== 404;
    }
  });

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

  // Create login link for existing account
  const loginLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/stripe/connect/create-login-link');
      return await res.json();
    },
    onSuccess: (data) => {
      // Redirect to the login link URL
      if (data.url) {
        setIsRedirecting(true);
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating login link',
        description: error.message || 'Please try again later',
        variant: 'destructive',
      });
    }
  });

  // Check for query parameters in URL that might indicate return from Stripe
  useEffect(() => {
    const url = new URL(window.location.href);
    const refreshParam = url.searchParams.get('refresh');
    const successParam = url.searchParams.get('success');

    if (refreshParam === 'true' || successParam === 'true') {
      // Clean up URL
      url.searchParams.delete('refresh');
      url.searchParams.delete('success');
      window.history.replaceState({}, document.title, url.toString());

      // Refetch account status
      refetch();

      // Show toast based on status
      if (successParam === 'true') {
        toast({
          title: 'Stripe Connect setup progress',
          description: 'Thank you for updating your account information!',
        });
      }
    }
  }, [refetch, toast]);

  const handleCreateAccount = () => {
    createAccountMutation.mutate();
  };

  const handleManageAccount = () => {
    loginLinkMutation.mutate();
  };

  const handleContinueSetup = () => {
    if (accountStatus?.accountLinkUrl) {
      setIsRedirecting(true);
      window.location.href = accountStatus.accountLinkUrl;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-lg">Loading payment account...</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Error state (excluding 404 which is handled as "no account")
  if (isError && (error as any).status !== 404) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-lg">Error loading payment account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">
            {(error as Error).message || 'There was an error loading your payment account information.'}
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => refetch()}>Try Again</Button>
        </CardFooter>
      </Card>
    );
  }

  // No account yet
  if (!accountStatus) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Set Up Payment Account</CardTitle>
          <CardDescription>
            Create a Stripe Connect account to receive payments for completed jobs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4">
            Setting up a payment account allows you to receive earnings directly to your bank account.
            The $2.50 service fee is retained by the platform, while the rest of your earnings will be
            transferred to your account.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleCreateAccount} 
            disabled={createAccountMutation.isPending || isRedirecting}
            className="w-full"
          >
            {createAccountMutation.isPending || isRedirecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              'Set Up Payment Account'
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Account exists - show status and actions
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Payment Account</CardTitle>
          <Badge 
            variant="outline"
            className={
              accountStatus.accountStatus === 'active' 
                ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                : accountStatus.accountStatus === 'restricted' 
                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' 
                  : 'bg-red-100 text-red-800 hover:bg-red-100'
            }
          >
            {accountStatus.accountStatus === 'active' 
              ? 'Active' 
              : accountStatus.accountStatus === 'restricted' 
                ? 'Restricted' 
                : 'Incomplete'}
          </Badge>
        </div>
        <CardDescription>
          Your Stripe Connect account for receiving payments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Account ID:</div>
            <div className="font-medium truncate">{accountStatus.accountId}</div>
            
            <div className="text-muted-foreground">Currency:</div>
            <div className="font-medium">{accountStatus.defaultCurrency?.toUpperCase() || 'USD'}</div>
            
            <div className="text-muted-foreground">Country:</div>
            <div className="font-medium">{accountStatus.country || 'US'}</div>
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="flex items-center">
              {accountStatus.detailsSubmitted ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              )}
              <span>Account details submitted</span>
            </div>
            
            <div className="flex items-center">
              {accountStatus.payoutsEnabled ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              )}
              <span>Payouts enabled</span>
            </div>
            
            <div className="flex items-center">
              {accountStatus.chargesEnabled ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
              )}
              <span>Charges enabled</span>
            </div>
          </div>
          
          {!accountStatus.detailsSubmitted || !accountStatus.payoutsEnabled ? (
            <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 rounded-md text-sm">
              Your account setup is incomplete. Please continue the setup process to receive payments.
            </div>
          ) : null}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {accountStatus.accountLinkUrl ? (
          <Button 
            onClick={handleContinueSetup} 
            className="w-full"
            disabled={isRedirecting}
          >
            {isRedirecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting...
              </>
            ) : (
              <>
                Complete Account Setup
                <ExternalLink className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        ) : (
          <Button 
            onClick={handleManageAccount} 
            className="w-full"
            variant="outline"
            disabled={loginLinkMutation.isPending || isRedirecting}
          >
            {loginLinkMutation.isPending || isRedirecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting...
              </>
            ) : (
              <>
                Manage Account
                <ExternalLink className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default StripeConnectSetup;