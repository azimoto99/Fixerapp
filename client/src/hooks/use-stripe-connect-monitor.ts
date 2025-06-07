import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useSessionMonitor } from '@/hooks/use-session-monitor';

interface StripeAccountStatus {
  id: string;
  isActive: boolean;
  requiresAttention: boolean;
  requirements: string[];
  lastChecked: string;
}

export function useStripeConnectMonitor(options = { pollInterval: 30000 }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { sessionHealth, checkSessionHealth } = useSessionMonitor();

  // Query for Stripe account status
  const { data: accountStatus, isError } = useQuery({
    queryKey: ['/api/stripe/connect/account-status'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/stripe/connect/account-status');
      if (!res.ok) {
        throw new Error('Failed to fetch Stripe account status');
      }
      return res.json();
    },
    refetchInterval: options.pollInterval,
    enabled: !!sessionHealth?.isAuthenticated
  });
  // Handle requirements that need attention
  React.useEffect(() => {
    if (accountStatus?.requiresAttention) {
      toast({
        title: 'Stripe Account Needs Attention',
        description: 'There are pending requirements for your Stripe account that need to be addressed.',
        variant: 'destructive',
      });
    }
  }, [accountStatus?.requiresAttention, toast]);

  // Handle errors
  React.useEffect(() => {
    if (isError) {
      toast({
        title: 'Connection Error',
        description: 'Unable to check Stripe account status. Please ensure you\'re connected to the internet.',
        variant: 'destructive'
      });
    }
  }, [isError, toast]);

  const refreshAccountStatus = React.useCallback(async () => {
    await checkSessionHealth();
    return queryClient.invalidateQueries({ queryKey: ['/api/stripe/connect/account-status'] });
  }, [checkSessionHealth, queryClient]);

  return {
    accountStatus,
    isError,
    refreshAccountStatus
  };
}
