import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AccountTypeSelection() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState<'worker' | 'poster' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [providerType, setProviderType] = useState<string | null>(null);

  // Get the user ID and provider type from the URL query parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get('id');
    const provider = searchParams.get('provider');
    
    if (id) {
      setUserId(id);
    }
    
    if (provider) {
      setProviderType(provider);
    }
  }, []);

  const handleTypeSelection = async (accountType: 'worker' | 'poster') => {
    if (!userId || !providerType) {
      toast({
        title: 'Error',
        description: 'Missing user information. Please try logging in again.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(accountType);

    try {
      const res = await apiRequest('POST', '/api/set-account-type', {
        userId,
        accountType,
        provider: providerType,
      });

      if (res.ok) {
        // Account type set successfully, redirect to home page
        navigate('/');
      } else {
        const data = await res.json();
        throw new Error(data.message || 'Failed to set account type');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to set account type',
        variant: 'destructive',
      });
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md p-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center">
            <svg className="h-8 w-8 text-primary-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
            <span className="ml-2 text-2xl font-bold text-primary-600">The Job</span>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Choose Account Type</CardTitle>
            <CardDescription>
              Select which type of account you want to use with your {providerType ? providerType.charAt(0).toUpperCase() + providerType.slice(1) : 'social'} login
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                size="lg"
                className="h-24 flex flex-col items-center justify-center text-left p-4 hover:border-primary hover:bg-primary/5"
                onClick={() => handleTypeSelection('worker')}
                disabled={loading !== null}
              >
                <div className="flex items-center justify-center mb-2">
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                    <path d="M20 8v6"></path>
                    <path d="M23 11h-6"></path>
                  </svg>
                </div>
                <span className="font-semibold">Worker</span>
                <span className="text-xs text-muted-foreground">Find jobs near you</span>
                {loading === 'worker' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  </div>
                )}
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="h-24 flex flex-col items-center justify-center text-left p-4 hover:border-primary hover:bg-primary/5"
                onClick={() => handleTypeSelection('poster')}
                disabled={loading !== null}
              >
                <div className="flex items-center justify-center mb-2">
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="9" y1="21" x2="9" y2="9"></line>
                    <line x1="15" y1="21" x2="15" y2="9"></line>
                  </svg>
                </div>
                <span className="font-semibold">Job Poster</span>
                <span className="text-xs text-muted-foreground">Post and manage jobs</span>
                {loading === 'poster' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  </div>
                )}
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>You can always create another account with a different type later.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}