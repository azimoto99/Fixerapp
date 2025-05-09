import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Earning, Job } from '@shared/schema';
import Header from '@/components/Header';
// Mobile Nav removed as requested
import EarningsSummaryChart from '@/components/earnings/EarningsSummaryChart';
import EarningsTransactionHistory from '@/components/earnings/EarningsTransactionHistory';
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
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Redirect } from 'wouter';
import StripeConnectSetup from '@/components/stripe/StripeConnectSetup';

// For earnings filtering
type FilterPeriod = 'all' | 'week' | 'month' | 'year';

export default function EarningsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');
  
  // Fetch earnings data
  const { data: earnings, isLoading } = useQuery<(Earning & { job?: Job })[]>({
    queryKey: ['/api/earnings/worker', user?.id],
    enabled: !!user?.id && user?.accountType === 'worker',
  });

  // Redirect non-worker accounts
  if (user && user.accountType !== 'worker') {
    return <Redirect to="/" />;
  }
  
  // Calculate statistics based on filter period
  const getFilteredEarnings = () => {
    if (!earnings) return [];
    
    const now = new Date();
    let cutoffDate: Date;
    
    switch (filterPeriod) {
      case 'week':
        cutoffDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        return earnings;
    }
    
    return earnings.filter(earning => {
      // Handle possible null dates (should not happen in practice)
      const earningDate = earning.dateEarned ? new Date(earning.dateEarned) : new Date();
      return earningDate >= cutoffDate;
    });
  };
  
  const filteredEarnings = getFilteredEarnings();
  
  // Calculate statistics
  const totalEarnings = filteredEarnings.reduce((sum, earning) => sum + earning.amount, 0);
  const pendingEarnings = filteredEarnings.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
  const paidEarnings = filteredEarnings.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);
  const completedJobs = new Set(filteredEarnings.map(e => e.jobId)).size;
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-80">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        </main>
        {/* Mobile nav removed */}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Earnings Dashboard</h1>
            <p className="text-gray-600 mt-1">Track your earnings and payment history</p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <Select value={filterPeriod} onValueChange={(value) => setFilterPeriod(value as FilterPeriod)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="year">Last 12 Months</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      
        {/* Stripe Connect Setup */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Payment Account Setup</CardTitle>
            <CardDescription>
              Connect your Stripe account to receive payments directly for completed jobs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StripeConnectSetup />
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-md font-medium flex items-center">
                <DollarSign className="h-4 w-4 mr-1 text-primary" />
                Total Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(totalEarnings)}</div>
              <p className="text-xs text-gray-500 mt-1">{completedJobs} completed jobs</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-md font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-1 text-amber-500" />
                Pending Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{formatCurrency(pendingEarnings)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {filteredEarnings.filter(e => e.status === 'pending').length} pending payments
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-md font-medium flex items-center">
                <TrendingUp className="h-4 w-4 mr-1 text-green-600" />
                Paid Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(paidEarnings)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {filteredEarnings.filter(e => e.status === 'paid').length} paid jobs
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-md font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-1 text-blue-600" />
                Payment Threshold
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(10.00)}</div>
              <p className="text-xs text-gray-500 mt-1">
                Minimum withdrawal amount
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Earnings Chart */}
        <div className="mb-8">
          <EarningsSummaryChart earnings={filteredEarnings} isLoading={isLoading} />
        </div>
        
        {/* Transaction History */}
        <div className="mb-8">
          <EarningsTransactionHistory earnings={filteredEarnings} isLoading={isLoading} />
        </div>
        
        {/* Earnings Tabs */}
        <Tabs defaultValue="all">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Earnings</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            <EarningsTable earnings={filteredEarnings} />
          </TabsContent>
          
          <TabsContent value="pending" className="space-y-4">
            <EarningsTable earnings={filteredEarnings.filter(e => e.status === 'pending')} />
          </TabsContent>
          
          <TabsContent value="paid" className="space-y-4">
            <EarningsTable earnings={filteredEarnings.filter(e => e.status === 'paid')} />
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Mobile nav removed */}
    </div>
  );
}

// The earnings table component
function EarningsTable({ earnings }: { earnings: (Earning & { job?: Job })[] }) {
  const { toast } = useToast();
  
  if (earnings.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">No earnings found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Start applying for jobs to earn money and track your payments here.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {earnings.map((earning) => (
              <TableRow key={earning.id}>
                <TableCell className="font-medium">
                  {earning.job?.title || `Job #${earning.jobId}`}
                </TableCell>
                <TableCell>
                  {earning.dateEarned ? new Date(earning.dateEarned).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell>{formatCurrency(earning.amount)}</TableCell>
                <TableCell>
                  <Badge 
                    className={
                      earning.status === 'paid' 
                        ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                        : earning.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                          : 'bg-red-100 text-red-800 hover:bg-red-100'
                    }
                  >
                    {earning.status === 'paid' ? 'Paid' : 
                     earning.status === 'pending' ? 'Pending' : 'Cancelled'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "Details Viewed",
                        description: `You viewed details for ${earning.job?.title || `Job #${earning.jobId}`}`,
                      });
                    }}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}