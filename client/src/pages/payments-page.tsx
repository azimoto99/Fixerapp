import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import PaymentHistory from '@/components/payments/PaymentHistory';
import StripeTransferForm from '@/components/payments/StripeTransferForm';
import JobPaymentForm from '@/components/payments/JobPaymentForm';
import PaymentMethodsManager from '@/components/payments/PaymentMethodsManager';
import StripeConnectSetupV2 from '@/components/stripe/StripeConnectSetupV2';
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
import { 
  Loader2, 
  CreditCard, 
  Send, 
  History, 
  BadgeDollarSign, 
  AlertCircle, 
  ArrowRight,
  Wallet,
  RefreshCw,
  CheckCircle2,
  Clock,
  BanknoteIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';

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
    <div className="bg-background min-h-screen flex flex-col">
      <Header />
      
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payment Center</h1>
            <p className="text-muted-foreground mt-1">Manage your payments, methods, and transactions</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Payment stats overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
                  <h3 className="text-2xl font-bold mt-1">$240.00</h3>
                  <p className="text-xs text-muted-foreground mt-1">Last updated today</p>
                </div>
                <div className="bg-primary/10 rounded-full p-3">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payments Received</p>
                  <h3 className="text-2xl font-bold mt-1">$1,245.00</h3>
                  <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
                </div>
                <div className="bg-green-500/10 rounded-full p-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                  <h3 className="text-2xl font-bold mt-1">$85.50</h3>
                  <p className="text-xs text-muted-foreground mt-1">3 transactions pending</p>
                </div>
                <div className="bg-orange-500/10 rounded-full p-3">
                  <Clock className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="bg-card rounded-lg p-1 mb-6">
            <TabsList className="w-full grid grid-cols-2 md:grid-cols-4">
              <TabsTrigger value="payment-methods" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <CreditCard className="h-4 w-4 mr-2" />
                <span className="hidden md:inline">Payment Methods</span>
                <span className="md:hidden">Methods</span>
              </TabsTrigger>
              <TabsTrigger value="payment-history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <History className="h-4 w-4 mr-2" />
                <span className="hidden md:inline">Payment History</span>
                <span className="md:hidden">History</span>
              </TabsTrigger>
              <TabsTrigger value="send-payment" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Send className="h-4 w-4 mr-2" />
                <span className="hidden md:inline">Send Payment</span>
                <span className="md:hidden">Send</span>
              </TabsTrigger>
              {canAcceptPayments && (
                <TabsTrigger value="receive-payments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <BadgeDollarSign className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Receive Payments</span>
                  <span className="md:hidden">Receive</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>
          
          <TabsContent value="payment-methods" className="space-y-6 mt-2">
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-primary" />
                  Payment Methods
                </CardTitle>
                <CardDescription>
                  Securely manage your payment cards and methods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentMethodsManager />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="payment-history" className="space-y-6 mt-2">
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl flex items-center">
                  <History className="h-5 w-5 mr-2 text-primary" />
                  Transaction History
                </CardTitle>
                <CardDescription>
                  View your complete payment history and receipts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentHistory />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="send-payment" className="space-y-6 mt-2">
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl flex items-center">
                  <Send className="h-5 w-5 mr-2 text-primary" />
                  Send Payment
                </CardTitle>
                <CardDescription>
                  Send payments to workers or for completed jobs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="job-payment" className="w-full">
                  <TabsList className="w-full mb-4 bg-muted/50">
                    <TabsTrigger value="job-payment">Pay for a Job</TabsTrigger>
                    <TabsTrigger value="worker-payment">Pay a Worker</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="job-payment">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="bg-primary/5 p-4 rounded-lg">
                          <h3 className="font-semibold flex items-center">
                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                            Why pay for jobs through Fixer?
                          </h3>
                          <ul className="mt-2 space-y-2 text-sm">
                            <li className="flex items-start">
                              <div className="rounded-full bg-green-500/10 p-1 mt-0.5 mr-2">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              </div>
                              <span>Secure payment processing</span>
                            </li>
                            <li className="flex items-start">
                              <div className="rounded-full bg-green-500/10 p-1 mt-0.5 mr-2">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              </div>
                              <span>Protection for both parties</span>
                            </li>
                            <li className="flex items-start">
                              <div className="rounded-full bg-green-500/10 p-1 mt-0.5 mr-2">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              </div>
                              <span>Automatic receipts and records</span>
                            </li>
                          </ul>
                        </div>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button className="w-full">
                              <BanknoteIcon className="h-4 w-4 mr-2" />
                              Pay for a Job
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Job Payment</AlertDialogTitle>
                              <AlertDialogDescription>
                                Select a job and enter payment details below.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            
                            <div className="py-4">
                              <JobPaymentForm 
                                job={{
                                  id: 1,
                                  title: "Test Job",
                                  description: "Test payment",
                                  paymentAmount: 100,
                                  category: "test",
                                  location: "Test Location",
                                  latitude: 0,
                                  longitude: 0,
                                  dateNeeded: new Date().toISOString(),
                                  status: "open",
                                  // Add missing required properties
                                  location_encrypted: null,
                                  posterId: userData.id,
                                  workerId: null,
                                  paymentType: "fixed",
                                  serviceFee: 0,
                                  totalAmount: 100,
                                  datePosted: new Date(),
                                  requiredSkills: [],
                                  equipmentProvided: false,
                                  autoAccept: false,
                                  startTime: null,
                                  clockInTime: null,
                                  completionTime: null,
                                  completedAt: null,
                                  shiftStartTime: null,
                                  shiftEndTime: null,
                                  workerTrackingEnabled: null,
                                  verifyLocationToStart: null,
                                  markerColor: null
                                }}
                                onSuccess={() => {
                                  toast({
                                    title: "Payment Successful",
                                    description: "Your payment has been processed successfully.",
                                  });
                                }}
                                onCancel={() => {
                                  toast({
                                    title: "Payment Cancelled",
                                    description: "Payment was cancelled.",
                                  });
                                }}
                              />
                            </div>
                            
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      
                      <div className="hidden md:block">
                        <img 
                          src="/assets/payment-illustration.svg" 
                          alt="Payment illustration" 
                          className="w-full max-w-[280px] mx-auto opacity-70 dark:opacity-40" 
                        />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="worker-payment">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="rounded-lg bg-primary/5 p-4">
                          <h3 className="font-semibold mb-2">Send Payment to Worker</h3>
                          <p className="text-sm text-muted-foreground">
                            Transfer funds directly to workers for completed services.
                          </p>
                        </div>
                        
                        <StripeTransferForm
                          onSuccess={() => {
                            toast({
                              title: "Transfer Successful",
                              description: "Your payment has been sent to the worker.",
                            });
                          }}
                        />
                      </div>
                      
                      <div className="hidden md:block">
                        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
                          <h3 className="font-semibold mb-3">Recent Recipients</h3>
                          <div className="space-y-3">
                            {Array.from({length: 3}).map((_, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                <div className="flex items-center">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                                    {String.fromCharCode(65 + idx)}
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">Worker {idx + 1}</p>
                                    <p className="text-xs text-muted-foreground">Last paid: Today</p>
                                  </div>
                                </div>
                                <Button size="sm" variant="ghost">
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
          
          {canAcceptPayments && (
            <TabsContent value="receive-payments" className="space-y-6 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <StripeConnectSetupV2 />
                </div>
                
                <Card className="shadow-sm border-border/60 h-fit">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <BanknoteIcon className="h-4 w-4 mr-2" />
                      Withdraw Funds
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Update Account
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      View Requirements
                    </Button>
                  </CardContent>
                </Card>
              </div>
              
              <Card className="shadow-sm border-border/60 mt-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl flex items-center">
                    <BadgeDollarSign className="h-5 w-5 mr-2 text-primary" />
                    Earnings History
                  </CardTitle>
                  <CardDescription>
                    View your complete earnings history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PaymentHistory />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}