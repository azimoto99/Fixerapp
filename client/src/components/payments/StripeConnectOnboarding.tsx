import React, { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  ExternalLink, 
  Check, 
  AlertTriangle, 
  CreditCard, 
  Building, 
  LucideBank, 
  ReceiptText,
  Wallet,
  Shield
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';

export interface ConnectAccountStatus {
  accountId: string | null;
  status: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  termsAccepted: boolean;
  bankingDetailsComplete: boolean;
  representativeDetailsComplete: boolean;
  requiresAction: boolean;
  actionUrl?: string;
}

interface OnboardingStepProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'complete' | 'current' | 'pending' | 'error';
  children?: React.ReactNode;
}

const OnboardingStep: React.FC<OnboardingStepProps> = ({ 
  title, 
  description, 
  icon,
  status, 
  children 
}) => {
  // Determine the color based on the status
  const getIconContainerClass = () => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
      case 'current':
        return 'bg-primary/10 text-primary';
      case 'error':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <Check className="h-5 w-5" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return icon;
    }
  };

  return (
    <div className="mb-8 last:mb-0">
      <div className="flex items-start">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${getIconContainerClass()}`}>
          {getStatusIcon()}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium mb-1">{title}</h3>
          <p className="text-muted-foreground mb-4">{description}</p>
          
          <div className={status === 'pending' ? 'opacity-50' : ''}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export const StripeConnectOnboarding: React.FC<{
  onComplete?: () => void;
}> = ({ onComplete }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [representativeName, setRepresentativeName] = useState('');
  const [representativeTitle, setRepresentativeTitle] = useState('');

  // Get current account status
  const { data: accountStatus, isLoading, error } = useQuery({
    queryKey: ['/api/stripe/connect/account-status'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/stripe/connect/account-status');
      
      if (!res.ok) {
        throw new Error('Failed to fetch account status');
      }
      
      return res.json();
    }
  });

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/stripe/connect/create-account');
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create Stripe Connect account');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Account Created",
        description: "Your Stripe Connect account has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/connect/account-status'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Account Creation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Accept terms mutation
  const acceptTermsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/stripe/connect/accept-terms', {
        termsAccepted
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to accept terms');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Terms Accepted",
        description: "You've successfully accepted the Stripe Connect terms",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/connect/account-status'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Accept Terms",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update representative details mutation
  const updateRepresentativeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/stripe/connect/update-representative', {
        name: representativeName,
        title: representativeTitle
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update representative details');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Details Updated",
        description: "Your representative details have been updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/connect/account-status'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Complete account setup mutation
  const completeSetupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/stripe/connect/get-account-link');
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to get account link');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      // Redirect to Stripe's hosted onboarding flow
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading account status...</p>
      </div>
    );
  }

  const hasAccount = accountStatus?.accountId;
  const termsStatus = accountStatus?.termsAccepted ? 'complete' : hasAccount ? 'current' : 'pending';
  const representativeStatus = accountStatus?.representativeDetailsComplete 
    ? 'complete' 
    : (hasAccount && accountStatus?.termsAccepted) 
      ? 'current' 
      : 'pending';
  const bankingStatus = accountStatus?.bankingDetailsComplete 
    ? 'complete' 
    : (hasAccount && accountStatus?.termsAccepted && accountStatus?.representativeDetailsComplete) 
      ? 'current' 
      : 'pending';

  return (
    <Card className="w-full max-w-3xl mx-auto border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Wallet className="mr-2 h-5 w-5" />
          Stripe Connect Setup
        </CardTitle>
        <CardDescription>
          Set up your Stripe Connect account to start receiving payments for jobs you complete
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasAccount ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-muted/30 rounded-full flex items-center justify-center">
              <Building className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Start Receiving Payments</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Create a Stripe Connect account to receive payments directly to your bank account for jobs you complete.
            </p>
            <Button 
              onClick={() => createAccountMutation.mutate()}
              disabled={createAccountMutation.isPending}
              size="lg"
            >
              {createAccountMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-lg bg-muted/50 p-4 flex items-center">
              <div className="mr-4">
                <Shield className="h-8 w-8 text-primary/60" />
              </div>
              <div>
                <h3 className="font-medium">Account Status</h3>
                <p className="text-sm text-muted-foreground">
                  {accountStatus.status === 'active' 
                    ? 'Your account is active and ready to receive payments' 
                    : 'Complete the steps below to activate your payment account'}
                </p>
              </div>
              {accountStatus.status === 'active' && (
                <div className="ml-auto">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <Check className="mr-1 h-3 w-3" />
                    Active
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <OnboardingStep
                title="Accept Terms of Service"
                description="Review and accept Stripe's terms of service to enable payment processing"
                icon={<ReceiptText className="h-5 w-5" />}
                status={termsStatus}
              >
                {termsStatus === 'current' && (
                  <div className="space-y-4">
                    <div className="flex items-start space-x-2">
                      <Checkbox 
                        id="terms" 
                        checked={termsAccepted}
                        onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor="terms"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          I accept Stripe's terms of service
                        </label>
                        <p className="text-sm text-muted-foreground">
                          By checking this box, you agree to Stripe's{" "}
                          <a 
                            href="https://stripe.com/connect-account/legal" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            Connected Account Agreement
                          </a>
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => acceptTermsMutation.mutate()}
                      disabled={!termsAccepted || acceptTermsMutation.isPending}
                    >
                      {acceptTermsMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Accept Terms"
                      )}
                    </Button>
                  </div>
                )}
              </OnboardingStep>

              <OnboardingStep
                title="Add Representative Details"
                description="Provide details about the business representative (you)"
                icon={<Building className="h-5 w-5" />}
                status={representativeStatus}
              >
                {representativeStatus === 'current' && (
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="representative-name">Full Name</Label>
                        <Input
                          id="representative-name"
                          placeholder="Your full legal name"
                          value={representativeName}
                          onChange={(e) => setRepresentativeName(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="representative-title">Your Title/Position</Label>
                        <Input
                          id="representative-title"
                          placeholder="e.g. Owner, Director, etc."
                          value={representativeTitle}
                          onChange={(e) => setRepresentativeTitle(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => updateRepresentativeMutation.mutate()}
                      disabled={!representativeName || !representativeTitle || updateRepresentativeMutation.isPending}
                    >
                      {updateRepresentativeMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Details"
                      )}
                    </Button>
                  </div>
                )}
              </OnboardingStep>

              <OnboardingStep
                title="Set Up Banking Details"
                description="Add your bank account information to receive payouts"
                icon={<LucideBank className="h-5 w-5" />}
                status={bankingStatus}
              >
                {bankingStatus === 'current' && (
                  <div className="space-y-4">
                    <p className="text-sm">
                      You'll need to complete your Stripe Connect setup on Stripe's website to add your banking details 
                      securely.
                    </p>
                    <Button
                      onClick={() => completeSetupMutation.mutate()}
                      disabled={completeSetupMutation.isPending}
                    >
                      {completeSetupMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Preparing...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Continue Setup on Stripe
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </OnboardingStep>
            </div>

            {accountStatus.requiresAction && accountStatus.actionUrl && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20 p-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mr-3" />
                  <div>
                    <h3 className="font-medium text-amber-800 dark:text-amber-400">Action Required</h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      There are additional steps required to activate your account.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="mt-3 bg-white dark:bg-background border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                  onClick={() => window.location.href = accountStatus.actionUrl!}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Complete Required Steps
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
      {hasAccount && accountStatus?.status === 'active' && (
        <CardFooter className="flex justify-end">
          <Button onClick={onComplete}>
            Continue
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default StripeConnectOnboarding;