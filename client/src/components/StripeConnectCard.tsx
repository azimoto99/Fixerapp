import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, ArrowRight, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Debugging helper
const DEBUG = true;
const log = (...args) => DEBUG && console.log(...args);

interface StripeConnectCardProps {
  onComplete?: () => void;
}

const StripeConnectCard: React.FC<StripeConnectCardProps> = ({ onComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      log('Attempting to connect to Stripe...');
      
      // Call backend to create Stripe Connect onboarding link
      // The API router is mounted at /api, and the stripe connect router at /stripe/connect
      log('Making API request to /api/stripe/connect/create-account');
      const res = await apiRequest('POST', '/api/stripe/connect/create-account', {});
      
      log('Stripe Connect API response:', {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        headers: Object.fromEntries([...res.headers])
      });
      
      if (!res.ok) {
        const data = await res.json().catch(e => ({ message: `Failed to parse error response: ${e.message}` }));
        log('Error response data:', data);
        throw new Error(data.message || 'Failed to create Stripe Connect account');
      }
      const data = await res.json();
      const url = data.accountLinkUrl || data.url;
      if (!url) throw new Error('No onboarding URL received from server');
      window.open(url, '_blank');
      toast({
        title: 'Stripe Connect Setup Started',
        description: 'Complete the setup in the new tab. Return here when finished.',
      });
      if (onComplete) onComplete();
    } catch (e: any) {
      setError(e.message || 'Failed to start Stripe Connect onboarding');
      toast({
        title: 'Error',
        description: e.message || 'Failed to start Stripe Connect onboarding',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto border-blue-400 bg-blue-50 dark:bg-blue-900/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          Set Up Stripe Connect
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-700 dark:text-gray-200">
          To receive payments, you must set up a Stripe Connect account. This is a secure onboarding process handled by Stripe. You will:
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Provide your personal and banking information</li>
            <li>Verify your identity</li>
            <li>Return to Fixer to start receiving payments</li>
          </ul>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        <Button
          onClick={handleConnect}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Redirecting to Stripe...
            </>
          ) : (
            <>
              Set Up Stripe Connect <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default StripeConnectCard;
