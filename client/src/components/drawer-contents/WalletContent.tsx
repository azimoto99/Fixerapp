import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User } from '@shared/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Wallet, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft,
  Trophy,
  Clock,
  Download,
  Filter,
  Eye,
  EyeOff,
  CreditCard,
  Plus
} from 'lucide-react';

interface WalletContentProps {
  user: User;
}

interface Transaction {
  id: string;
  amount: number;
  type: 'earning' | 'bonus' | 'withdrawal' | 'fee';
  date: string;
  description: string;
  jobTitle?: string;
  status: 'completed' | 'pending' | 'failed';
}

const WalletContent: React.FC<WalletContentProps> = ({ user }) => {
  const [showBalance, setShowBalance] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'earnings' | 'withdrawals' | 'payments'>('all');
  const [activeSection, setActiveSection] = useState<'overview' | 'earnings' | 'payments'>('overview');
  const { toast } = useToast();

  // Fetch earnings data
  const { data: earnings, isLoading: earningsLoading } = useQuery({
    queryKey: ['/api/earnings'],
    enabled: !!user,
  });

  // Fetch payments data
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['/api/payments'],
    enabled: !!user,
  });

  // Fetch payment methods
  const { data: paymentMethods, isLoading: paymentMethodsLoading } = useQuery({
    queryKey: ['/api/stripe/payment-methods'],
    enabled: !!user,
  });

  // Calculate wallet metrics
  const totalBalance = earnings?.reduce((sum: number, earning: any) => {
    return earning.status === 'paid' ? sum + (earning.amount || 0) : sum;
  }, 0) || 0;

  const pendingBalance = earnings?.reduce((sum: number, earning: any) => {
    return earning.status === 'pending' ? sum + (earning.amount || 0) : sum;
  }, 0) || 0;

  const availableBalance = totalBalance - (payments?.reduce((sum: number, payment: any) => {
    return payment.status === 'completed' ? sum + (payment.amount || 0) : sum;
  }, 0) || 0);

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

  // Combine and sort transactions
  const allTransactions: Transaction[] = [
    ...(earnings?.map((earning: any) => ({
      id: `earning-${earning.id}`,
      amount: earning.amount || 0,
      type: 'earning' as const,
      date: earning.createdAt,
      description: `Job Payment`,
      jobTitle: earning.job?.title,
      status: earning.status === 'paid' ? 'completed' as const : 'pending' as const
    })) || []),
    ...(payments?.map((payment: any) => ({
      id: `payment-${payment.id}`,
      amount: -(payment.amount || 0),
      type: 'withdrawal' as const,
      date: payment.createdAt,
      description: 'Withdrawal',
      status: payment.status === 'completed' ? 'completed' as const : 'pending' as const
    })) || [])
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredTransactions = allTransactions.filter(transaction => {
    if (filterType === 'all') return true;
    if (filterType === 'earnings') return transaction.type === 'earning';
    if (filterType === 'withdrawals') return transaction.type === 'withdrawal';
    return true;
  });

  const handleWithdraw = async () => {
    if (availableBalance <= 0) {
      toast({
        title: "No funds available",
        description: "You don't have any funds available for withdrawal.",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest('POST', '/api/payments/withdraw', {
        amount: availableBalance
      });
      
      toast({
        title: "Withdrawal initiated",
        description: `$${availableBalance.toFixed(2)} withdrawal has been processed.`,
      });
    } catch (error) {
      toast({
        title: "Withdrawal failed",
        description: "Unable to process withdrawal. Please try again.",
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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earning':
      case 'bonus':
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case 'withdrawal':
      case 'fee':
        return <ArrowDownLeft className="h-4 w-4 text-red-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  if (earningsLoading || paymentsLoading || paymentMethodsLoading) {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Wallet
        </h2>
      </div>

      {/* Balance Section */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Available Balance</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBalance(!showBalance)}
              className="h-8 w-8 p-0"
            >
              {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="space-y-3">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {showBalance ? formatCurrency(availableBalance) : '••••••'}
            </div>
            
            {pendingBalance > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
                <span>{formatCurrency(pendingBalance)} pending</span>
              </div>
            )}
            
            <Button 
              onClick={handleWithdraw}
              disabled={availableBalance <= 0}
              className="w-full mt-4"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Withdraw Funds
            </Button>
          </div>
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

      {/* Payment Methods */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Payment Methods</CardTitle>
            <Button variant="outline" size="sm" className="text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Add Card
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {paymentMethods && paymentMethods.length > 0 ? (
              paymentMethods.map((method: any) => (
                <div key={method.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <CreditCard className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        •••• •••• •••• {method.card?.last4}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {method.card?.brand?.toUpperCase()} • Expires {method.card?.exp_month}/{method.card?.exp_year}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {method.id === paymentMethods[0]?.id && (
                      <span className="text-primary font-medium">Default</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No payment methods added</p>
                <p className="text-xs text-muted-foreground mt-1">Add a card to make payments</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
                className="h-7 px-2 text-xs"
              >
                All
              </Button>
              <Button
                variant={filterType === 'earnings' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('earnings')}
                className="h-7 px-2 text-xs"
              >
                Earnings
              </Button>
              <Button
                variant={filterType === 'withdrawals' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('withdrawals')}
                className="h-7 px-2 text-xs"
              >
                Withdrawals
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-64">
            <div className="space-y-1 p-4">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No transactions yet</p>
                </div>
              ) : (
                filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction.type)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {transaction.jobTitle || transaction.description}
                          </p>
                          <Badge 
                            variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                            className="h-5 px-1.5 text-xs"
                          >
                            {transaction.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(transaction.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        transaction.amount >= 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default WalletContent;