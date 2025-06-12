import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2, DollarSign, Clock, ExternalLink, CreditCard, MessageSquare, CheckCircle2, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface ApplicationFormProps {
  jobId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

const ApplicationForm: React.FC<ApplicationFormProps> = ({ 
  jobId, 
  onSuccess, 
  onCancel,
  className = '', 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [expectedDuration, setExpectedDuration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStripeAccount, setHasStripeAccount] = useState<boolean | null>(null);
  const [isCheckingStripe, setIsCheckingStripe] = useState<boolean>(false);
  
  // Helper function to check Stripe Connect status
  const checkStripeConnectStatus = async (): Promise<boolean> => {
    try {
      const response = await apiRequest('GET', '/api/stripe/connect/account-status');
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return data.exists === true && data.details?.payoutsEnabled === true;
    } catch (error) {
      console.error('Error checking Stripe account:', error);
      return false;
    }
  };

  // Check for Stripe Connect account on component mount
  useEffect(() => {
    if (user && user.accountType === 'worker') {
      setIsCheckingStripe(true);
      checkStripeConnectStatus()
        .then(hasAccount => {
          setHasStripeAccount(hasAccount);
        })
        .catch(err => {
          console.error('Error checking Stripe account:', err);
          setHasStripeAccount(false);
        })
        .finally(() => {
          setIsCheckingStripe(false);
        });
    }
  }, [user]);
  
  // Function to redirect to Stripe Connect onboarding
  const handleSetupStripeConnect = async () => {
    try {
      setIsCheckingStripe(true);
      const response = await apiRequest('POST', '/api/stripe/connect/create-account', {});
      if (!response.ok) {
        throw new Error('Failed to create Stripe Connect account');
      }
      
      const data = await response.json();
      const url = data.accountLinkUrl || data.url;
      if (url) {
        // Open in new tab
        window.open(url, '_blank');
        toast({
          title: 'Setting up Stripe Connect',
          description: 'Complete the form in the new tab. You may need to refresh this page after completion.',
        });
        // Set a timeout to check again for the account after some time
        setTimeout(() => {
          checkStripeConnectStatus()
            .then(hasAccount => {
              setHasStripeAccount(hasAccount);
              if (hasAccount) {
                toast({
                  title: 'Stripe Connect Setup Complete',
                  description: 'Your payment account is now ready. You can proceed with your application.',
                });
              }
            })
            .catch(err => {
              console.error('Error re-checking Stripe account:', err);
            })
            .finally(() => {
              setIsCheckingStripe(false);
            });
        }, 5000); // Check after 5 seconds
      } else {
        throw new Error('No onboarding URL received from server');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start Stripe Connect setup';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setIsCheckingStripe(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to apply for jobs');
      return;
    }
    
    if (user.accountType !== 'worker') {
      setError('Only worker accounts can apply for jobs');
      return;
    }
    
    // Basic validation
    if (!message.trim()) {
      setError('Please provide a cover letter to introduce yourself');
      return;
    }

    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate <= 0) {
      setError('Please enter a valid hourly rate');
      return;
    }
    
    if (!expectedDuration) {
      setError('Please estimate how long the job will take');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Check for Stripe Connect account first
      const hasConnectAccount = await checkStripeConnectStatus();
      
      if (!hasConnectAccount) {
        // Redirect to Connect account setup page or show a specific error
        toast({
          title: 'Stripe Connect Required',
          description: 'You need to set up your payment account before applying for jobs. Go to your profile to set up Stripe Connect.',
          variant: 'destructive',
        });
        
        setError('You need to set up your Stripe Connect account to receive payments before applying for jobs.');
        setIsSubmitting(false);
        return;
      }
      
      const response = await apiRequest('POST', '/api/applications', {
        jobId,
        workerId: user.id,
        message: message.trim(),
        hourlyRate: rate,
        expectedDuration
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit application');
      }
      
      toast({
        title: 'Application Submitted',
        description: 'Your job application has been submitted successfully!',
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      toast({
        title: 'Application Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const calculateEstimatedCost = (hourlyRate: number, duration: string): number => {
    let hours = 0;
    
    // Map duration selections to estimated hours
    const durationMap: Record<string, number> = {
      'Less than 1 hour': 0.5,        // 30 minutes average
      '1-2 hours': 1.5,               // Midpoint
      '2-4 hours': 3,                 // Midpoint
      'Half day (4-6 hours)': 5,      // Midpoint
      'Full day (6-8 hours)': 7,      // Midpoint
      'Multiple days': 16             // Estimate for 2 days
    };
    
    // Use exact matches from the map to avoid string.includes issues
    if (duration in durationMap) {
      hours = durationMap[duration];
    } else {
      // Fallback for any non-exact matches
      for (const [key, value] of Object.entries(durationMap)) {
        if (duration.includes(key)) {
          hours = value;
          break;
        }
      }
    }
    
    return hourlyRate * hours;
  };
  
  // Helper to get placeholder text based on current context
  const getMessagePlaceholder = () => {
    if (!user) {
      return 'Please login to apply for this job';
    }
    
    if (user.accountType !== 'worker') {
      return 'Only worker accounts can apply for jobs';
    }
    
    return 'Introduce yourself and explain why you\'re a good fit for this job. Include any relevant experience or qualifications.';
  };

  const isDisabled = isSubmitting || !user || user.accountType !== 'worker';
  
  return (
    <div className={className}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Cover letter message */}
          <div>
            <Label htmlFor="message" className="font-medium flex items-center">
              Cover Letter 
              <span className="text-xs ml-2 font-normal text-muted-foreground">(Required)</span>
            </Label>
            <Textarea
              id="message"
              placeholder={getMessagePlaceholder()}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="h-32 resize-none mt-1.5"
              disabled={isDisabled}
            />
            <div className="mt-2 flex items-start gap-2">
              <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                <MessageSquare className="h-3 w-3 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  A good cover letter increases your chances of being hired. Introduce yourself, mention relevant experience, and explain why you're interested in this specific job.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {message.length === 0 ? (
                    <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
                      Empty letter
                    </Badge>
                  ) : message.length < 50 ? (
                    <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">
                      Too short
                    </Badge>
                  ) : message.length > 50 && message.length < 150 ? (
                    <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">
                      Good start
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-green-500 border-green-500/30">
                      Great length
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {message.length} characters
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          {/* Payment details section with border */}
          <div className="border rounded-md p-4 bg-muted/5 space-y-4">
            <h3 className="text-sm font-medium">Payment Details</h3>
            
            {/* Hourly rate */}
            <div>
              <Label htmlFor="hourlyRate" className="font-medium flex items-center">
                Your Hourly Rate
                <span className="text-xs ml-2 font-normal text-muted-foreground">(Required)</span>
              </Label>
              <div className="relative mt-1.5">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="hourlyRate"
                  type="number"
                  placeholder="25.00"
                  min="1"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="pl-10"
                  disabled={isDisabled}
                />
              </div>
              <div className="flex items-center mt-2">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    Set a competitive hourly rate based on the job requirements
                  </p>
                </div>
                <div>
                  {hourlyRate && (
                    <Badge variant={
                      parseFloat(hourlyRate) < 15 ? "outline" : 
                      parseFloat(hourlyRate) > 50 ? "secondary" : 
                      "default"
                    } className="text-xs">
                      {parseFloat(hourlyRate) < 15 ? "Budget" : 
                       parseFloat(hourlyRate) > 50 ? "Premium" : 
                       "Standard"} Rate
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {/* Expected duration */}
            <div>
              <Label htmlFor="expectedDuration" className="font-medium flex items-center">
                Estimated Duration
                <span className="text-xs ml-2 font-normal text-muted-foreground">(Required)</span>
              </Label>
              <div className="relative mt-1.5">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Select 
                  value={expectedDuration} 
                  onValueChange={setExpectedDuration}
                  disabled={isDisabled}
                >
                  <SelectTrigger className="pl-10">
                    <SelectValue placeholder="Select estimated duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Less than 1 hour">Less than 1 hour</SelectItem>
                    <SelectItem value="1-2 hours">1-2 hours</SelectItem>
                    <SelectItem value="2-4 hours">2-4 hours</SelectItem>
                    <SelectItem value="Half day (4-6 hours)">Half day (4-6 hours)</SelectItem>
                    <SelectItem value="Full day (6-8 hours)">Full day (6-8 hours)</SelectItem>
                    <SelectItem value="Multiple days">Multiple days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                A realistic time estimate helps set expectations for the job poster
              </p>
            </div>
          </div>
          
          {/* Estimated job cost calculator */}
          {hourlyRate && expectedDuration && (
            <div className="mt-4 p-4 bg-primary/5 border border-primary/10 rounded-lg">
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <DollarSign className="h-4 w-4 mr-1.5 text-primary" />
                Estimated Job Value
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Hourly Rate</p>
                  <p className="font-medium">${parseFloat(hourlyRate).toFixed(2)}/hr</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">{expectedDuration}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Service Fee (5%)</p>
                  <p className="font-medium">
                    ${(calculateEstimatedCost(parseFloat(hourlyRate), expectedDuration) * 0.05).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Your Earnings</p>
                  <p className="font-medium text-primary">
                    ${(calculateEstimatedCost(parseFloat(hourlyRate), expectedDuration) * 0.9).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Stripe Connect Account Setup Section */}
          {user && user.accountType === 'worker' && (
            <div className="border rounded-md bg-muted/5 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-800/20 dark:via-purple-800/20 dark:to-pink-800/20 p-0.5">
                <div className="bg-background rounded-t-sm px-4 py-3 flex justify-between items-center">
                  <h3 className="font-medium flex items-center">
                    <CreditCard className="h-4 w-4 mr-2 text-primary" />
                    Payment Account Setup
                  </h3>
                  {hasStripeAccount === true && (
                    <Badge variant="green" className="px-2 py-0.5">Verified</Badge>
                  )}
                </div>
              </div>
              
              <div className="p-4">
                {isCheckingStripe ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                    <span className="text-sm">Checking payment account status...</span>
                  </div>
                ) : (
                  <>
                    {hasStripeAccount === false ? (
                      <div className="space-y-3">
                        <div className="text-sm space-y-1.5">
                          <p className="font-medium text-yellow-600 dark:text-yellow-400">Stripe Connect Required</p>
                          <p className="text-muted-foreground">You need to set up a Stripe Connect account to receive payments for jobs. It only takes a few minutes to complete.</p>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm rounded-md bg-yellow-50 dark:bg-yellow-950/30 p-2.5 border border-yellow-200 dark:border-yellow-900">
                          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                          <span className="flex-1">Without a Stripe account, you won't be able to submit applications or get paid.</span>
                        </div>
                        
                        <Button 
                          onClick={handleSetupStripeConnect} 
                          variant="default" 
                          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-none"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Set up your payment account
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-full text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div className="space-y-1 flex-1">
                          <p className="font-medium text-green-600 dark:text-green-400">Payment Account Verified</p>
                          <p className="text-sm text-muted-foreground">Your Stripe Connect account is active and ready to receive payments. You'll receive earnings directly to your connected bank account.</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 p-3 rounded-md text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>{error}</div>
            </div>
          )}
          
          {/* Form actions with enhanced submit button */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 mt-2">
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={isSubmitting}
                className="sm:order-1 order-2"
              >
                Cancel
              </Button>
            )}
            
            <Button 
              type="submit"
              disabled={isDisabled || (user?.accountType === 'worker' && hasStripeAccount === false)}
              className={`${onCancel ? 'sm:order-2 order-1' : ''} relative overflow-hidden group ${
                isDisabled || (user?.accountType === 'worker' && hasStripeAccount === false) 
                  ? 'opacity-50' 
                  : 'bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700'
              }`}
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <span className="relative z-10 flex items-center">
                    <Send className="h-4 w-4 mr-2" />
                    Submit Application
                  </span>
                  <span className="absolute inset-0 bg-white/10 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </>
              )}
            </Button>
          </div>
          
          {/* Additional note if Stripe account isn't set up */}
          {user?.accountType === 'worker' && hasStripeAccount === false && (
            <div className="text-center mt-3">
              <p className="text-xs text-muted-foreground">
                You must set up your Stripe Connect account before you can apply for jobs
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default ApplicationForm;