import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, FileText, CreditCard, Calendar, DownloadCloud } from 'lucide-react';
import { Payment, Earning } from '@shared/schema';
import DownloadReceipt from '@/components/DownloadReceipt';

const TransactionHistory: React.FC = () => {
  const { user } = useAuth();
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

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

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Transaction History</h1>

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
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !payments || payments.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>You haven't made any payments yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {payments.map((payment: Payment) => (
                    <div key={payment.id} className="border rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">{payment.description || 'Payment'}</div>
                        {getStatusBadge(payment.status)}
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {payment.createdAt ? formatDate(new Date(payment.createdAt)) : 'N/A'}
                        </div>
                        <div className="font-medium text-black">
                          {formatCurrency(payment.amount)}
                        </div>
                      </div>
                      <div className="flex justify-end">
                        {payment.status === 'completed' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadReceipt(payment.id)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Receipt
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
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
            </CardHeader>
            <CardContent>
              {earningsLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !earnings || earnings.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>You haven't received any earnings yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {earnings.map((earning: Earning) => (
                    <div key={earning.id} className="border rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">Job Payment</div>
                        <Badge className={
                          earning.status === 'paid' 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        }>
                          {earning.status === 'paid' ? 'Paid' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div className="text-gray-600">Amount:</div>
                        <div className="font-medium text-black">{formatCurrency(earning.amount)}</div>
                        <div className="text-gray-600">Service Fee:</div>
                        <div className="text-red-600">{formatCurrency(earning.serviceFee || 2.50)}</div>
                        <div className="text-gray-600">Net Earnings:</div>
                        <div className="font-bold text-green-600">{formatCurrency(earning.netAmount)}</div>
                        <div className="text-gray-600">Date:</div>
                        <div>{earning.dateEarned ? formatDate(new Date(earning.dateEarned)) : 'N/A'}</div>
                      </div>
                    </div>
                  ))}
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