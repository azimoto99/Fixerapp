import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type DbUser } from '@shared/schema'; // Changed to import DbUser type
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  TrendingUp,
  ArrowUpRight,
  Trophy,
  Clock,
  Link,
  AlertCircle
} from 'lucide-react';

interface EarningsContentProps {
  user: DbUser; // Changed to use DbUser type
}

const EarningsContent: React.FC<EarningsContentProps> = ({ user }) => {
  const { toast } = useToast();

  // Fetch earnings data
  const { data: earnings, isLoading: earningsLoading } = useQuery<any[], Error>({
    queryKey: ['/api/earnings'],
    enabled: !!user,
  });

  // Fetch Stripe Connect status
  const { data: stripeConnect, isLoading: stripeLoading } = useQuery<any, Error>({
    queryKey: ['/api/stripe/connect/account-status'], // 2. Updated queryKey
    enabled: !!user,
  });

  // 3. Ensure earnings is an array before performing array operations
  const safeEarnings: any[] = Array.isArray(earnings) ? earnings : [];

  // Calculate earnings metrics
  const totalBalance = safeEarnings.reduce((sum: number, earning: any) => {
    return earning.status === 'paid' ? sum + (earning.amount || 0) : sum;
  }, 0);

  const pendingBalance = safeEarnings.reduce((sum: number, earning: any) => {
    return earning.status === 'pending' ? sum + (earning.amount || 0) : sum;
  }, 0);

  // Calculate this week's earnings
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const thisWeekEarnings = safeEarnings.reduce((sum: number, earning: any) => {
    const earningDate = new Date(earning.createdAt);
    return earningDate >= oneWeekAgo && earning.status === 'paid' ? sum + (earning.amount || 0) : sum;
  }, 0);

  // Calculate average per job
  const completedJobs = safeEarnings.filter((earning: any) => earning.status === 'paid').length;
  const avgPerJob = completedJobs > 0 ? totalBalance / completedJobs : 0;
  const handleConnectStripe = async () => {
    try {
      const res = await apiRequest('POST', '/api/stripe/connect/create-account', {});
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create Stripe Connect account');
      }
      const data = await res.json();
      const url = data.accountLinkUrl || data.url;
      if (!url) throw new Error('No onboarding URL received from server');
      window.open(url, '_blank');
      toast({
        title: 'Stripe Connect Setup Started',
        description: 'Complete the setup in the new tab. Return here when finished.',
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Unable to connect Stripe account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 4. Safely check Stripe connection status
  const isStripeActuallyConnected = !!(stripeConnect && typeof stripeConnect.exists === 'boolean' && stripeConnect.exists && stripeConnect.payoutsEnabled);
  const isStripeSetupIncomplete = !!(stripeConnect && stripeConnect.exists && !stripeConnect.payoutsEnabled && stripeConnect.details_submitted === false);

  if (earningsLoading || stripeLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-100px)]"> {/* Adjust height as needed */}
      <div className="p-6 space-y-6">
        {/* Stripe Connect Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Stripe Connect</CardTitle>
            {isStripeActuallyConnected ? (
              <Badge variant="default">Active & Verified</Badge>
            ) : stripeConnect && stripeConnect.exists && !stripeConnect.payoutsEnabled ? (
              <Badge variant="secondary">Pending Verification</Badge>
            ) : (
              <Badge variant="destructive">Not Connected</Badge>
            )}
          </CardHeader>          <CardContent>
            {!stripeConnect || !stripeConnect.exists ? (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Connect your Stripe account to receive payouts for completed jobs.
                </p>
                <Button onClick={handleConnectStripe} className="w-full">
                  <Link className="mr-2 h-4 w-4" /> Connect Stripe Account
                </Button>
              </>
            ) : stripeConnect.exists && !stripeConnect.payoutsEnabled ? (
              <>
                <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-md mb-3">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-yellow-700 mr-2" />
                    <p className="text-sm text-yellow-700">
                      Your Stripe account setup is incomplete or under verification. Please complete the setup to enable payouts.
                    </p>
                  </div>
                </div>
                <Button onClick={handleConnectStripe} className="w-full">
                  <Link className="mr-2 h-4 w-4" /> Connect Stripe Account
                </Button>
              </>
            ) : isStripeActuallyConnected ? (
              <p className="text-sm text-muted-foreground">
                Your Stripe account is connected and verified. You can receive payouts.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Your Stripe account may require further verification. Please complete the setup.
                </p>
                <Button onClick={handleConnectStripe} className="w-full">
                  <Link className="mr-2 h-4 w-4" /> Connect Stripe Account
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Earnings Overview Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Earnings Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Earned</p>
              <p className="text-lg font-semibold">{formatCurrency(totalBalance)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">This Week</p>
              <p className="text-lg font-semibold text-green-600">{formatCurrency(thisWeekEarnings)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg per Job</p>
              <p className="text-lg font-semibold">{formatCurrency(avgPerJob)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">Jobs Completed</p>
              <p className="text-lg font-semibold flex items-center gap-1">
                <Trophy className="h-4 w-4 text-yellow-500" />
                {completedJobs}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Earnings Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            {safeEarnings.length > 0 ? (
              <ul className="space-y-3">
                {safeEarnings.slice(0, 5).map((earning: any) => ( // Display top 5 recent
                  <li key={earning.id || earning.jobId} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                    <div>
                      <p className="font-medium">{earning.jobTitle || `Job ID: ${earning.jobId}`}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(earning.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={earning.status === 'paid' ? 'default' : 'outline'}>
                        {earning.status}
                      </Badge>
                      <p className="font-semibold text-base">{formatCurrency(earning.amount)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No earnings yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};

export default EarningsContent;