import { Switch, Route, useLocation, useRoute } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/Home";
import PostJob from "@/pages/PostJob";
import JobDetails from "@/pages/JobDetails";
import JobDetailPage from "@/pages/job-detail-page";
import EarningsPage from "@/pages/EarningsPage";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import TransactionHistory from "@/pages/TransactionHistory";
import CompleteProfile from "@/pages/CompleteProfile";
import Checkout from "@/pages/Checkout";
import PaymentConfirmation from "@/pages/PaymentConfirmation";
import PaymentsDashboard from "@/pages/PaymentsDashboard";

import NotificationsPage from "@/pages/notifications-page";
import ResetPassword from "@/pages/ResetPassword";
import { AuthProvider } from "@/hooks/use-auth";
import { NotificationProvider } from "@/hooks/use-notifications";
import { RealTimeNotificationProvider } from "@/providers/notification-provider";
import { ProtectedRoute } from "@/lib/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { StripeConnectCheck, StripeRequirementsCheck } from "@/components/stripe";
import WelcomeMessage from "@/components/WelcomeMessage";
import { ThemeProvider } from "@/components/theme";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import ContextualTips from "@/components/onboarding/ContextualTips";
import { SimpleToastProvider } from "@/hooks/use-simple-toast";

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
      <ProtectedRoute path="/post-job" component={PostJob} />
      <ProtectedRoute path="/jobs/post" component={PostJob} />
      <ProtectedRoute path="/job/:id" component={JobDetailPage} />
      <ProtectedRoute path="/earnings" component={EarningsPage} />
      <ProtectedRoute path="/transactions" component={TransactionHistory} />
      <ProtectedRoute path="/checkout" component={Checkout} />
      <ProtectedRoute path="/payment-confirmation" component={PaymentConfirmation} />
      <ProtectedRoute path="/payments" component={PaymentsDashboard} />
      <ProtectedRoute path="/payments/dashboard" component={PaymentsDashboard} />
      <ProtectedRoute path="/notifications" component={NotificationsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/login" component={RedirectToAuth} />
      <Route path="/register" component={RedirectToAuth} />
      <Route path="/auth/callback" component={() => <div>Processing authentication...</div>} />
      <Route path="/reset-password" component={ResetPassword} />
      {/* Account type selection is no longer needed */}
      <Route path="/complete-profile" component={CompleteProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

// This component uses auth context, so it must be inside the AuthProvider
function AuthenticatedContent() {
  const { user } = useAuth();
  
  return (
    <>
      <RouterWithAuth />
      {user && (
        <StripeConnectCheck workersOnly={true} enforce={false}>
          <StripeRequirementsCheck user={user}>
            <WelcomeMessage />
          </StripeRequirementsCheck>
        </StripeConnectCheck>
      )}
      {/* Contextual tips will track user actions and show tooltips at the right moments */}
      {user && <ContextualTips />}
      <Toaster />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="fixer-theme">
        <TooltipProvider>
          <SimpleToastProvider>
            <AuthProvider>
              <RealTimeNotificationProvider>
                <OnboardingProvider>
                  <AuthenticatedContent />
                </OnboardingProvider>
              </RealTimeNotificationProvider>
            </AuthProvider>
          </SimpleToastProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;