import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';

// Higher-Order Component to ensure a component is only rendered when authenticated
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    redirectTo?: string;
    loadingComponent?: React.ReactNode;
  }
) {
  return function WithAuthComponent(props: P) {
    const { user, isLoading, loginMutation } = useAuth();
    const [, navigate] = useLocation();
    const [retryCount, setRetryCount] = useState(0);
    const [isRetrying, setIsRetrying] = useState(false);

    // Handle authentication checking
    useEffect(() => {
      if (!isLoading && !user && retryCount < 2) {
        // If retries are exhausted, redirect
        if (options?.redirectTo) {
          navigate(options.redirectTo);
        }
      }
    }, [isLoading, user, navigate, options?.redirectTo, retryCount]);

    // Handle retry logic
    const handleRetry = async () => {
      setIsRetrying(true);
      try {
        // Make a direct fetch to refresh the session state
        const response = await fetch('/api/user', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          if (userData) {
            // Manually refresh the page to reset authentication state
            window.location.reload();
            return;
          }
        }
        
        // Increment retry count
        setRetryCount(prev => prev + 1);
      } catch (error) {
        console.error('Auth retry failed:', error);
      } finally {
        setIsRetrying(false);
      }
    };

    // Show loading state
    if (isLoading) {
      return options?.loadingComponent ? (
        <>{options.loadingComponent}</>
      ) : (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      );
    }

    // If not authenticated, show error with retry option
    if (!user) {
      return (
        <Card className="mx-auto max-w-md mt-8">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Your session has expired or you are not logged in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please log in again to access this part of the application.
            </p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => navigate('/auth')}
            >
              Go to Login
            </Button>
            <Button 
              onClick={handleRetry} 
              disabled={isRetrying || retryCount >= 2}
            >
              {isRetrying ? 'Retrying...' : 'Retry Connection'}
            </Button>
          </CardFooter>
        </Card>
      );
    }

    // If authenticated, render the wrapped component
    return <Component {...props} />;
  };
}