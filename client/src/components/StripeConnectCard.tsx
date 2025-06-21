import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, ArrowRight, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from './ui/alert';




interface StripeConnectCardProps {
  onComplete?: () => void;
}

const StripeConnectCard: React.FC<StripeConnectCardProps> = ({ onComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
  
      
      // Navigate to our custom onboarding page
      navigate('/stripe-connect/onboarding');
      
      toast({
        title: 'Opening Stripe Connect Setup',
        description: 'Complete the comprehensive setup process to start receiving payments.',
      });
      
      if (onComplete) onComplete();
    } catch (e: any) {
      setError(e.message || 'Failed to open Stripe Connect setup');
      toast({
        title: 'Error',
        description: e.message || 'Failed to open Stripe Connect setup',
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
          To receive payments, you must set up a Stripe Connect account. Our guided setup process will help you:
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Understand what information you'll need</li>
            <li>Complete your Stripe Connect account setup</li>
            <li>Verify your account status</li>
            <li>Start receiving payments for your work</li>
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
              Opening Setup...
            </>
          ) : (
            <>
              Start Payment Setup <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default StripeConnectCard;
