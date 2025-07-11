import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import PaymentHistory from '@/components/payments/PaymentHistory';
import JobPaymentForm from '@/components/payments/JobPaymentForm';
import PaymentMethodsManager from '@/components/payments/PaymentMethodsManager';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  CreditCard, 
  History, 
  BadgeDollarSign, 
  RefreshCw,
  CheckCircle2,
  Clock,
  Wallet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState('payment-methods');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Fetch current user data
  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/user');
      if (!res.ok) {
        if (res.status === 401) {
          // Not authenticated, redirect to login
          setLocation('/login');
          return null;
        }
        throw new Error('Failed to fetch user data');
      }
      return res.json();
    }
  });
  
  // If still loading, show spinner
  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // If not authenticated, redirect to login page
  if (!userData) {
    setLocation('/login');
    return null;
  }
  
  return (
    <div className="bg-background min-h-screen flex flex-col">
      <Header />
      
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payment Center</h1>
            <p className="text-muted-foreground mt-1">Manage your PayPal payments and transactions</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Payment stats overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
                  <h3 className="text-2xl font-bold mt-1">$240.00</h3>
                  <p className="text-xs text-muted-foreground mt-1">Last updated today</p>
                </div>
                <div className="bg-primary/10 rounded-full p-3">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payments Received</p>
                  <h3 className="text-2xl font-bold mt-1">$1,245.00</h3>
                  <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
                </div>
                <div className="bg-green-500/10 rounded-full p-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                  <h3 className="text-2xl font-bold mt-1">$85.50</h3>
                  <p className="text-xs text-muted-foreground mt-1">3 transactions pending</p>
                </div>
                <div className="bg-orange-500/10 rounded-full p-3">
                  <Clock className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="bg-card rounded-lg p-1 mb-6">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="payment-methods" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <CreditCard className="h-4 w-4 mr-2" />
                <span className="hidden md:inline">PayPal Methods</span>
                <span className="md:hidden">Methods</span>
              </TabsTrigger>
              <TabsTrigger value="payment-history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <History className="h-4 w-4 mr-2" />
                <span className="hidden md:inline">Payment History</span>
                <span className="md:hidden">History</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="payment-methods" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>PayPal Payment Methods</CardTitle>
                <CardDescription>
                  Manage your PayPal payment methods and settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentMethodsManager />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="payment-history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                  View your payment transactions and history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentHistory />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}