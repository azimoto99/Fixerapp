import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Form schema for transfers
const transferFormSchema = z.object({
  workerId: z.number().int().positive('Worker ID is required'),
  jobId: z.number().int().positive('Job ID is required').optional(),
  amount: z.number().min(5, 'Minimum transfer amount is $5'),
  description: z.string().min(3, 'Please provide a brief description').max(255),
});

type TransferFormValues = z.infer<typeof transferFormSchema>;

interface StripeTransferFormProps {
  workerId?: number;
  jobId?: number;
  workerName?: string;
  jobTitle?: string;
  initialAmount?: number;
  onSuccess?: () => void;
  compact?: boolean;
}

/**
 * StripeTransferForm
 * 
 * A component for transferring funds to a worker's Stripe Connect account
 */
export default function StripeTransferForm({
  workerId,
  jobId,
  workerName,
  jobTitle,
  initialAmount,
  onSuccess,
  compact = false
}: StripeTransferFormProps) {
  const { toast } = useToast();
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [workerDisplayName, setWorkerDisplayName] = useState(workerName || 'Worker');
  
  // Get worker details if not provided
  const { data: workerData, isLoading: isLoadingWorker } = useQuery({
    queryKey: workerId ? ['/api/users', workerId] : null,
    queryFn: async () => {
      if (!workerId) return null;
      const res = await apiRequest('GET', `/api/users/${workerId}`);
      if (!res.ok) throw new Error('Failed to fetch worker details');
      return res.json();
    },
    enabled: !!workerId && !workerName,
    onSuccess: (data) => {
      if (data) {
        setWorkerDisplayName(data.fullName || data.username || 'Worker');
      }
    }
  });
  
  // Get job details if not provided
  const { data: jobData, isLoading: isLoadingJob } = useQuery({
    queryKey: jobId ? ['/api/jobs', jobId] : null,
    queryFn: async () => {
      if (!jobId) return null;
      const res = await apiRequest('GET', `/api/jobs/${jobId}`);
      if (!res.ok) throw new Error('Failed to fetch job details');
      return res.json();
    },
    enabled: !!jobId && !jobTitle,
  });
  
  // Define form with default values
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      workerId: workerId || 0,
      jobId: jobId || undefined,
      amount: initialAmount || 0,
      description: jobTitle ? `Payment for ${jobTitle}` : 'Payment for services',
    },
  });
  
  // Update form values when props change
  React.useEffect(() => {
    if (workerId) {
      form.setValue('workerId', workerId);
    }
    if (jobId) {
      form.setValue('jobId', jobId);
    }
    if (initialAmount) {
      form.setValue('amount', initialAmount);
    }
    if (jobTitle) {
      form.setValue('description', `Payment for ${jobTitle}`);
    }
  }, [workerId, jobId, initialAmount, jobTitle, form]);
  
  // Create transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (data: TransferFormValues) => {
      const res = await apiRequest('POST', '/api/stripe/transfers/create', data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to process transfer');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setTransferSuccess(true);
      
      toast({
        title: 'Payment Successful',
        description: `Successfully transferred ${formatCurrency(data.amount)} to ${workerDisplayName}`,
        variant: 'default',
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      if (jobId) {
        queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId] });
        queryClient.invalidateQueries({ queryKey: ['/api/payments/job', jobId] });
      }
      if (workerId) {
        queryClient.invalidateQueries({ queryKey: ['/api/payments/worker', workerId] });
      }
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Transfer Failed',
        description: error.message || 'Failed to process transfer',
        variant: 'destructive',
      });
    }
  });
  
  // Handle form submission
  const onSubmit = (values: TransferFormValues) => {
    transferMutation.mutate(values);
  };
  
  // If transfer was successful, show success message
  if (transferSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="flex flex-col items-center text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
          <CardTitle>Payment Successful</CardTitle>
          <CardDescription>
            Your payment has been sent to {workerDisplayName}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-2xl font-bold">
            {formatCurrency(form.getValues().amount)}
          </p>
          <p className="text-muted-foreground">
            {form.getValues().description}
          </p>
          {jobData && (
            <div className="flex justify-center">
              <Badge variant="outline" className="text-sm">
                Job: {jobData.title}
              </Badge>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => setTransferSuccess(false)} variant="outline">
            Make Another Payment
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // Compact version for embedding in other components
  if (compact) {
    return (
      <div className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center space-x-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="Amount"
                        value={field.value || ''}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit"
                disabled={transferMutation.isPending || !form.formState.isValid}
              >
                {transferMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>Pay <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    );
  }
  
  // Full version with all form fields
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Send Payment to Worker</CardTitle>
        <CardDescription>
          Transfer funds to {workerDisplayName}'s connected account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!workerId && (
              <FormField
                control={form.control}
                name="workerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Worker ID</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        value={field.value || ''}
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {!jobId && (
              <FormField
                control={form.control}
                name="jobId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job ID (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        value={field.value || ''}
                        onChange={e => {
                          const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Link this payment to a specific job
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      value={field.value || ''}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    The amount to transfer in USD
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Enter payment description"
                    />
                  </FormControl>
                  <FormDescription>
                    This will appear on the worker's statement
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {transferMutation.isError && (
              <div className="rounded-md bg-destructive/10 p-3 text-destructive flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <div>{transferMutation.error.message}</div>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={transferMutation.isPending || !form.formState.isValid}
            >
              {transferMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Send Payment'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}