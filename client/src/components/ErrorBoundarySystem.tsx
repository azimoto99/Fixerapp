import React from "@/lib/ensure-react";
import { Component, ReactNode, ErrorInfo } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  queryClient?: QueryClient;
}

export class ErrorBoundarySystem extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error details
    console.error('Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    
    // Report error to monitoring service (if available)
    this.reportError(error, errorInfo);
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In a production app, you would send this to an error monitoring service
    // like Sentry, LogRocket, or Bugsnag
    const errorReport = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getUserId(),
      environment: process.env.NODE_ENV,
      retryCount: this.retryCount,
      errorType: this.getErrorType(error)
    };
    
    // Log to console for debugging
    console.error('Error Report:', errorReport);
    
    // Store error locally for potential offline reporting
    try {
      const existingErrors = JSON.parse(localStorage.getItem('errorReports') || '[]');
      existingErrors.push(errorReport);
      // Keep only the last 10 errors to avoid storage bloat
      const recentErrors = existingErrors.slice(-10);
      localStorage.setItem('errorReports', JSON.stringify(recentErrors));
    } catch (storageError) {
      console.warn('Failed to store error report locally:', storageError);
    }
    
    // In production, send to monitoring service:
    // errorMonitoringService.captureException(error, errorReport);
  };

  private getUserId = (): string | null => {
    // Try to get user ID from various sources
    try {
      // From localStorage
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id?.toString() || null;
      }
      
      // From sessionStorage
      const sessionData = sessionStorage.getItem('user');
      if (sessionData) {
        const user = JSON.parse(sessionData);
        return user.id?.toString() || null;
      }
      
      return null;
    } catch {
      return null;
    }
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      
      // Clear query cache if available
      if (this.props.queryClient) {
        this.props.queryClient.clear();
      }
      
      // Reset error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: ''
      });
      
      // Force re-render
      this.forceUpdate();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private getErrorType = (error: Error): string => {
    if (error.name === 'ChunkLoadError') return 'chunk_load';
    if (error.message.includes('Network')) return 'network';
    if (error.message.includes('fetch')) return 'api';
    if (error.message.includes('Stripe')) return 'payment';
    if (error.message.includes('auth')) return 'authentication';
    return 'unknown';
  };

  private getErrorSolution = (errorType: string): string => {
    switch (errorType) {
      case 'chunk_load':
        return 'This usually happens after an app update. Please refresh the page.';
      case 'network':
        return 'Please check your internet connection and try again.';
      case 'api':
        return 'There was a problem connecting to our servers. Please try again.';
      case 'payment':
        return 'There was an issue with payment processing. Please try again or contact support.';
      case 'authentication':
        return 'Please log out and log back in to refresh your session.';
      default:
        return 'An unexpected error occurred. Please try refreshing the page.';
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const errorType = this.getErrorType(this.state.error);
      const solution = this.getErrorSolution(errorType);
      const canRetry = this.retryCount < this.maxRetries;

      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <CardDescription>
                {solution}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Error details (only in development) */}
              {process.env.NODE_ENV === 'development' && (
                <details className="text-xs bg-muted p-3 rounded">
                  <summary className="cursor-pointer font-medium">Error Details</summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <strong>Error ID:</strong> {this.state.errorId}
                    </div>
                    <div>
                      <strong>Type:</strong> {errorType}
                    </div>
                    <div>
                      <strong>Message:</strong> {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="text-xs mt-1 overflow-auto">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
              
              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                {canRetry && (
                  <Button onClick={this.handleRetry} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again ({this.maxRetries - this.retryCount} attempts left)
                  </Button>
                )}
                
                <Button onClick={this.handleReload} variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
                
                <Button onClick={this.handleGoHome} variant="outline" className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>
              
              {/* Support information */}
              <div className="text-center text-sm text-muted-foreground">
                <p>If this problem persists, please contact support.</p>
                <p className="mt-1">
                  Error ID: <code className="text-xs">{this.state.errorId}</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Network error recovery component
export function NetworkErrorRecovery({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = React.useState(false);

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (showOfflineMessage && !isOnline) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle>You're offline</CardTitle>
            <CardDescription>
              Please check your internet connection and try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

// Chunk load error recovery (for code splitting)
export function ChunkErrorRecovery({ children }: { children: ReactNode }) {
  const [hasChunkError, setHasChunkError] = React.useState(false);

  React.useEffect(() => {
    const handleChunkError = (event: ErrorEvent) => {
      if (event.error?.name === 'ChunkLoadError') {
        setHasChunkError(true);
      }
    };

    window.addEventListener('error', handleChunkError);
    
    return () => {
      window.removeEventListener('error', handleChunkError);
    };
  }, []);

  if (hasChunkError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <RefreshCw className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>App Update Available</CardTitle>
            <CardDescription>
              A new version of the app is available. Please refresh to get the latest features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}