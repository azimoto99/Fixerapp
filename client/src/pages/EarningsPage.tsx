import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Earning, Job, User } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import RatingDisplay from '@/components/RatingDisplay';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DollarSign, Calendar, Check, Clock, ChevronRight, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function EarningsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'earnings' | 'payments'>('earnings');

  // Fetch the worker's earnings
  const { data: earnings, isLoading: earningsLoading } = useQuery<Earning[]>({
    queryKey: ['/api/earnings/worker', user?.id],
    enabled: !!user && user.accountType === 'worker',
  });

  // Fetch the worker's completed jobs
  const { data: completedJobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ['/api/jobs', { workerId: user?.id, status: 'completed' }],
    enabled: !!user && user.accountType === 'worker',
  });

  // Calculate total earnings
  const totalEarnings = earnings?.reduce((total, earning) => total + earning.amount, 0) || 0;
  const totalNetEarnings = earnings?.reduce((total, earning) => total + earning.netAmount, 0) || 0;
  const pendingPayments = earnings?.filter(e => e.status === 'pending').length || 0;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Handle payment request
  const handleRequestPayment = () => {
    // In a real implementation, this would initiate a payment request to the system
    toast({
      title: "Payment Requested",
      description: "Your payment request has been submitted and will be processed soon.",
    });
  };

  if (!user || user.accountType !== 'worker') {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-medium">Earnings are only available for worker accounts</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Please sign in with a worker account to view your earnings
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Earnings & Payments</h1>
        <p className="text-muted-foreground">
          Track your job earnings and payment history
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription>Total Earnings</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <DollarSign className="h-5 w-5 mr-1 text-green-500" />
              {formatCurrency(totalEarnings)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Net after service fees: {formatCurrency(totalNetEarnings)}
            </div>
          </CardContent>
          <div className="absolute bottom-0 right-0 w-16 h-16 bg-green-100 rounded-tl-full opacity-20" />
          <TrendingUp className="absolute bottom-2 right-2 h-6 w-6 text-green-500 opacity-60" />
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed Jobs</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Check className="h-5 w-5 mr-1 text-blue-500" />
              {completedJobs?.length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {user.rating && <RatingDisplay rating={user.rating} showCount={false} className="mt-1" />}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Payments</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Clock className="h-5 w-5 mr-1 text-amber-500" />
              {pendingPayments}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full"
              disabled={pendingPayments === 0}
              onClick={handleRequestPayment}
            >
              Request Payment
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'earnings' | 'payments')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="earnings">Earnings History</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="earnings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Earnings</CardTitle>
              <CardDescription>
                History of your earnings from completed jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {earningsLoading ? (
                <div className="py-4 text-center">Loading earnings...</div>
              ) : earnings && earnings.length > 0 ? (
                <div className="space-y-4">
                  {earnings.map((earning) => (
                    <div key={earning.id} className="flex flex-col space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">
                            Job #{earning.jobId}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {earning.dateEarned && format(new Date(earning.dateEarned), 'MMM d, yyyy')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-lg">
                            {formatCurrency(earning.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Fee: {formatCurrency(earning.serviceFee)}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          earning.status === 'paid' 
                            ? 'bg-green-100 text-green-800'
                            : earning.status === 'pending' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {earning.status.charAt(0).toUpperCase() + earning.status.slice(1)}
                        </span>
                        <div className="text-sm font-medium">
                          Net: {formatCurrency(earning.netAmount)}
                        </div>
                      </div>
                      <Separator className="mt-2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">No earnings yet</p>
                  <p className="text-sm mt-1">Complete jobs to start earning</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Payments</CardTitle>
              <CardDescription>
                History of payments received
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center">
                <p className="text-muted-foreground">No payment history yet</p>
                <p className="text-sm mt-1">Payments will appear here once processed</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}