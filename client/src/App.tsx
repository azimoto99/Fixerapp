import React from "@/lib/ensure-react";
import { Switch, Route, useLocation, useRoute } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PaymentDialogProvider } from "@/components/payments/PaymentDialogManager";
import Home from "@/pages/Home";
import PostJob from "@/pages/PostJob";
// Using JobDetailPage as the primary job details component
import JobDetailPage from "@/pages/job-detail-page";

import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import TransactionHistory from "@/pages/TransactionHistory";
import CompleteProfile from "@/pages/CompleteProfile";
import Checkout from "@/pages/checkout";
import PaymentConfirmation from "@/pages/PaymentConfirmation";
import PaymentSettings from "@/pages/PaymentSettings";
import StripeTester from "@/pages/StripeTester";
import PaymentSuccess from "@/pages/payment-success";
import PaymentsPage from "@/pages/payments-page";
import NotificationsPage from "@/pages/notifications-page";
import UserProfile from "@/pages/UserProfile";
import AdminPanelV2 from "@/pages/AdminPanelV2";
import { AuthProvider } from "@/hooks/use-auth";
import { NotificationProvider } from "@/hooks/use-notifications";
import { ProtectedRoute } from "@/lib/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { StripeConnectCheck, StripeRequirementsCheck } from "@/components/stripe";
import WelcomeMessage from "@/components/WelcomeMessage";
import { ThemeProvider } from "@/components/theme";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import ContextualTips from "@/components/onboarding/ContextualTips";
import { SimpleToastProvider } from "@/hooks/use-simple-toast";
import JobCardFix from "@/components/JobCardFix";
import MobileNav from "@/components/MobileNav";
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
  
  // If still loading, show a loading indicator
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }
  
  return (
    <Switch>
      <ProtectedRoute path="/" component={Home} />
      <ProtectedRoute path="/post-job" component={PostJob} />
      <ProtectedRoute path="/jobs/post" component={PostJob} />
      <ProtectedRoute path="/job/:id" component={JobDetailPage} />

      <ProtectedRoute path="/transactions" component={TransactionHistory} />
      <ProtectedRoute path="/checkout/:amount/:jobId" component={Checkout} />
      <ProtectedRoute path="/payment-success" component={PaymentSuccess} />
      <ProtectedRoute path="/payment-confirmation" component={PaymentConfirmation} />
      <ProtectedRoute path="/payment-settings" component={PaymentSettings} />
      {/* Consolidated payment management */}
      <ProtectedRoute path="/payments" component={PaymentsPage} />
      {/* Removed redundant StripeTest route */}
      <ProtectedRoute path="/stripe-tester" component={StripeTester} />
      <ProtectedRoute path="/notifications" component={NotificationsPage} />
      <ProtectedRoute path="/admin" component={AdminPanelV2} />
      <ProtectedRoute path="/profile/:id" component={UserProfile} />
      {/* Payment dashboard is not accessible as there are no job posters */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/login" component={RedirectToAuth} />
      <Route path="/register" component={RedirectToAuth} />
      <Route path="/auth/callback" component={() => <div>Processing authentication...</div>} />
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
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-6rem] top-[-6rem] h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-4rem] top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-72 w-72 rounded-full bg-secondary/50 blur-3xl" />
      </div>

      <div className={user ? "pb-24 md:pb-0" : ""}>
        <RouterWithAuth />
      </div>

      {user && (
        <StripeConnectCheck workersOnly={true} enforce={false}>
          <StripeRequirementsCheck user={user}>
            <WelcomeMessage />
          </StripeRequirementsCheck>
        </StripeConnectCheck>
      )}
      {/* Contextual tips will track user actions and show tooltips at the right moments */}
      {user && <ContextualTips />}
      {/* JobCardFix ensures job details card appears on top of other UI elements */}
      {user && <JobCardFix />}
      {user && <MobileNav />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="fixer-theme">
        <TooltipProvider>
          <SimpleToastProvider>
            <AuthProvider>
              <NotificationProvider>
                <PaymentDialogProvider>
                  <OnboardingProvider>
                    <AuthenticatedContent />
                  </OnboardingProvider>
                </PaymentDialogProvider>
              </NotificationProvider>
            </AuthProvider>
          </SimpleToastProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
