import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import StripeConnectRequired from './StripeConnectRequired';
import { useToast } from '@/hooks/use-toast';

interface StripeConnectCheckProps {
  children: React.ReactNode;
  // If set to true, this will force users to complete the setup before proceeding
  enforce?: boolean;
  // If true, only workers will be checked for Stripe Connect
  workersOnly?: boolean;
}

const StripeConnectCheck: React.FC<StripeConnectCheckProps> = ({ 
  children, 
  enforce = false,
  workersOnly = true 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showRequiredModal, setShowRequiredModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // First, verify the authentication session specifically for Stripe operations
  useEffect(() => {
    async function checkStripeAuth() {
      if (!user) return;
      
      try {
        console.log("Checking auth status for Stripe operations");
        const res = await apiRequest('GET', '/api/stripe/check-auth');
        
        if (!res.ok) {
          console.error("Auth check failed");
          toast({
            title: "Authentication Error",
            description: "Please try logging out and back in to continue with Stripe operations.",
            variant: "destructive",
          });
          
          // Try to refresh auth state
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          return;
        }
        
        const data = await res.json();
        console.log("Auth check response:", data);
        
        if (data.authenticated) {
          setAuthChecked(true);
          console.log("Authentication verified for Stripe operations");
          
          // If session was restored, refresh user data
          if (data.restored) {
            console.log("Session was restored from backup userId");
            await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          }
        } else {
          toast({
            title: "Session Error",
            description: "Your session appears to be invalid. Please try logging out and back in.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
      }
    }
    
    checkStripeAuth();
  }, [user, toast]);

  // Skip check for non-workers if workersOnly is true
  const shouldCheckUser = !!(authChecked && user && (!workersOnly || user.accountType === 'worker'));

  // Check if the user has a Connect account
  const { data: accountStatus, isLoading, error } = useQuery({
    queryKey: ['/api/stripe/connect/account-status'],
    queryFn: async () => {
      try {
        // First check authentication again right before making the request
        const authCheck = await apiRequest('GET', '/api/stripe/check-auth');
        if (!authCheck.ok) {
          console.log('Authentication check failed, returning null');
          return null; // Gracefully handle auth failure
        }
        
        const res = await apiRequest('GET', '/api/stripe/connect/account-status');
        if (!res.ok) {
          if (res.status === 404) {
            return null; // No account found is a valid scenario
          }
          console.log(`Failed to get account status: ${res.status}, returning null`);
          return null; // Gracefully handle other failures
        }
        return await res.json();
      } catch (error) {
        // Handle 404 (no account) as a legitimate response
        if ((error as any).status === 404) {
          return null;
        }
        console.error("Error fetching Stripe Connect status:", error);
        return null; // Return null instead of throwing to prevent crashes
      }
    },
    // Only run if we should check this user and auth is verified
    enabled: shouldCheckUser,
    // Don't retry 404 errors (no account)
    retry: (failureCount, error: any) => {
      return failureCount < 3 && error.status !== 404;
    }
  });

  useEffect(() => {
    if (!isLoading && shouldCheckUser) {
      // If enforce is true, show the modal when the user doesn't have an account
      // or if the account setup is incomplete
      const needsSetup = !accountStatus || 
        (accountStatus.accountStatus !== 'active' && accountStatus.accountStatus !== 'restricted');
      
      // Check if user has previously dismissed the setup
      const hasUserDismissedSetup = localStorage.getItem('stripe-connect-dismissed') === 'true';
      
      if (enforce && needsSetup && !hasUserDismissedSetup) {
        setShowRequiredModal(true);
      }
      
      setHasChecked(true);
    }
  }, [isLoading, accountStatus, enforce, shouldCheckUser]);

  // Handle skip action
  const handleSkip = () => {
    setShowRequiredModal(false);
  };

  // If we need to show setup modal
  if (showRequiredModal) {
    return (
      <>
        {children}
        <StripeConnectRequired 
          onSkip={handleSkip} 
          showSkip={!enforce} 
        />
      </>
    );
  }

  // Return children once checked or if we don't need to check
  return <>{children}</>;
};

export default StripeConnectCheck;