import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import PaymentHistory from '@/components/payments/PaymentHistory';
import StripeTransferForm from '@/components/payments/StripeTransferForm';
import JobPaymentForm from '@/components/payments/JobPaymentForm';
import PaymentMethodsManager from '@/components/payments/PaymentMethodsManager';
import StripeConnectSetup from '@/components/stripe/StripeConnectSetup';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, CreditCard, Send, History, BadgeDollarSign, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState('payment-methods');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Fetch current user data
  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/user');
      if (!res.ok) {
        if (res.status === 401) {
          // Not authenticated, redirect to login
          setLocation('/login');
          return null;
        }
        throw new Error('Failed to fetch user data');
      }
      return res.json();
    }
  });
  
  // Check if the user is authenticated for using Stripe
  const { data: stripeAuthData, isLoading: isLoadingStripeAuth } = useQuery({
    queryKey: ['/api/stripe/check-auth'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/stripe/check-auth');
      if (!res.ok) {
        throw new Error('Failed to check Stripe authentication status');
      }
      return res.json();
    }
  });
  
  // Determine if user can accept payments (worker role with Stripe Connect)
  const canAcceptPayments = userData?.accountType === 'worker' || userData?.accountType === 'both';
  
  // If still loading, show spinner
  if (isLoadingUser || isLoadingStripeAuth) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // If not authenticated, redirect to login page
  if (!userData || !stripeAuthData?.authenticated) {
    setLocation('/login');
    return null;
  }
  
  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Payment Management</h1>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 mb-8">
          <TabsTrigger value="payment-methods">
            <CreditCard className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Payment Methods</span>
            <span className="md:hidden">Methods</span>
          </TabsTrigger>
          <TabsTrigger value="payment-history">
            <History className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Payment History</span>
            <span className="md:hidden">History</span>
          </TabsTrigger>
          <TabsTrigger value="send-payment">
            <Send className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Send Payment</span>
            <span className="md:hidden">Send</span>
          </TabsTrigger>
          {canAcceptPayments && (
            <TabsTrigger value="receive-payments">
              <BadgeDollarSign className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Receive Payments</span>
              <span className="md:hidden">Receive</span>
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="payment-methods" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage Payment Methods</CardTitle>
              <CardDescription>
                Add, remove, or update your payment methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentMethodsManager userId={userData.id} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payment-history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                View your payment history and transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentHistory userId={userData.id} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="send-payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Send Payment</CardTitle>
              <CardDescription>
                Send a payment to a worker or pay for a job
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="job-payment" className="w-full">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="job-payment">Pay for a Job</TabsTrigger>
                  <TabsTrigger value="worker-payment">Pay a Worker</TabsTrigger>
                </TabsList>
                
                <TabsContent value="job-payment">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Enter the job ID and payment details to pay for a completed job.
                    </p>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button>Pay for a Job</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Job Payment</AlertDialogTitle>
                          <AlertDialogDescription>
                            Enter the job ID to proceed with payment.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        
                        <div className="py-4">
                          {/* Dynamic job payment form with job selector */}
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              Select a job to pay for:
                            </p>
                            <JobPaymentForm 
                              onSuccess={() => {
                                toast({
                                  title: "Payment Successful",
                                  description: "Your payment has been processed successfully.",
                                });
                              }}
                            />
                          </div>
                        </div>
                        
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TabsContent>
                
                <TabsContent value="worker-payment">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Send a direct payment to a worker.
                    </p>
                    
                    <StripeTransferForm
                      onSuccess={() => {
                        toast({
                          title: "Transfer Successful",
                          description: "Your payment has been sent to the worker.",
                        });
                      }}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
        
        {canAcceptPayments && (
          <TabsContent value="receive-payments" className="space-y-6">
            <StripeConnectSetup />
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Recent Earnings</CardTitle>
                <CardDescription>
                  View your recent earnings and payment transfers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentHistory workerId={userData.id} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}