import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Shield, Globe } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// PayPal Payment Methods Manager
// Since PayPal handles payment methods directly in the user's PayPal account,
// this component provides information about PayPal payment options

const PaymentMethodsManager = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            PayPal Payment Methods
          </CardTitle>
          <CardDescription>
            Your payment methods are managed directly through PayPal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              PayPal securely manages your payment methods including credit cards, debit cards, and bank accounts. 
              When you make a payment, you'll be redirected to PayPal to select your preferred payment method.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4 className="font-medium">Available Payment Options via PayPal:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center">
                <CreditCard className="mr-2 h-4 w-4" />
                Credit and Debit Cards
              </li>
              <li className="flex items-center">
                <Globe className="mr-2 h-4 w-4" />
                Bank Accounts
              </li>
              <li className="flex items-center">
                <Shield className="mr-2 h-4 w-4" />
                PayPal Balance
              </li>
            </ul>
          </div>

          <div className="pt-4">
            <Button 
              variant="outline" 
              onClick={() => window.open('https://www.paypal.com/myaccount/money', '_blank')}
              className="w-full"
            >
              Manage Payment Methods in PayPal
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security & Protection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start">
              <Shield className="mr-2 h-4 w-4 mt-0.5 text-green-600" />
              <div>
                <p className="font-medium">PayPal Buyer Protection</p>
                <p className="text-muted-foreground">Your purchases are protected by PayPal's Buyer Protection program</p>
              </div>
            </div>
            <div className="flex items-start">
              <Shield className="mr-2 h-4 w-4 mt-0.5 text-green-600" />
              <div>
                <p className="font-medium">Secure Transactions</p>
                <p className="text-muted-foreground">All transactions are encrypted and monitored for fraud</p>
              </div>
            </div>
            <div className="flex items-start">
              <Shield className="mr-2 h-4 w-4 mt-0.5 text-green-600" />
              <div>
                <p className="font-medium">Privacy Protection</p>
                <p className="text-muted-foreground">Your financial information is never shared with merchants</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentMethodsManager;