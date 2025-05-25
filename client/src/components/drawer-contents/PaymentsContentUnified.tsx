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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
  ArrowUpRight,
  X,
  TrendingUp,
  Filter,
  Download,
  Eye,
  MoreHorizontal
} from 'lucide-react';

/**
 * Unified Payments Content Component
 * 
 * Combines the best features from PaymentsContent and PaymentsContentV2:
 * - Modern, responsive UI design from V2
 * - Advanced Stripe integration and features from V1
 * - Comprehensive payment history management
 * - Payment method management with add/remove functionality
 * - Refund request capabilities
 * - Enhanced filtering and search
 */
const PaymentsContentUnified = () => {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // State management
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAddMethodOpen, setIsAddMethodOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Fetch payment data with React Query
  const { data: payments = [], isLoading: paymentsLoading, error: paymentsError } = useQuery({
    queryKey: ['/api/payments'],
    enabled: !!user,
    retry: 3,
    staleTime: 30000
  });

  const { data: paymentMethods = [], isLoading: methodsLoading } = useQuery({
    queryKey: ['/api/stripe/payment-methods'],
    enabled: !!user,
    retry: 3,
    staleTime: 60000
  });

  const { data: earnings = [], isLoading: earningsLoading } = useQuery({
    queryKey: ['/api/earnings'],
    enabled: !!user && user.accountType === 'worker',
    retry: 3,
    staleTime: 30000
  });

  // Mutations for payment operations
  const addPaymentMethodMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/stripe/payment-methods'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/payment-methods'] });
      toast({ title: "Payment method added successfully" });
      setIsAddMethodOpen(false);
    },
    onError: (error) => {
      toast({ 
        title: "Failed to add payment method", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deletePaymentMethodMutation = useMutation({
    mutationFn: (methodId: string) => apiRequest('DELETE', `/api/stripe/payment-methods/${methodId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/payment-methods'] });
      toast({ title: "Payment method removed successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to remove payment method", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const refundRequestMutation = useMutation({
    mutationFn: (paymentId: number) => apiRequest('POST', `/api/payments/${paymentId}/refund`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      toast({ title: "Refund request submitted successfully" });
      setIsDetailsOpen(false);
    },
    onError: (error) => {
      toast({ 
        title: "Failed to request refund", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Helper functions
  const formatPaymentDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'refunded': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const StatusBadge = ({ status }: { status: string }) => (
    <Badge className={`${getStatusColor(status)} capitalize`}>
      {status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
      {status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
      {status === 'failed' && <AlertCircle className="w-3 h-3 mr-1" />}
      {status}
    </Badge>
  );

  // Filter payments based on search and filters
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = !searchTerm || 
      payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.jobId?.toString().includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    
    const matchesDate = dateFilter === 'all' || (() => {
      const paymentDate = new Date(payment.createdAt);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (dateFilter) {
        case 'week': return daysDiff <= 7;
        case 'month': return daysDiff <= 30;
        case 'quarter': return daysDiff <= 90;
        default: return true;
      }
    })();
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calculate summary statistics
  const completedPayments = filteredPayments.filter(p => p.status === 'completed');
  const pendingPayments = filteredPayments.filter(p => p.status === 'pending');
  const totalSpent = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalEarned = earnings.reduce((sum, e) => sum + (e.amount || 0), 0);

  const handleAddPaymentMethod = async () => {
    try {
      addPaymentMethodMutation.mutate();
    } catch (error) {
      console.error('Payment method addition failed:', error);
    }
  };

  const handleDeleteMethod = async (methodId: string) => {
    if (confirm('Are you sure you want to remove this payment method?')) {
      deletePaymentMethodMutation.mutate(methodId);
    }
  };

  const handleRefundRequest = () => {
    if (selectedPayment && confirm('Are you sure you want to request a refund for this payment?')) {
      refundRequestMutation.mutate(selectedPayment.id);
    }
  };

  const handleViewDetails = (payment: any) => {
    setSelectedPayment(payment);
    setIsDetailsOpen(true);
  };

  if (paymentsLoading || methodsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payments & Earnings</h2>
          <p className="text-muted-foreground">
            Manage your payment methods and view transaction history
          </p>
        </div>
        <Button onClick={handleAddPaymentMethod} disabled={addPaymentMethodMutation.isPending}>
          {addPaymentMethodMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Add Payment Method
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
          {user.accountType === 'worker' && (
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  From {completedPayments.length} completed payments
                </p>
              </CardContent>
            </Card>

            {user.accountType === 'worker' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalEarned.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    From {earnings.length} completed jobs
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingPayments.length}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting processing
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest payment activity</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredPayments.slice(0, 5).length > 0 ? (
                <div className="space-y-3">
                  {filteredPayments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <Receipt className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{payment.description || 'Payment'}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatPaymentDate(payment.createdAt)}
                            {payment.jobId && (
                              <span className="ml-2 text-primary">
                                Job #{payment.jobId}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <StatusBadge status={payment.status} />
                        <p className="font-medium">${payment.amount?.toFixed(2)}</p>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => handleViewDetails(payment)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="methods" className="space-y-6">
          {paymentMethods.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentMethods.map((method) => (
                <Card key={method.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            •••• •••• •••• {method.card?.last4}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {method.card?.brand?.toUpperCase()} expires {method.card?.exp_month}/{method.card?.exp_year}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {method.isDefault && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => handleDeleteMethod(method.id)}
                          disabled={deletePaymentMethodMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <CreditCard className="h-10 w-10 text-primary/50 mb-3" />
                <h3 className="text-lg font-medium mb-1">No payment methods</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add a payment method to quickly pay for services
                </p>
                <Button onClick={handleAddPaymentMethod} variant="default">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Payment Method
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Transaction History Tab */}
        <TabsContent value="history" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="week">Past Week</SelectItem>
                    <SelectItem value="month">Past Month</SelectItem>
                    <SelectItem value="quarter">Past Quarter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Transaction List */}
          {filteredPayments.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{payment.description || 'Payment'}</p>
                            {payment.jobId && (
                              <p className="text-sm text-muted-foreground">Job #{payment.jobId}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatPaymentDate(payment.createdAt)}</TableCell>
                        <TableCell className="font-medium">${payment.amount?.toFixed(2)}</TableCell>
                        <TableCell>
                          <StatusBadge status={payment.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={() => handleViewDetails(payment)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {payment.stripePaymentId && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7"
                                onClick={() => window.open(`https://dashboard.stripe.com/payments/${payment.stripePaymentId}`, '_blank')}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <Receipt className="h-10 w-10 text-primary/50 mb-3" />
                <h3 className="text-lg font-medium mb-1">No transactions found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or filter criteria
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Earnings Tab (Workers Only) */}
        {user.accountType === 'worker' && (
          <TabsContent value="earnings" className="space-y-6">
            {earnings.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job</TableHead>
                        <TableHead>Date Earned</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {earnings.map((earning) => (
                        <TableRow key={earning.id}>
                          <TableCell>
                            <p className="font-medium">Job #{earning.jobId}</p>
                          </TableCell>
                          <TableCell>{formatPaymentDate(earning.createdAt)}</TableCell>
                          <TableCell className="font-medium">${earning.amount?.toFixed(2)}</TableCell>
                          <TableCell>
                            <StatusBadge status={earning.status || 'completed'} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <Wallet className="h-10 w-10 text-primary/50 mb-3" />
                  <h3 className="text-lg font-medium mb-1">No earnings yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Complete jobs to start earning money
                  </p>
                  <Button onClick={() => navigate('/')} variant="default">
                    Find Jobs
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Payment Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="font-semibold">${selectedPayment.amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Date</span>
                  <span>{formatPaymentDate(selectedPayment.createdAt)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusBadge status={selectedPayment.status} />
                </div>
                {selectedPayment.transactionId && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Transaction ID</span>
                    <span className="text-xs font-mono">{selectedPayment.transactionId}</span>
                  </div>
                )}
                {selectedPayment.jobId && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Job ID</span>
                    <span>#{selectedPayment.jobId}</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsDetailsOpen(false)}
                >
                  Close
                </Button>
                
                {selectedPayment.status === 'completed' && user?.accountType === 'poster' && (
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={handleRefundRequest}
                    disabled={refundRequestMutation.isPending}
                  >
                    {refundRequestMutation.isPending ? (
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
                    onClick={() => window.open(`https://dashboard.stripe.com/payments/${selectedPayment.stripePaymentId}`, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1.5" />
                    View in Stripe
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsContentUnified;