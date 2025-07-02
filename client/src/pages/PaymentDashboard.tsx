import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Loader2, Download, CreditCard, DollarSign, PieChart, 
  TrendingUp, Clock, CheckCircle2, AlertCircle, Filter,
  Calendar, Search, RefreshCw, Receipt, ArrowRight, 
  CreditCard as CreditCardIcon, BanknoteIcon, XCircle, ChevronDown
} from 'lucide-react';
import { Payment, Job } from '@shared/schema';
import DownloadReceipt from '@/components/DownloadReceipt';
import { StripeConnectSetup } from '@/components/stripe';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const PaymentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  
  // Fetch payments made by the user
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['/api/payments/user', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/payments/user/${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });
  
  // Fetch jobs posted by the user
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['/api/jobs', { posterId: user?.id }],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/jobs?posterId=${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  const handleDownloadReceipt = (paymentId: number) => {
    setSelectedPaymentId(paymentId);
    setShowReceiptModal(true);
  };
  
  const toggleExpandJob = (jobId: number) => {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
    } else {
      setExpandedJobId(jobId);
    }
  };

  // Filter payments based on status and search query
  const filteredPayments = React.useMemo(() => {
    if (!payments) return [];
    
    return payments.filter((payment: Payment) => {
      // Status filter
      const statusMatch = paymentFilter === 'all' || payment.status === paymentFilter;
      
      // Search filter - check if job title or transaction ID contains the search query
      let searchMatch = true;
      if (searchQuery) {
        const jobName = payment.jobId ? getJobName(payment.jobId) : '';
        searchMatch = 
          jobName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (payment.transactionId && payment.transactionId.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (payment.description && payment.description.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      
      return statusMatch && searchMatch;
    });
  }, [payments, paymentFilter, searchQuery, jobs]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">{status}</Badge>;
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'processing':
        return <RefreshCw className="h-5 w-5 text-blue-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  // Calculate payment statistics
  const calculateStats = () => {
    if (!payments || payments.length === 0) {
      return {
        totalSpent: 0,
        pendingAmount: 0,
        completedAmount: 0,
        paymentCount: 0,
        pendingCount: 0,
        completedCount: 0,
        successRate: 0
      };
    }

    const totalSpent = payments.reduce((sum: number, p: Payment) => sum + p.amount, 0);
    const pendingPayments = payments.filter((p: Payment) => p.status === 'pending');
    const completedPayments = payments.filter((p: Payment) => p.status === 'completed');
    
    const pendingAmount = pendingPayments.reduce((sum: number, p: Payment) => sum + p.amount, 0);
    const completedAmount = completedPayments.reduce((sum: number, p: Payment) => sum + p.amount, 0);
    
    return {
      totalSpent,
      pendingAmount,
      completedAmount,
      paymentCount: payments.length,
      pendingCount: pendingPayments.length,
      completedCount: completedPayments.length,
      successRate: (completedPayments.length / payments.length) * 100
    };
  };

  const stats = calculateStats();

  // Get job name by id
  const getJobName = (jobId: number | null) => {
    if (!jobId || !jobs) return 'N/A';
    const job = jobs.find((j: Job) => j.id === jobId);
    return job ? job.title : 'N/A';
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Payment Dashboard</h1>
      
      {/* Stripe Connect Setup for Workers */}
      {user && user.accountType === 'worker' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payment Account Setup</CardTitle>
            <CardDescription>
              Set up your Stripe Connect account to receive payments directly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StripeConnectSetup />
          </CardContent>
        </Card>
      )}
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-green-500 mr-2" />
              <div className="text-2xl font-bold">{formatCurrency(stats.totalSpent)}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-yellow-500 mr-2" />
              <div className="text-2xl font-bold">{stats.pendingCount}</div>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {formatCurrency(stats.pendingAmount)} pending
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Completed Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CheckCircle2 className="h-5 w-5 text-blue-500 mr-2" />
              <div className="text-2xl font-bold">{stats.completedCount}</div>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {formatCurrency(stats.completedAmount)} processed
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center mb-1">
              <TrendingUp className="h-5 w-5 text-purple-500 mr-2" />
              <div className="text-2xl font-bold">{stats.successRate.toFixed(0)}%</div>
            </div>
            <Progress value={stats.successRate} className="h-2" />
          </CardContent>
        </Card>
      </div>
      
      {/* Payments Table */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                Track and manage your payments to workers
              </CardDescription>
            </div>
            
            {payments && payments.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search payments..."
                    className="pl-8 w-full sm:w-[200px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <Select
                  value={paymentFilter}
                  onValueChange={setPaymentFilter}
                >
                  <SelectTrigger className="w-full sm:w-[150px]">
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
            )}
          </div>
        </CardHeader>
        <CardContent>
          {paymentsLoading || jobsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : !payments || payments.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>You haven't made any payments yet.</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <Filter className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No payments match your search criteria</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setPaymentFilter('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment: Payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span>{payment.createdAt ? formatDate(new Date(payment.createdAt)) : 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-emerald-700">
                          {getJobName(payment.jobId)}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {payment.description || "Payment for services"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                          <BanknoteIcon className="h-4 w-4 mr-1 text-emerald-500" />
                          <span className="font-medium">{formatCurrency(payment.amount)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {getStatusIcon(payment.status)}
                          <span className="ml-2">{getStatusBadge(payment.status)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {payment.status === 'completed' ? (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDownloadReceipt(payment.id)}
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          >
                            <Receipt className="h-4 w-4 mr-1" />
                            Receipt
                          </Button>
                        ) : payment.status === 'pending' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            disabled
                            className="text-yellow-600"
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Processing
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Job Payment Status */}
      <Card>
        <CardHeader>
          <CardTitle>Job Payment Status</CardTitle>
          <CardDescription>
            View payment status for your posted jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : !jobs || jobs.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>You haven't posted any jobs yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job: Job) => {
                const jobPayments = payments?.filter((p: Payment) => p.jobId === job.id) || [];
                const isPaid = jobPayments.some((p: Payment) => p.status === 'completed');
                const isPending = jobPayments.some((p: Payment) => p.status === 'pending');
                const isProcessing = jobPayments.some((p: Payment) => p.status === 'processing');
                const isExpanded = expandedJobId === job.id;
                
                let statusColor = 'gray';
                if (job.status === 'completed') {
                  statusColor = isPaid ? 'emerald' : 'blue';
                } else if (job.status === 'in_progress') {
                  statusColor = 'purple';
                } else if (job.status === 'open') {
                  statusColor = 'yellow';
                }
                
                return (
                  <Collapsible
                    key={job.id}
                    open={isExpanded}
                    onOpenChange={() => toggleExpandJob(job.id)}
                    className={`border rounded-lg shadow-sm overflow-hidden ${isExpanded ? 'border-emerald-200' : ''}`}
                  >
                    <div className={`p-4 ${isExpanded ? 'bg-emerald-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full bg-${statusColor}-500`} />
                          <div className="font-semibold">{job.title}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`
                            ${job.status === 'completed' 
                              ? (isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800')
                              : job.status === 'in_progress'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }
                          `}>
                            {job.status === 'completed' 
                              ? (isPaid ? 'Paid' : 'Payment Required') 
                              : job.status.replace('_', ' ')}
                          </Badge>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
                              <ChevronDown 
                                className={`h-5 w-5 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} 
                              />
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap justify-between items-center mt-2 gap-y-2">
                        <div className="text-sm text-gray-600">
                          Worker: {job.workerId 
                            ? <span className="font-medium text-emerald-700">Assigned</span> 
                            : <span className="text-yellow-600">Unassigned</span>}
                        </div>
                        <div className="font-bold text-emerald-600 text-right">
                          {formatCurrency(job.totalAmount)}
                        </div>
                      </div>
                    </div>
                    
                    <CollapsibleContent>
                      <div className="px-4 pb-4 pt-1 bg-white border-t">
                        <Separator className="my-3" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Payment Details</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Base Payment:</span>
                                <span className="font-medium">{formatCurrency(job.paymentAmount)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Service Fee:</span>
                                <span className="font-medium">{formatCurrency(job.serviceFee || 2.50)}</span>
                              </div>
                              <Separator className="my-1" />
                              <div className="flex justify-between">
                                <span className="text-gray-600 font-medium">Total Amount:</span>
                                <span className="font-bold text-emerald-600">{formatCurrency(job.totalAmount)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Payment Status</h4>
                            <div className="space-y-2">
                              {jobPayments.length > 0 ? (
                                jobPayments.map((payment: Payment) => (
                                  <div key={payment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md text-sm">
                                    <div className="flex items-center">
                                      {getStatusIcon(payment.status)}
                                      <span className="ml-2">{formatDate(payment.createdAt || new Date())}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span>{formatCurrency(payment.amount)}</span>
                                      {getStatusBadge(payment.status)}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-gray-500 text-center p-2 bg-gray-50 rounded-md text-sm">
                                  No payment history for this job
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {job.status === 'completed' && !isPaid && !isPending && !isProcessing && (
                          <div className="mt-4 flex justify-end">
                            <Button 
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => {
                                // Navigate to checkout with job id and amount
                                window.location.href = `/checkout?jobId=${job.id}&amount=${job.totalAmount || job.paymentAmount}`;
                              }}
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Pay Now
                            </Button>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Receipt Modal */}
      {showReceiptModal && selectedPaymentId && (
        <DownloadReceipt 
          paymentId={selectedPaymentId} 
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
};

export default PaymentDashboard;