import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowDownUp, Search, FileSpreadsheet, Calendar, Receipt, Clock, CircleDollarSign } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface PaymentHistoryProps {
  userId?: number;
  workerId?: number;
  jobId?: number;
  limit?: number;
}

export default function PaymentHistory({
  userId,
  workerId,
  jobId,
  limit = 10
}: PaymentHistoryProps) {
  const [activeTab, setActiveTab] = useState<string>('payments');
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Fetch payments
  const {
    data: paymentsData,
    isLoading: isLoadingPayments,
    error: paymentsError,
  } = useQuery({
    queryKey: ['/api/payments', { userId, limit }],
    queryFn: async () => {
      let endpoint = '/api/payments';
      if (userId) endpoint += `/user/${userId}`;
      if (limit) endpoint += `?limit=${limit}`;
      
      const res = await apiRequest('GET', endpoint);
      if (!res.ok) {
        if (res.status === 404) return { data: [] };
        throw new Error('Failed to fetch payments');
      }
      return res.json();
    },
    enabled: activeTab === 'payments',
  });
  
  // Fetch earnings if workerId is provided
  const {
    data: earningsData,
    isLoading: isLoadingEarnings,
    error: earningsError,
  } = useQuery({
    queryKey: ['/api/earnings', { workerId, limit }],
    queryFn: async () => {
      let endpoint = `/api/earnings/worker/${workerId}`;
      if (limit) endpoint += `?limit=${limit}`;
      
      const res = await apiRequest('GET', endpoint);
      if (!res.ok) {
        if (res.status === 404) return { data: [] };
        throw new Error('Failed to fetch earnings');
      }
      return res.json();
    },
    enabled: !!workerId && activeTab === 'earnings',
  });
  
  // Fetch transfers if workerId is provided
  const {
    data: transfersData,
    isLoading: isLoadingTransfers,
    error: transfersError,
  } = useQuery({
    queryKey: ['/api/stripe/transfers', { workerId, limit }],
    queryFn: async () => {
      let endpoint = `/api/stripe/transfers/worker/${workerId}`;
      if (limit) endpoint += `?limit=${limit}`;
      
      const res = await apiRequest('GET', endpoint);
      if (!res.ok) {
        if (res.status === 404) return { data: [] };
        throw new Error('Failed to fetch transfers');
      }
      return res.json();
    },
    enabled: !!workerId && activeTab === 'transfers',
  });
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  // Get payment badge color based on status
  const getPaymentStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
      case 'paid':
      case 'complete':
        return <Badge variant="success">Paid</Badge>;
      case 'pending':
      case 'processing':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Processing</Badge>;
      case 'failed':
      case 'canceled':
        return <Badge variant="destructive">Failed</Badge>;
      case 'refunded':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Filter payments
  const filteredPayments = paymentsData?.data?.filter((payment: any) => {
    if (filter !== 'all' && payment.status.toLowerCase() !== filter.toLowerCase()) {
      return false;
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        (payment.description && payment.description.toLowerCase().includes(query)) ||
        (payment.transactionId && payment.transactionId.toLowerCase().includes(query)) ||
        (payment.status && payment.status.toLowerCase().includes(query))
      );
    }
    
    return true;
  }) || [];
  
  // Render payment rows
  const renderPaymentRows = () => {
    if (filteredPayments.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="text-center py-8">
            <div className="flex flex-col items-center">
              <Receipt className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No payment history found</p>
            </div>
          </TableCell>
        </TableRow>
      );
    }
    
    return filteredPayments.map((payment: any) => (
      <TableRow key={payment.id}>
        <TableCell className="font-medium">
          {payment.description || `Payment #${payment.id}`}
        </TableCell>
        <TableCell>{formatDate(payment.dateCreated)}</TableCell>
        <TableCell>{formatCurrency(payment.amount)}</TableCell>
        <TableCell>{payment.paymentType || 'Card'}</TableCell>
        <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
      </TableRow>
    ));
  };
  
  // Render earnings rows
  const renderEarningRows = () => {
    const earnings = earningsData?.data || [];
    
    if (earnings.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="text-center py-8">
            <div className="flex flex-col items-center">
              <CircleDollarSign className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No earnings history found</p>
            </div>
          </TableCell>
        </TableRow>
      );
    }
    
    return earnings.map((earning: any) => (
      <TableRow key={earning.id}>
        <TableCell className="font-medium">
          {earning.description || `Earning for Job #${earning.jobId}`}
        </TableCell>
        <TableCell>{formatDate(earning.dateEarned)}</TableCell>
        <TableCell>{formatCurrency(earning.amount)}</TableCell>
        <TableCell>{earning.jobId ? `Job #${earning.jobId}` : 'Direct'}</TableCell>
        <TableCell>
          {earning.datePaid 
            ? <Badge variant="success">Paid on {formatDate(earning.datePaid)}</Badge>
            : <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>
          }
        </TableCell>
      </TableRow>
    ));
  };
  
  // Render transfer rows
  const renderTransferRows = () => {
    const transfers = transfersData?.data || [];
    
    if (transfers.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="text-center py-8">
            <div className="flex flex-col items-center">
              <ArrowDownUp className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No transfers found</p>
            </div>
          </TableCell>
        </TableRow>
      );
    }
    
    return transfers.map((transfer: any) => (
      <TableRow key={transfer.id || transfer.transfer_id}>
        <TableCell className="font-medium">
          {transfer.description || `Transfer to bank account`}
        </TableCell>
        <TableCell>{formatDate(transfer.created)}</TableCell>
        <TableCell>{formatCurrency(Number(transfer.amount) / 100)}</TableCell>
        <TableCell>{transfer.source_type || 'Stripe'}</TableCell>
        <TableCell>
          {transfer.status === 'paid' 
            ? <Badge variant="success">Completed</Badge>
            : <Badge variant="outline">{transfer.status}</Badge>
          }
        </TableCell>
      </TableRow>
    ));
  };
  
  // Loading state
  const isLoading = 
    (activeTab === 'payments' && isLoadingPayments) ||
    (activeTab === 'earnings' && isLoadingEarnings) || 
    (activeTab === 'transfers' && isLoadingTransfers);
    
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payments">
            <Receipt className="h-4 w-4 mr-2" />
            Payments
          </TabsTrigger>
          {workerId && (
            <TabsTrigger value="earnings">
              <CircleDollarSign className="h-4 w-4 mr-2" />
              Earnings
            </TabsTrigger>
          )}
          {workerId && (
            <TabsTrigger value="transfers">
              <ArrowDownUp className="h-4 w-4 mr-2" />
              Transfers
            </TabsTrigger>
          )}
        </TabsList>
        
        <div className="flex justify-between items-center mt-4 mb-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search payments..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {activeTab === 'payments' && (
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Status</SelectLabel>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="succeeded">Succeeded</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </div>
        
        <TabsContent value="payments" className="pt-4">
          <Table>
            <TableCaption>A list of your recent payment transactions.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderPaymentRows()}
            </TableBody>
          </Table>
        </TabsContent>
        
        <TabsContent value="earnings" className="pt-4">
          <Table>
            <TableCaption>A list of your recent earnings.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Date Earned</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderEarningRows()}
            </TableBody>
          </Table>
        </TabsContent>
        
        <TabsContent value="transfers" className="pt-4">
          <Table>
            <TableCaption>A list of transfers to your bank account.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderTransferRows()}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="text-xs flex items-center">
          <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
          Export CSV
        </Button>
      </div>
    </div>
  );
}