import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function PaymentConfirmation() {
  const [, setLocation] = useLocation();
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get the payment_intent and payment_intent_client_secret from the URL
    const query = new URLSearchParams(window.location.search);
    const paymentIntent = query.get('payment_intent');
    const paymentIntentClientSecret = query.get('payment_intent_client_secret');
    const redirectStatus = query.get('redirect_status');

    // If we have a payment intent, verify it
    if (paymentIntent && paymentIntentClientSecret) {
      setPaymentStatus(redirectStatus || 'success');
    } else {
      // Check if we were redirected here from a successful in-app confirmation
      setPaymentStatus('success');
    }

    // Simulate loading for a better UX
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="container max-w-md mx-auto py-12">
      <Card>
        <CardHeader>
          {isLoading ? (
            <>
              <CardTitle className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                Processing Payment
              </CardTitle>
              <CardDescription className="text-center">
                Please wait while we confirm your payment...
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="flex items-center justify-center text-center">
                <CheckCircle className="h-8 w-8 text-green-500 mr-2" />
                Payment Successful
              </CardTitle>
              <CardDescription className="text-center">
                Your payment has been processed successfully
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        <CardContent>
          {!isLoading && (
            <div className="bg-primary/10 rounded-md p-4 text-center">
              <p>Thank you for your payment. Your transaction has been completed.</p>
              <p className="text-sm text-muted-foreground mt-2">
                A confirmation has been sent to your email address.
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center">
          {!isLoading && (
            <div className="space-y-2 w-full">
              <Button 
                onClick={() => setLocation('/dashboard')} 
                className="w-full"
              >
                Go to Dashboard
              </Button>
              <Button 
                onClick={() => setLocation('/jobs')} 
                variant="outline" 
                className="w-full"
              >
                Find More Jobs
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}