import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CircleCheckBig, CircleX, Info, ExternalLink, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

/**
 * StripeConnectSetup Component
 * 
 * A component for setting up Stripe Connect for workers
 * to receive payments directly to their bank accounts
 */
export default function StripeConnectSetup() {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('setup');
  const { toast } = useToast();
  
  // Check Stripe Connect Account Status
  const { 
    data: connectAccount, 
    isLoading: isLoadingAccount,
    error: connectError,
    refetch: refetchAccount
  } = useQuery({
    queryKey: ['/api/stripe/connect/account-status'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/stripe/connect/account-status');
      if (res.status === 404) {
        // No account yet, which is fine
        return { exists: false };
      }
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to get account status');
      }
      return res.json();
    },
    retry: false,
  });
  
  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/stripe/connect/create-account', { acceptTerms: true });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create Stripe Connect account');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Account Created',
        description: 'Your Stripe Connect account has been created',
      });
      
      // Open the Stripe hosted onboarding URL in a new tab
      if (data.accountLinkUrl) {
        window.open(data.accountLinkUrl, '_blank');
      }
      
      // Switch to dashboard tab
      setActiveTab('dashboard');
      
      // Refetch account status
      setTimeout(() => {
        refetchAccount();
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create account: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Create login link mutation
  const createLoginLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/stripe/connect/create-login-link');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create login link');
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Open the Stripe dashboard
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to access dashboard: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Accept Stripe terms
  const acceptTermsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/users/:id/stripe-terms', { accept: true });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update terms acceptance');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Terms Accepted',
        description: 'You have accepted the Stripe Connected Account Agreement',
      });
      
      // Refetch account
      setTimeout(() => {
        refetchAccount();
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to accept terms: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Handle account creation
  const handleCreateAccount = () => {
    if (!acceptedTerms) {
      toast({
        title: 'Terms Required',
        description: 'You must accept the terms and conditions',
        variant: 'destructive',
      });
      return;
    }
    
    createAccountMutation.mutate();
  };
  
  // Create login link to Stripe dashboard
  const handleLoginToStripe = () => {
    createLoginLinkMutation.mutate();
  };
  
  // Accept terms
  const handleAcceptTerms = () => {
    acceptTermsMutation.mutate();
  };
  
  // Display setup requirements
  const hasConnectAccount = connectAccount && connectAccount.exists;
  const accountVerified = connectAccount?.account?.charges_enabled;
  const accountDetails = connectAccount?.account || {};
  const capabilities = accountDetails.capabilities || {};
  const requirements = accountDetails.requirements || {};
  
  // Calculate onboarding progress
  const calculateProgress = () => {
    if (!hasConnectAccount) return 0;
    if (accountVerified) return 100;
    
    // Calculate based on requirements and capabilities
    let progress = 20; // Start with 20% for having an account
    
    // Add points for capabilities
    if (capabilities.transfers === 'active') progress += 20;
    if (capabilities.card_payments === 'active') progress += 20;
    
    // Check if there are pending requirements
    const pendingRequirements = requirements.currently_due?.length || 0;
    if (pendingRequirements === 0) progress += 20;
    
    // Check if representative and external account are provided
    if (accountDetails.company?.directors_provided) progress += 10;
    if (accountDetails.external_accounts?.data?.length > 0) progress += 10;
    
    return Math.min(progress, 100);
  };
  
  const progress = calculateProgress();
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-3xl mx-auto">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="setup">Stripe Connect Setup</TabsTrigger>
        <TabsTrigger value="dashboard" disabled={!hasConnectAccount}>Account Dashboard</TabsTrigger>
      </TabsList>
      
      <TabsContent value="setup">
        <Card>
          <CardHeader>
            <CardTitle>Set Up Payments with Stripe Connect</CardTitle>
            <CardDescription>
              Connect your Stripe account to receive payments directly for your work
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingAccount ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : hasConnectAccount ? (
              <Alert className={accountVerified ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
                <div className="flex items-center">
                  {accountVerified ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                  )}
                  <AlertTitle>
                    {accountVerified ? 'Account Verified' : 'Account Setup in Progress'}
                  </AlertTitle>
                </div>
                <AlertDescription className="mt-2">
                  {accountVerified ? (
                    <p>Your Stripe Connect account is fully verified and ready to receive payments.</p>
                  ) : (
                    <p>Your Stripe Connect account has been created but needs additional information before you can receive payments.</p>
                  )}
                  
                  <div className="mt-4">
                    <div className="flex justify-between mb-1 text-sm font-medium">
                      <span>Account Setup Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  
                  {!accountVerified && (
                    <Button 
                      className="mt-4"
                      onClick={handleLoginToStripe}
                      disabled={createLoginLinkMutation.isPending}
                    >
                      {createLoginLinkMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Complete Account Setup <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert>
                  <Info className="h-4 w-4 mr-2" />
                  <AlertTitle>About Stripe Connect</AlertTitle>
                  <AlertDescription>
                    Stripe Connect allows you to receive payments directly to your bank account. 
                    We'll help you set up your account to start receiving payments for your work.
                  </AlertDescription>
                </Alert>
                
                <Accordion type="single" collapsible>
                  <AccordionItem value="benefits">
                    <AccordionTrigger>Benefits of Stripe Connect</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc pl-5 space-y-2">
                        <li>Receive payments directly to your bank account</li>
                        <li>Fast transfers, typically within 2 business days</li>
                        <li>Secure payment processing</li>
                        <li>Detailed reporting and analytics</li>
                        <li>Support for multiple payment methods</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="requirements">
                    <AccordionTrigger>Account Requirements</AccordionTrigger>
                    <AccordionContent>
                      <p className="mb-2">To set up your Stripe Connect account, you'll need:</p>
                      <ul className="list-disc pl-5 space-y-2">
                        <li>Legal name and address</li>
                        <li>Date of birth</li>
                        <li>Tax ID or SSN (for US workers)</li>
                        <li>Bank account details</li>
                        <li>Valid ID for verification</li>
                      </ul>
                      <p className="mt-2 text-sm text-muted-foreground">
                        All information is securely handled by Stripe. We do not store your banking details.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <Separator className="my-4" />
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="terms" 
                      checked={acceptedTerms} 
                      onCheckedChange={(checked) => setAcceptedTerms(!!checked)} 
                    />
                    <Label htmlFor="terms" className="text-sm text-muted-foreground">
                      I accept the <a href="https://stripe.com/connect-account/legal" target="_blank" rel="noopener noreferrer" className="text-primary underline">Stripe Connected Account Agreement</a> and acknowledge the <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Stripe Privacy Policy</a>.
                    </Label>
                  </div>
                </div>
              </>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between">
            {hasConnectAccount ? (
              <div className="flex space-x-4">
                <Button 
                  variant="outline" 
                  onClick={handleLoginToStripe}
                  disabled={createLoginLinkMutation.isPending}
                >
                  {createLoginLinkMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Stripe Dashboard <ExternalLink className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={() => setActiveTab('dashboard')} 
                  variant={accountVerified ? "outline" : "default"}
                >
                  View Account Details
                </Button>
              </div>
            ) : (
              <div className="w-full">
                <Button 
                  onClick={handleCreateAccount} 
                  disabled={!acceptedTerms || createAccountMutation.isPending}
                  className="w-full"
                >
                  {createAccountMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Stripe Connect Account'
                  )}
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>
      </TabsContent>
      
      <TabsContent value="dashboard">
        <Card>
          <CardHeader>
            <CardTitle>Stripe Connect Dashboard</CardTitle>
            <CardDescription>
              Manage your Stripe Connect account and view payment history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingAccount ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : hasConnectAccount ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Account Status</h3>
                    <p className="text-sm text-muted-foreground">
                      {accountVerified ? 
                        'Your account is fully verified and ready to receive payments' : 
                        'Your account requires additional information before you can receive payments'
                      }
                    </p>
                  </div>
                  <Badge 
                    variant={accountVerified ? "success" : "outline"}
                    className={accountVerified ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-amber-100 text-amber-800 hover:bg-amber-100"}
                  >
                    {accountVerified ? 'Verified' : 'Pending Verification'}
                  </Badge>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Account Capabilities</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start space-x-3">
                      {capabilities.transfers === 'active' ? (
                        <CircleCheckBig className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <CircleX className="h-5 w-5 text-amber-500 flex-shrink-0" />
                      )}
                      <div>
                        <h4 className="font-medium">Bank Transfers</h4>
                        <p className="text-sm text-muted-foreground">
                          {capabilities.transfers === 'active' ? 
                            'You can receive transfers to your bank account' : 
                            'Bank account information needed'
                          }
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      {capabilities.card_payments === 'active' ? (
                        <CircleCheckBig className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <CircleX className="h-5 w-5 text-amber-500 flex-shrink-0" />
                      )}
                      <div>
                        <h4 className="font-medium">Card Payments</h4>
                        <p className="text-sm text-muted-foreground">
                          {capabilities.card_payments === 'active' ? 
                            'You can receive payments from credit/debit cards' : 
                            'Additional verification needed for card payments'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {!accountVerified && requirements.currently_due && requirements.currently_due.length > 0 && (
                  <>
                    <Separator />
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Required Information</h3>
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        <AlertTitle>Action Required</AlertTitle>
                        <AlertDescription>
                          <p className="mb-2">The following information is required to activate your account:</p>
                          <ul className="list-disc pl-5 space-y-1">
                            {requirements.currently_due.map((requirement: string, index: number) => (
                              <li key={index} className="text-sm">
                                {requirement.replace(/_/g, ' ').replace(/\./g, ' › ')}
                              </li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                      
                      <Button 
                        onClick={handleLoginToStripe}
                        disabled={createLoginLinkMutation.isPending}
                      >
                        {createLoginLinkMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            Complete Account Setup <ExternalLink className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Payouts</h3>
                  
                  {accountDetails.external_accounts?.data?.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Your bank account is connected and ready to receive payments.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Payouts are typically processed within 2 business days.
                      </p>
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      <AlertTitle>Bank Account Needed</AlertTitle>
                      <AlertDescription>
                        Please add a bank account to receive payments.
                        <Button 
                          variant="link" 
                          onClick={handleLoginToStripe}
                          disabled={createLoginLinkMutation.isPending}
                          className="p-0 h-auto text-primary"
                        >
                          Add bank account
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Alert>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <AlertTitle>No Account Found</AlertTitle>
                  <AlertDescription>
                    You haven't set up a Stripe Connect account yet. Please go to the setup tab to create one.
                  </AlertDescription>
                </Alert>
                
                <Button 
                  onClick={() => setActiveTab('setup')} 
                  className="mt-4"
                >
                  Go to Setup
                </Button>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleLoginToStripe}
              disabled={!hasConnectAccount || createLoginLinkMutation.isPending}
            >
              {createLoginLinkMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Open Stripe Dashboard <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            
            <Button 
              onClick={() => refetchAccount()}
              variant="outline"
              disabled={isLoadingAccount}
            >
              {isLoadingAccount ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Refresh Status'
              )}
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  );
}