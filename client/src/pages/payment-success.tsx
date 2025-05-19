import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';

interface PaymentDetails {
  id: string;
  status: string;
  amount: number;
  jobId?: number;
  jobTitle?: string;
}

export default function PaymentSuccess() {
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Parse URL query parameters
  const queryParams = new URLSearchParams(window.location.search);
  const paymentId = queryParams.get('paymentId');
  const jobId = queryParams.get('jobId');
  const paramAmount = queryParams.get('amount');

  useEffect(() => {
    // If we have a payment ID from the URL, fetch the payment details
    if (paymentId) {
      setIsLoading(true);
      apiRequest('GET', `/api/payment-status/${paymentId}`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Payment not found');
          }
          return res.json();
        })
        .then(data => {
          setPayment({
            id: data.id,
            status: data.status,
            amount: data.amount / 100, // Convert cents to dollars
            jobId: data.jobId,
            jobTitle: data.jobTitle
          });
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error fetching payment:', error);
          setError('Unable to retrieve payment details. Please contact support.');
          setIsLoading(false);
        });
    } 
    // If we don't have a payment ID but have amount, create a simple success page
    else if (paramAmount) {
      setPayment({
        id: 'local-' + Date.now(),
        status: 'succeeded',
        amount: parseFloat(paramAmount),
        jobId: jobId ? parseInt(jobId) : undefined
      });
      setIsLoading(false);
    } 
    // If we have neither, show an error
    else {
      setError('No payment information provided');
      setIsLoading(false);
    }
  }, [paymentId, paramAmount, jobId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Verifying Payment</CardTitle>
            <CardDescription>Please wait while we verify your payment...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <RefreshCw className="h-12 w-12 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Payment Error
            </CardTitle>
            <CardDescription>{error || 'An unexpected error occurred'}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-6">
            <p className="text-center mb-4">
              If you believe this is a mistake, please contact our support team for assistance.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate('/')}>Return to Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const isSuccessful = payment.status === 'succeeded';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className={`flex items-center ${isSuccessful ? 'text-green-600' : ''}`}>
            {isSuccessful ? (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Payment Successful
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
                Payment {payment.status}
              </>
            )}
          </CardTitle>
          <CardDescription>
            {isSuccessful 
              ? 'Your payment has been processed successfully' 
              : `Your payment is currently ${payment.status}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-md">
            <div className="flex justify-between mb-2">
              <span className="text-muted-foreground">Payment ID:</span>
              <span className="font-medium">{payment.id}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">${payment.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-muted-foreground">Status:</span>
              <span className={`font-medium ${isSuccessful ? 'text-green-600' : 'text-amber-500'}`}>
                {payment.status}
              </span>
            </div>
            {payment.jobId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Job:</span>
                <span className="font-medium">
                  {payment.jobTitle || `Job #${payment.jobId}`}
                </span>
              </div>
            )}
          </div>
          
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 rounded-md p-4">
            <p className="text-green-700 dark:text-green-400 text-sm">
              A receipt has been sent to your email address. You can also view your payment history in your account dashboard.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => navigate('/')}>
            Return Home
          </Button>
          {payment.jobId && (
            <Button onClick={() => navigate(`/jobs/${payment.jobId}`)}>
              View Job <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {!payment.jobId && (
            <Button onClick={() => navigate('/payments')}>
              Payment History <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}