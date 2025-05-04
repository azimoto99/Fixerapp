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

// Full router with all components
function RouterWithAuth() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [isRoot] = useRoute("/");
  
  // Add debug info to console
  useEffect(() => {
    console.log("Auth state:", { 
      isLoading, 
      userAuthenticated: !!user,
      accountType: user?.accountType,
      isRoot
    });
  }, [isLoading, user, isRoot]);
  
  // Redirect from root to /auth if not logged in
  useEffect(() => {
    if (!isLoading && !user && isRoot) {
      navigate('/auth');
    }
  }, [isLoading, user, isRoot, navigate]);
  
  return (
    <Switch>
      {/* Main routes */}
      <Route 
        path="/" 
        component={() => {
          // If the user is logged in, try to load the real Home component 
          if (user) {
            try {
              // Dynamically import the required components instead of loading them at the top level
              // This way if one component fails, it won't cause the entire page to fail
              const Home = require('@/pages/Home').default;
              return <ErrorBoundaryRoute component={Home} />;
            } catch (e) {
              console.error("Error loading Home component:", e);
              
              // Fall back to a simple dashboard
              return (
                <div className="container mx-auto py-10 px-4">
                  <div className="flex flex-col gap-6">
                    <div className="bg-white rounded-lg shadow-lg p-6">
                      <h1 className="text-3xl font-bold mb-2">Welcome back, {user.fullName}</h1>
                      <p className="text-gray-600 mb-6">Account type: {user.accountType}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <a href="/profile" className="block p-6 bg-blue-50 rounded-lg shadow hover:shadow-md transition">
                          <h3 className="text-lg font-semibold mb-2">Profile</h3>
                          <p className="text-gray-600">Manage your personal information</p>
                        </a>
                        
                        {user.accountType === 'worker' && (
                          <a href="/earnings" className="block p-6 bg-green-50 rounded-lg shadow hover:shadow-md transition">
                            <h3 className="text-lg font-semibold mb-2">Earnings</h3>
                            <p className="text-gray-600">View your earnings and payment history</p>
                          </a>
                        )}
                        
                        <a href="/post-job" className="block p-6 bg-purple-50 rounded-lg shadow hover:shadow-md transition">
                          <h3 className="text-lg font-semibold mb-2">Post a Job</h3>
                          <p className="text-gray-600">Create a new job opportunity</p>
                        </a>
                        
                        {user.accountType === 'poster' && (
                          <a href="/payment-dashboard" className="block p-6 bg-amber-50 rounded-lg shadow hover:shadow-md transition">
                            <h3 className="text-lg font-semibold mb-2">Payment Dashboard</h3>
                            <p className="text-gray-600">Manage your posted job payments</p>
                          </a>
                        )}
                        
                        <a href="/transactions" className="block p-6 bg-indigo-50 rounded-lg shadow hover:shadow-md transition">
                          <h3 className="text-lg font-semibold mb-2">Transactions</h3>
                          <p className="text-gray-600">View your transaction history</p>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
          } else {
            return <ErrorBoundaryRoute component={DiagnosticPage} />;
          }
        }} 
      />
      
      {/* Job routes */}
      <Route path="/post-job" component={() => {
        try {
          const PostJob = require('@/pages/PostJob').default;
          return <ErrorBoundaryRoute component={PostJob} />;
        } catch (e) {
          console.error("Error loading PostJob component:", e);
          return <ErrorBoundaryRoute component={DiagnosticPage} />;
        }
      }} />
      
      <Route path="/job/:id" component={(params) => {
        try {
          // The original JobDetails page expects to get the id from the path params
          // We're not passing the id explicitly to avoid type errors
          const JobDetails = require('@/pages/JobDetails').default;
          return <ErrorBoundaryRoute component={JobDetails} />;
        } catch (e) {
          console.error("Error loading JobDetails component:", e);
          return <ErrorBoundaryRoute component={DiagnosticPage} />;
        }
      }} />
      
      {/* User routes */}
      <Route path="/profile" component={() => {
        try {
          const Profile = require('@/pages/Profile').default;
          return <ErrorBoundaryRoute component={Profile} />;
        } catch (e) {
          console.error("Error loading Profile component:", e);
          return <ErrorBoundaryRoute component={DiagnosticPage} />;
        }
      }} />
      
      <Route path="/earnings" component={() => {
        try {
          const EarningsPage = require('@/pages/EarningsPage').default;
          return <ErrorBoundaryRoute component={EarningsPage} />;
        } catch (e) {
          console.error("Error loading EarningsPage component:", e);
          return <ErrorBoundaryRoute component={DiagnosticPage} />;
        }
      }} />
      
      <Route path="/transactions" component={() => {
        try {
          const TransactionHistory = require('@/pages/TransactionHistory').default;
          return <ErrorBoundaryRoute component={TransactionHistory} />;
        } catch (e) {
          console.error("Error loading TransactionHistory component:", e);
          return <ErrorBoundaryRoute component={DiagnosticPage} />;
        }
      }} />
      
      <Route path="/payment-dashboard" component={() => {
        try {
          const PaymentDashboard = require('@/pages/PaymentDashboard').default;
          return <ErrorBoundaryRoute component={PaymentDashboard} />;
        } catch (e) {
          console.error("Error loading PaymentDashboard component:", e);
          return <ErrorBoundaryRoute component={DiagnosticPage} />;
        }
      }} />
      
      {/* Authentication routes */}
      <Route path="/auth" component={() => <ErrorBoundaryRoute component={AuthPage} />} />
      <Route path="/login" component={() => <ErrorBoundaryRoute component={RedirectToAuth} />} />
      <Route path="/register" component={() => <ErrorBoundaryRoute component={RedirectToAuth} />} />
      <Route path="/auth/callback" component={() => <div>Processing authentication...</div>} />
      <Route path="/diagnostic" component={() => <ErrorBoundaryRoute component={DiagnosticPage} />} />
      
      {/* User setup routes */}
      <Route path="/account-type-selection" component={() => {
        try {
          const AccountTypeSelection = require('@/pages/AccountTypeSelection').default;
          return <ErrorBoundaryRoute component={AccountTypeSelection} />;
        } catch (e) {
          console.error("Error loading AccountTypeSelection component:", e);
          return <ErrorBoundaryRoute component={DiagnosticPage} />;
        }
      }} />
      <Route path="/complete-profile" component={() => {
        try {
          const CompleteProfile = require('@/pages/CompleteProfile').default;
          return <ErrorBoundaryRoute component={CompleteProfile} />;
        } catch (e) {
          console.error("Error loading CompleteProfile component:", e);
          return <ErrorBoundaryRoute component={DiagnosticPage} />;
        }
      }} />
      <Route path="/connect-setup" component={() => {
        try {
          const ConnectSetup = require('@/pages/ConnectSetup').default;
          return <ErrorBoundaryRoute component={ConnectSetup} />;
        } catch (e) {
          console.error("Error loading ConnectSetup component:", e);
          return <ErrorBoundaryRoute component={DiagnosticPage} />;
        }
      }} />
      
      {/* Fallback route */}
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
