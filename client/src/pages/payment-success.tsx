import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [paymentId, setPaymentId] = useState<string | null>(null);
  
  useEffect(() => {
    // Get the payment_intent from the URL
    const query = new URLSearchParams(window.location.search);
    const paymentIntent = query.get('payment_intent');
    
    if (paymentIntent) {
      setPaymentId(paymentIntent);
    }
  }, []);

  return (
    <div className="container max-w-md mx-auto py-12">
      <Card className="border-green-100 dark:border-green-900">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 flex items-center justify-center bg-green-100 dark:bg-green-900 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Your payment has been processed successfully
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center">
          <div className="bg-muted/50 rounded-md p-4 text-center mb-6">
            <p>Thank you for your payment. Your transaction has been completed.</p>
            {paymentId && (
              <p className="text-sm text-muted-foreground mt-2">
                Transaction ID: {paymentId.substring(0, 8)}...
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              A confirmation has been sent to your email address.
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-2">
          <Button 
            onClick={() => setLocation('/jobs')} 
            className="w-full"
          >
            Find More Jobs
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button 
            onClick={() => setLocation('/dashboard')} 
            variant="outline" 
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}