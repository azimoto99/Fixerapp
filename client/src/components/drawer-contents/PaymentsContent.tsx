import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';

// UI Components
import { TabsContent, Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter } from '@/components/ui/drawer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

// Icons
import { 
  Loader2, 
  Search, 
  Plus, 
  CreditCard, 
  FileText, 
  ArrowRight,
  DollarSign,
  Banknote,
  PlusCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  Receipt,
  RefreshCw,
  ExternalLink,
  BanknoteIcon,
  Wallet,
  ArrowUpRight
} from 'lucide-react';

// Custom Components
import PaymentDetailsCard from '@/components/payments/PaymentDetailsCard';
import JobPaymentForm from '@/components/payments/JobPaymentForm';
import { usePaymentDialog } from '@/components/payments/PaymentDialogManager';
import PaymentMethodsList from '@/components/payments/PaymentMethodsList';

interface PaymentsContentProps {
  userId: number;
}

// Mock payment for when API call fails
interface MockPayment {
  id: number;
  description: string;
  amount: number;
  status: string;
  createdAt: string;
  type: string;
  jobId?: number;
  transactionId?: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const getVariant = () => {
    switch (status.toLowerCase()) {
      case 'completed':
        return { variant: 'default', icon: <CheckCircle className="h-3 w-3 mr-1" /> }; 
      case 'pending':
        return { variant: 'outline', icon: <Clock className="h-3 w-3 mr-1" /> };
      case 'processing':
        return { variant: 'secondary', icon: <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> };
      case 'failed':
        return { variant: 'destructive', icon: <AlertCircle className="h-3 w-3 mr-1" /> };
      default:
        return { variant: 'outline', icon: null };
    }
  };

  const { variant, icon } = getVariant();
  
  return (
    <Badge variant={variant as any} className={status === 'completed' ? 'bg-green-600' : undefined}>
      <span className="flex items-center text-xs">
        {icon}
        {status}
      </span>
    </Badge>
  );
};

const PaymentsContent: React.FC<PaymentsContentProps> = ({ userId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { openAddPaymentMethod } = usePaymentDialog();
  const [activeTab, setActiveTab] = useState('history');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentDetailsOpen, setPaymentDetailsOpen] = useState(false);
  const [makePaymentOpen, setMakePaymentOpen] = useState(false);
  const [, navigate] = useLocation();
  
  // No mock payment data - only use authentic data from API
  
  // Fetch payments from the API
  const { 
    data: payments, 
    isLoading: isLoadingPayments, 
    refetch: refetchPayments,
    error: paymentsError
  } = useQuery({
    queryKey: ['/api/payments/user', userId],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', `/api/payments/user/${userId}`);
        if (!res.ok) throw new Error('Failed to fetch payments');
        return res.json();
      } catch (error) {
        console.error("Error fetching payments:", error);
        return [];
      }
    },
  });

  // Use only real payments data from API, never mock data
  const paymentsData = payments || [];
  
  // Filter payments based on search term and status
  const filteredPayments = paymentsData
    ? paymentsData.filter((payment: any) => {
        const matchesSearch =
          searchTerm === '' ||
          payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (payment.amount && payment.amount.toString().includes(searchTerm)) ||
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
      toast({
        title: "Payment cancelled",
        description: "The payment has been successfully cancelled and refunded.",
      });
    },
    onError: (error: Error) => {
      console.error('Cancel payment error:', error);
      toast({
        title: "Error cancelling payment",
        description: error.message,
        variant: "destructive"
      });
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
      
      toast({
        title: "Receipt downloaded",
        description: "Your payment receipt has been downloaded.",
      });
    },
    onError: (error: Error) => {
      console.error('Generate receipt error:', error);
      toast({
        title: "Error generating receipt",
        description: error.message,
        variant: "destructive"
      });
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
    toast({
      title: "Payment successful",
      description: "Your payment has been processed successfully.",
    });
  };

  // Handle payment form cancellation
  const handlePaymentCancel = () => {
    setMakePaymentOpen(false);
  };

  // Calculate payment stats from payment data
  const totalSpent = filteredPayments
    .filter((p: any) => p.type !== 'payout')
    .reduce((sum: number, p: any) => sum + p.amount, 0);
    
  const pendingAmount = filteredPayments
    .filter((p: any) => p.status === 'pending')
    .reduce((sum: number, p: any) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b">
        <h2 className="text-sm font-medium text-muted-foreground">Payment Center</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => window.location.href="/payments"} 
          className="h-7 text-xs px-2.5 -mr-2"
        >
          Full Dashboard
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
      
      {/* Payment stats summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground flex items-center">
                <Wallet className="h-3 w-3 mr-1 text-primary" />
                Total Payments
              </span>
              <span className="text-xl font-bold mt-1">${totalSpent.toFixed(2)}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {filteredPayments.filter((p: any) => p.type !== 'payout').length} transactions
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground flex items-center">
                <Clock className="h-3 w-3 mr-1 text-amber-500" />
                Pending
              </span>
              <span className="text-xl font-bold mt-1">${pendingAmount.toFixed(2)}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {filteredPayments.filter((p: any) => p.status === 'pending').length} pending items
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="history" value={activeTab} onValueChange={setActiveTab}>
        <div className="bg-card rounded-md p-1 mb-2 border">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              History
            </TabsTrigger>
            <TabsTrigger value="methods" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              Methods
            </TabsTrigger>
          </TabsList>
        </div>
        
        {/* Payment History Tab */}
        <TabsContent value="history" className="space-y-3 mt-3">
          <div className="border rounded-lg overflow-hidden">
            <div className="p-3 pb-2 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium">Your Payments</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {user?.accountType === 'worker' 
                      ? 'Payments received for completed jobs' 
                      : 'History of payments to workers'}
                  </p>
                </div>
                
                {/* Make new payment button */}
                {user?.accountType === 'poster' && (
                  <Dialog open={makePaymentOpen} onOpenChange={setMakePaymentOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="ml-auto h-7 text-xs px-2.5">
                        <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                        Pay Worker
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Make a Payment</DialogTitle>
                        <DialogDescription>
                          Pay a worker directly for a job or service
                        </DialogDescription>
                      </DialogHeader>
                      {/* Placeholder job for direct payments */}
                      <JobPaymentForm 
                        job={{
                          id: 0,
                          title: "Direct Payment",
                          description: "Direct payment to a worker",
                          category: "Other",
                          location: null,
                          latitude: null,
                          longitude: null,
                          budget: 0,
                          date: new Date().toISOString(),
                          status: "completed",
                          posterId: user?.id || 0,
                          workerId: null,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                          posterName: user?.fullName || "",
                          workerName: null
                        }}
                        onSuccess={handlePaymentSuccess}
                        onCancel={handlePaymentCancel}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
            
            <div className="p-3">
              {payments && payments.length > 0 ? (
                <div className="space-y-3">
                  {/* Search and filter controls - more compact */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-grow">
                      <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search payments..."
                        className="pl-7 h-7 text-xs py-1"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <Select
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(value)}
                    >
                      <SelectTrigger className="h-7 text-xs py-1 w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                        <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                        <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                        <SelectItem value="processing" className="text-xs">Processing</SelectItem>
                        <SelectItem value="failed" className="text-xs">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payments table */}
                  <div className="rounded-md border overflow-hidden">
                    <ScrollArea className="max-h-[270px]">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background">
                          <TableRow>
                            <TableHead className="w-[80px] text-xs">Date</TableHead>
                            <TableHead className="text-xs">Description</TableHead>
                            <TableHead className="text-xs">Amount</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-right text-xs w-10">View</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPayments.length > 0 ? (
                            filteredPayments.map((payment: any) => (
                              <TableRow 
                                key={payment.id} 
                                className="cursor-pointer hover:bg-muted/50" 
                                onClick={() => handleOpenPaymentDetails(payment)}
                              >
                                <TableCell className="font-medium text-xs py-2">
                                  {formatDate(payment.createdAt)}
                                </TableCell>
                                <TableCell className="py-2">
                                  <div className="line-clamp-1 text-xs">
                                    {payment.description || `Payment #${payment.id}`}
                                  </div>
                                  {payment.jobId && (
                                    <div className="text-[10px] text-muted-foreground">
                                      Job #{payment.jobId}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium text-xs py-2">
                                  {payment.type === 'payout' ? (
                                    <span className="text-green-600">+{formatCurrency(payment.amount)}</span>
                                  ) : (
                                    <span>{formatCurrency(payment.amount)}</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-2">
                                  <StatusBadge status={payment.status} />
                                </TableCell>
                                <TableCell className="text-right py-2">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                          <ArrowRight className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>View payment details</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-4 text-xs text-muted-foreground">
                                No matching payments found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </div>
              ) : isLoadingPayments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="text-center py-8 space-y-2">
                  <div className="w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center mb-3">
                    {user?.accountType === 'worker' ? (
                      <Banknote className="h-6 w-6 text-muted-foreground" />
                    ) : (
                      <DollarSign className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <p className="font-medium text-sm">No payment history found</p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    {user?.accountType === 'worker' 
                      ? 'Complete jobs to receive payments that will appear here'
                      : 'Your payments to workers for jobs will appear here'}
                  </p>
                  {user?.accountType === 'worker' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs mt-2"
                      onClick={() => setActiveTab('setup')}
                    >
                      Set up payment account
                    </Button>
                  ) : (
                    <Dialog open={makePaymentOpen} onOpenChange={setMakePaymentOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="text-xs mt-2">
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
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
                        {/* Placeholder job for direct payments */}
                        <JobPaymentForm 
                          job={{
                            id: 0,
                            title: "Direct Payment",
                            description: "Direct payment to a worker",
                            category: "Other",
                            location: null,
                            latitude: null,
                            longitude: null,
                            budget: 0,
                            date: new Date().toISOString(),
                            status: "completed",
                            posterId: user?.id || 0,
                            workerId: null,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            posterName: user?.fullName || "",
                            workerName: null
                          }}
                          onSuccess={handlePaymentSuccess}
                          onCancel={handlePaymentCancel}
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Payment details drawer */}
          <Drawer open={paymentDetailsOpen} onOpenChange={setPaymentDetailsOpen}>
            <DrawerContent>
              <div className="max-w-md mx-auto px-4 py-4">
                <DrawerHeader className="px-0 pb-2">
                  <DrawerTitle className="text-base">Payment Details</DrawerTitle>
                  <DrawerDescription className="text-xs">
                    Transaction information and actions
                  </DrawerDescription>
                </DrawerHeader>
                {selectedPayment && (
                  <div className="border rounded-lg p-3 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-medium">
                          {selectedPayment.description || `Payment #${selectedPayment.id}`}
                        </h4>
                        <p className="text-xs text-muted-foreground flex items-center mt-0.5">
                          <Calendar className="h-3 w-3 mr-1.5" />
                          {formatDate(selectedPayment.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-semibold">
                          {selectedPayment.type === 'payout' ? (
                            <span className="text-green-600">+{formatCurrency(selectedPayment.amount)}</span>
                          ) : (
                            <span>{formatCurrency(selectedPayment.amount)}</span>
                          )}
                        </p>
                        <StatusBadge status={selectedPayment.status} />
                      </div>
                    </div>
                    
                    {/* Payment details */}
                    <div className="border-t border-b py-2 space-y-1.5">
                      {selectedPayment.jobId && (
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Job ID:</span>
                          <span className="text-xs font-medium">#{selectedPayment.jobId}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Transaction ID:</span>
                        <span className="text-xs font-medium">#{selectedPayment.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Payment Method:</span>
                        <span className="text-xs font-medium">
                          {selectedPayment.paymentMethod || 'Credit Card'}
                        </span>
                      </div>
                      {selectedPayment.serviceFee && (
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Service Fee:</span>
                          <span className="text-xs font-medium">
                            {formatCurrency(selectedPayment.serviceFee)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Type:</span>
                        <span className="text-xs font-medium capitalize">
                          {selectedPayment.type || 'payment'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs justify-between"
                        onClick={handleViewReceipt}
                        disabled={selectedPayment.status !== 'completed'}
                      >
                        <span className="flex items-center">
                          <Receipt className="h-3.5 w-3.5 mr-1.5" />
                          Download Receipt
                        </span>
                        <FileText className="h-3.5 w-3.5 ml-1.5 opacity-70" />
                      </Button>
                      
                      {selectedPayment.status === 'completed' && user?.accountType === 'poster' && (
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="text-xs"
                          onClick={handleRefundRequest}
                          disabled={cancelPaymentMutation.isPending}
                        >
                          {cancelPaymentMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Request Refund
                        </Button>
                      )}
                      
                      {selectedPayment.stripePaymentId && (
                        <Button 
                          size="sm" 
                          variant="link" 
                          className="text-xs text-muted-foreground"
                          onClick={() => window.open(`https://dashboard.stripe.com/payments/${selectedPayment.stripePaymentId}`, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1.5" />
                          View in Stripe Dashboard
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                <DrawerFooter className="px-0 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setPaymentDetailsOpen(false)}
                    size="sm"
                    className="text-xs"
                  >
                    Close
                  </Button>
                </DrawerFooter>
              </div>
            </DrawerContent>
          </Drawer>
        </TabsContent>
        
        {/* Payment Methods Tab */}
        <TabsContent value="methods" className="space-y-3 mt-3">
          <div className="border rounded-lg overflow-hidden">
            <div className="p-3 pb-2 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium">Payment Methods</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {user?.accountType === 'worker' 
                      ? 'Add bank accounts to receive payments' 
                      : 'Manage your payment methods for jobs'}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  className="ml-auto h-7 text-xs px-2.5"
                  onClick={openAddPaymentMethod}
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                  Add Method
                </Button>
              </div>
            </div>
            <div className="p-3">
              <PaymentMethodsList />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentsContent;