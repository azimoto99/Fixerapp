import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function PaymentSuccess() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<'success' | 'processing' | 'failed' | 'loading'>('loading');
  const [message, setMessage] = useState('');
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  // Get payment status from URL
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const redirectStatus = query.get('redirect_status');
    const paymentIntent = query.get('payment_intent');
    
    if (!paymentIntent) {
      setStatus('failed');
      setMessage('No payment information found.');
      return;
    }
    
    // Check payment status from our API
    const checkPaymentStatus = async () => {
      try {
        const response = await apiRequest(
          'GET', 
          `/api/payment-status/${paymentIntent}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to retrieve payment status');
        }
        
        const data = await response.json();
        setPaymentInfo(data);
        
        if (data.status === 'succeeded') {
          setStatus('success');
          setMessage('Your payment was processed successfully!');
        } else if (data.status === 'processing') {
          setStatus('processing');
          setMessage('Your payment is still processing. We\'ll notify you when it completes.');
        } else {
          setStatus('failed');
          setMessage(data.message || 'Payment failed or was canceled.');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('failed');
        setMessage('Error retrieving payment information.');
      }
    };
    
    checkPaymentStatus();
  }, []);

  return (
    <div className="container max-w-lg mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {status === 'success' && (
              <CheckCircle className="h-8 w-8 text-green-500" />
            )}
            {status === 'processing' && (
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" 
                   aria-label="Processing"/>
            )}
            {status === 'failed' && (
              <AlertCircle className="h-8 w-8 text-red-500" />
            )}
            {status === 'loading' && (
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" 
                   aria-label="Loading"/>
            )}
            <CardTitle>
              {status === 'success' && 'Payment Successful'}
              {status === 'processing' && 'Payment Processing'}
              {status === 'failed' && 'Payment Failed'}
              {status === 'loading' && 'Checking Payment Status'}
            </CardTitle>
          </div>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentInfo && (
            <div className="space-y-2">
              {paymentInfo.amount && (
                <p><span className="font-semibold">Amount:</span> ${(paymentInfo.amount / 100).toFixed(2)}</p>
              )}
              {paymentInfo.date && (
                <p><span className="font-semibold">Date:</span> {new Date(paymentInfo.date).toLocaleString()}</p>
              )}
              {paymentInfo.description && (
                <p><span className="font-semibold">Description:</span> {paymentInfo.description}</p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
          >
            Return to Dashboard
          </Button>
          
          {status === 'success' && paymentInfo?.jobId && (
            <Button 
              onClick={() => navigate(`/job/${paymentInfo.jobId}`)}
            >
              View Job
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}