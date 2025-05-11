import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertCircle, CheckCircle, User, DollarSign } from 'lucide-react';

// Define the form schema
const transferSchema = z.object({
  workerId: z.number().optional(),
  jobId: z.number().optional(),
  amount: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().min(1, { message: 'Amount must be greater than 0' })
  ),
  description: z.string().min(3, { message: 'Description must be at least 3 characters' }),
  sourceType: z.enum(['balance', 'payment_intent']),
});

type TransferFormValues = z.infer<typeof transferSchema>;

interface StripeTransferFormProps {
  workerId?: number;
  jobId?: number;
  initialAmount?: number;
  onSuccess?: () => void;
}

export default function StripeTransferForm({
  workerId,
  jobId,
  initialAmount = 0,
  onSuccess,
}: StripeTransferFormProps) {
  const [transferSuccess, setTransferSuccess] = useState(false);
  const { toast } = useToast();
  
  // Get workers for dropdown
  const { data: workers, isLoading: isLoadingWorkers } = useQuery({
    queryKey: ['/api/users/workers'],
    queryFn: async () => {
      if (workerId) return { data: [] }; // If workerId is provided, no need to fetch workers
      
      const res = await apiRequest('GET', '/api/users/workers');
      if (!res.ok) {
        if (res.status === 404) return { data: [] };
        throw new Error('Failed to fetch workers');
      }
      return res.json();
    },
    enabled: !workerId, // Only fetch if workerId is not provided
  });
  
  // Get jobs for dropdown
  const { data: jobs, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['/api/jobs', { status: 'completed' }],
    queryFn: async () => {
      if (jobId) return { data: [] }; // If jobId is provided, no need to fetch jobs
      
      const res = await apiRequest('GET', '/api/jobs?status=completed');
      if (!res.ok) {
        if (res.status === 404) return { data: [] };
        throw new Error('Failed to fetch jobs');
      }
      return res.json();
    },
    enabled: !jobId, // Only fetch if jobId is not provided
  });
  
  // Get worker details if workerId is provided
  const { data: workerDetails, isLoading: isLoadingWorkerDetails } = useQuery({
    queryKey: ['/api/users', workerId],
    queryFn: async () => {
      if (!workerId) return null;
      
      const res = await apiRequest('GET', `/api/users/${workerId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch worker details');
      }
      return res.json();
    },
    enabled: !!workerId,
  });
  
  // Create form with default values
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      workerId: workerId || undefined,
      jobId: jobId || undefined,
      amount: initialAmount || undefined,
      description: jobId ? `Payment for Job #${jobId}` : 'Worker payment',
      sourceType: 'balance',
    },
  });
  
  // Create direct transfer mutation
  const createTransferMutation = useMutation({
    mutationFn: async (values: TransferFormValues) => {
      const res = await apiRequest('POST', '/api/stripe/transfers/direct', values);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create transfer');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setTransferSuccess(true);
      toast({
        title: 'Transfer Successful',
        description: 'Payment has been sent to the worker',
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/transfers'] });
      if (jobId) {
        queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId] });
      }
      if (workerId) {
        queryClient.invalidateQueries({ queryKey: ['/api/earnings', { workerId }] });
      }
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Transfer Failed',
        description: error.message || 'Failed to send payment to worker',
        variant: 'destructive',
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (values: TransferFormValues) => {
    // Include the workerId if it's provided as a prop but not selected in the form
    if (workerId && !values.workerId) {
      values.workerId = workerId;
    }
    
    // Include the jobId if it's provided as a prop but not selected in the form
    if (jobId && !values.jobId) {
      values.jobId = jobId;
    }
    
    createTransferMutation.mutate(values);
  };
  
  // Loading state
  const isLoading = isLoadingWorkers || isLoadingJobs || isLoadingWorkerDetails;
  
  // If transfer was successful, show success message
  if (transferSuccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            Transfer Successful
          </CardTitle>
          <CardDescription>
            Your payment to the worker has been processed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The worker will be notified of this payment. The funds will be available in their Stripe Connect account.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => setTransferSuccess(false)} variant="outline" className="w-full">
            Send Another Payment
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // Render the form
  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Payment to Worker</CardTitle>
        <CardDescription>
          Transfer funds directly to a worker's account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : workerDetails?.stripeConnectAccountId ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {!workerId && (
                <FormField
                  control={form.control}
                  name="workerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Worker</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a worker" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {workers?.data?.map((worker: any) => (
                            <SelectItem key={worker.id} value={worker.id.toString()}>
                              {worker.fullName || worker.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the worker to send payment to
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {workerId && workerDetails && (
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-primary/10 rounded-full p-2">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">{workerDetails.fullName || workerDetails.username}</h4>
                    <p className="text-sm text-muted-foreground">
                      {workerDetails.email}
                    </p>
                  </div>
                </div>
              )}
              
              {!jobId && (
                <FormField
                  control={form.control}
                  name="jobId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job (Optional)</FormLabel>
                      <Select
                        value={field.value?.toString() || ''}
                        onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a job" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No specific job</SelectItem>
                          {jobs?.data?.map((job: any) => (
                            <SelectItem key={job.id} value={job.id.toString()}>
                              {job.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Optionally link this payment to a specific job
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
                      <div className="relative">
                        <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          step="0.01"
                          placeholder="0.00"
                          className="pl-8"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Enter the amount to transfer in USD
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
                        placeholder="Payment description"
                      />
                    </FormControl>
                    <FormDescription>
                      Add a description for this payment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="sourceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Source</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="balance">From Your Stripe Balance</SelectItem>
                        <SelectItem value="payment_intent">Create New Payment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose how you want to fund this transfer
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {createTransferMutation.isError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {createTransferMutation.error instanceof Error
                      ? createTransferMutation.error.message
                      : 'An unexpected error occurred'
                    }
                  </AlertDescription>
                </Alert>
              )}
              
              <Button
                type="submit"
                disabled={createTransferMutation.isPending || !form.formState.isValid}
                className="w-full"
              >
                {createTransferMutation.isPending ? (
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
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Stripe Connect Required</AlertTitle>
            <AlertDescription>
              The worker needs to set up their Stripe Connect account before they can receive payments.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}