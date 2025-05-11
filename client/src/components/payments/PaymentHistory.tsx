import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  CreditCard,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  Download,
} from 'lucide-react';

// Helper function to format date
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Helper function to format currency
function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount / 100); // Stripe amounts are in cents
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  let variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'success' = 'default';
  
  switch (status.toLowerCase()) {
    case 'succeeded':
    case 'paid':
    case 'completed':
      variant = 'success';
      break;
    case 'pending':
    case 'processing':
      variant = 'secondary';
      break;
    case 'failed':
    case 'canceled':
    case 'cancelled':
      variant = 'destructive';
      break;
    case 'refunded':
    case 'partial_refunded':
      variant = 'outline';
      break;
    default:
      variant = 'default';
  }
  
  return (
    <Badge variant={variant} className="capitalize">
      {status.replace('_', ' ')}
    </Badge>
  );
}

// Payment type filtering options
const PAYMENT_TYPES = [
  { value: 'all', label: 'All Transactions' },
  { value: 'charge', label: 'Charges' },
  { value: 'refund', label: 'Refunds' },
  { value: 'transfer', label: 'Transfers' },
  { value: 'payout', label: 'Payouts' },
];

// Time period filtering options
const TIME_PERIODS = [
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: '90days', label: 'Last 90 Days' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

// Pagination settings
const ITEMS_PER_PAGE = 10;

export default function PaymentHistory() {
  // Filter and pagination state
  const [activeTab, setActiveTab] = useState('payments');
  const [paymentType, setPaymentType] = useState('all');
  const [timePeriod, setTimePeriod] = useState('30days');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Fetch payments
  const {
    data: paymentsData,
    isLoading: isLoadingPayments,
    isError: isErrorPayments,
  } = useQuery({
    queryKey: ['/api/stripe/payments', { type: paymentType, period: timePeriod, page: currentPage }],
    queryFn: async () => {
      const res = await apiRequest(
        'GET',
        `/api/stripe/payments?type=${paymentType}&period=${timePeriod}&page=${currentPage}&limit=${ITEMS_PER_PAGE}`
      );
      
      if (!res.ok) {
        if (res.status === 404) return { data: [], total: 0 };
        throw new Error('Failed to fetch payments');
      }
      
      return res.json();
    },
  });
  
  // Fetch transfers (money sent to workers)
  const {
    data: transfersData,
    isLoading: isLoadingTransfers,
    isError: isErrorTransfers,
  } = useQuery({
    queryKey: ['/api/stripe/transfers', { period: timePeriod, page: currentPage }],
    queryFn: async () => {
      const res = await apiRequest(
        'GET',
        `/api/stripe/transfers?period=${timePeriod}&page=${currentPage}&limit=${ITEMS_PER_PAGE}`
      );
      
      if (!res.ok) {
        if (res.status === 404) return { data: [], total: 0 };
        throw new Error('Failed to fetch transfers');
      }
      
      return res.json();
    },
    enabled: activeTab === 'transfers',
  });
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when search changes
  };
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1); // Reset to first page when tab changes
  };
  
  // Calculate total pages for pagination
  const totalItems = activeTab === 'payments' 
    ? (paymentsData?.total || 0) 
    : (transfersData?.total || 0);
    
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  
  // Filter data based on search query
  const filteredPayments = activeTab === 'payments' && paymentsData?.data
    ? paymentsData.data.filter((payment: any) => {
        if (!searchQuery) return true;
        
        const searchLower = searchQuery.toLowerCase();
        return (
          payment.description?.toLowerCase().includes(searchLower) ||
          payment.id?.toLowerCase().includes(searchLower) ||
          payment.status?.toLowerCase().includes(searchLower) ||
          payment.amount?.toString().includes(searchLower)
        );
      })
    : [];
    
  const filteredTransfers = activeTab === 'transfers' && transfersData?.data
    ? transfersData.data.filter((transfer: any) => {
        if (!searchQuery) return true;
        
        const searchLower = searchQuery.toLowerCase();
        return (
          transfer.description?.toLowerCase().includes(searchLower) ||
          transfer.id?.toLowerCase().includes(searchLower) ||
          transfer.status?.toLowerCase().includes(searchLower) ||
          transfer.amount?.toString().includes(searchLower) ||
          transfer.destination?.toLowerCase().includes(searchLower)
        );
      })
    : [];
  
  // Render loading state
  const renderLoading = () => (
    <div className="flex justify-center py-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  
  // Render error state
  const renderError = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertCircle className="h-8 w-8 text-destructive mb-2" />
      <h3 className="font-medium">Failed to load payment history</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        There was an error retrieving your transaction history
      </p>
      <Button onClick={() => window.location.reload()} variant="outline">
        Try Again
      </Button>
    </div>
  );
  
  // Render empty state
  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <FileText className="h-8 w-8 text-muted-foreground mb-2" />
      <h3 className="font-medium">No Transactions Found</h3>
      <p className="text-sm text-muted-foreground mt-1">
        {activeTab === 'payments'
          ? "You don't have any payments matching the current filters"
          : "You haven't made any transfers to workers yet"}
      </p>
    </div>
  );
  
  // Render payments table
  const renderPaymentsTable = () => {
    if (isLoadingPayments) return renderLoading();
    if (isErrorPayments) return renderError();
    if (!filteredPayments.length) return renderEmpty();
    
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment: any) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono text-xs">
                    {payment.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>{payment.description || 'Payment'}</TableCell>
                  <TableCell>{formatDate(payment.created)}</TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>
                    <StatusBadge status={payment.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" title="View details">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {renderPagination()}
      </div>
    );
  };
  
  // Render transfers table
  const renderTransfersTable = () => {
    if (isLoadingTransfers) return renderLoading();
    if (isErrorTransfers) return renderError();
    if (!filteredTransfers.length) return renderEmpty();
    
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Worker</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransfers.map((transfer: any) => (
                <TableRow key={transfer.id}>
                  <TableCell className="font-mono text-xs">
                    {transfer.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    {transfer.workerName || 'Worker #' + transfer.workerId}
                  </TableCell>
                  <TableCell>
                    {transfer.jobTitle 
                      ? `Job #${transfer.jobId}: ${transfer.jobTitle}`
                      : transfer.jobId
                        ? `Job #${transfer.jobId}`
                        : 'Direct Transfer'
                    }
                  </TableCell>
                  <TableCell>{formatDate(transfer.created)}</TableCell>
                  <TableCell>{formatCurrency(transfer.amount)}</TableCell>
                  <TableCell>
                    <StatusBadge status={transfer.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {renderPagination()}
      </div>
    );
  };
  
  // Render pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              isActive={currentPage > 1}
            />
          </PaginationItem>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(page => {
              // Show first page, last page, and pages around current page
              return page === 1 || 
                     page === totalPages || 
                     (page >= currentPage - 1 && page <= currentPage + 1);
            })
            .map((page, i, array) => {
              // Add ellipsis if there are gaps
              const showEllipsisBefore = i > 0 && array[i-1] !== page - 1;
              const showEllipsisAfter = i < array.length - 1 && array[i+1] !== page + 1;
              
              return (
                <React.Fragment key={page}>
                  {showEllipsisBefore && (
                    <PaginationItem>
                      <PaginationLink disabled>...</PaginationLink>
                    </PaginationItem>
                  )}
                  
                  <PaginationItem>
                    <PaginationLink
                      isActive={page === currentPage}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                  
                  {showEllipsisAfter && (
                    <PaginationItem>
                      <PaginationLink disabled>...</PaginationLink>
                    </PaginationItem>
                  )}
                </React.Fragment>
              );
            })}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              isActive={currentPage < totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };
  
  // Main render
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
        <CardDescription>
          View your payment transactions and worker transfers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs 
          defaultValue="payments" 
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="transfers">Worker Transfers</TabsTrigger>
          </TabsList>
          
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-8"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              {activeTab === 'payments' && (
                <Select value={paymentType} onValueChange={setPaymentType}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Time period" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_PERIODS.map(period => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <TabsContent value="payments" className="space-y-4">
            {renderPaymentsTable()}
          </TabsContent>
          
          <TabsContent value="transfers" className="space-y-4">
            {renderTransfersTable()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}