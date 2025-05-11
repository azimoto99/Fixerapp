import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, DollarSign, ArrowDown, ArrowUp, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

interface PaymentHistoryProps {
  userId?: number;
  workerId?: number;
  jobId?: number;
}

/**
 * PaymentHistory component
 * 
 * Displays payment history for a user, worker, or job
 */
export default function PaymentHistory({ userId, workerId, jobId }: PaymentHistoryProps) {
  const [currentTab, setCurrentTab] = useState('all');
  
  // Fetch payments data
  const { data: paymentsData, isLoading, error } = useQuery({
    queryKey: jobId 
      ? ['/api/stripe/transfers/job', jobId]
      : workerId
        ? ['/api/stripe/transfers/worker', workerId]
        : ['/api/payments'],
    queryFn: async () => {
      let url = '/api/payments';
      
      if (jobId) {
        url = `/api/stripe/transfers/job/${jobId}`;
      } else if (workerId) {
        url = `/api/stripe/transfers/worker/${workerId}`;
      } else if (userId) {
        url = `/api/payments/user/${userId}`;
      }
      
      const res = await apiRequest('GET', url);
      if (!res.ok) {
        throw new Error('Failed to fetch payment history');
      }
      return res.json();
    },
    enabled: !!(userId || workerId || jobId),
  });
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  // Get status badge for payment
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'succeeded':
      case 'paid':
        return <Badge variant="success">Completed</Badge>;
      case 'pending':
      case 'processing':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'failed':
      case 'canceled':
        return <Badge variant="destructive">Failed</Badge>;
      case 'refunded':
        return <Badge variant="secondary">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Get type badge for payment
  const getTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'charge':
      case 'payment':
        return <Badge variant="outline" className="bg-blue-50"><ArrowUp className="h-3 w-3 mr-1" /> Paid</Badge>;
      case 'transfer':
      case 'payout':
        return <Badge variant="outline" className="bg-green-50"><ArrowDown className="h-3 w-3 mr-1" /> Received</Badge>;
      case 'refund':
        return <Badge variant="outline" className="bg-amber-50">Refund</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            Loading your payment history...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            Could not load payment history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-destructive">
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </div>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // No data state
  if (!paymentsData || 
     (paymentsData.payments && paymentsData.payments.length === 0) && 
     (paymentsData.earnings && paymentsData.earnings.length === 0) &&
     (!paymentsData.transfers || paymentsData.transfers.length === 0)) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            You don't have any payment history yet
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            No payment transactions found
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Filter payments based on current tab
  const filterPayments = (payments: any[] = []) => {
    if (currentTab === 'all') return payments;
    return payments.filter(p => p.type?.toLowerCase() === currentTab);
  };
  
  const payments = paymentsData.payments || [];
  const earnings = paymentsData.earnings || [];
  const transfers = paymentsData.transfers || [];
  
  const filteredPayments = filterPayments(payments);
  
  // Render payment history table
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Payment History</CardTitle>
        <CardDescription>
          {jobId ? 'Payment history for this job' : 
           workerId ? 'Payment history for this worker' : 
           'Your payment history'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" onValueChange={setCurrentTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="payment">Payments</TabsTrigger>
            <TabsTrigger value="transfer">Transfers</TabsTrigger>
            {!jobId && <TabsTrigger value="refund">Refunds</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            {filteredPayments.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {formatDate(payment.createdAt)}
                        </TableCell>
                        <TableCell>
                          {payment.description || 
                           (payment.jobId ? `Payment for Job #${payment.jobId}` : 'Payment')}
                        </TableCell>
                        <TableCell>
                          {getTypeBadge(payment.type)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No payments found</p>
              </div>
            )}
            
            {earnings.length > 0 && (
              <>
                <Separator className="my-4" />
                <h3 className="text-lg font-medium mb-2">Earnings</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Job</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Net Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {earnings.map((earning) => (
                        <TableRow key={earning.id}>
                          <TableCell className="font-medium">
                            {formatDate(earning.dateEarned)}
                          </TableCell>
                          <TableCell>
                            {earning.jobId ? `Job #${earning.jobId}` : 'Direct Payment'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(earning.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(earning.amount)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(earning.netAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
            
            {transfers.length > 0 && (
              <>
                <Separator className="my-4" />
                <h3 className="text-lg font-medium mb-2">Stripe Transfers</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer) => (
                        <TableRow key={transfer.id}>
                          <TableCell className="font-medium">
                            {formatDate(transfer.created * 1000)} {/* Stripe timestamps are in seconds */}
                          </TableCell>
                          <TableCell>
                            {transfer.description || 'Transfer'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(transfer.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(transfer.amount / 100)} {/* Stripe amounts are in cents */}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="payment" className="space-y-4">
            {filteredPayments.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {formatDate(payment.createdAt)}
                        </TableCell>
                        <TableCell>
                          {payment.description || 
                           (payment.jobId ? `Payment for Job #${payment.jobId}` : 'Payment')}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No payments found</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="transfer" className="space-y-4">
            {/* Combined earnings and transfers */}
            {earnings.length > 0 || transfers.length > 0 ? (
              <>
                {earnings.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-md font-medium">Earnings</h3>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Job</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Net Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {earnings.map((earning) => (
                            <TableRow key={earning.id}>
                              <TableCell className="font-medium">
                                {formatDate(earning.dateEarned)}
                              </TableCell>
                              <TableCell>
                                {earning.jobId ? `Job #${earning.jobId}` : 'Direct Payment'}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(earning.status)}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(earning.netAmount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                
                {transfers.length > 0 && (
                  <div className="space-y-4 mt-4">
                    <h3 className="text-md font-medium">Stripe Transfers</h3>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transfers.map((transfer) => (
                            <TableRow key={transfer.id}>
                              <TableCell className="font-medium">
                                {formatDate(transfer.created * 1000)}
                              </TableCell>
                              <TableCell>
                                {transfer.description || 'Transfer'}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(transfer.status)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(transfer.amount / 100)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No transfers found</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="refund" className="space-y-4">
            {filteredPayments.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {formatDate(payment.createdAt)}
                        </TableCell>
                        <TableCell>
                          {payment.description || `Refund for payment #${payment.id}`}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No refunds found</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}