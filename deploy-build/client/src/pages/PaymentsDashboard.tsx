import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'wouter';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import PaymentMethodManager from '@/components/payments/PaymentMethodManager';
import StripeConnectOnboarding from '@/components/payments/StripeConnectOnboarding';
import { 
  CreditCard, 
  ArrowUpRight, 
  Wallet, 
  Coins, 
  BarChart3, 
  Clock, 
  ShieldCheck, 
  CreditCardIcon,
  BanknoteIcon,
  Building2
} from 'lucide-react';

// Payment Activity Card Component
const PaymentActivityCard: React.FC<{
  title: string;
  amount: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  type: 'payment' | 'payout';
  jobId?: number;
  jobTitle?: string;
}> = ({ title, amount, date, status, type, jobId, jobTitle }) => {
  // Status styling
  const getStatusClasses = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    }
  };

  return (
    <div className="flex items-center py-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${type === 'payment' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
        {type === 'payment' ? (
          <ArrowUpRight className="h-5 w-5" />
        ) : (
          <ArrowUpRight className="h-5 w-5 transform rotate-180" />
        )}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center">
          <div>
            <p className="font-medium">{title}</p>
            {jobTitle && (
              <p className="text-sm text-muted-foreground">
                Job: {jobTitle}
              </p>
            )}
          </div>
          
          <div className="ml-auto text-right">
            <p className={`font-medium ${type === 'payment' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {type === 'payment' ? '-' : '+'}{amount}
            </p>
            <p className="text-xs text-muted-foreground">{date}</p>
          </div>
        </div>
      </div>
      
      <div className="ml-4">
        <span className={`inline-flex text-xs px-2 py-1 rounded-full ${getStatusClasses()}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
}> = ({ title, value, icon, description, trend }) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className={`flex items-center mt-2 text-xs ${trend.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <span>{trend.positive ? '↑' : '↓'} {trend.value}</span>
            <span className="ml-1">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const PaymentsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Get user information to determine if they need to onboard for Connect
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/user');
      if (!res.ok) {
        throw new Error('Failed to fetch user data');
      }
      return res.json();
    }
  });
  
  // Get payment statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/stripe/payment-stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/stripe/payment-stats');
      if (!res.ok) {
        return {
          totalEarned: 0,
          totalSpent: 0,
          pendingPayouts: 0,
          upcomingPayments: 0
        };
      }
      return res.json();
    },
    enabled: !!userData
  });
  
  // Get recent payment activity
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['/api/stripe/payment-activity'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/stripe/payment-activity');
      if (!res.ok) {
        return [];
      }
      return res.json();
    },
    enabled: !!userData
  });
  
  // Get Connect account status
  const { data: connectAccount, isLoading: connectLoading } = useQuery({
    queryKey: ['/api/stripe/connect/account-status'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/stripe/connect/account-status');
      if (!res.ok) {
        return {
          accountId: null,
          status: null
        };
      }
      return res.json();
    },
    enabled: !!userData
  });

  const needsStripeConnect = userData?.accountType === 'worker' && (!connectAccount?.accountId || connectAccount?.status !== 'active');
  
  // If user hasn't set up their account, direct them to onboarding
  if (!userLoading && userData && needsStripeConnect && userData.accountType === 'worker') {
    return (
      <div className="container max-w-5xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6 flex items-center">
          <Wallet className="mr-2 h-7 w-7" />
          Payment Setup
        </h1>
        <p className="text-muted-foreground mb-8">
          Complete your Stripe Connect account setup to start receiving payments for jobs
        </p>
        
        <StripeConnectOnboarding
          onComplete={() => {
            toast({
              title: "Setup Complete",
              description: "Your Stripe Connect account is now ready to receive payments",
            });
            setActiveTab('overview');
          }}
        />
      </div>
    );
  }

  // Default/regular dashboard view
  return (
    <div className="container max-w-6xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2 flex items-center">
        <Wallet className="mr-2 h-7 w-7" />
        Payments Dashboard
      </h1>
      <p className="text-muted-foreground mb-6">
        Manage your payment methods, view transaction history, and track earnings
      </p>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="connect">Connect Account</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Earned"
              value={`$${stats?.totalEarned?.toFixed(2) || '0.00'}`}
              icon={<Coins className="h-4 w-4 text-green-500" />}
              trend={{ value: '12.5%', positive: true }}
            />
            <StatCard
              title="Total Spent"
              value={`$${stats?.totalSpent?.toFixed(2) || '0.00'}`}
              icon={<CreditCard className="h-4 w-4 text-red-500" />}
              trend={{ value: '5.2%', positive: false }}
            />
            <StatCard
              title="Pending Payouts"
              value={`$${stats?.pendingPayouts?.toFixed(2) || '0.00'}`}
              icon={<Clock className="h-4 w-4 text-amber-500" />}
            />
            <StatCard
              title="Upcoming Payments"
              value={`$${stats?.upcomingPayments?.toFixed(2) || '0.00'}`}
              icon={<BarChart3 className="h-4 w-4 text-blue-500" />}
            />
          </div>
          
          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your recent payment activity</CardDescription>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="py-8 text-center">
                  <Clock className="h-8 w-8 animate-pulse text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading payment activity...</p>
                </div>
              ) : activities && activities.length > 0 ? (
                <div className="space-y-1">
                  {activities.map((activity: any, index: number) => (
                    <React.Fragment key={activity.id}>
                      <PaymentActivityCard
                        title={activity.description || (activity.type === 'payment' ? 'Payment' : 'Payout')}
                        amount={`$${activity.amount.toFixed(2)}`}
                        date={new Date(activity.createdAt).toLocaleDateString()}
                        status={activity.status}
                        type={activity.type}
                        jobId={activity.jobId}
                        jobTitle={activity.jobTitle}
                      />
                      {index < activities.length - 1 && <Separator />}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <CreditCardIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">No Activity Yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    Your payment activity will appear here once you start making or receiving payments.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/jobs/browse">Browse Jobs</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Connect Account Status Card */}
          {userData?.accountType === 'worker' && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Stripe Connect Account</CardTitle>
                    <CardDescription>Your payment receiving account status</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setActiveTab('connect')}>
                    Manage
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mr-4">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  
                  <div>
                    <div className="flex items-center">
                      <h3 className="font-medium">
                        {connectAccount?.accountId 
                          ? 'Connect Account Active' 
                          : 'No Connect Account'}
                      </h3>
                      
                      {connectAccount?.status === 'active' ? (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </span>
                      ) : connectAccount?.accountId ? (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          Pending
                        </span>
                      ) : (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                          Not Set Up
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1">
                      {connectAccount?.accountId 
                        ? (connectAccount?.status === 'active' 
                          ? 'Your account is fully set up and ready to receive payments.' 
                          : 'Your account needs additional information before it can receive payments.')
                        : 'Set up a Stripe Connect account to receive payments for jobs.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="methods">
          <PaymentMethodManager />
        </TabsContent>
        
        <TabsContent value="connect">
          {userData?.accountType === 'worker' ? (
            <StripeConnectOnboarding 
              onComplete={() => {
                toast({
                  title: "Setup Complete",
                  description: "Your Stripe Connect account is now fully set up",
                });
                setActiveTab('overview');
              }}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Connect Account</CardTitle>
                <CardDescription>
                  Stripe Connect is only available for worker accounts
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">Worker Account Required</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Stripe Connect accounts are only available for worker accounts. If you're a worker who wants to receive payments, please update your account type.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentsDashboard;