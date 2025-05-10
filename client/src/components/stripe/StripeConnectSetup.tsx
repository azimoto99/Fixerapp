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
  accountLinkUrl?: string;  // URL for the account onboarding flow
};

const StripeConnectSetup: React.FC<StripeConnectSetupProps> = ({ compact = false }) => {
  const { toast } = useToast();
  
  // Query account status with enhanced error handling
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
        
        // If we get a 401, the user might need to log in again
        if (error.status === 401) {
          console.log('Session may have expired, attempting to refresh user data');
          // Try to refresh user data (this will redirect to login if needed)
          await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          // Still throw the error to be caught by the UI
          throw new Error('Authentication needed. Please try again or refresh the page.');
        }
        
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      // Don't retry 401 or 404 errors
      if (error.status === 401 || error.status === 404) return false;
      return failureCount < 3;
    }
  });
  
  // Create account mutation with enhanced error handling
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      try {
        // Request to check if user is authenticated before proceeding
        const authCheck = await apiRequest('GET', '/api/stripe/check-auth');
        if (!authCheck.ok) {
          console.log('User authentication check failed before creating Stripe account');
          // Invalidate user query to trigger auth redirect if needed
          await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          throw new Error('Please login to continue');
        }
        
        // Parse the auth check response
        const authData = await authCheck.json();
        if (!authData.authenticated) {
          console.log('Auth check returned not authenticated:', authData);
          throw new Error('Session expired. Please login again.');
        }
        
        const res = await apiRequest('POST', '/api/stripe/connect/create-account', {});
        
        // If response is not ok, throw with more details
        if (!res.ok) {
          if (res.status === 401) {
            console.log('Authentication failed during Stripe account creation');
            // Try to refresh user data (this will redirect to login if needed)
            await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
            throw new Error('Authentication error. Please login again.');
          }
          
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
  
  // Create login link mutation with enhanced error handling
  const createLoginLinkMutation = useMutation({
    mutationFn: async () => {
      try {
        // Request to check if user is authenticated before proceeding using our special endpoint
        const authCheck = await apiRequest('GET', '/api/stripe/check-auth');
        if (!authCheck.ok) {
          console.log('User authentication check failed before creating login link');
          // Invalidate user query to trigger auth redirect if needed
          await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          throw new Error('Please login to continue');
        }
        
        // Parse the auth check response
        const authData = await authCheck.json();
        if (!authData.authenticated) {
          console.log('Auth check returned not authenticated:', authData);
          throw new Error('Session expired. Please login again.');
        }
        
        const res = await apiRequest('POST', '/api/stripe/connect/create-login-link', {});
        
        // If response is not ok, handle different error cases
        if (!res.ok) {
          if (res.status === 401) {
            console.log('Authentication failed during login link creation');
            // Try to refresh user data (this will redirect to login if needed)
            await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
            throw new Error('Authentication error. Please login again.');
          }
          
          const errorData = await res.json();
          throw new Error(errorData.message || `Server error: ${res.status}`);
        }
        
        return await res.json();
      } catch (error) {
        console.error('Error creating Stripe Connect login link:', error);
        throw error;
      }
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
      return { 
        text: 'Not Connected', 
        variant: 'outline', 
        iconComponent: XCircle,
        iconProps: { className: "h-4 w-4 mr-1" }
      };
    }
    
    switch (accountStatus.accountStatus) {
      case 'active':
        return { 
          text: 'Active', 
          variant: 'default', 
          iconComponent: CheckCircle,
          iconProps: { className: "h-4 w-4 mr-1" }
        };
      case 'incomplete':
        return { 
          text: 'Incomplete', 
          variant: 'warning', 
          iconComponent: AlertCircle,
          iconProps: { className: "h-4 w-4 mr-1" }
        };
      case 'pending':
        return { 
          text: 'Pending Verification', 
          variant: 'secondary', 
          iconComponent: Loader2,
          iconProps: { className: "h-4 w-4 mr-1 animate-spin" }
        };
      case 'restricted':
        return { 
          text: 'Restricted', 
          variant: 'destructive', 
          iconComponent: AlertCircle,
          iconProps: { className: "h-4 w-4 mr-1" }
        };
      case 'disabled':
        return { 
          text: 'Disabled', 
          variant: 'destructive', 
          iconComponent: XCircle,
          iconProps: { className: "h-4 w-4 mr-1" }
        };
      default:
        return { 
          text: accountStatus.accountStatus, 
          variant: 'outline', 
          iconComponent: AlertCircle,
          iconProps: { className: "h-4 w-4 mr-1" }
        };
    }
  };
  
  // Determine if we should use account link instead of login link
  const needsOnboarding = accountStatus && 
    (accountStatus.accountStatus === 'incomplete' || 
     !accountStatus.detailsSubmitted || 
     !accountStatus.payoutsEnabled);
  
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
              {statusBadge.iconComponent && <statusBadge.iconComponent {...statusBadge.iconProps} />}
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
              onClick={() => {
                // For incomplete accounts, use account link instead of login link
                if (needsOnboarding && accountStatus.accountLinkUrl) {
                  window.open(accountStatus.accountLinkUrl, '_blank');
                  toast({
                    title: 'Stripe Connect Setup',
                    description: 'Please complete your account setup in the new tab.',
                  });
                } else {
                  createLoginLinkMutation.mutate();
                }
              }}
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
                  {needsOnboarding ? 'Complete Setup' : 'Manage Account'}
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
          {!isLoading && (() => {
            const badge = getStatusBadge();
            return (
              <Badge variant={badge.variant as any} className="flex items-center">
                {badge.iconComponent && <badge.iconComponent {...badge.iconProps} />}
                {badge.text}
              </Badge>
            );
          })()}
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
                  
                  {accountStatus.requirements.currentlyDue && accountStatus.requirements.currentlyDue.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-amber-600 mb-1">Currently Due:</div>
                      <ul className="text-xs list-disc list-inside space-y-1 text-muted-foreground">
                        {accountStatus.requirements.currentlyDue.map((item, index) => {
                          // Check if this is an ID verification requirement
                          const isIdVerification = item.includes('verification') || 
                                                item.includes('document') || 
                                                item.includes('identity') ||
                                                item.includes('id_number') ||
                                                item.includes('ssn_last_4');
                          
                          return (
                            <li key={index} className={isIdVerification ? "font-medium text-orange-700" : ""}>
                              {item}
                              {isIdVerification && (
                                <span className="block pl-4 mt-1 text-xs font-normal">
                                  ID verification required. Please complete Stripe onboarding.
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  
                  {accountStatus.requirements.eventuallyDue && accountStatus.requirements.eventuallyDue.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-blue-600 mb-1">Eventually Due:</div>
                      <ul className="text-xs list-disc list-inside space-y-1 text-muted-foreground">
                        {accountStatus.requirements.eventuallyDue.map((item, index) => {
                          // Check if this is an ID verification requirement
                          const isIdVerification = item.includes('verification') || 
                                                item.includes('document') || 
                                                item.includes('identity') ||
                                                item.includes('id_number') ||
                                                item.includes('ssn_last_4');
                          
                          return (
                            <li key={index} className={isIdVerification ? "font-medium text-blue-700" : ""}>
                              {item}
                              {isIdVerification && (
                                <span className="block pl-4 mt-1 text-xs font-normal">
                                  Additional ID verification will be needed later.
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  
                  {accountStatus.requirements.pendingVerification && accountStatus.requirements.pendingVerification.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-orange-600 mb-1">Pending Verification:</div>
                      <ul className="text-xs list-disc list-inside space-y-1 text-muted-foreground">
                        {accountStatus.requirements.pendingVerification.map((item, index) => {
                          // Check if this is an ID verification requirement
                          const isIdVerification = item.includes('verification') || 
                                                item.includes('document') || 
                                                item.includes('identity') ||
                                                item.includes('id_number') ||
                                                item.includes('ssn_last_4');
                                                
                          return (
                            <li key={index} className={isIdVerification ? "font-medium text-orange-700" : ""}>
                              {item}
                              {isIdVerification && (
                                <span className="block pl-4 mt-1 text-xs font-normal">
                                  ID document awaiting verification by Stripe.
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  
                  {/* Add a note about ID verification if account is incomplete */}
                  {!accountStatus.detailsSubmitted && (
                    <div className="mt-4 p-3 border border-orange-200 bg-orange-50 rounded text-sm">
                      <h5 className="font-medium text-orange-800 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        ID Verification Required
                      </h5>
                      <p className="mt-1 text-orange-700 text-xs">
                        Stripe Connect requires identity verification including government ID documents and proof of address.
                        Click "Complete Setup" to proceed with the verification process in Stripe's secure portal.
                      </p>
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
            onClick={() => {
              // For incomplete accounts, use account link instead of login link
              if (needsOnboarding && accountStatus.accountLinkUrl) {
                window.open(accountStatus.accountLinkUrl, '_blank');
                toast({
                  title: 'Stripe Connect Setup',
                  description: 'Please complete your account setup in the new tab.',
                });
              } else {
                createLoginLinkMutation.mutate();
              }
            }}
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
                {needsOnboarding ? 'Complete Setup' : 'Manage Account'}
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default StripeConnectSetup;