import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

/**
 * Component to test Stripe integration and configuration
 */
const StripeTester: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Array<{name: string, status: 'success' | 'error' | 'warning', message: string}>>([]);
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);

  // Test Stripe configuration and integration
  const testStripeIntegration = async () => {
    setIsLoading(true);
    setResults([]);
    
    const newResults: Array<{name: string, status: 'success' | 'error' | 'warning', message: string}> = [];
    let isConfigured = true;

    try {
      // Step 1: Check if Stripe API keys are configured
      console.log('Checking Stripe API keys...');
      newResults.push({
        name: 'API Keys',
        status: import.meta.env.VITE_STRIPE_PUBLIC_KEY ? 'success' : 'error',
        message: import.meta.env.VITE_STRIPE_PUBLIC_KEY 
          ? 'Stripe public key is configured' 
          : 'Stripe public key is missing'
      });

      if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
        isConfigured = false;
      }

      // Step 2: Test authentication endpoint
      console.log('Testing authentication endpoint...');
      try {
        const authRes = await apiRequest('GET', '/api/stripe/check-auth');
        const authData = await authRes.json();
        
        newResults.push({
          name: 'Authentication',
          status: authData.authenticated ? 'success' : 'warning',
          message: authData.authenticated 
            ? `Authenticated as user ID: ${authData.user}` 
            : 'Not authenticated'
        });
        
        if (!authData.authenticated) {
          isConfigured = false;
        }
      } catch (error) {
        console.error('Auth test error:', error);
        newResults.push({
          name: 'Authentication',
          status: 'error',
          message: 'Failed to check authentication status'
        });
        isConfigured = false;
      }

      // Step 3: Test setup intent creation
      console.log('Testing setup intent creation...');
      try {
        const setupRes = await apiRequest('POST', '/api/stripe/create-setup-intent', {});
        
        if (setupRes.ok) {
          const setupData = await setupRes.json();
          
          newResults.push({
            name: 'Setup Intent',
            status: setupData.clientSecret ? 'success' : 'warning',
            message: setupData.clientSecret 
              ? 'Successfully created setup intent' 
              : 'Setup intent created but missing client secret'
          });
        } else {
          const errorData = await setupRes.json();
          newResults.push({
            name: 'Setup Intent',
            status: 'error',
            message: `Failed to create setup intent: ${errorData.message || setupRes.statusText}`
          });
          isConfigured = false;
        }
      } catch (error) {
        console.error('Setup intent test error:', error);
        newResults.push({
          name: 'Setup Intent',
          status: 'error',
          message: 'Failed to create setup intent'
        });
        isConfigured = false;
      }

      // Step 4: Test payment intent creation
      console.log('Testing payment intent creation...');
      try {
        const paymentRes = await apiRequest('POST', '/api/stripe/create-payment-intent', {
          amount: 100, // $1.00 test amount
        });
        
        if (paymentRes.ok) {
          const paymentData = await paymentRes.json();
          
          newResults.push({
            name: 'Payment Intent',
            status: paymentData.clientSecret ? 'success' : 'warning',
            message: paymentData.clientSecret 
              ? 'Successfully created payment intent' 
              : 'Payment intent created but missing client secret'
          });
        } else {
          const errorData = await paymentRes.json();
          newResults.push({
            name: 'Payment Intent',
            status: 'error',
            message: `Failed to create payment intent: ${errorData.message || paymentRes.statusText}`
          });
          isConfigured = false;
        }
      } catch (error) {
        console.error('Payment intent test error:', error);
        newResults.push({
          name: 'Payment Intent',
          status: 'error',
          message: 'Failed to create payment intent'
        });
        isConfigured = false;
      }

      // Step 5: Test Stripe Connect endpoints
      console.log('Testing Stripe Connect...');
      try {
        const connectRes = await apiRequest('GET', '/api/stripe/connect/account-status');
        
        if (connectRes.ok) {
          const connectData = await connectRes.json();
          
          newResults.push({
            name: 'Stripe Connect',
            status: 'success',
            message: `Connect account found with status: ${connectData.accountStatus || 'unknown'}`
          });
        } else if (connectRes.status === 404) {
          newResults.push({
            name: 'Stripe Connect',
            status: 'warning',
            message: 'No Connect account found - account creation required'
          });
        } else {
          newResults.push({
            name: 'Stripe Connect',
            status: 'error',
            message: `Failed to check Connect account status: ${connectRes.statusText}`
          });
        }
      } catch (error) {
        console.error('Connect test error:', error);
        newResults.push({
          name: 'Stripe Connect',
          status: 'error',
          message: 'Failed to check Connect account status'
        });
      }

    } catch (error) {
      console.error('Testing error:', error);
      newResults.push({
        name: 'Testing Error',
        status: 'error',
        message: 'An unexpected error occurred during testing'
      });
      isConfigured = false;
    } finally {
      setResults(newResults);
      setStripeConfigured(isConfigured);
      setIsLoading(false);
      
      toast({
        title: isConfigured ? 'Stripe Integration Test Passed' : 'Stripe Integration Issues Detected',
        description: isConfigured 
          ? 'All required Stripe functionality is working properly' 
          : 'Some Stripe functionality is not working correctly. See details for more information.',
        variant: isConfigured ? 'default' : 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Stripe Integration Tester
          {stripeConfigured !== null && (
            <Badge 
              variant={stripeConfigured ? 'default' : 'destructive'}
              className={stripeConfigured ? 'bg-green-600' : undefined}
            >
              {stripeConfigured ? 'Configured' : 'Issues Detected'}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Test your Stripe payment processing configuration
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Testing Stripe integration...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="mt-0.5">
                  {result.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {result.status === 'warning' && <AlertCircle className="h-5 w-5 text-amber-500" />}
                  {result.status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                </div>
                <div>
                  <p className="font-medium">{result.name}</p>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Click the button below to test your Stripe integration
            </p>
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={testStripeIntegration}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            'Test Stripe Integration'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default StripeTester;