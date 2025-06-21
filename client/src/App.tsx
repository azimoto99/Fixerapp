import React from "@/lib/ensure-react";
import { Switch, Route, useLocation, useRoute } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { PaymentDialogProvider } from "@/components/payments/PaymentDialogManager";
import Home from "@/pages/Home";
import PostJob from "@/pages/PostJob";
// JobDetailPage removed - using unified JobDetailsCard via JobCardFix

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
import VerifyEmail from "@/pages/VerifyEmail";
import StripeConnectOnboarding from "@/components/StripeConnectOnboarding";
import WalletPage from "@/pages/wallet-page";
import { AuthProvider } from "@/hooks/use-auth";
import { NotificationProvider } from "@/hooks/use-notifications";
import { ProtectedRoute } from "@/lib/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { StripeConnectCheck, StripeRequirementsCheck } from "@/components/stripe";
import WelcomeMessage from "@/components/WelcomeMessage";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import ContextualTips from "@/components/onboarding/ContextualTips";
import { SimpleToastProvider } from "@/hooks/use-simple-toast";

import ExpoConnectGuide from "@/components/ExpoConnectGuide";
import JobCardFix from "@/components/JobCardFix";
import { useState, useEffect } from "react";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { AccountTypeSelection } from "@/pages/AccountTypeSelection";
import { AccountTypeRoute } from "@/lib/account-type-route";
import { CrossPlatformProvider } from "@/lib/cross-platform";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { StripeConnectProvider } from "@/contexts/stripe-connect-context";
import { PaymentDialogManager } from "@/components/payments/PaymentDialogManager";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Pages
import ExplorePage from "@/pages/ExplorePage";
import Profile from "@/pages/Profile";
import { SupportPage } from "@/pages/support-page";
import { PrivacyPage } from "@/pages/privacy-page";
import { TermsPage } from "@/pages/terms-page";
import { AboutPage } from "@/pages/about-page";

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
  const { user, isLoading, error } = useAuth();
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
  
  // If there's an error loading user data, redirect to auth
  if (error && isRoot) {
    console.error('Error loading user data:', error);
    navigate('/auth');
    return null;
  }
  
  return (
    <Switch>
      <ProtectedRoute path="/" component={Home} />
      <ProtectedRoute path="/post-job" component={PostJob} />
      <ProtectedRoute path="/jobs/post" component={PostJob} />
      {/* Job detail route removed - using unified JobDetailsCard modal */}

      <ProtectedRoute path="/transactions" component={TransactionHistory} />
      <ProtectedRoute path="/checkout/:amount/:jobId" component={Checkout} />
      <ProtectedRoute path="/payment-success" component={PaymentSuccess} />
      <ProtectedRoute path="/payment-confirmation" component={PaymentConfirmation} />
      <ProtectedRoute path="/payment-settings" component={PaymentSettings} />
      {/* Consolidated payment management */}
      <ProtectedRoute path="/payments" component={PaymentsPage} />
      <ProtectedRoute path="/verify-email" component={VerifyEmail} />
      {/* Wallet page for Stripe Connect returns */}
      <ProtectedRoute path="/wallet" component={WalletPage} />
      {/* Removed redundant StripeTest route */}
      <ProtectedRoute path="/stripe-tester" component={StripeTester} />
      <ProtectedRoute path="/notifications" component={NotificationsPage} />
      <ProtectedRoute path="/admin" component={AdminPanelV2} />
      <ProtectedRoute path="/profile/:id" component={UserProfile} />
      <ProtectedRoute path="/stripe-connect/onboarding" component={StripeConnectOnboarding} />
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
      {/* ExpoConnectGuide button removed from UI - use ./expo-connect.sh in console instead */}
      {/* Global Messaging Drawer - Disabled in favor of job-based messaging */}

      {/* JobCardFix ensures job details card appears on top of other UI elements */}
      {user && <JobCardFix />}
      
      <Toaster />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <CrossPlatformProvider>
          <AuthProvider>
            <WebSocketProvider>
              <StripeConnectProvider>
                <AppContent />
              </StripeConnectProvider>
            </WebSocketProvider>
          </AuthProvider>
        </CrossPlatformProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const isMobile = useMobile();

  // Check if we're on a public route that doesn't require authentication
  const isPublicRoute = ['/terms', '/privacy', '/about'].includes(location);

  // Show loading state while checking authentication
  if (isLoading && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show auth page if user is not authenticated and not on a public route
  if (!user && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-background">
        <AuthPage />
        <Toaster />
      </div>
    );
  }

  // Show account type selection if user hasn't selected an account type
  if (user && !user.accountType && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-background">
        <AccountTypeSelection />
        <Toaster />
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-background", isMobile && "pb-16")}>
      {/* Header for desktop, hidden on mobile */}
      <div className="hidden md:block">
        <Header />
      </div>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 md:py-12">
        <AccountTypeRoute path="/" component={Home} />
        <AccountTypeRoute path="/explore" component={ExplorePage} />
        <AccountTypeRoute path="/profile" component={Profile} />
        <AccountTypeRoute path="/admin" component={AdminPanelV2} requiredRole="admin" />
        <AccountTypeRoute path="/verify-email" component={VerifyEmail} />
        <AccountTypeRoute path="/notifications" component={NotificationsPage} />
        <AccountTypeRoute path="/payments" component={PaymentsPage} />
        <AccountTypeRoute path="/support" component={SupportPage} />
        <AccountTypeRoute path="/privacy" component={PrivacyPage} />
        <AccountTypeRoute path="/terms" component={TermsPage} />
        <AccountTypeRoute path="/about" component={AboutPage} />
      </main>

      {/* Welcome message for new users */}
      {user && (
        <WelcomeMessage />
      )}

      {/* Mobile navigation */}
      <div className="md:hidden">
        <MobileNav />
      </div>

      {/* Global Payment Dialog Manager */}
      <PaymentDialogManager />

      <Toaster />
    </div>
  );
}

export default App;