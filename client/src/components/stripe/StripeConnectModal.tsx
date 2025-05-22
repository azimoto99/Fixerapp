import * as React from 'react';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  CheckCircle2, 
  User, 
  MapPin, 
  CreditCard, 
  Shield,
  Building,
  FileText,
  Camera,
  Upload,
  AlertCircle,
  X
} from 'lucide-react';

interface StripeConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
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
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  
  // Identity Verification
  ssn: string;
  businessEIN: string;
  
  // Business Information
  businessType: 'individual' | 'company';
  businessName: string;
  businessDescription: string;
  websiteUrl: string;
  
  // Banking Information
  bankAccount: {
    routingNumber: string;
    accountNumber: string;
    accountHolderName: string;
    accountType: 'checking' | 'savings';
  };
  
  // Legal and Compliance
  termsAccepted: boolean;
  identityConfirmed: boolean;
  businessConfirmed: boolean;
}

const StripeConnectModal: React.FC<StripeConnectModalProps> = ({ isOpen, onClose, onComplete }) => {
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
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US'
    },
    ssn: '',
    businessEIN: '',
    businessType: 'individual',
    businessName: '',
    businessDescription: 'Gig economy services through Fixer platform',
    websiteUrl: '',
    bankAccount: {
      routingNumber: '',
      accountNumber: '',
      accountHolderName: '',
      accountType: 'checking'
    },
    termsAccepted: false,
    identityConfirmed: false,
    businessConfirmed: false
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
            ...(prev[keys[0] as keyof FormData] as any),
            [keys[1]]: value
          }
        };
      }
      return prev;
    });
  };
  
  // Setup mutation with comprehensive data
  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/stripe/connect/setup-account', {
        personalInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth,
          ssn: formData.ssn
        },
        address: formData.address,
        businessType: formData.businessType,
        businessInfo: {
          name: formData.businessName || `${formData.firstName} ${formData.lastName}`,
          description: formData.businessDescription,
          website: formData.websiteUrl,
          ein: formData.businessEIN
        },
        bankAccount: formData.bankAccount,
        compliance: {
          termsAccepted: formData.termsAccepted,
          identityConfirmed: formData.identityConfirmed,
          businessConfirmed: formData.businessConfirmed
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to setup account');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Payment Account Setup Complete!',
        description: 'Your account has been successfully configured and is ready to receive payments.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/connect/account-status'] });
      onComplete();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: 'Setup Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  const totalSteps = 6;
  const progressPercent = (currentStep / totalSteps) * 100;
  
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.firstName && formData.lastName && formData.email && formData.phone);
      case 2:
        return !!(formData.address.line1 && formData.address.city && formData.address.state && formData.address.postalCode);
      case 3:
        return !!(formData.dateOfBirth.day && formData.dateOfBirth.month && formData.dateOfBirth.year && formData.ssn);
      case 4:
        return formData.businessType === 'individual' || !!(formData.businessName && formData.businessDescription);
      case 5:
        return !!(formData.bankAccount.routingNumber && formData.bankAccount.accountNumber && formData.bankAccount.accountHolderName);
      case 6:
        return formData.termsAccepted && formData.identityConfirmed && formData.businessConfirmed;
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
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateFormData('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
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
            
            <div className="space-y-2">
              <Label htmlFor="addressLine2">Apartment, Suite, etc.</Label>
              <Input
                id="addressLine2"
                value={formData.address.line2}
                onChange={(e) => updateFormData('address.line2', e.target.value)}
                placeholder="Apt 4B"
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
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Identity Verification</h3>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950/50 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  This information is required by law for identity verification and fraud prevention.
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Date of Birth *</Label>
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
            
            <div className="space-y-2">
              <Label htmlFor="ssn">Social Security Number (Last 4 digits) *</Label>
              <Input
                id="ssn"
                type="password"
                value={formData.ssn}
                onChange={(e) => updateFormData('ssn', e.target.value)}
                placeholder="1234"
                maxLength={4}
              />
              <p className="text-xs text-muted-foreground">
                Required for tax reporting and identity verification
              </p>
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Building className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Business Information</h3>
            </div>
            
            <div className="space-y-2">
              <Label>Business Type</Label>
              <Select value={formData.businessType} onValueChange={(value: 'individual' | 'company') => updateFormData('businessType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual / Sole Proprietor</SelectItem>
                  <SelectItem value="company">Company / Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {formData.businessType === 'company' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => updateFormData('businessName', e.target.value)}
                    placeholder="Acme Services LLC"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="businessEIN">Business EIN (Optional)</Label>
                  <Input
                    id="businessEIN"
                    value={formData.businessEIN}
                    onChange={(e) => updateFormData('businessEIN', e.target.value)}
                    placeholder="12-3456789"
                  />
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="businessDescription">Business Description</Label>
              <Textarea
                id="businessDescription"
                value={formData.businessDescription}
                onChange={(e) => updateFormData('businessDescription', e.target.value)}
                placeholder="Describe the services you provide..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL (Optional)</Label>
              <Input
                id="websiteUrl"
                value={formData.websiteUrl}
                onChange={(e) => updateFormData('websiteUrl', e.target.value)}
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>
        );
        
      case 5:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Bank Account Information</h3>
            </div>
            
            <div className="bg-green-50 dark:bg-green-950/50 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-600" />
                <p className="text-sm text-green-800 dark:text-green-300">
                  Your banking information is securely encrypted and processed by Stripe. This is where you'll receive payments.
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
              <Label htmlFor="accountType">Account Type</Label>
              <Select value={formData.bankAccount.accountType} onValueChange={(value: 'checking' | 'savings') => updateFormData('bankAccount.accountType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="routingNumber">Bank Routing Number *</Label>
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
        
      case 6:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Review & Verification</h3>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border">
              <h4 className="font-medium mb-2">Account Summary:</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
                <p><strong>Email:</strong> {formData.email}</p>
                <p><strong>Address:</strong> {formData.address.line1}, {formData.address.city}, {formData.address.state} {formData.address.postalCode}</p>
                <p><strong>Business Type:</strong> {formData.businessType === 'individual' ? 'Individual' : 'Company'}</p>
                <p><strong>Bank Account:</strong> ***{formData.bankAccount.accountNumber.slice(-4)} ({formData.bankAccount.accountType})</p>
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
                    and authorize Fixer to share your information with Stripe.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="identity"
                  checked={formData.identityConfirmed}
                  onCheckedChange={(checked) => updateFormData('identityConfirmed', checked)}
                />
                <div className="space-y-1">
                  <Label htmlFor="identity" className="text-sm font-medium">
                    I confirm my identity information is accurate *
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    All personal information provided is true and accurate to the best of my knowledge.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="business"
                  checked={formData.businessConfirmed}
                  onCheckedChange={(checked) => updateFormData('businessConfirmed', checked)}
                />
                <div className="space-y-1">
                  <Label htmlFor="business" className="text-sm font-medium">
                    I confirm my business information is accurate *
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Business details and banking information are correct and authorized for use.
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-6 w-6" />
              <span>Payment Account Setup</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round(progressPercent)}% Complete</span>
            </div>
            <Progress value={progressPercent} className="w-full" />
            
            <div className="flex justify-center space-x-2 mt-2">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i + 1}
                  className={`w-2 h-2 rounded-full ${
                    i + 1 <= currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
          
          <Card>
            <CardContent className="p-6">
              {renderStep()}
            </CardContent>
          </Card>
          
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={currentStep === 1 ? onClose : handleBack}
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StripeConnectModal;