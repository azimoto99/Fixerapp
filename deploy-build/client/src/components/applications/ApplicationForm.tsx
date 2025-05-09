import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Loader2, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Define the form schema
const applicationFormSchema = z.object({
  message: z.string()
    .min(10, 'Your message should be at least 10 characters')
    .max(1000, 'Your message exceeds the maximum length of 1000 characters'),
});

type ApplicationFormValues = z.infer<typeof applicationFormSchema>;

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
  const [error, setError] = useState<string | null>(null);

  // Initialize form with default values
  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      message: '',
    },
  });

  // Create application mutation
  const createApplicationMutation = useMutation({
    mutationFn: async (values: ApplicationFormValues) => {
      if (!user) {
        throw new Error('You must be logged in to apply for a job');
      }

      const applicationData = {
        jobId,
        workerId: user.id,
        message: values.message,
      };

      const res = await apiRequest('POST', '/api/applications', applicationData);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to submit application');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Application Submitted',
        description: 'Your job application has been submitted successfully.',
      });
      
      // Invalidate applications query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/applications/worker'] });
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: 'Application Failed',
        description: `Failed to submit application: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Form submission handler
  const onSubmit = async (values: ApplicationFormValues) => {
    setError(null);
    await createApplicationMutation.mutateAsync(values);
  };

  return (
    <div className={className}>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Message</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Introduce yourself and explain why you're a good fit for this job..."
                    className="min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Provide details about your experience and why you're interested in this job.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex justify-between pt-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={createApplicationMutation.isPending}
              >
                Cancel
              </Button>
            )}
            
            <Button
              type="submit"
              disabled={createApplicationMutation.isPending}
              className={onCancel ? '' : 'ml-auto'}
            >
              {createApplicationMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ApplicationForm;