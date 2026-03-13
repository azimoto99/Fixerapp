import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, CreditCard, DollarSign, Eye, EyeOff, TrendingUp, Wallet } from "lucide-react";
import { type Earning, type Payment, type User } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface WalletContentProps {
  user: User;
}

interface PaymentMethod {
  id: string;
  card?: {
    brand?: string | null;
    last4?: string | null;
  } | null;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) {
    return "Unknown";
  }

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WalletContent({ user }: WalletContentProps) {
  const { toast } = useToast();
  const [showBalance, setShowBalance] = useState(true);
  const [activeSection, setActiveSection] = useState<"overview" | "earnings" | "payments">("overview");

  const { data: earnings = [], isLoading: earningsLoading } = useQuery<Earning[]>({
    queryKey: ["/api/earnings"],
    enabled: !!user,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    enabled: !!user,
  });

  const { data: paymentMethods = [], isLoading: paymentMethodsLoading } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/stripe/payment-methods"],
    enabled: !!user,
  });

  const totals = useMemo(() => {
    const totalEarned = earnings.reduce((sum, earning) => {
      return earning.status === "paid" ? sum + (earning.amount || 0) : sum;
    }, 0);

    const pendingEarnings = earnings.reduce((sum, earning) => {
      return earning.status === "pending" ? sum + (earning.amount || 0) : sum;
    }, 0);

    const completedPayments = payments.reduce((sum, payment) => {
      return payment.status === "completed" ? sum + (payment.amount || 0) : sum;
    }, 0);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyEarnings = earnings.reduce((sum, earning) => {
      const earnedAt = earning.dateEarned ? new Date(earning.dateEarned) : null;
      if (!earnedAt || earnedAt < oneWeekAgo || earning.status !== "paid") {
        return sum;
      }
      return sum + (earning.amount || 0);
    }, 0);

    const completedJobs = earnings.filter((earning) => earning.status === "paid").length;

    return {
      totalEarned,
      pendingEarnings,
      availableBalance: totalEarned - completedPayments,
      weeklyEarnings,
      completedJobs,
      averagePerJob: completedJobs > 0 ? totalEarned / completedJobs : 0,
    };
  }, [earnings, payments]);

  const handleWithdraw = async () => {
    if (totals.availableBalance <= 0) {
      toast({
        title: "No funds available",
        description: "You don't have any funds available for withdrawal.",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("POST", "/api/payments/withdraw", {
        amount: totals.availableBalance,
      });

      toast({
        title: "Withdrawal initiated",
        description: `${formatCurrency(totals.availableBalance)} withdrawal has been processed.`,
      });
    } catch {
      toast({
        title: "Withdrawal failed",
        description: "Unable to process withdrawal right now.",
        variant: "destructive",
      });
    }
  };

  if (earningsLoading || paymentsLoading || paymentMethodsLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Wallet
        </h2>
        <div className="flex rounded-lg bg-muted p-1">
          {(["overview", "earnings", "payments"] as const).map((section) => (
            <Button
              key={section}
              size="sm"
              variant={activeSection === section ? "default" : "ghost"}
              className="text-xs px-3 capitalize"
              onClick={() => setActiveSection(section)}
            >
              {section}
            </Button>
          ))}
        </div>
      </div>

      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:border-blue-800 dark:from-blue-900/20 dark:to-indigo-900/20">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">Available Balance</span>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowBalance((value) => !value)}>
              {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="text-3xl font-bold">{showBalance ? formatCurrency(totals.availableBalance) : "......"}</div>
            {totals.pendingEarnings > 0 && (
              <div className="text-sm text-amber-600 dark:text-amber-400">
                {formatCurrency(totals.pendingEarnings)} pending
              </div>
            )}
            <Button onClick={handleWithdraw} disabled={totals.availableBalance <= 0} className="w-full" size="sm">
              Withdraw Funds
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeSection === "overview" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Earnings Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Earned</p>
                <p className="text-lg font-semibold">{formatCurrency(totals.totalEarned)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">This Week</p>
                <p className="text-lg font-semibold text-green-600">{formatCurrency(totals.weeklyEarnings)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg per Job</p>
                <p className="text-lg font-semibold">{formatCurrency(totals.averagePerJob)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Jobs Completed</p>
                <p className="text-lg font-semibold">{totals.completedJobs}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentMethods.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payment methods added.</p>
              ) : (
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Card ending in {method.card?.last4 ?? "----"}</span>
                      </div>
                      <Badge variant="secondary">{method.card?.brand?.toUpperCase() || "CARD"}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeSection === "earnings" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-green-600" />
              Earnings History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {earnings.length === 0 && <p className="text-sm text-muted-foreground">No earnings yet.</p>}
                {earnings.map((earning) => (
                  <div key={earning.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">Job Payment</p>
                      <p className="text-xs text-muted-foreground">{formatDate(earning.dateEarned)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">+{formatCurrency(earning.amount || 0)}</p>
                      <Badge variant={earning.status === "paid" ? "green" : "secondary"}>{earning.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {activeSection === "payments" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4 text-red-600" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {payments.length === 0 && <p className="text-sm text-muted-foreground">No payments yet.</p>}
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{payment.description || "Withdrawal"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(payment.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">-{formatCurrency(payment.amount || 0)}</p>
                      <Badge variant={payment.status === "completed" ? "default" : "secondary"}>{payment.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
