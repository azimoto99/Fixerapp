import { useState, useEffect } from "react";
import { Switch, Route, useLocation, useRoute } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { AuthProvider } from "@/hooks/use-auth";
import { useAuth } from "@/hooks/use-auth";

// Component to wrap each route and catch errors
function ErrorBoundaryRoute({ component: Component, ...rest }: { component: React.ComponentType<any>, path?: string }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Reset error state when the route changes
  useEffect(() => {
    setHasError(false);
    setError(null);
  }, [rest.path]);

  if (hasError) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold mb-4 text-red-600">Component Error</h1>
          <p className="mb-4">There was an error rendering this component:</p>
          <div className="bg-gray-100 p-4 rounded mb-4 overflow-auto">
            <pre className="text-sm">{error?.message}</pre>
            {error?.stack && (
              <details className="mt-2">
                <summary className="cursor-pointer">Stack trace</summary>
                <pre className="text-xs mt-2">{error.stack}</pre>
              </details>
            )}
          </div>
          <div className="mt-4">
            <Button 
              onClick={() => window.location.reload()} 
              variant="destructive"
            >
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  try {
    return <Component {...rest} />;
  } catch (err) {
    console.error("Component render error:", err);
    setHasError(true);
    setError(err instanceof Error ? err : new Error(String(err)));
    
    return (
      <div className="p-4 bg-red-100 text-red-800 rounded">
        Rendering error. See console for details.
      </div>
    );
  }
}

// Fallback component for when Auth provider has an error
function AuthFallback() {
  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold mb-4">Authentication System Error</h1>
        <p className="mb-4">There was a problem with the authentication system.</p>
        <div className="mt-4">
          <a href="/auth-test">
            <Button variant="outline">Try Google Auth Test</Button>
          </a>
          <a href="/register-test" className="ml-2">
            <Button variant="outline">Try Registration Test</Button>
          </a>
        </div>
      </div>
    </div>
  );
}

// Diagnostic page for testing system status
function DiagnosticPage() {
  const [serverStatus, setServerStatus] = useState<string>("Checking...");
  const [authStatus, setAuthStatus] = useState<string>("Checking...");
  
  useEffect(() => {
    // Check server status
    fetch("/api/categories")
      .then(response => {
        if (response.ok) {
          setServerStatus("Server is running ✅");
        } else {
          setServerStatus(`Server error: ${response.status} ${response.statusText} ❌`);
        }
      })
      .catch(error => {
        setServerStatus(`Server connection error: ${error.message} ❌`);
      });
    
    // Check auth status
    fetch("/api/user")
      .then(response => {
        if (response.ok) {
          return response.json().then(user => {
            setAuthStatus(`Authenticated as ${user.username} ✅`);
          });
        } else if (response.status === 401) {
          setAuthStatus("Not authenticated ℹ️");
        } else {
          setAuthStatus(`Auth error: ${response.status} ${response.statusText} ❌`);
        }
      })
      .catch(error => {
        setAuthStatus(`Auth check error: ${error.message} ❌`);
      });
  }, []);
  
  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold mb-4">The Job - System Diagnostic</h1>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">System Status</h2>
          <div className="space-y-2 mb-4">
            <div className="p-3 bg-gray-100 rounded">
              <p><strong>Server Status:</strong> {serverStatus}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded">
              <p><strong>Auth Status:</strong> {authStatus}</p>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Authentication Tests</h2>
          <div className="flex flex-wrap gap-4">
            <a href="/auth-test">
              <Button variant="outline">Google Auth Test</Button>
            </a>
            <a href="/register-test">
              <Button variant="outline">Registration Test</Button>
            </a>
            <a href="/auth">
              <Button variant="default">Go to Auth Page</Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Redirect component for old routes
function RedirectToAuth() {
  const [_, navigate] = useLocation();
  
  useEffect(() => {
    navigate('/auth');
  }, [navigate]);
  
  return null;
}

// Simple router with minimal components
function RouterWithAuth() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [isRoot] = useRoute("/");
  
  // Redirect from root to /auth if not logged in
  useEffect(() => {
    if (!isLoading && !user && isRoot) {
      navigate('/auth');
    }
  }, [isLoading, user, isRoot, navigate]);
  
  return (
    <Switch>
      <Route path="/" component={() => <ErrorBoundaryRoute component={DiagnosticPage} />} />
      <Route path="/auth" component={() => <ErrorBoundaryRoute component={AuthPage} />} />
      <Route path="/login" component={() => <ErrorBoundaryRoute component={RedirectToAuth} />} />
      <Route path="/register" component={() => <ErrorBoundaryRoute component={RedirectToAuth} />} />
      <Route path="/auth/callback" component={() => <div>Processing authentication...</div>} />
      <Route path="/diagnostic" component={() => <ErrorBoundaryRoute component={DiagnosticPage} />} />
      <Route component={() => <ErrorBoundaryRoute component={NotFound} />} />
    </Switch>
  );
}

// Simplified App with error catching
function App() {
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <RouterWithAuth />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error("Auth provider error:", error);
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthFallback />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
}

export default App;
