import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { TabsContent, Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  ExternalLink, 
  Search, 
  Info, 
  Plus, 
  CreditCard, 
  FileText, 
  ArrowRight,
  DollarSign,
  Banknote,
  PlusCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter } from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import StripeConnectSetup from '@/components/stripe/StripeConnectSetup';
import PaymentDetailsCard from '@/components/payments/PaymentDetailsCard';
import JobPaymentForm from '@/components/payments/JobPaymentForm';
import PaymentMethodsManager from '@/components/payments/PaymentMethodsManager';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PaymentsContentProps {
  userId: number;
}

const PaymentsContent: React.FC<PaymentsContentProps> = ({ userId }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('history');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentDetailsOpen, setPaymentDetailsOpen] = useState(false);
  const [makePaymentOpen, setMakePaymentOpen] = useState(false);
  
  // Function to navigate to Stripe test payment page
  const goToStripeTestPage = () => {
    console.log("Navigating to Stripe test page");
    window.open('/stripe-test', '_blank');
  };

  // Fetch payments from the API
  const { data: payments, isLoading: isLoadingPayments, refetch: refetchPayments } = useQuery({
    queryKey: ['/api/payments/user', userId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/payments/user/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch payments');
      return res.json();
    },
  });

  // Filter payments based on search term and status
  const filteredPayments = payments
    ? payments.filter((payment: any) => {
        const matchesSearch =
          searchTerm === '' ||
          payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.amount.toString().includes(searchTerm) ||
          (payment.jobId && payment.jobId.toString().includes(searchTerm));
          
        const matchesStatus = 
          statusFilter === 'all' || 
          payment.status.toLowerCase() === statusFilter.toLowerCase();
          
        return matchesSearch && matchesStatus;
      })
    : [];
  
  // Open payment details drawer
  const handleOpenPaymentDetails = (payment: any) => {
    setSelectedPayment(payment);
    setPaymentDetailsOpen(true);
  };
  
  // Cancel/refund a payment
  const cancelPaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const res = await apiRequest('POST', `/api/payments/${paymentId}/cancel`, {});
      if (!res.ok) throw new Error('Failed to cancel payment');
      return res.json();
    },
    onSuccess: () => {
      refetchPayments();
      setPaymentDetailsOpen(false);
    },
    onError: (error: Error) => {
      console.error('Cancel payment error:', error);
    },
  });

  // Generate receipt for payment
  const generateReceiptMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const res = await apiRequest('GET', `/api/payments/${paymentId}/receipt`, {});
      if (!res.ok) throw new Error('Failed to generate receipt');
      return res.blob();
    },
    onSuccess: (blob) => {
      // Create a download link for the receipt PDF
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${selectedPayment?.id || 'payment'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onError: (error: Error) => {
      console.error('Generate receipt error:', error);
    },
  });

  // View receipt callback
  const handleViewReceipt = () => {
    if (selectedPayment) {
      generateReceiptMutation.mutate(selectedPayment.id);
    }
  };
  
  // Handle refund callback
  const handleRefundRequest = () => {
    if (selectedPayment) {
      cancelPaymentMutation.mutate(selectedPayment.id);
    }
  };
  
  // Success callback for payment completion
  const handlePaymentSuccess = () => {
    refetchPayments();
    setMakePaymentOpen(false);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="history" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="setup">Account Setup</TabsTrigger>
        </TabsList>
        
        {/* Payment History Tab */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Your Payments</CardTitle>
                  <CardDescription>
                    {user?.accountType === 'worker' 
                      ? 'Track payments you\'ve received for completed jobs' 
                      : 'View your payment history for jobs you\'ve posted'}
                  </CardDescription>
                </div>
                
                {/* Make new payment button */}
                {user?.accountType === 'poster' && (
                  <Dialog open={makePaymentOpen} onOpenChange={setMakePaymentOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="ml-auto">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Make Payment
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Make a Payment</DialogTitle>
                        <DialogDescription>
                          Pay a worker directly for a job or service
                        </DialogDescription>
                      </DialogHeader>
                      <JobPaymentForm onSuccess={handlePaymentSuccess} />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {payments && payments.length > 0 ? (
                <div className="space-y-4">
                  {/* Search and filter controls */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search payments..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <Select
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payments table */}
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.length > 0 ? (
                          filteredPayments.map((payment: any) => (
                            <TableRow key={payment.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenPaymentDetails(payment)}>
                              <TableCell className="font-medium">
                                {formatDate(payment.createdAt)}
                              </TableCell>
                              <TableCell>
                                <div className="line-clamp-1">
                                  {payment.description || `Payment #${payment.id}`}
                                </div>
                                {payment.jobId && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Job #{payment.jobId}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {payment.type === 'payout' ? (
                                  <span className="text-green-600">+{formatCurrency(payment.amount)}</span>
                                ) : (
                                  <span>{formatCurrency(payment.amount)}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    payment.status === 'completed' ? 'default' :
                                    payment.status === 'pending' ? 'outline' :
                                    payment.status === 'processing' ? 'secondary' :
                                    'destructive'
                                  }
                                  className={payment.status === 'completed' ? 'bg-green-600' : undefined}
                                >
                                  {payment.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No matching payments found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : isLoadingPayments ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
                    {user?.accountType === 'worker' ? (
                      <Banknote className="h-8 w-8 text-muted-foreground" />
                    ) : (
                      <DollarSign className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <p className="font-medium">No payment history found</p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {user?.accountType === 'worker' 
                      ? 'Complete jobs to receive payments that will appear here'
                      : 'Your payments to workers for jobs will appear here'}
                  </p>
                  {user?.accountType === 'worker' ? (
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('setup')}
                    >
                      Set up payment account
                    </Button>
                  ) : (
                    <Dialog open={makePaymentOpen} onOpenChange={setMakePaymentOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Make a Payment
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Make a Payment</DialogTitle>
                          <DialogDescription>
                            Pay a worker directly for a job or service
                          </DialogDescription>
                        </DialogHeader>
                        <JobPaymentForm onSuccess={handlePaymentSuccess} />
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Payment details drawer */}
          <Drawer open={paymentDetailsOpen} onOpenChange={setPaymentDetailsOpen}>
            <DrawerContent>
              <div className="max-w-md mx-auto px-4 py-6">
                <DrawerHeader className="px-0">
                  <DrawerTitle>Payment Details</DrawerTitle>
                  <DrawerDescription>
                    Transaction information and actions
                  </DrawerDescription>
                </DrawerHeader>
                {selectedPayment && (
                  <PaymentDetailsCard 
                    payment={selectedPayment} 
                    onViewReceipt={handleViewReceipt} 
                    onRefund={handleRefundRequest}
                  />
                )}
                <DrawerFooter className="px-0 pt-6">
                  <Button variant="outline" onClick={() => setPaymentDetailsOpen(false)}>
                    Close
                  </Button>
                </DrawerFooter>
              </div>
            </DrawerContent>
          </Drawer>
        </TabsContent>
        
        {/* Payment Methods Tab */}
        <TabsContent value="methods" className="space-y-4 mt-4">
          <PaymentMethodsManager userId={userId} />
          
          <Card>
            <CardHeader>
              <CardTitle>Direct Deposit</CardTitle>
              <CardDescription>
                Manage your bank account for receiving payments
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex items-start gap-4 text-sm">
                <div className="rounded-md p-2 bg-primary/10">
                  <Banknote className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Bank Account Setup</p>
                  <p className="text-muted-foreground mt-1">
                    Bank account information is managed securely through your Stripe Connect account.
                    This ensures your banking details are kept secure and never stored on our servers.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => setActiveTab('setup')}>
                Manage Bank Account
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Payment Setup Tab */}
        <TabsContent value="setup" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Account Setup</CardTitle>
              <CardDescription>
                Set up your Stripe Connect account to {user?.accountType === 'worker' ? 'receive' : 'make'} payments securely
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <StripeConnectSetup />
                
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-md text-blue-800 text-sm flex items-start dark:bg-blue-950 dark:border-blue-900 dark:text-blue-300">
                  <Info className="h-5 w-5 mr-2 mt-0.5 text-blue-600 flex-shrink-0 dark:text-blue-400" />
                  <div>
                    <p className="font-medium mb-1">Why do we use Stripe Connect?</p>
                    <p>
                      Stripe Connect allows us to process payments securely while ensuring that 
                      your banking information is never stored on our servers. This gives you added
                      security and peace of mind when sending or receiving payments.
                    </p>
                    {user?.accountType === 'worker' && (
                      <p className="mt-2">
                        <strong>For Workers:</strong> You'll need to provide some identity verification 
                        and banking information to receive payments directly to your bank account.
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <Button 
                    variant="outline"
                    onClick={() => window.open('https://stripe.com/docs/connect/identity-verification', '_blank')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Verification Guide
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => window.open('https://dashboard.stripe.com/', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Stripe Dashboard
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={goToStripeTestPage}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Test Payments
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
      </Tabs>
    </div>
  );
};

export default PaymentsContent;