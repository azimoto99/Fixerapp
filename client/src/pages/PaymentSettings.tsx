import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Wallet, Settings, ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import PaymentMethodsManager from '@/components/payments/PaymentMethodsManager';
import StripeConnectSetup from '@/components/stripe/StripeConnectSetup';
import StripeTester from '@/components/payments/StripeTester';
import { Link } from 'wouter';

const PaymentSettings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('payment-methods');
  const { toast } = useToast();

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                Please log in to manage your payment settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button className="w-full">Log In</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      
      <main className="flex-1 container max-w-5xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Link href="/profile" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Profile
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Payment Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your payment methods, accounts, and preferences
          </p>
        </div>
        
        <Separator className="my-6" />
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="payment-methods">
              <span className="flex items-center">
                <CreditCard className="h-4 w-4 mr-2" />
                Payment Methods
              </span>
            </TabsTrigger>
            <TabsTrigger value="connect-account">
              <span className="flex items-center">
                <Wallet className="h-4 w-4 mr-2" />
                Connect Account
              </span>
            </TabsTrigger>
            <TabsTrigger value="test-integration">
              <span className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Test Integration
              </span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="payment-methods">
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold tracking-tight mb-1">Payment Methods</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Add, remove, or update the payment methods you use on this platform
                </p>
                
                <PaymentMethodsManager userId={user.id} />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="connect-account">
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold tracking-tight mb-1">Stripe Connect Account</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  {user.accountType === 'worker' 
                    ? 'Set up your Stripe Connect account to receive payments directly as a worker'
                    : 'Manage your payment account settings for sending payments'
                  }
                </p>
                
                <StripeConnectSetup />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="test-integration">
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold tracking-tight mb-1">Test Stripe Integration</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Verify that Stripe payment processing is working correctly
                </p>
                
                <StripeTester />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PaymentSettings;