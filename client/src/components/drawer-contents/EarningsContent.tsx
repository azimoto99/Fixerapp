import * as React from 'react'; 
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Earning, Job, Application, Review } from '@shared/schema';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { 
  Loader2, 
  ArrowUpRight, 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  Clock, 
  Calendar, 
  Award, 
  Star, 
  Download,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  PiggyBank,
  AlertCircle,
  BanknoteIcon,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

interface EarningsContentProps {
  userId: number;
}

const EarningsContent: React.FC<EarningsContentProps> = ({ userId }) => {
  const [timeframe, setTimeframe] = useState('month');
  const { toast } = useToast();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  
  // Check Stripe Connect Account Status
  const { 
    data: connectAccount, 
    isLoading: isLoadingAccount,
    refetch: refetchAccount
  } = useQuery({
    queryKey: ['/api/stripe/connect/account-status'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/stripe/connect/account-status');
        if (res.status === 404) {
          // No account yet, which is fine
          return { exists: false };
        }
        if (!res.ok) {
          const errorData = await res.json();
          return { exists: false, error: errorData.message || 'Failed to get account status' };
        }
        return res.json();
      } catch (error) {
        console.error('Error fetching Stripe Connect account:', error);
        return { exists: false, error: 'Connection error' };
      }
    },
    retry: false,
  });
  
  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      setIsCreatingAccount(true);
      try {
        const res = await apiRequest('POST', '/api/stripe/connect/create-account', {
          acceptedTerms: true
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to create Stripe Connect account');
        }
        return res.json();
      } catch (error) {
        console.error('Mutation error:', error);
        throw error;
      } finally {
        setIsCreatingAccount(false);
      }
    },
    onSuccess: (data) => {
      toast({
        title: 'Account created!',
        description: 'Your Stripe Connect account has been created. Redirecting to complete setup...',
      });
      
      // Redirect to the onboarding URL
      if (data.accountLinkUrl) {
        setTimeout(() => {
          window.location.href = data.accountLinkUrl;
        }, 1000);
      } else {
        refetchAccount();
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create account: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Fetch earnings data
  const { 
    data: earnings, 
    isLoading,
    error: earningsError
  } = useQuery<any[]>({
    queryKey: [`/api/earnings/worker/${userId}`],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', `/api/earnings/worker/${userId}`);
        if (!res.ok) {
          // Return empty array on error
          console.error("Error fetching earnings:", await res.text());
          return [];
        }
        return res.json();
      } catch (error) {
        console.error("Error fetching earnings:", error);
        return [];
      }
    },
    retry: false
  });
  
  // Fetch job data the worker has completed
  const { data: jobs } = useQuery<Job[]>({
    queryKey: ['/api/jobs', { workerId: userId }],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/jobs?workerId=${userId}`);
        if (!res.ok) return [];
        return res.json();
      } catch (error) {
        console.error("Error fetching jobs:", error);
        return [];
      }
    },
  });
  
  // Get reviews for the worker
  const { data: reviews } = useQuery<Review[]>({
    queryKey: [`/api/reviews/user/${userId}`]
  });
  
  // Get applications for the worker
  const { data: applications } = useQuery<Application[]>({
    queryKey: [`/api/applications/worker/${userId}`]
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-36">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!earnings || earnings.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b">
          <h2 className="text-sm font-medium text-muted-foreground">Earnings Dashboard</h2>
        </div>
        
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="bg-primary/10 rounded-full p-3 h-12 w-12 flex items-center justify-center">
                <PiggyBank className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="font-medium">Set Up Stripe Connect to Receive Payments</h3>
                <p className="text-sm text-muted-foreground">
                  Create a Stripe Connect account to receive direct deposits for completed jobs.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button 
                    size="sm"
                    variant="default"
                    className="text-xs"
                    onClick={() => createAccountMutation.mutate()}
                    disabled={isCreatingAccount}
                  >
                    {isCreatingAccount ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>Set Up Payment Account</>
                    )}
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    asChild
                  >
                    <a href="https://stripe.com/connect" target="_blank" rel="noopener noreferrer">
                      Learn More
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="rounded-lg border p-8 flex flex-col items-center justify-center text-center">
          <div className="bg-muted rounded-full p-4 mb-4">
            <DollarSign className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No earnings yet</h3>
          <p className="text-muted-foreground text-sm max-w-md">
            Complete jobs to start tracking your earnings here. Apply to available jobs to start earning.
          </p>
          <Button className="mt-4" variant="outline" asChild>
            <a href="/jobs">Browse Available Jobs</a>
          </Button>
        </div>
      </div>
    );
  }

  // Calculate total and pending earnings
  const totalEarnings = earnings.reduce((acc, curr) => acc + curr.amount, 0);
  const paidEarnings = earnings
    .filter(e => e.status === 'paid')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const pendingEarnings = totalEarnings - paidEarnings;

  // Format dates for the charts
  const formatDate = (dateString: Date | string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString.toString());
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // Filter earnings by timeframe
  const getFilteredEarnings = () => {
    if (!earnings || earnings.length === 0) return [];
    
    if (timeframe === 'all') return earnings;
    
    const now = new Date();
    let startDate = new Date();
    
    if (timeframe === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeframe === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeframe === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    }
    
    return earnings.filter((e: any) => e.dateEarned ? new Date(e.dateEarned) >= startDate : false);
  };

  const filteredEarnings = getFilteredEarnings();
  
  // Prepare data for the bar chart - ensure no empty data
  const chartData = filteredEarnings.length > 0 
    ? filteredEarnings.map(earning => ({
        date: formatDate(earning.dateEarned),
        amount: earning.amount,
        jobTitle: jobs?.find(j => j.id === earning.jobId)?.title || `Job #${earning.jobId || ''}`,
      }))
    : [];

  // Status distribution for pie chart
  const statusData = [
    {
      name: 'Paid',
      value: filteredEarnings.filter(e => e.status === 'paid').length,
    },
    {
      name: 'Pending',
      value: filteredEarnings.filter(e => e.status === 'pending').length,
    },
  ].filter(data => data.value > 0); // Only include non-zero data

  const COLORS = ['#0088FE', '#FFBB28'];

  // Calculate Stripe Connect onboarding progress
  const calculateProgress = () => {
    if (!connectAccount || !connectAccount.exists) return 0;
    if (connectAccount.account?.charges_enabled) return 100;
    
    // Calculate based on requirements and capabilities
    let progress = 20; // Start with 20% for having an account
    const capabilities = connectAccount.account?.capabilities || {};
    const requirements = connectAccount.account?.requirements || {};
    
    // Add points for capabilities
    if (capabilities.transfers === 'active') progress += 20;
    if (capabilities.card_payments === 'active') progress += 20;
    
    // Check if there are pending requirements
    const pendingRequirements = requirements.currently_due?.length || 0;
    if (pendingRequirements === 0) progress += 20;
    
    // Check if representative and external account are provided
    if (connectAccount.account?.company?.directors_provided) progress += 10;
    if (connectAccount.account?.external_accounts?.data?.length > 0) progress += 10;
    
    return Math.min(progress, 99); // Cap at 99% until fully enabled
  };
  
  // Calculate average earning
  const averageEarning = 
    filteredEarnings.length > 0 
      ? filteredEarnings.reduce((acc, curr) => acc + curr.amount, 0) / filteredEarnings.length 
      : 0;

  return (
    <div className="space-y-6">
      <Card className={`${connectAccount?.account?.charges_enabled ? "bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800" : "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800"}`}>
        <CardHeader>
          <CardTitle className={`${connectAccount?.account?.charges_enabled ? "text-green-800 dark:text-green-300" : "text-blue-800 dark:text-blue-300"}`}>
            {connectAccount?.account?.charges_enabled 
              ? "Stripe Connect Account Active" 
              : connectAccount?.exists 
                ? "Stripe Connect Account Setup In Progress" 
                : "Payment Account Status"}
          </CardTitle>
        </CardHeader>
        <CardContent className={`${connectAccount?.account?.charges_enabled ? "text-green-800 dark:text-green-300" : "text-blue-800 dark:text-blue-300"}`}>
          {isLoadingAccount ? (
            <div className="flex items-center space-x-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading account status...</span>
            </div>
          ) : connectAccount?.account?.charges_enabled ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Your Stripe Connect account is fully set up and can accept payments</span>
              </div>
              
              {connectAccount.account.external_accounts?.data?.length > 0 && (
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span>Bank account connected for payouts</span>
                </div>
              )}
              
              <p className="mt-2">
                You can view your earnings, withdraw funds, and manage account settings through the Stripe dashboard.
              </p>
            </div>
          ) : connectAccount?.exists ? (
            <div className="space-y-3">
              <p>Your Stripe Connect account requires additional setup:</p>
              
              {connectAccount.account?.requirements?.currently_due?.length > 0 && (
                <div className="flex items-center space-x-2 text-amber-600">
                  <Clock className="h-5 w-5" />
                  <span>{connectAccount.account.requirements.currently_due.length} items pending verification</span>
                </div>
              )}
              
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${calculateProgress()}%` }}></div>
              </div>
              <p className="text-sm">{calculateProgress()}% complete</p>
            </div>
          ) : (
            <p className="mb-2">
              Set up a Stripe Connect account to receive payments directly to your bank account.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {connectAccount?.account?.charges_enabled ? (
            <>
              <Button 
                variant="outline"
                onClick={() => {
                  const createLoginLink = async () => {
                    try {
                      const res = await apiRequest('POST', '/api/stripe/connect/create-login-link');
                      if (!res.ok) {
                        const errorData = await res.json();
                        throw new Error(errorData.message || 'Failed to create login link');
                      }
                      const data = await res.json();
                      
                      // Navigate to Stripe dashboard
                      if (data.url) {
                        window.location.href = data.url;
                      }
                    } catch (error) {
                      toast({
                        title: 'Error',
                        description: `Failed to open Stripe dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        variant: 'destructive',
                      });
                    }
                  };
                  
                  createLoginLink();
                }}
              >
                View Stripe Dashboard
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => refetchAccount()}
              >
                Refresh Status
              </Button>
            </>
          ) : connectAccount?.exists && connectAccount?.accountLinkUrl ? (
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                if (connectAccount.accountLinkUrl) {
                  window.location.href = connectAccount.accountLinkUrl;
                }
              }}
            >
              Complete Account Setup
            </Button>
          ) : !connectAccount?.exists ? (
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                createAccountMutation.mutate();
              }}
              disabled={isCreatingAccount}
            >
              {isCreatingAccount ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </>
              ) : (
                <>Set Up Payment Account</>
              )}
            </Button>
          ) : (
            <Button 
              variant="outline"
              onClick={() => refetchAccount()}
            >
              Refresh Status
            </Button>
          )}
        </CardFooter>
      </Card>
      
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Earnings Dashboard</h2>
        <Tabs defaultValue="all" className="w-auto">
          <TabsList>
            <TabsTrigger 
              value="week" 
              onClick={() => setTimeframe('week')}
              className={`text-xs ${timeframe === 'week' ? 'bg-primary text-white' : ''}`}
            >
              Week
            </TabsTrigger>
            <TabsTrigger 
              value="month"
              onClick={() => setTimeframe('month')}
              className={`text-xs ${timeframe === 'month' ? 'bg-primary text-white' : ''}`}
            >
              Month
            </TabsTrigger>
            <TabsTrigger 
              value="year"
              onClick={() => setTimeframe('year')}
              className={`text-xs ${timeframe === 'year' ? 'bg-primary text-white' : ''}`}
            >
              Year
            </TabsTrigger>
            <TabsTrigger 
              value="all"
              onClick={() => setTimeframe('all')}
              className={`text-xs ${timeframe === 'all' ? 'bg-primary text-white' : ''}`}
            >
              All
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Total Earnings</span>
              <div className="flex items-center space-x-1">
                <span className="text-2xl font-bold">${totalEarnings.toFixed(2)}</span>
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Pending</span>
              <div className="flex items-center space-x-1">
                <span className="text-2xl font-bold">${pendingEarnings.toFixed(2)}</span>
                <Badge variant="outline" className="ml-2">
                  {earnings.filter(e => e.status === 'pending').length} jobs
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings over time chart */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Earnings Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 20,
                  left: 20,
                  bottom: 60,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip
                  formatter={(value, name, props) => [`$${value}`, props.payload.jobTitle]}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Payment Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">Average Earning</span>
              </div>
              <span className="font-medium">${averageEarning.toFixed(2)}</span>
            </div>
            
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center">
                <Wallet className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">Completed Jobs</span>
              </div>
              <span className="font-medium">{filteredEarnings.length}</span>
            </div>
            
            {filteredEarnings.filter(e => e.status === 'pending').length > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">Pending Payments</span>
                </div>
                <Badge variant="outline">
                  {filteredEarnings.filter(e => e.status === 'pending').length}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEarnings.length > 0 ? (
            <div className="space-y-4">
              {filteredEarnings.slice(0, 5).map((earning, index) => {
                const job = jobs?.find(j => j.id === earning.jobId);
                return (
                  <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{job?.title || `Job #${earning.jobId || ''}`}</p>
                      <p className="text-sm text-muted-foreground">
                        {earning.dateEarned ? new Date(earning.dateEarned.toString()).toLocaleDateString() : 'No date'}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <Badge variant={earning.status === 'paid' ? 'default' : 'secondary'} className="mr-2">
                        {earning.status}
                      </Badge>
                      <span className="font-semibold">${earning.amount.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No recent transactions found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EarningsContent;