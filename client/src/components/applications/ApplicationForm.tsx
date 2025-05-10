import React, { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await apiRequest('POST', '/api/applications', {
        jobId,
        workerId: user.id,
        message: message.trim() || null
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
  
  // Create a function to check for Stripe Connect account
  const checkStripeConnectStatus = async (): Promise<boolean> => {
    try {
      // Check if user has a Stripe Connect account
      const res = await apiRequest('GET', '/api/stripe/connect/account-status');
      
      if (!res.ok) {
        return false;
      }
      
      const accountStatus = await res.json();
      return accountStatus && accountStatus.accountStatus === 'active';
    } catch (error) {
      console.error('Failed to check Stripe Connect status:', error);
      return false;
    }
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
  
  return (
    <div className={className}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-3">
          <div>
            <Label htmlFor="message">Application Message</Label>
            <Textarea
              id="message"
              placeholder={getMessagePlaceholder()}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="h-32 resize-none mt-1.5"
              disabled={isSubmitting || !user || user.accountType !== 'worker'}
            />
          </div>
          
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
              disabled={isSubmitting || !user || user.accountType !== 'worker'}
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