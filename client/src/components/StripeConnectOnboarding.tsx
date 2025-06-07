import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { CheckCircle, Clock, AlertCircle, CreditCard, Shield, FileText, DollarSign, Landmark, Globe, Phone, Mail, User, MapPin, Calendar, ExternalLink, RefreshCw, ArrowRight, Info } from 'lucide-react';

interface StripeAccountStatus {
  exists: boolean;
  accountId?: string;
  payoutsEnabled?: boolean;
  chargesEnabled?: boolean;
  accountStatus?: 'active' | 'pending' | 'restricted';
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
    pending_verification: string[];
  };
  verification?: {
    disabled_reason?: string;
    due_by?: number;
    fields_needed?: string[];
  };
}

const StripeConnectOnboarding: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState<StripeAccountStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const steps = [
    {
      id: 'intro',
      title: 'Welcome to Stripe Connect',
      description: 'Set up your payment account to start earning on Fixer'
    },
    {
      id: 'requirements',
      title: 'What You\'ll Need',
      description: 'Gather required information for quick setup'
    },
    {
      id: 'setup',
      title: 'Account Setup',
      description: 'Complete your Stripe Connect account'
    },
    {
      id: 'verification',
      title: 'Verification Status',
      description: 'Check your account verification progress'
    }
  ];

  // Check account status on component mount
  useEffect(() => {
    checkAccountStatus();
  }, []);
  const checkAccountStatus = async () => {
    setRefreshing(true);
    try {
      const response = await apiRequest('GET', '/api/stripe/connect/account-status');
      if (response.ok) {
        const data = await response.json();
        setAccountStatus(data);
        
        // Automatically advance to verification step if account exists
        if (data.exists && currentStep < 3) {
          setCurrentStep(3);
        }
      } else {
        // Account doesn't exist yet
        setAccountStatus({ exists: false });
      }
    } catch (error) {
      console.error('Failed to check account status:', error);
      setAccountStatus({ exists: false });
    } finally {
      setRefreshing(false);
    }
  };

  const createStripeAccount = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/stripe/connect/create-account', {});
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create Stripe account');
      }
      
      const data = await response.json();
      
      // Open Stripe onboarding in new tab
      if (data.accountLinkUrl) {
        window.open(data.accountLinkUrl, '_blank');
        toast({
          title: 'Stripe Setup Started',
          description: 'Complete the setup in the new tab, then return here to check your status.',
        });
        
        // Move to verification step
        setCurrentStep(3);
        
        // Check status after a short delay
        setTimeout(checkAccountStatus, 3000);
      }
    } catch (error: any) {
      console.error('Stripe account creation error:', error);
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to start Stripe Connect setup',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createOnboardingLink = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/stripe/connect/create-link', {
        type: 'account_onboarding'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create onboarding link');
      }
      
      const data = await response.json();
      
      if (data.accountLinkUrl) {
        window.open(data.accountLinkUrl, '_blank');
        toast({
          title: 'Onboarding Link Created',
          description: 'Complete the setup in the new tab, then return here.',
        });
      }
    } catch (error: any) {
      console.error('Onboarding link creation error:', error);
      toast({
        title: 'Link Creation Failed',
        description: error.message || 'Failed to create onboarding link',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  const requirementsList = [
    {
      category: 'Personal Information',
      icon: <User className="h-5 w-5" />,
      items: [
        'Full legal name',
        'Date of birth',
        'Social Security Number (SSN) or Tax ID',
        'Phone number',
        'Email address'
      ]
    },
    {
      category: 'Address Information',
      icon: <MapPin className="h-5 w-5" />,
      items: [
        'Home address',
        'Mailing address (if different)',
        'Country of residence'
      ]
    },    {
      category: 'Banking Information',
      icon: <Landmark className="h-5 w-5" />,
      items: [
        'Bank account number',
        'Routing number',
        'Bank name and address'
      ]
    },
    {
      category: 'Business Information (if applicable)',
      icon: <FileText className="h-5 w-5" />,
      items: [
        'Business type',
        'Business address',
        'Tax information',
        'Business registration documents'
      ]
    }
  ];

  const SecurityFeatures = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <Shield className="h-6 w-6 text-green-600" />
        <div>
          <h4 className="font-semibold text-green-800 dark:text-green-200">Bank-Level Security</h4>
          <p className="text-sm text-green-700 dark:text-green-300">Your information is protected with the same encryption used by banks</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <Globe className="h-6 w-6 text-blue-600" />
        <div>
          <h4 className="font-semibold text-blue-800 dark:text-blue-200">Global Payment Processing</h4>
          <p className="text-sm text-blue-700 dark:text-blue-300">Accept payments from customers worldwide</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
        <DollarSign className="h-6 w-6 text-purple-600" />
        <div>
          <h4 className="font-semibold text-purple-800 dark:text-purple-200">Fast Payouts</h4>
          <p className="text-sm text-purple-700 dark:text-purple-300">Get paid within 2 business days after job completion</p>
        </div>
      </div>
    </div>
  );

  const AccountStatusDisplay = () => {
    if (!accountStatus) return null;

    const getStatusColor = () => {
      if (!accountStatus.exists) return 'bg-gray-100 text-gray-800';
      if (accountStatus.payoutsEnabled) return 'bg-green-100 text-green-800';
      return 'bg-yellow-100 text-yellow-800';
    };

    const getStatusText = () => {
      if (!accountStatus.exists) return 'Not Created';
      if (accountStatus.payoutsEnabled) return 'Active';
      return 'Pending Verification';
    };

    const getStatusIcon = () => {
      if (!accountStatus.exists) return <AlertCircle className="h-4 w-4" />;
      if (accountStatus.payoutsEnabled) return <CheckCircle className="h-4 w-4" />;
      return <Clock className="h-4 w-4" />;
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Account Status</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={checkAccountStatus}
            disabled={refreshing}
          >
            {refreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
        
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Badge className={getStatusColor()}>
              {getStatusIcon()}
              {getStatusText()}
            </Badge>
            {accountStatus.accountId && (
              <span className="text-sm text-gray-500">
                ID: {accountStatus.accountId.slice(-6)}
              </span>
            )}
          </div>
          
          {accountStatus.exists && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Charges Enabled:</span>
                <span className={`ml-2 ${accountStatus.chargesEnabled ? 'text-green-600' : 'text-red-600'}`}>
                  {accountStatus.chargesEnabled ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="font-medium">Payouts Enabled:</span>
                <span className={`ml-2 ${accountStatus.payoutsEnabled ? 'text-green-600' : 'text-red-600'}`}>
                  {accountStatus.payoutsEnabled ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          )}
          
          {accountStatus.requirements && (
            <div className="mt-4 space-y-2">
              {accountStatus.requirements.currently_due.length > 0 && (
                <div>
                  <span className="font-medium text-red-600">Currently Due:</span>
                  <ul className="list-disc list-inside text-sm text-red-600 ml-4">
                    {accountStatus.requirements.currently_due.map((req, idx) => (
                      <li key={idx}>{req.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {accountStatus.requirements.eventually_due.length > 0 && (
                <div>
                  <span className="font-medium text-yellow-600">Eventually Due:</span>
                  <ul className="list-disc list-inside text-sm text-yellow-600 ml-4">
                    {accountStatus.requirements.eventually_due.map((req, idx) => (
                      <li key={idx}>{req.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        
        {accountStatus.exists && !accountStatus.payoutsEnabled && (
          <Button 
            onClick={createOnboardingLink} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Creating Link...' : 'Continue Setup'}
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CreditCard className="h-16 w-16 mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Welcome to Stripe Connect</h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Stripe Connect is a secure payment platform used by millions of businesses worldwide. 
                Set up your account to start receiving payments for your work on Fixer.
              </p>
            </div>
            
            <SecurityFeatures />
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200">Why Stripe Connect?</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Stripe Connect allows us to securely process payments and transfer earnings directly to your bank account. 
                    It's trusted by companies like Shopify, Lyft, and thousands of other platforms.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <FileText className="h-16 w-16 mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold mb-2">What You'll Need</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Gather these documents and information before starting the setup process
              </p>
            </div>
            
            <div className="space-y-4">
              {requirementsList.map((category, idx) => (
                <Card key={idx} className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {category.icon}
                    <h3 className="font-semibold">{category.category}</h3>
                  </div>
                  <ul className="space-y-1">
                    {category.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Important Note</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    All information must be accurate and match your legal documents. 
                    Providing false information may result in account suspension.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CreditCard className="h-16 w-16 mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Account Setup</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Create your Stripe Connect account to start accepting payments
              </p>
            </div>
            
            {user && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Your Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span>{user.fullName || user.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span>{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span>{user.phone}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}
            
            <div className="space-y-4">
              <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg text-center">
                <h3 className="font-semibold mb-2">Ready to Start?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Click the button below to begin the Stripe Connect setup process. 
                  You'll be redirected to Stripe's secure platform to complete your account.
                </p>
                
                <Button
                  onClick={createStripeAccount}
                  disabled={isLoading}
                  className="w-full max-w-md"
                  size="lg"
                >
                  {isLoading ? 'Creating Account...' : 'Start Stripe Setup'}
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </div>
              
              <div className="text-xs text-gray-500 text-center">
                By clicking "Start Stripe Setup", you'll be redirected to Stripe's platform. 
                The setup typically takes 5-10 minutes to complete.
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Verification Status</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Check your account status and complete any remaining requirements
              </p>
            </div>
            
            <AccountStatusDisplay />
            
            {accountStatus?.payoutsEnabled && (
              <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-3" />
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                  Account Verified!
                </h3>
                <p className="text-green-700 dark:text-green-300 mb-4">
                  Your Stripe Connect account is fully set up and ready to receive payments. 
                  You can now start accepting jobs on Fixer.
                </p>
                <Button 
                  onClick={() => window.location.href = '/'}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Start Finding Jobs
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Stripe Connect Setup</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete your payment setup to start earning on Fixer
          </p>
        </div>

        {/* Progress Bar */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Step {currentStep + 1} of {steps.length}</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            <div className="flex justify-between">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex flex-col items-center text-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mb-2 ${
                    idx <= currentStep 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="max-w-20">
                    <p className="text-xs font-medium">{step.title}</p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card>
          <CardContent className="p-8">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          
          <Button
            onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === steps.length - 1}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StripeConnectOnboarding;
