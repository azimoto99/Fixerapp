import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2, DollarSign, Clock, ExternalLink, CreditCard } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
      const response = await apiRequest('GET', '/api/stripe/connect/onboarding-url');
      if (!response.ok) {
        throw new Error('Failed to get onboarding URL');
      }
      
      const data = await response.json();
      if (data.url) {
        // Open in new tab
        window.open(data.url, '_blank');
        
        toast({
          title: 'Setting up Stripe Connect',
          description: 'Complete the form in the new tab. You may need to refresh this page after completion.',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start Stripe Connect setup';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
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
    
    if (duration.includes('Less than 1 hour')) {
      hours = 0.5; // Assuming 30 minutes on average
    } else if (duration.includes('1-2 hours')) {
      hours = 1.5; // Midpoint
    } else if (duration.includes('2-4 hours')) {
      hours = 3; // Midpoint
    } else if (duration.includes('Half day')) {
      hours = 5; // Midpoint of 4-6 hours
    } else if (duration.includes('Full day')) {
      hours = 7; // Midpoint of 6-8 hours
    } else if (duration.includes('Multiple days')) {
      hours = 16; // Assuming 2 full days
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
            <Label htmlFor="message" className="font-medium">Cover Letter</Label>
            <Textarea
              id="message"
              placeholder={getMessagePlaceholder()}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="h-32 resize-none mt-1.5"
              disabled={isDisabled}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Introduce yourself and explain why you're a good fit for this job
            </p>
          </div>
          
          {/* Hourly rate */}
          <div>
            <Label htmlFor="hourlyRate" className="font-medium">Your Hourly Rate</Label>
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
            <p className="text-xs text-muted-foreground mt-1">
              Set your competitive hourly rate for this job
            </p>
          </div>
          
          {/* Expected duration */}
          <div>
            <Label htmlFor="expectedDuration" className="font-medium">Estimated Duration</Label>
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
            <p className="text-xs text-muted-foreground mt-1">
              How long do you expect this job to take?
            </p>
          </div>
          
          {/* Stripe Connect Account Alert */}
          {user && user.accountType === 'worker' && !isCheckingStripe && (
            <>
              {hasStripeAccount === false && (
                <Alert className="bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400">
                  <CreditCard className="h-4 w-4" />
                  <AlertTitle>Stripe Connect Required</AlertTitle>
                  <AlertDescription className="mt-1">
                    You need to set up a Stripe Connect account to receive payments for jobs.
                    <Button 
                      onClick={handleSetupStripeConnect} 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 border-yellow-500/50 hover:bg-yellow-500/10"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Set up Stripe Connect
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              {hasStripeAccount === true && (
                <Alert className="bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Stripe Connect Ready</AlertTitle>
                  <AlertDescription>
                    Your Stripe Connect account is set up and ready to receive payments.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {error && (
            <div className="bg-destructive/10 p-3 rounded-md text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>{error}</div>
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-2">
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            
            <Button 
              type="submit"
              disabled={isDisabled || (user?.accountType === 'worker' && hasStripeAccount === false)}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ApplicationForm;