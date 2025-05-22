import * as React from 'react';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from "@/components/ui/separator";
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  CheckCircle2, 
  User, 
  MapPin, 
  CreditCard, 
  Shield,
  Building,
  Calendar,
  Phone,
  Mail
} from 'lucide-react';

interface StripeConnectSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface FormData {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: {
    day: string;
    month: string;
    year: string;
  };
  
  // Address Information
  address: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  
  // Business Information (for Express accounts)
  businessType: 'individual' | 'company';
  
  // Banking Information
  bankAccount: {
    routingNumber: string;
    accountNumber: string;
    accountHolderName: string;
  };
  
  // Legal
  termsAccepted: boolean;
}

const StripeConnectSetup: React.FC<StripeConnectSetupProps> = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: {
      day: '',
      month: '',
      year: ''
    },
    address: {
      line1: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US'
    },
    businessType: 'individual',
    bankAccount: {
      routingNumber: '',
      accountNumber: '',
      accountHolderName: ''
    },
    termsAccepted: false
  });
  
  const { toast } = useToast();
  
  const updateFormData = (field: string, value: any) => {
    setFormData(prev => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      } else if (keys.length === 2) {
        return {
          ...prev,
          [keys[0]]: {
            ...prev[keys[0] as keyof FormData],
            [keys[1]]: value
          }
        };
      }
      return prev;
    });
  };
  
  // Create and update Connect account mutation
  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/stripe/connect/setup-account', {
        personalInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth
        },
        address: formData.address,
        businessType: formData.businessType,
        bankAccount: formData.bankAccount
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to setup account');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Account Setup Complete!',
        description: 'Your payment account has been successfully configured.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/connect/account-status'] });
      onComplete();
    },
    onError: (error: Error) => {
      toast({
        title: 'Setup Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  const totalSteps = 4;
  const progressPercent = (currentStep / totalSteps) * 100;
  
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.firstName && formData.lastName && formData.email);
      case 2:
        return !!(formData.address.line1 && formData.address.city && formData.address.state && formData.address.postalCode);
      case 3:
        return !!(formData.bankAccount.routingNumber && formData.bankAccount.accountNumber && formData.bankAccount.accountHolderName);
      case 4:
        return formData.termsAccepted;
      default:
        return false;
    }
  };
  
  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(prev => prev + 1);
      } else {
        setupMutation.mutate();
      }
    } else {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields to continue.',
        variant: 'destructive',
      });
    }
  };
  
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <User className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Personal Information</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateFormData('lastName', e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateFormData('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <div className="grid grid-cols-3 gap-2">
                <Select value={formData.dateOfBirth.month} onValueChange={(value) => updateFormData('dateOfBirth.month', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1).padStart(2, '0')}>
                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Day"
                  value={formData.dateOfBirth.day}
                  onChange={(e) => updateFormData('dateOfBirth.day', e.target.value)}
                  maxLength={2}
                />
                <Input
                  placeholder="Year"
                  value={formData.dateOfBirth.year}
                  onChange={(e) => updateFormData('dateOfBirth.year', e.target.value)}
                  maxLength={4}
                />
              </div>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Address Information</h3>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="addressLine1">Street Address *</Label>
              <Input
                id="addressLine1"
                value={formData.address.line1}
                onChange={(e) => updateFormData('address.line1', e.target.value)}
                placeholder="123 Main Street"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.address.city}
                  onChange={(e) => updateFormData('address.city', e.target.value)}
                  placeholder="San Francisco"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={formData.address.state}
                  onChange={(e) => updateFormData('address.state', e.target.value)}
                  placeholder="CA"
                  maxLength={2}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">ZIP Code *</Label>
                <Input
                  id="postalCode"
                  value={formData.address.postalCode}
                  onChange={(e) => updateFormData('address.postalCode', e.target.value)}
                  placeholder="94102"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={formData.address.country} onValueChange={(value) => updateFormData('address.country', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Bank Account Information</h3>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950/50 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Your banking information is securely encrypted and processed by Stripe.
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accountHolderName">Account Holder Name *</Label>
              <Input
                id="accountHolderName"
                value={formData.bankAccount.accountHolderName}
                onChange={(e) => updateFormData('bankAccount.accountHolderName', e.target.value)}
                placeholder="John Doe"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="routingNumber">Routing Number *</Label>
              <Input
                id="routingNumber"
                value={formData.bankAccount.routingNumber}
                onChange={(e) => updateFormData('bankAccount.routingNumber', e.target.value)}
                placeholder="110000000"
                maxLength={9}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number *</Label>
              <Input
                id="accountNumber"
                type="password"
                value={formData.bankAccount.accountNumber}
                onChange={(e) => updateFormData('bankAccount.accountNumber', e.target.value)}
                placeholder="Enter your account number"
              />
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Review & Accept</h3>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border">
              <h4 className="font-medium mb-2">Account Summary:</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
                <p><strong>Email:</strong> {formData.email}</p>
                <p><strong>Address:</strong> {formData.address.line1}, {formData.address.city}, {formData.address.state} {formData.address.postalCode}</p>
                <p><strong>Bank Account:</strong> ***{formData.bankAccount.accountNumber.slice(-4)}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={formData.termsAccepted}
                  onCheckedChange={(checked) => updateFormData('termsAccepted', checked)}
                />
                <div className="space-y-1">
                  <Label htmlFor="terms" className="text-sm font-medium">
                    I accept the Stripe Connected Account Agreement *
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    By checking this box, you agree to the{' '}
                    <a href="https://stripe.com/connect-account/legal" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Stripe Connected Account Agreement
                    </a>{' '}
                    and authorize Fixer to share your information with Stripe for payment processing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-6 w-6" />
          <span>Set Up Payment Account</span>
        </CardTitle>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round(progressPercent)}% Complete</span>
          </div>
          <Progress value={progressPercent} className="w-full" />
        </div>
      </CardHeader>
      
      <CardContent>
        {renderStep()}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onCancel : handleBack}
          disabled={setupMutation.isPending}
        >
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={!validateStep(currentStep) || setupMutation.isPending}
        >
          {setupMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up...
            </>
          ) : currentStep === totalSteps ? (
            'Complete Setup'
          ) : (
            'Next'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default StripeConnectSetup;