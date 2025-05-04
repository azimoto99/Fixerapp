import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface StripeConnectSetupProps {
  compact?: boolean;
}

type AccountStatus = {
  accountStatus: string;
  requirements?: {
    currentlyDue?: string[];
    eventuallyDue?: string[];
    pendingVerification?: string[];
  };
  accountId: string;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
};

const StripeConnectSetup: React.FC<StripeConnectSetupProps> = ({ compact = false }) => {
  const { toast } = useToast();
  
  // Query account status
  const { data: accountStatus, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/stripe/connect/account-status'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/stripe/connect/account-status');
        return await res.json() as AccountStatus;
      } catch (error: any) {
        // Handle 404 (no account) as a legitimate response
        if (error.status === 404) {
          return null;
        }
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      return failureCount < 3 && error.status !== 404;
    }
  });
  
  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      try {
        const res = await apiRequest('POST', '/api/stripe/connect/create-account', {});
        
        // If response is not ok, throw with more details
        if (!res.ok) {
          const errorData = await res.json();
          console.error('Stripe Connect account creation failed:', errorData);
          throw new Error(errorData.message || `Server error: ${res.status}`);
        }
        
        return await res.json();
      } catch (error) {
        console.error('Error in Stripe Connect account creation:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data.accountLinkUrl) {
        // Open the Stripe Connect onboarding link in a new tab
        window.open(data.accountLinkUrl, '_blank');
        
        toast({
          title: 'Stripe Connect Setup Started',
          description: 'Please complete the setup in the new tab.',
        });
      } else {
        console.error('Missing accountLinkUrl in response:', data);
        toast({
          title: 'Error',
          description: 'Could not create account link. Please try again.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: 'Failed to create Stripe Connect account: ' + (error.message || 'Unknown error'),
        variant: 'destructive',
      });
    }
  });
  
  // Create login link mutation
  const createLoginLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/stripe/connect/create-login-link', {});
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.url || data.accountLinkUrl) {
        // Open the Stripe Connect dashboard in a new tab
        window.open(data.accountLinkUrl || data.url, '_blank');
      } else {
        console.error('Missing url in response:', data);
        toast({
          title: 'Error',
          description: 'Could not create login link. Please try again.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: 'Failed to access your Stripe account: ' + (error.message || 'Unknown error'),
        variant: 'destructive',
      });
    }
  });
  
  // Get status badge props based on account status
  const getStatusBadge = () => {
    if (!accountStatus) {
      return { text: 'Not Connected', variant: 'outline', icon: <XCircle className="h-4 w-4 mr-1" /> };
    }
    
    switch (accountStatus.accountStatus) {
      case 'active':
        return { text: 'Active', variant: 'default', icon: <CheckCircle className="h-4 w-4 mr-1" /> };
      case 'incomplete':
        return { text: 'Incomplete', variant: 'warning', icon: <AlertCircle className="h-4 w-4 mr-1" /> };
      case 'pending':
        return { text: 'Pending Verification', variant: 'secondary', icon: <Loader2 className="h-4 w-4 mr-1 animate-spin" /> };
      case 'restricted':
        return { text: 'Restricted', variant: 'destructive', icon: <AlertCircle className="h-4 w-4 mr-1" /> };
      case 'disabled':
        return { text: 'Disabled', variant: 'destructive', icon: <XCircle className="h-4 w-4 mr-1" /> };
      default:
        return { text: accountStatus.accountStatus, variant: 'outline', icon: <AlertCircle className="h-4 w-4 mr-1" /> };
    }
  };
  
  // If in compact mode, just show a simple card with status and action button
  if (compact) {
    const statusBadge = getStatusBadge();
    const hasAccount = !!accountStatus;
    
    return (
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Payment Account</CardTitle>
            <Badge variant={statusBadge.variant as any} className="flex items-center">
              {statusBadge.icon}
              {statusBadge.text}
            </Badge>
          </div>
          <CardDescription>
            {hasAccount 
              ? "Your Stripe Connect account status"
              : "Set up a Stripe Connect account to receive payments"}
          </CardDescription>
        </CardHeader>
        <CardFooter className="pt-2">
          {isLoading ? (
            <Button disabled className="w-full">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </Button>
          ) : hasAccount ? (
            <Button 
              onClick={() => createLoginLinkMutation.mutate()}
              disabled={createLoginLinkMutation.isPending}
              className="w-full"
            >
              {createLoginLinkMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage Account
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={() => createAccountMutation.mutate()}
              disabled={createAccountMutation.isPending}
              className="w-full"
            >
              {createAccountMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Set Up Account
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }
  
  // Full detailed view
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Stripe Connect Account</CardTitle>
          {!isLoading && (
            <Badge variant={getStatusBadge().variant as any} className="flex items-center">
              {getStatusBadge().icon}
              {getStatusBadge().text}
            </Badge>
          )}
        </div>
        <CardDescription>
          Your payment account status and details
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-md bg-destructive/10 p-4 text-destructive">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>Error loading account data</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2" 
              onClick={() => refetch()}
            >
              Try Again
            </Button>
          </div>
        ) : !accountStatus ? (
          <div className="text-center py-4">
            <p className="mb-4 text-muted-foreground">
              You haven't set up a Stripe Connect account yet. This is required to receive payments through the platform.
            </p>
            <Button 
              onClick={() => createAccountMutation.mutate()}
              disabled={createAccountMutation.isPending}
            >
              {createAccountMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Set Up Stripe Connect Account
                </>
              )}
            </Button>
          </div>
        ) : (
          <div>
            {/* Account details */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">Account ID:</div>
                <div className="text-muted-foreground">{accountStatus.accountId}</div>
                
                <div className="font-medium">Details Submitted:</div>
                <div>
                  {accountStatus.detailsSubmitted ? (
                    <span className="text-green-600 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" /> Yes
                    </span>
                  ) : (
                    <span className="text-amber-600 flex items-center">
                      <XCircle className="h-4 w-4 mr-1" /> No
                    </span>
                  )}
                </div>
                
                <div className="font-medium">Payouts Enabled:</div>
                <div>
                  {accountStatus.payoutsEnabled ? (
                    <span className="text-green-600 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" /> Yes
                    </span>
                  ) : (
                    <span className="text-amber-600 flex items-center">
                      <XCircle className="h-4 w-4 mr-1" /> No
                    </span>
                  )}
                </div>
                
                <div className="font-medium">Charges Enabled:</div>
                <div>
                  {accountStatus.chargesEnabled ? (
                    <span className="text-green-600 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" /> Yes
                    </span>
                  ) : (
                    <span className="text-amber-600 flex items-center">
                      <XCircle className="h-4 w-4 mr-1" /> No
                    </span>
                  )}
                </div>
              </div>
              
              {/* Requirements section */}
              {accountStatus.requirements && (
                <div className="border rounded-md p-3 mt-4 bg-muted/40">
                  <h4 className="text-sm font-medium mb-2">Requirements</h4>
                  
                  {accountStatus.requirements.currentlyDue?.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-amber-600 mb-1">Currently Due:</div>
                      <ul className="text-xs list-disc list-inside space-y-1 text-muted-foreground">
                        {accountStatus.requirements.currentlyDue.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {accountStatus.requirements.eventuallyDue?.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-blue-600 mb-1">Eventually Due:</div>
                      <ul className="text-xs list-disc list-inside space-y-1 text-muted-foreground">
                        {accountStatus.requirements.eventuallyDue.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {accountStatus.requirements.pendingVerification?.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-orange-600 mb-1">Pending Verification:</div>
                      <ul className="text-xs list-disc list-inside space-y-1 text-muted-foreground">
                        {accountStatus.requirements.pendingVerification.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            'Refresh'
          )}
        </Button>
        
        {accountStatus && (
          <Button 
            onClick={() => createLoginLinkMutation.mutate()}
            disabled={createLoginLinkMutation.isPending || isLoading}
          >
            {createLoginLinkMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Opening Dashboard...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage Account
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default StripeConnectSetup;