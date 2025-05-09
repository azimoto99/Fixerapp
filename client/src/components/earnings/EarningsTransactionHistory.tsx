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
import { Loader2, Download, ArrowUpRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Earning, Job } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
  
  return (
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EarningsTransactionHistory;