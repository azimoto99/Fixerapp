import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// Tabs removed - using single PayPal payment methods section
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { CreditCard, ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import PaymentMethodsManager from '@/components/payments/PaymentMethodsManager';
// Stripe components removed - using PayPal instead
import { Link } from 'wouter';

const PaymentSettings: React.FC = () => {
  const { user } = useAuth();
  // PayPal-based payment settings - no tabs needed
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
        
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold tracking-tight mb-1">PayPal Payment Methods</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Manage your payment methods through PayPal
            </p>
            
            <PaymentMethodsManager />
          </div>
        </div>
      </main>
    </div>
  );
};

export default PaymentSettings;