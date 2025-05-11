import React, { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertCircle, Loader2, ArrowRight, Info, ExternalLink } from 'lucide-react';

interface StripeConnectSetupProps {
  compact?: boolean;
}

export default function StripeConnectSetupV2({ compact = false }: StripeConnectSetupProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('setup');
  const { toast } = useToast();
  
  // Check Stripe Connect Account Status
  const { 
    data: connectAccount, 
    isLoading: isLoadingAccount,
    refetch: refetchAccount
  } = useQuery({
    queryKey: ['/api/stripe/connect/account-status'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/stripe/connect/account-status');
        if (res.status === 404) {
          // No account yet, which is fine
          return { exists: false };
        }
        if (!res.ok) {
          const errorData = await res.json();
          return { exists: false, error: errorData.message || 'Failed to get account status' };
        }
        return res.json();
      } catch (error) {
        // Catch any network errors and return a default state
        return { exists: false, error: 'Connection error' };
      }
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
  
  // Format requirement string for display
  const formatRequirement = (requirement: string) => {
    return requirement.replace(/_/g, ' ').replace(/\./g, ' › ');
  };
  
  // If compact mode is enabled, show a simplified version
  if (compact) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Stripe Connect Status</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          {isLoadingAccount ? (
            <div className="flex items-center gap-2 py-1">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm">Checking...</span>
            </div>
          ) : hasConnectAccount ? (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Badge variant={accountVerified ? "default" : "outline"} className="text-xs">
                  {accountVerified ? 'Verified' : 'Setup Needed'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {accountVerified ? 'Ready to receive payments' : `${progress}% Complete`}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setActiveTab('dashboard')}>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={() => setActiveTab('setup')}>
              Set Up Payments
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }
  
  // Standard full view
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-3xl mx-auto">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="setup" className="text-xs">Stripe Connect Setup</TabsTrigger>
        <TabsTrigger value="dashboard" disabled={!hasConnectAccount} className="text-xs">Account Dashboard</TabsTrigger>
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
                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <Info className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                  <AlertTitle className="text-blue-800 dark:text-blue-300 font-medium">Get Paid Faster with Stripe Connect</AlertTitle>
                  <AlertDescription className="text-blue-700 dark:text-blue-400 mt-2">
                    <p>Stripe Connect allows you to receive payments directly to your bank account. Setting up is quick and secure:</p>
                    <ul className="list-disc pl-6 mt-3 space-y-1.5">
                      <li>Fast direct deposits to your bank account</li>
                      <li>Verify your identity once and get paid for all jobs</li>
                      <li>Track all payments in one secure dashboard</li>
                      <li>Industry-leading security and fraud protection</li>
                    </ul>
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
                
                <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50 p-4">
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Terms & Conditions</h3>
                  
                  <div className="flex items-start space-x-3 bg-white dark:bg-slate-900 p-3 rounded border border-blue-100 dark:border-blue-800">
                    <Checkbox 
                      id="terms" 
                      checked={acceptedTerms} 
                      onCheckedChange={(checked) => setAcceptedTerms(!!checked)}
                      className="mt-1" 
                    />
                    <div>
                      <Label htmlFor="terms" className="text-sm font-medium">
                        I agree to the following terms:
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        By creating a Stripe Connect account, I accept the <a href="https://stripe.com/connect-account/legal" target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium">Stripe Connected Account Agreement</a> and acknowledge the <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium">Stripe Privacy Policy</a>. I understand Stripe will process my payments and may require verification of my identity.
                      </p>
                    </div>
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
                <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-6 shadow-sm dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900 mb-4">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">Ready to start earning?</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-400 mb-4">
                    Complete your Stripe Connect setup to receive payments directly for your work.
                  </p>
                
                  <Button 
                    onClick={handleCreateAccount} 
                    disabled={!acceptedTerms || createAccountMutation.isPending}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                    size="lg"
                  >
                    {createAccountMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Setting Up Your Account...
                      </>
                    ) : (
                      <>Set Up Payments with Stripe Connect</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardFooter>
        </Card>
      </TabsContent>
      
      <TabsContent value="dashboard">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Stripe Connect Dashboard</CardTitle>
                <CardDescription>
                  Manage your Stripe Connect account and view payment history
                </CardDescription>
              </div>
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" 
                alt="Stripe" 
                className="h-8 opacity-80" 
              />
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {isLoadingAccount ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : hasConnectAccount ? (
              <>
                <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                  <div className={`p-4 ${accountVerified ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30' : 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {accountVerified ? (
                          <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                          </div>
                        )}
                        <div>
                          <h3 className={`text-lg font-medium ${accountVerified ? 'text-emerald-900 dark:text-emerald-300' : 'text-amber-900 dark:text-amber-300'}`}>
                            {accountVerified ? 'Account Verified' : 'Verification Required'}
                          </h3>
                          <p className={`text-sm ${accountVerified ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                            {accountVerified ? 
                              'Your account is fully verified and ready to receive payments' : 
                              'Additional information needed to process payments'
                            }
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant="outline"
                        className={accountVerified 
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-800" 
                          : "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 dark:bg-amber-900/60 dark:text-amber-300 dark:border-amber-800"
                        }
                      >
                        {accountVerified ? 'Verified' : 'Pending Verification'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {!accountVerified && requirements.currently_due && requirements.currently_due.length > 0 && (
                  <>
                    <Separator />
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Account Requirements</h3>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800">
                          Action Needed
                        </Badge>
                      </div>
                      
                      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-5">
                        <div className="flex gap-3 mb-4">
                          <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <h4 className="font-medium text-amber-900 dark:text-amber-300">Complete Your Verification</h4>
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                              The following information is needed to activate your account:
                            </p>
                          </div>
                        </div>
                        
                        <div className="rounded-md bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 p-3 mb-4">
                          <ul className="space-y-2">
                            {requirements.currently_due.map((requirement: string, index: number) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <div className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">!</span>
                                </div>
                                <span className="text-slate-700 dark:text-slate-300">
                                  {formatRequirement(requirement)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <Button 
                          onClick={handleLoginToStripe}
                          disabled={createLoginLinkMutation.isPending}
                          className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                          size="lg"
                        >
                          {createLoginLinkMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Loading Stripe Dashboard...
                            </>
                          ) : (
                            <>Complete Verification Now <ExternalLink className="ml-2 h-4 w-4" /></>
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
                
                <Button
                  variant="outline"
                  onClick={handleLoginToStripe}
                  disabled={createLoginLinkMutation.isPending}
                  className="w-full"
                >
                  {createLoginLinkMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Go to Stripe Dashboard <ExternalLink className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center py-8">
                <Alert>
                  <Info className="h-4 w-4 mr-2" />
                  <AlertTitle>No account found</AlertTitle>
                  <AlertDescription>
                    You haven't set up a Stripe Connect account yet. Please go to the Setup tab to create one.
                  </AlertDescription>
                </Alert>
                
                <Button className="mt-4" onClick={() => setActiveTab('setup')}>
                  Go to Setup
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}