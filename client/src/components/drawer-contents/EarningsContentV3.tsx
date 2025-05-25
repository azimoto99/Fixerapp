import * as React from 'react'; 
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Earning, Job, Application, Review } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from "@/components/ui/separator";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  Clock, 
  Calendar, 
  Award, 
  Star, 
  CheckCircle2,
  CreditCard,
  PiggyBank,
  BanknoteIcon,
} from 'lucide-react';

interface EarningsContentProps {
  userId: number;
}

const EarningsContentV3: React.FC<EarningsContentProps> = ({ userId }) => {
  const [timeframe, setTimeframe] = useState('month');
  
  // Get earnings for the worker
  const { data: earnings, isLoading } = useQuery<Earning[]>({
    queryKey: [`/api/earnings/worker/${userId}`]
  });
  
  // Get jobs data
  const { data: jobs } = useQuery<Job[]>({
    queryKey: ['/api/jobs']
  });

  // Get Stripe Connect account status
  const { data: connectAccount } = useQuery({
    queryKey: ['/api/stripe/connect/account-status'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/stripe/connect/account-status');
        if (res.status === 404) return { exists: false };
        if (!res.ok) return { exists: false };
        return res.json();
      } catch (error) {
        return { exists: false };
      }
    },
    enabled: !!userId
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate earnings metrics safely
  const safeEarnings = earnings || [];
  const totalEarnings = safeEarnings.reduce((sum, earning) => sum + (earning.amount || 0), 0);
  const pendingEarnings = safeEarnings.filter(e => e.status === 'pending').reduce((sum, earning) => sum + (earning.amount || 0), 0);
  const paidEarnings = safeEarnings.filter(e => e.status === 'paid').reduce((sum, earning) => sum + (earning.amount || 0), 0);
  const completedJobs = safeEarnings.length;

  // Check if Stripe Connect is active
  const isStripeActive = connectAccount && 
    connectAccount.accountId && 
    connectAccount.detailsSubmitted === true && 
    connectAccount.payoutsEnabled === true;

  // Filter earnings by timeframe
  const getFilteredEarnings = () => {
    if (timeframe === 'all') return safeEarnings;
    
    const now = new Date();
    let startDate = new Date();
    
    if (timeframe === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeframe === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeframe === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    }
    
    return safeEarnings.filter((e: any) => e.dateEarned ? new Date(e.dateEarned) >= startDate : false);
  };

  const filteredEarnings = getFilteredEarnings();

  // Prepare chart data
  const chartData = filteredEarnings.map((earning, index) => ({
    name: `Job ${index + 1}`,
    amount: earning.amount,
    date: earning.dateEarned ? new Date(earning.dateEarned).toLocaleDateString() : 'N/A'
  }));

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Earnings Dashboard</h2>
          <p className="text-muted-foreground">Track your earnings and financial performance</p>
        </div>
        {isStripeActive && (
          <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Payment Ready
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-500 rounded-lg">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold text-blue-600">${totalEarnings.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-500 rounded-lg">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paid Out</p>
                <p className="text-2xl font-bold text-green-600">${paidEarnings.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600">${pendingEarnings.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Award className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Jobs Done</p>
                <p className="text-2xl font-bold text-purple-600">{completedJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeframe Selection */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">Time period:</span>
        <Tabs value={timeframe} onValueChange={setTimeframe} className="w-auto">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Charts Section */}
      {safeEarnings.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Earnings Chart */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Earnings Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Earnings */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BanknoteIcon className="h-5 w-5" />
                Recent Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredEarnings.slice(0, 5).map((earning, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">
                        {jobs?.find(j => j.id === earning.jobId)?.title || `Job #${earning.jobId}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {earning.dateEarned ? new Date(earning.dateEarned).toLocaleDateString() : 'Date N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${earning.amount}</p>
                      <Badge variant={earning.status === 'paid' ? 'default' : 'secondary'}>
                        {earning.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Empty State */
        <Card className="border-0 shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <PiggyBank className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Ready to Start Earning!</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              {isStripeActive 
                ? "Your payment account is set up and ready. Complete jobs to start tracking your earnings here."
                : "Complete jobs to start earning. Your payments will be processed securely."}
            </p>
            <Button variant="default">
              Browse Available Jobs
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EarningsContentV3;