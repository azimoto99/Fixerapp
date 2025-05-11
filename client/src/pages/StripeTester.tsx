import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Load Stripe outside of component render cycle
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Payment form component that renders the Stripe elements
const CheckoutForm = ({ amount }: { amount: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Payment Error",
        description: "Stripe hasn't loaded yet. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
    });

    // If error is about user going to the return URL, don't show an error message
    if (error && error.type !== 'validation_error') {
      toast({
        title: "Payment Failed",
        description: error.message || "Something went wrong with your payment",
        variant: "destructive"
      });
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
      </Button>
    </form>
  );
};

// Main Stripe Tester component
export default function StripeTester() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState(25);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createPaymentIntent = async () => {
    if (amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Amount must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/stripe/create-payment-intent-v2", {
        amount,
        description: "Test payment from Stripe Tester"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create payment intent");
      }
      
      const data = await response.json();
      setClientSecret(data.clientSecret);
      
      toast({
        title: "Payment Intent Created",
        description: `Ready to process a $${amount.toFixed(2)} payment`,
      });
    } catch (error) {
      toast({
        title: "Payment Setup Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Stripe Payment Tester</CardTitle>
          <CardDescription>
            This page allows you to test the Stripe payment integration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!clientSecret ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount to charge ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0.5"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </div>
              <Button 
                onClick={createPaymentIntent} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Setting up..." : "Create Payment Intent"}
              </Button>
            </div>
          ) : (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm amount={amount} />
            </Elements>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {clientSecret && (
            <Button 
              variant="outline" 
              onClick={() => setClientSecret(null)}
            >
              Reset
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}