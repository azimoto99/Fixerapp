import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User } from '@shared/schema';
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
  user: User;
}

const EarningsContent: React.FC<EarningsContentProps> = ({ user }) => {
  const { toast } = useToast();

  // Fetch earnings data
  const { data: earnings, isLoading: earningsLoading } = useQuery({
    queryKey: ['/api/earnings'],
    enabled: !!user,
  });

  // Fetch Stripe Connect status
  const { data: stripeConnect, isLoading: stripeLoading } = useQuery({
    queryKey: ['/api/stripe/connect-status'],
    enabled: !!user,
  });

  // Calculate earnings metrics
  const totalBalance = earnings?.reduce((sum: number, earning: any) => {
    return earning.status === 'paid' ? sum + (earning.amount || 0) : sum;
  }, 0) || 0;

  const pendingBalance = earnings?.reduce((sum: number, earning: any) => {
    return earning.status === 'pending' ? sum + (earning.amount || 0) : sum;
  }, 0) || 0;

  // Calculate this week's earnings
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const thisWeekEarnings = earnings?.reduce((sum: number, earning: any) => {
    const earningDate = new Date(earning.createdAt);
    return earningDate >= oneWeekAgo && earning.status === 'paid' ? sum + (earning.amount || 0) : sum;
  }, 0) || 0;

  // Calculate average per job
  const completedJobs = earnings?.filter((earning: any) => earning.status === 'paid').length || 0;
  const avgPerJob = completedJobs > 0 ? totalBalance / completedJobs : 0;

  const handleConnectStripe = async () => {
    try {
      const response = await apiRequest('POST', '/api/stripe/create-account');
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to connect Stripe account. Please try again.",
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
    <div className="space-y-6">
      {/* Stripe Connect Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link className="h-4 w-4" />
            Stripe Connect
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stripeConnect?.isConnected ? (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center gap-3">
                <Link className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Connected to Stripe</p>
                  <p className="text-xs text-gray-500">Account ready to receive payments</p>
                </div>
              </div>
              <Badge variant="default" className="bg-green-600">Active</Badge>
            </div>
          ) : (
            <div className="text-center py-6">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-sm mb-4">Connect your Stripe account to receive payments</p>
              <Button 
                onClick={handleConnectStripe}
                className="w-full"
              >
                Connect Stripe Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Earnings Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Earnings Summary
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

      {/* Earnings History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Earnings History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {earnings && earnings.length > 0 ? (
              <div className="space-y-2">
                {earnings.map((earning: any) => (
                  <div key={earning.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">Job Payment</p>
                        <p className="text-xs text-gray-500">{formatDate(earning.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">
                        +{formatCurrency(earning.amount || 0)}
                      </p>
                      <Badge variant={earning.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                        {earning.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No earnings yet</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default EarningsContent; 