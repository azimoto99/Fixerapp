import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useStripe } from '@stripe/react-stripe-js';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, ExternalLink, Home } from 'lucide-react';

type PaymentStatus = 'success' | 'processing' | 'failed' | 'loading';

const PaymentConfirmation = () => {
  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [message, setMessage] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const stripe = useStripe();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!stripe) {
      return;
    }

    // Retrieve the "payment_intent_client_secret" query parameter
    const clientSecret = new URLSearchParams(window.location.search).get(
      'payment_intent_client_secret'
    );

    // Also grab the job ID if available (can be passed along with the return URL)
    const jobIdParam = new URLSearchParams(window.location.search).get('jobId');
    setJobId(jobIdParam);

    if (!clientSecret) {
      setStatus('failed');
      setMessage('Payment verification failed. Missing payment information.');
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      if (!paymentIntent) {
        setStatus('failed');
        setMessage('Payment information could not be retrieved.');
        return;
      }

      switch (paymentIntent.status) {
        case 'succeeded':
          setStatus('success');
          setMessage('Payment successful!');
          break;
        case 'processing':
          setStatus('processing');
          setMessage('Your payment is processing.');
          break;
        case 'requires_payment_method':
          setStatus('failed');
          setMessage('Your payment was not successful, please try again.');
          break;
        default:
          setStatus('failed');
          setMessage('Something went wrong with your payment.');
          break;
      }
    });
  }, [stripe]);

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-16 w-16 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-16 w-16 text-amber-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-16 w-16 text-destructive" />;
      case 'loading':
      default:
        return <Loader2 className="h-16 w-16 text-primary animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-500';
      case 'processing':
        return 'text-amber-500';
      case 'failed':
        return 'text-destructive';
      case 'loading':
      default:
        return 'text-primary';
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'success':
        return 'Payment Successful';
      case 'processing':
        return 'Payment Processing';
      case 'failed':
        return 'Payment Failed';
      case 'loading':
      default:
        return 'Verifying Payment';
    }
  };

  return (
    <div className="container max-w-2xl py-12">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className={`text-2xl ${getStatusColor()}`}>{getTitle()}</CardTitle>
          <CardDescription className="text-lg">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'processing' && (
            <p className="text-muted-foreground">
              Your payment is being processed. This may take a moment.
            </p>
          )}
          
          {status === 'success' && (
            <p className="text-muted-foreground">
              Thank you for your payment. Your transaction has been completed successfully.
            </p>
          )}
          
          {status === 'failed' && (
            <p className="text-muted-foreground">
              We were unable to process your payment. Please try again or contact support if you continue to have issues.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button 
            variant="outline"
            onClick={() => navigate('/')}
          >
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
          
          {jobId && (
            <Button 
              onClick={() => navigate(`/job/${jobId}`)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Job
            </Button>
          )}
          
          {status === 'failed' && (
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
            >
              Try Again
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentConfirmation;