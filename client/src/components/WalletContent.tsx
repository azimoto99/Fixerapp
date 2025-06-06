import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DbUser } from '../../../shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { STRIPE_PUBLIC_KEY } from '@/lib/env';
import {
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Trophy,
  Clock,
  Download,
  Eye,
  EyeOff,
  CreditCard,
  Plus,
  Trash2,
  Loader2
} from 'lucide-react';
import { CardElement, useStripe, useElements, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import StripeConnectCard from './StripeConnectCard';

const stripePromise = loadStripe(STRIPE_PUBLIC_KEY);

interface WalletContentProps {
  user: DbUser;
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

const WalletContentInner: React.FC<WalletContentProps> = ({ user }) => {
  const [showBalance, setShowBalance] = useState(true);
  const [activeSection, setActiveSection] = useState<'overview' | 'history'>('overview');
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [removingCardId, setRemovingCardId] = useState<string | null>(null);
  const [showStripeConnect, setShowStripeConnect] = useState(false);
  const { toast } = useToast();
  const stripe = useStripe();
  const elements = useElements();

  // Fetch earnings data
  const { data: earningsRaw, isLoading: earningsLoading, error: earningsError, refetch: refetchEarnings } = useQuery({
    queryKey: ['/api/earnings'],
    enabled: !!user,
  });

  // Fetch payments data
  const { data: paymentsRaw, isLoading: paymentsLoading, error: paymentsError, refetch: refetchPayments } = useQuery({
    queryKey: ['/api/payments'],
    enabled: !!user,
  });

  // Fetch payment methods
  const { data: paymentMethodsRaw, isLoading: paymentMethodsLoading, error: paymentMethodsError, refetch: refetchPaymentMethods } = useQuery({
    queryKey: ['/api/stripe/payment-methods'],
    enabled: !!user,
  });

  // Always treat as arrays for type safety
  const earnings = Array.isArray(earningsRaw) ? earningsRaw : [];
  const payments = Array.isArray(paymentsRaw) ? paymentsRaw : [];
  const paymentMethods = Array.isArray(paymentMethodsRaw) ? paymentMethodsRaw : [];

  // Add payment method using Stripe Elements
  const addPaymentMethod = async () => {
    setIsAddingCard(true);
    try {
      if (!stripe || !elements) {
        throw new Error('Stripe not loaded');
      }
      
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }
      
      // Create payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to create payment method');
      }
      
      if (!paymentMethod) {
        throw new Error('No payment method created');
      }
      
      // Send to backend
      const res = await apiRequest('POST', '/api/stripe/payment-methods', {
        paymentMethodId: paymentMethod.id
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to add payment method');
      }
      
      toast({ 
        title: 'Payment method added successfully',
        description: `Card ending in ${paymentMethod.card?.last4} has been saved.`
      });
      
      setAddCardOpen(false);
      refetchPaymentMethods();
      cardElement.clear();
    } catch (e) {
      console.error('Add payment method error:', e);
      toast({ 
        title: 'Failed to add payment method', 
        description: e instanceof Error ? e.message : 'An unexpected error occurred',
        variant: 'destructive' 
      });
    } finally {
      setIsAddingCard(false);
    }
  };

  // Remove payment method mutation
  const removePaymentMethod = async (id: string) => {
    setRemovingCardId(id);
    try {
      const res = await apiRequest('DELETE', `/api/stripe/payment-methods/${id}`);
      if (!res.ok) throw new Error('Failed to remove payment method');
      toast({ title: 'Payment method removed' });
      refetchPaymentMethods();
    } catch (e) {
      toast({ title: 'Failed to remove payment method', description: String(e), variant: 'destructive' });
    } finally {
      setRemovingCardId(null);
    }
  };

  // Withdraw funds
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const handleWithdraw = async () => {
    const availableBalance = totalBalance - (payments?.reduce((sum: number, payment: any) => {
      return payment.status === 'completed' ? sum + (payment.amount || 0) : sum;
    }, 0) || 0);
    if (availableBalance <= 0) {
      toast({
        title: "No funds available",
        description: "You don't have any funds available for withdrawal.",
        variant: "destructive",
      });
      return;
    }
    setIsWithdrawing(true);
    try {
      const res = await apiRequest('POST', '/api/payments/withdraw', {
        amount: availableBalance
      });
      if (!res.ok) throw new Error('Withdrawal failed');
      toast({
        title: "Withdrawal initiated",
        description: `$${availableBalance.toFixed(2)} withdrawal has been processed.`,
      });
      refetchPayments();
      refetchEarnings();
    } catch (error) {
      toast({
        title: "Withdrawal failed",
        description: "Unable to process withdrawal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Calculate wallet metrics
  const totalBalance = earnings?.reduce((sum: number, earning: any) => {
    return earning.status === 'paid' ? sum + (earning.amount || 0) : sum;
  }, 0) || 0;

  const pendingBalance = earnings?.reduce((sum: number, earning: any) => {
    return earning.status === 'pending' ? sum + (earning.amount || 0) : sum;
  }, 0) || 0;

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
      description: payment.description || 'Withdrawal',
      status: payment.status === 'completed' ? 'completed' as const : 'pending' as const
    })) || [])
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Error handling for API failures
  if (earningsError || paymentsError || paymentMethodsError) {
    return (
      <div className="space-y-4 text-center py-10">
        <div className="text-red-600 font-semibold text-lg flex flex-col items-center gap-2">
          <Wallet className="h-8 w-8 mb-2 text-red-500" />
          Wallet failed to load
        </div>
        <div className="text-gray-500 text-sm mb-4">
          {earningsError && <div>Earnings failed to load: {String(earningsError.message || earningsError)}</div>}
          {paymentsError && <div>Payments failed to load: {String(paymentsError.message || paymentsError)}</div>}
          {paymentMethodsError && <div>Payment methods failed to load: {String(paymentMethodsError.message || paymentMethodsError)}</div>}
        </div>
        <Button
          onClick={() => {
            refetchEarnings();
            refetchPayments();
            refetchPaymentMethods();
          }}
          variant="default"
        >
          Retry
        </Button>
      </div>
    );
  }

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

  const handleStripeConnect = async () => {
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
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e.message || 'Failed to start Stripe Connect onboarding',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-6 w-6 text-blue-600" />
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
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {showBalance ? formatCurrency(totalBalance) : '••••••'}
          </div>
          {pendingBalance > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 mb-2">
              <Clock className="h-4 w-4" />
              <span>{formatCurrency(pendingBalance)} pending</span>
            </div>
          )}
          <Button
            onClick={handleWithdraw}
            disabled={totalBalance <= 0 || isWithdrawing}
            className="w-full mt-4"
            size="lg"
          >
            {isWithdrawing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Withdraw Funds
          </Button>
        </CardContent>
      </Card>

      {/* Payment Methods Card or Stripe Connect Card */}
      {showStripeConnect ? (
        <StripeConnectCard onComplete={() => setShowStripeConnect(false)} />
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Methods
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setAddCardOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
              <Button size="sm" variant="default" onClick={handleStripeConnect}>
                Set Up Stripe Connect
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {paymentMethods && paymentMethods.length > 0 ? (
              <div className="space-y-2">
                {paymentMethods.map((method: any) => (
                  <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-gray-600" />
                      <span className="text-sm">•••• {method.card?.last4}</span>
                      <Badge variant="secondary" className="text-xs">
                        {method.card?.brand?.toUpperCase()}
                      </Badge>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removePaymentMethod(method.id)}
                      disabled={removingCardId === method.id}
                    >
                      {removingCardId === method.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-500" />}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No payment methods added</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Payment Method Dialog */}
      <Dialog open={addCardOpen} onOpenChange={setAddCardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded p-4 bg-gray-50 dark:bg-gray-900">
              <CardElement 
                options={{ 
                  hidePostalCode: true,
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                    invalid: {
                      color: '#9e2146',
                    },
                  },
                }} 
              />
            </div>
            <p className="text-xs text-gray-500">
              Your payment information is securely processed by Stripe and never stored on our servers.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={addPaymentMethod} disabled={isAddingCard || !stripe || !elements} className="w-full">
              {isAddingCard ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section Toggle */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <Button
          variant={activeSection === 'overview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveSection('overview')}
        >
          Overview
        </Button>
        <Button
          variant={activeSection === 'history' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveSection('history')}
        >
          History
        </Button>
      </div>

      {/* Transaction History */}
      {activeSection === 'history' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {allTransactions && allTransactions.length > 0 ? (
                <div className="space-y-2">
                  {allTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {tx.type === 'earning' ? <ArrowUpRight className="h-4 w-4 text-green-600" /> : <ArrowDownLeft className="h-4 w-4 text-red-600" />}
                        <div>
                          <p className="text-sm font-medium">{tx.description}{tx.jobTitle ? `: ${tx.jobTitle}` : ''}</p>
                          <p className="text-xs text-gray-500">{formatDate(tx.date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${tx.type === 'earning' ? 'text-green-600' : 'text-red-600'}`}>{tx.type === 'earning' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}</p>
                        <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No transactions yet</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const WalletContent: React.FC<WalletContentProps> = (props) => (
  <Elements stripe={stripePromise}>
    <WalletContentInner {...props} />
  </Elements>
);

export default WalletContent;
