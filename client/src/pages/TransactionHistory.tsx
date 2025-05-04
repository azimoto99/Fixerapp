import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { Link, useLocation } from 'wouter';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, FileText, CreditCard, Calendar, ReceiptIcon, Filter, Search, ArrowRight, DollarSign, Clock, ArrowLeft, ChevronLeft } from 'lucide-react';
import { Payment, Earning, Job } from '@shared/schema';
import DownloadReceipt from '@/components/DownloadReceipt';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const TransactionHistory: React.FC = () => {
  const { user } = useAuth();
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateSort, setDateSort] = useState<'asc' | 'desc'>('desc');

  // Fetch payments made by the user as a job poster
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['/api/payments/user', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/payments/user/${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Fetch earnings received by the user as a worker
  const { data: earnings, isLoading: earningsLoading } = useQuery({
    queryKey: ['/api/earnings/worker', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/earnings/worker/${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Fetch jobs related to payments
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['/api/jobs'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/jobs');
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Filtered and sorted payments
  const filteredPayments = React.useMemo(() => {
    if (!payments) return [];
    
    return payments
      .filter((payment: Payment) => {
        const matchesSearch = searchTerm === '' || 
          (payment.description && payment.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
          payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
        
        return matchesSearch && matchesStatus;
      })
      .sort((a: Payment, b: Payment) => {
        // Handle both string and Date formats safely
        const getTime = (date: Date | string | null) => {
          if (!date) return 0;
          return typeof date === 'string' ? new Date(date).getTime() : date.getTime();
        };
        const dateA = getTime(a.createdAt);
        const dateB = getTime(b.createdAt);
        return dateSort === 'desc' ? dateB - dateA : dateA - dateB;
      });
  }, [payments, searchTerm, statusFilter, dateSort]);

  // Get job title for a payment
  const getJobTitle = (jobId: number | null) => {
    if (!jobId || !jobs) return 'N/A';
    const job = jobs.find((j: Job) => j.id === jobId);
    return job ? job.title : 'General Payment';
  };

  const handleDownloadReceipt = (paymentId: number) => {
    setSelectedPaymentId(paymentId);
    setShowReceiptModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center mb-6">
        <Link to="/" className="mr-3">
          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Map
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Transaction History</h1>
      </div>

      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="payments" className="flex-1">Payments Made</TabsTrigger>
          <TabsTrigger value="earnings" className="flex-1">Earnings Received</TabsTrigger>
        </TabsList>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payments Made</CardTitle>
              <CardDescription>
                History of payments you've made as a job poster
              </CardDescription>
              
              {/* Search and filter controls */}
              {payments && payments.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={dateSort}
                    onValueChange={(value: 'asc' | 'desc') => setDateSort(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sort by date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Newest First</SelectItem>
                      <SelectItem value="asc">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
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
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableCaption>Your payment history</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Receipt #</TableHead>
                        <TableHead className="w-[180px]">Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Job</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment: Payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">TJ-{payment.id.toString().padStart(5, '0')}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                              <span>{payment.createdAt ? formatDate(payment.createdAt) : 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{payment.description || 'Payment for services'}</TableCell>
                          <TableCell>{payment.jobId ? getJobTitle(payment.jobId) : 'N/A'}</TableCell>
                          <TableCell className="text-right font-medium">
                            <div className="flex items-center justify-end">
                              <DollarSign className="h-4 w-4 mr-1 text-emerald-500" />
                              {formatCurrency(payment.amount)}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell className="text-right">
                            {payment.status === 'completed' ? (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDownloadReceipt(payment.id)}
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              >
                                <ReceiptIcon className="h-4 w-4 mr-1" />
                                Receipt
                              </Button>
                            ) : payment.status === 'pending' ? (
                              <div className="flex items-center justify-end text-yellow-600">
                                <Clock className="h-4 w-4 mr-1" />
                                <span className="text-xs">Processing</span>
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Earnings Tab */}
        <TabsContent value="earnings">
          <Card>
            <CardHeader>
              <CardTitle>Earnings Received</CardTitle>
              <CardDescription>
                History of payments you've received as a worker
              </CardDescription>
              
              {/* Summary cards for earnings */}
              {earnings && earnings.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-emerald-800">Total Earned</p>
                          <h3 className="text-2xl font-bold text-emerald-900 mt-1">
                            {formatCurrency(
                              earnings.reduce((sum: number, earning: Earning) => sum + earning.amount, 0)
                            )}
                          </h3>
                        </div>
                        <div className="h-12 w-12 bg-emerald-200 rounded-full flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-emerald-700" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-800">Pending</p>
                          <h3 className="text-2xl font-bold text-blue-900 mt-1">
                            {formatCurrency(
                              earnings
                                .filter((e: Earning) => e.status !== 'paid')
                                .reduce((sum: number, earning: Earning) => sum + earning.amount, 0)
                            )}
                          </h3>
                        </div>
                        <div className="h-12 w-12 bg-blue-200 rounded-full flex items-center justify-center">
                          <Clock className="h-6 w-6 text-blue-700" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-800">Net Earnings</p>
                          <h3 className="text-2xl font-bold text-purple-900 mt-1">
                            {formatCurrency(
                              earnings.reduce((sum: number, earning: Earning) => sum + earning.netAmount, 0)
                            )}
                          </h3>
                        </div>
                        <div className="h-12 w-12 bg-purple-200 rounded-full flex items-center justify-center">
                          <ArrowRight className="h-6 w-6 text-purple-700" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {earningsLoading || jobsLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                </div>
              ) : !earnings || earnings.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>You haven't received any earnings yet.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableCaption>Your earnings history</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job</TableHead>
                        <TableHead className="w-[180px]">Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Fee</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {earnings.map((earning: Earning) => (
                        <TableRow key={earning.id}>
                          <TableCell className="font-medium">
                            {earning.jobId ? getJobTitle(earning.jobId) : 'General Payment'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                              <span>{earning.dateEarned ? formatDate(earning.dateEarned) : 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(earning.amount)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            -{formatCurrency(earning.serviceFee || 2.50)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">
                            {formatCurrency(earning.netAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              earning.status === 'paid' 
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            }>
                              {earning.status === 'paid' ? 'Paid' : 'Pending'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

export default TransactionHistory;