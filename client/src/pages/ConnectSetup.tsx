import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import StripeConnectSetup from '@/components/stripe/StripeConnectSetup';

export default function ConnectSetup() {
  const [_, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [redirecting, setRedirecting] = useState(false);
  
  // For handling Stripe Connect return URL parameters
  useEffect(() => {
    const url = new URL(window.location.href);
    const refreshParam = url.searchParams.get('refresh');
    const successParam = url.searchParams.get('success');

    if (successParam === 'true') {
      // User has completed Stripe Connect onboarding
      handleOnboardingComplete();
    }
  }, []);

  // If user is not logged in, redirect to login
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/auth');
    }
  }, [isLoading, user, setLocation]);

  const handleOnboardingComplete = async () => {
    if (!user) return;
    
    try {
      // Mark that the user has completed Stripe Connect setup
      const response = await apiRequest('PATCH', `/api/users/${user.id}`, {
        stripeConnectSetupComplete: true
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        queryClient.setQueryData(['/api/user'], updatedUser);
        
        // Show success toast
        toast({
          title: 'Payment Account Setup Complete',
          description: 'Your Stripe Connect account is now ready to receive payments',
        });
        
        // Redirect to home page
        setRedirecting(true);
        setTimeout(() => setLocation('/'), 1500);
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };
  
  // Skip this page if the user already has Stripe Connect setup complete
  useEffect(() => {
    if (!isLoading && user && user.stripeConnectSetupComplete) {
      setLocation('/');
    }
  }, [isLoading, user, setLocation]);
  
  const handleSkip = async () => {
    if (!user) return;
    
    try {
      // Mark that the user has skipped Stripe Connect setup
      const response = await apiRequest('PATCH', `/api/users/${user.id}`, {
        stripeConnectSetupComplete: true
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        queryClient.setQueryData(['/api/user'], updatedUser);
        
        // Show skip toast
        toast({
          title: 'Setup Skipped',
          description: 'You can set up your payment account later from your profile',
        });
        
        // Redirect to home page
        setRedirecting(true);
        setTimeout(() => setLocation('/'), 1000);
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  
  if (redirecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border mb-4" />
        <p className="text-muted-foreground">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Set Up Your Payment Account
          </h1>
          <p className="text-muted-foreground text-lg">
            Complete your Stripe Connect setup to receive payments from jobs
          </p>
        </div>
        
        <div className="flex flex-col items-center max-w-xl mx-auto">
          <StripeConnectSetup />
          
          <div className="mt-6 w-full max-w-md text-center">
            <button 
              onClick={handleSkip}
              className="text-sm text-muted-foreground underline hover:text-primary transition-colors"
            >
              Skip for now
            </button>
            <p className="text-xs text-muted-foreground mt-1">
              You can set up your payment account later from your profile
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}