import React, { createContext, useContext, useCallback } from 'react';
import { useStripeConnectMonitor } from '@/hooks/use-stripe-connect-monitor';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface StripeConnectContextType {
  accountStatus: {
    id?: string;
    isActive: boolean;
    requiresAttention: boolean;
    requirements: string[];
    lastChecked: string;
  } | null;
  isLoading: boolean;
  isError: boolean;
  refreshStatus: () => Promise<void>;
  openAccountSettings: () => Promise<void>;
}

const StripeConnectContext = createContext<StripeConnectContextType | undefined>(undefined);

export function StripeConnectProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const { accountStatus, isError, refreshAccountStatus } = useStripeConnectMonitor({
    pollInterval: 60000 // Check every minute by default
  });
  const openAccountSettings = useCallback(async () => {
    try {
      const res = await apiRequest('GET', '/api/stripe/connect/create-link');
      const { url } = await res.json();
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error opening account settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to open account settings. Please try again.',
        variant: 'destructive'
      });
    }
  }, [toast]);

  return (
    <StripeConnectContext.Provider
      value={{
        accountStatus,
        isLoading: false,
        isError,
        refreshStatus: refreshAccountStatus,
        openAccountSettings
      }}
    >
      {children}
    </StripeConnectContext.Provider>
  );
}

export function useStripeConnect() {
  const context = useContext(StripeConnectContext);
  if (context === undefined) {
    throw new Error('useStripeConnect must be used within a StripeConnectProvider');
  }
  return context;
}
