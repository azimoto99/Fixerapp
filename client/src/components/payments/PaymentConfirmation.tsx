import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  CreditCard, 
  CheckCircle, 
  Clock, 
  CalendarClock,
  Ban,
  DollarSign,
  CreditCardIcon,
  AlertCircle,
  ChevronRight,
  ArrowRight,
  RefreshCcw,
  Shield
} from 'lucide-react';

interface PaymentConfirmationProps {
  jobId: number;
  applicationId: number;
  workerId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function PaymentConfirmation({
  jobId,
  applicationId,
  workerId,
  onSuccess,
  onCancel
}: PaymentConfirmationProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('saved');

  // Fetch job data
  const { 
    data: job, 
    isLoading: isLoadingJob,
    error: jobError
  } = useQuery({
    queryKey: ['/api/jobs', jobId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }
      return response.json();
    }
  });

  // Fetch application data
  const {
    data: application,
    isLoading: isLoadingApplication,
    error: applicationError
  } = useQuery({
    queryKey: ['/api/applications', applicationId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/applications/${applicationId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch application details');
      }
      return response.json();
    }
  });

  // Fetch saved payment methods
  const {
    data: paymentMethods,
    isLoading: isLoadingPaymentMethods,
    error: paymentMethodsError,
    refetch: refetchPaymentMethods
  } = useQuery({
    queryKey: ['/api/payment-methods'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/stripe/payment-methods');
      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }
      return response.json();
    }
  });

  // Mutation for processing payment
  const processPaymentMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      const response = await apiRequest('POST', '/api/payments/process', {
        jobId,
        applicationId,
        workerId,
        paymentMethodId: selectedPaymentMethod
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process payment');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Payment processed',
        description: 'Your payment has been successfully processed and the worker has been hired.',
      });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: 'Payment failed',
        description: error instanceof Error ? error.message : 'Failed to process payment',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  // Calculate estimated cost
  const calculateEstimatedCost = (): number => {
    if (!application?.hourlyRate || !application?.expectedDuration) {
      return 0;
    }
    
    let hours = 0;
    const duration = application.expectedDuration;
    
    if (duration.includes('Less than 1 hour')) {
      hours = 0.5;
    } else if (duration.includes('1-2 hours')) {
      hours = 1.5;
    } else if (duration.includes('2-4 hours')) {
      hours = 3;
    } else if (duration.includes('Half day')) {
      hours = 5;
    } else if (duration.includes('Full day')) {
      hours = 7;
    } else if (duration.includes('Multiple days')) {
      hours = 16;
    }
    
    return application.hourlyRate * hours;
  };

  const estimatedCost = application ? calculateEstimatedCost() : 0;
  const serviceFee = estimatedCost * 0.1; // 10% service fee
  const totalAmount = estimatedCost + serviceFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPaymentMethod) {
      toast({
        title: 'Payment method required',
        description: 'Please select a payment method to continue',
        variant: 'destructive',
      });
      return;
    }
    
    processPaymentMutation.mutate();
  };

  if (isLoadingJob || isLoadingApplication) {
    return (
      <div className="flex justify-center items-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (jobError || applicationError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {jobError instanceof Error ? jobError.message : 
           applicationError instanceof Error ? applicationError.message : 
           'Failed to load required data'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Confirmation</CardTitle>
          <CardDescription>
            Complete your payment to hire {application?.workerName} for your job
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Job & Application summary */}
            <div className="border rounded-lg p-4 bg-muted/40">
              <h3 className="font-medium text-sm mb-2">Job Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Job Title:</span>
                  <span className="font-medium">{job?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Worker:</span>
                  <span className="font-medium">{application?.workerName}</span>
                </div>
                {application?.hourlyRate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hourly Rate:</span>
                    <span className="font-medium">${application.hourlyRate.toFixed(2)}/hr</span>
                  </div>
                )}
                {application?.expectedDuration && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected Duration:</span>
                    <span className="font-medium">{application.expectedDuration}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment breakdown */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-sm mb-3">Payment Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Worker Payment:</span>
                  <span>${estimatedCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Fee (10%):</span>
                  <span>${serviceFee.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                  <span>Total Amount:</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment method selection */}
            <div>
              <h3 className="font-medium text-sm mb-3">Select Payment Method</h3>
              
              <Tabs defaultValue="saved" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="saved">Saved Cards</TabsTrigger>
                  <TabsTrigger value="new">Add New Card</TabsTrigger>
                </TabsList>
                
                <TabsContent value="saved" className="space-y-4 pt-4">
                  {isLoadingPaymentMethods ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : paymentMethodsError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        Failed to load your saved payment methods
                      </AlertDescription>
                    </Alert>
                  ) : paymentMethods?.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground text-sm">You don't have any saved payment methods</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => setActiveTab('new')}
                      >
                        Add a new card
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paymentMethods?.map((method: any) => (
                        <div
                          key={method.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            selectedPaymentMethod === method.id 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedPaymentMethod(method.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="bg-muted/70 p-2 rounded-full">
                                <CreditCardIcon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium">
                                  •••• {method.card.last4}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Expires {method.card.exp_month}/{method.card.exp_year}
                                </p>
                              </div>
                            </div>
                            <div>
                              {selectedPaymentMethod === method.id && (
                                <CheckCircle className="h-5 w-5 text-primary" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex items-center justify-center mt-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => refetchPaymentMethods()}
                          className="text-xs"
                        >
                          <RefreshCcw className="mr-1 h-3 w-3" />
                          Refresh payment methods
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="new" className="space-y-4 pt-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Note</AlertTitle>
                    <AlertDescription>
                      Adding a new card functionality will redirect you to a secure page. 
                      After adding your card, you'll return to this payment confirmation.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex justify-center">
                    <Button>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Add New Card
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            {/* Security notice */}
            <div className="text-xs text-muted-foreground flex items-center justify-center space-x-1 pt-2">
              <Shield className="h-3 w-3" />
              <span>Your payment is secure and protected</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedPaymentMethod || isProcessing}
            className="min-w-[120px]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Pay ${totalAmount.toFixed(2)}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}