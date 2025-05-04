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
import { 
  Loader2, Download, CreditCard, DollarSign, PieChart, 
  TrendingUp, Clock, CheckCircle2, AlertCircle, Filter
} from 'lucide-react';
import { Payment, Job } from '@shared/schema';
import DownloadReceipt from '@/components/DownloadReceipt';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

const PaymentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">{status}</Badge>;
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

    const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0);
    const pendingPayments = payments.filter(p => p.status === 'pending');
    const completedPayments = payments.filter(p => p.status === 'completed');
    
    const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
    const completedAmount = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    
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
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            Track and manage your payments to workers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsLoading || jobsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !payments || payments.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>You haven't made any payments yet.</p>
            </div>
          ) : (
            <Table>
              <TableCaption>A list of your recent payments</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment: Payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.createdAt ? formatDate(new Date(payment.createdAt)) : 'N/A'}
                    </TableCell>
                    <TableCell>{getJobName(payment.jobId)}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-right">
                      {payment.status === 'completed' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadReceipt(payment.id)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Receipt
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !jobs || jobs.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>You haven't posted any jobs yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job: Job) => {
                const jobPayments = payments?.filter(p => p.jobId === job.id) || [];
                const isPaid = jobPayments.some(p => p.status === 'completed');
                const isPending = jobPayments.some(p => p.status === 'pending');
                
                return (
                  <div key={job.id} className="border rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">{job.title}</div>
                      <Badge className={
                        job.status === 'completed' 
                          ? isPaid
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }>
                        {job.status === 'completed' 
                          ? (isPaid ? 'Paid' : 'Payment Required') 
                          : job.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Worker: {job.workerId ? 'Assigned' : 'Unassigned'}
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className="text-gray-600">Amount:</span>{' '}
                        <span className="font-medium">{formatCurrency(job.paymentAmount)}</span>
                        {' + '}
                        <span className="text-gray-600">Fee:</span>{' '}
                        <span className="font-medium">{formatCurrency(job.serviceFee || 2.50)}</span>
                      </div>
                      <div className="font-bold text-green-600">
                        {formatCurrency(job.totalAmount)}
                      </div>
                    </div>
                  </div>
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