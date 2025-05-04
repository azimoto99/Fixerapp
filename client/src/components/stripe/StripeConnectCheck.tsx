import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import StripeConnectRequired from './StripeConnectRequired';

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
  const [showRequiredModal, setShowRequiredModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  // Skip check for non-workers if workersOnly is true
  const shouldCheckUser = !!(user && (!workersOnly || user.accountType === 'worker'));

  // Check if the user has a Connect account
  const { data: accountStatus, isLoading, error } = useQuery({
    queryKey: ['/api/stripe/connect/account-status'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/stripe/connect/account-status');
        return await res.json();
      } catch (error) {
        // Handle 404 (no account) as a legitimate response
        if ((error as any).status === 404) {
          return null;
        }
        throw error;
      }
    },
    // Only run if we should check this user
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
      
      if (enforce && needsSetup) {
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