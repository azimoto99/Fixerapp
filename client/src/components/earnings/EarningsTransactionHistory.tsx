import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Loader2, Download, ArrowUpRight, Filter, Clock, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Earning, Job } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface EarningsTransactionHistoryProps {
  earnings: (Earning & { job?: Job })[];
  isLoading: boolean;
}

// Define filter options
type StatusFilter = 'all' | 'pending' | 'paid' | 'cancelled';
type SortOrder = 'newest' | 'oldest' | 'highest' | 'lowest';

const EarningsTransactionHistory: React.FC<EarningsTransactionHistoryProps> = ({ 
  earnings, 
  isLoading 
}) => {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [selectedEarning, setSelectedEarning] = useState<(Earning & { job?: Job }) | null>(null);
  const [transactionDetailsOpen, setTransactionDetailsOpen] = useState(false);
  
  // Filter and sort earnings
  const filteredEarnings = React.useMemo(() => {
    // Apply status filter
    let filtered = [...(earnings || [])];
    if (statusFilter !== 'all') {
      filtered = filtered.filter(earning => earning.status === statusFilter);
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return new Date(b.dateEarned || 0).getTime() - new Date(a.dateEarned || 0).getTime();
        case 'oldest':
          return new Date(a.dateEarned || 0).getTime() - new Date(b.dateEarned || 0).getTime();
        case 'highest':
          return b.amount - a.amount;
        case 'lowest':
          return a.amount - b.amount;
        default:
          return 0;
      }
    });
  }, [earnings, statusFilter, sortOrder]);
  
  // Handle export earnings
  const handleExportEarnings = () => {
    // Prepare CSV content
    const headers = [
      'Job ID', 
      'Job Title', 
      'Amount', 
      'Service Fee', 
      'Net Amount', 
      'Status', 
      'Date Earned', 
      'Date Paid'
    ].join(',');
    
    const rows = filteredEarnings.map(earning => [
      earning.jobId,
      `"${earning.job?.title || `Job #${earning.jobId}`}"`, // Quote to handle commas
      earning.amount,
      earning.serviceFee,
      earning.netAmount,
      earning.status,
      earning.dateEarned ? new Date(earning.dateEarned).toLocaleDateString() : 'N/A',
      earning.datePaid ? new Date(earning.datePaid).toLocaleDateString() : 'N/A'
    ].join(','));
    
    const csvContent = [headers, ...rows].join('\n');
    
    // Create a Blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `earnings-report-${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: "Your earnings report has been downloaded as a CSV file.",
    });
  };
  
  // Status badge renderer
  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/30">
            Paid
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/30">
            Pending
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/30">
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
    }
  };
  
  // Mutations for transaction actions
  const updateEarningStatusMutation = useMutation({
    mutationFn: async (data: { earningId: number; status: string }) => {
      const res = await apiRequest('POST', '/api/earnings/update-status', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/earnings/worker'] });
      toast({
        title: "Status Updated",
        description: "The payment status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update payment status. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Handle download receipt
  const handleDownloadReceipt = (earning: Earning & { job?: Job }) => {
    // Prepare receipt data for download
    const receiptData = `
Receipt for Payment #${earning.id}
-----------------------------
Job: ${earning.job?.title || `Job #${earning.jobId}`}
Date: ${earning.dateEarned ? new Date(earning.dateEarned).toLocaleDateString() : 'N/A'}
Status: ${earning.status.toUpperCase()}
${earning.datePaid ? `Date Paid: ${new Date(earning.datePaid).toLocaleDateString()}` : ''}

Amount: ${formatCurrency(earning.amount)}
Service Fee: ${formatCurrency(earning.serviceFee)}
Net Amount: ${formatCurrency(earning.netAmount)}
-----------------------------
Thank you for using our platform!
    `;
    
    // Create a blob and download
    const blob = new Blob([receiptData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `receipt-${earning.id}.txt`);
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Receipt Downloaded",
      description: "Your receipt has been downloaded.",
    });
  };
  
  // Handle check payment status
  const handleCheckStatus = (earning: Earning & { job?: Job }) => {
    toast({
      title: "Payment Status",
      description: `Your payment for ${earning.job?.title || `Job #${earning.jobId}`} is ${earning.status}. ${earning.status === 'pending' ? 'It is being processed and will be deposited to your account soon.' : ''}`,
    });
  };
  
  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col space-y-2 md:flex-row md:justify-between md:items-center md:space-y-0">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                View all your earnings transactions
              </CardDescription>
            </div>
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center"
                onClick={handleExportEarnings}
                disabled={isLoading || !filteredEarnings.length}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <div className="flex space-x-2">
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                  <SelectTrigger className="w-[130px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
                  <SelectTrigger className="w-[130px]">
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="highest">Highest Amount</SelectItem>
                    <SelectItem value="lowest">Lowest Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !filteredEarnings.length ? (
            <div className="text-center py-12 bg-muted/10 rounded-md">
              <p className="text-muted-foreground">No transactions found for the selected filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Service Fee</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEarnings.map((earning) => (
                    <TableRow key={earning.id}>
                      <TableCell className="font-medium">
                        {earning.job?.title || `Job #${earning.jobId}`}
                      </TableCell>
                      <TableCell>
                        {earning.dateEarned ? new Date(earning.dateEarned).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(earning.amount)}
                      </TableCell>
                      <TableCell className="text-destructive">
                        {formatCurrency(earning.serviceFee)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(earning.netAmount)}
                      </TableCell>
                      <TableCell>
                        {renderStatusBadge(earning.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedEarning(earning);
                            setTransactionDetailsOpen(true);
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Transaction Details Dialog */}
      <Dialog open={transactionDetailsOpen} onOpenChange={setTransactionDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              {selectedEarning && (
                <>Payment information for {selectedEarning.job?.title || `Job #${selectedEarning.jobId}`}</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEarning && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">Job Title:</div>
                <div>{selectedEarning.job?.title || `Job #${selectedEarning.jobId}`}</div>
                
                <div className="font-medium">Date Earned:</div>
                <div>{selectedEarning.dateEarned ? new Date(selectedEarning.dateEarned).toLocaleDateString() : 'N/A'}</div>
                
                <div className="font-medium">Date Paid:</div>
                <div>{selectedEarning.datePaid ? new Date(selectedEarning.datePaid).toLocaleDateString() : 'Pending'}</div>
                
                <div className="font-medium">Gross Amount:</div>
                <div className="text-primary font-semibold">{formatCurrency(selectedEarning.amount)}</div>
                
                <div className="font-medium">Service Fee:</div>
                <div className="text-destructive">{formatCurrency(selectedEarning.serviceFee)}</div>
                
                <div className="font-medium">Net Amount:</div>
                <div className="text-green-600 font-semibold">{formatCurrency(selectedEarning.netAmount)}</div>
                
                <div className="font-medium">Status:</div>
                <div>
                  {renderStatusBadge(selectedEarning.status)}
                </div>
                
                <div className="font-medium">Transaction ID:</div>
                <div className="text-xs font-mono">{selectedEarning.id}</div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {selectedEarning.status === 'pending' ? (
                    <div className="flex items-center text-amber-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>This payment is currently being processed and will be deposited to your account soon.</span>
                    </div>
                  ) : selectedEarning.status === 'paid' ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      <span>This payment has been processed and deposited to your account.</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <XCircle className="h-4 w-4 mr-2" />
                      <span>This payment was cancelled or declined.</span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDownloadReceipt(selectedEarning)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Receipt
                  </Button>
                  
                  {selectedEarning.status === 'pending' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCheckStatus(selectedEarning)}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Check Status
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setTransactionDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EarningsTransactionHistory;