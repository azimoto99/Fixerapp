import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, ArrowRight, HomeIcon } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

interface PaymentResult {
  id: string;
  status: string;
  amount: number;
  jobId: number;
  jobTitle: string;
}

export default function PaymentSuccess() {
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentResult | null>(null);
  const { user } = useAuth();
  
  // Get payment intent from URL params
  const params = new URLSearchParams(window.location.search);
  const paymentIntentId = params.get('payment_intent');

  useEffect(() => {
    if (!paymentIntentId) {
      setError('No payment information found');
      setIsLoading(false);
      return;
    }

    const getPaymentDetails = async () => {
      try {
        const response = await apiRequest("GET", `/api/payment-status/${paymentIntentId}`);
        if (!response.ok) {
          throw new Error('Could not retrieve payment details');
        }
        
        const data = await response.json();
        setPayment(data);
      } catch (err) {
        console.error('Error fetching payment details:', err);
        setError((err as Error).message || 'Failed to load payment details');
      } finally {
        setIsLoading(false);
      }
    };

    getPaymentDetails();
  }, [paymentIntentId]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Confirming your payment...</p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="container max-w-md mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Payment Error</CardTitle>
            <CardDescription>
              There was a problem confirming your payment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-destructive text-sm">{error || 'Payment details could not be loaded'}</p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
            >
              <HomeIcon className="h-4 w-4 mr-2" />
              Return Home
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto py-12">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto rounded-full bg-green-100 p-3 w-16 h-16 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Your payment has been processed successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Payment ID:</div>
              <div className="font-medium">{payment.id.slice(-8)}</div>
              
              <div className="text-muted-foreground">Amount:</div>
              <div className="font-medium">${(payment.amount / 100).toFixed(2)}</div>
              
              <div className="text-muted-foreground">Status:</div>
              <div className="font-medium capitalize">{payment.status}</div>
              
              <div className="text-muted-foreground">Job:</div>
              <div className="font-medium">{payment.jobTitle}</div>
            </div>
          </div>
          
          <p className="text-center text-sm text-muted-foreground">
            A receipt has been sent to your email address.
          </p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/jobs/${payment.jobId}`)}
          >
            View Job Details
          </Button>
          <Button 
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}