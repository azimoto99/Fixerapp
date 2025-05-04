import { Switch, Route, useLocation, useRoute } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/Home";
import PostJob from "@/pages/PostJob";
import JobDetails from "@/pages/JobDetails";
import Profile from "@/pages/Profile";
import EarningsPage from "@/pages/EarningsPage";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import TransactionHistory from "@/pages/TransactionHistory";
import PaymentDashboard from "@/pages/PaymentDashboard";
import AccountTypeSelection from "@/pages/AccountTypeSelection";
import CompleteProfile from "@/pages/CompleteProfile";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { AccountTypeRoute } from "@/lib/account-type-route";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

// Redirect component for old routes
function RedirectToAuth() {
  const [_, navigate] = useLocation();
  
  useEffect(() => {
    navigate('/auth');
  }, [navigate]);
  
  return null;
}

// Auth-aware router that redirects to auth page if not logged in
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
      <ProtectedRoute path="/" component={Home} />
      <AccountTypeRoute path="/post-job" component={PostJob} allowedType="poster" />
      <ProtectedRoute path="/job/:id" component={JobDetails} />
      <ProtectedRoute path="/profile" component={Profile} />
      <AccountTypeRoute path="/earnings" component={EarningsPage} allowedType="worker" />
      <ProtectedRoute path="/transactions" component={TransactionHistory} />
      <AccountTypeRoute path="/payment-dashboard" component={PaymentDashboard} allowedType="poster" />
      <Route path="/auth" component={AuthPage} />
      <Route path="/login" component={RedirectToAuth} />
      <Route path="/register" component={RedirectToAuth} />
      <Route path="/auth/callback" component={() => <div>Processing authentication...</div>} />
      <Route path="/account-type-selection" component={AccountTypeSelection} />
      <Route path="/complete-profile" component={CompleteProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
}

export default App;
