import React from "@/lib/ensure-react";
import { Switch, Route, useLocation, useRoute } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { PaymentDialogProvider } from "@/components/payments/PaymentDialogManager";
import Home from "@/pages/Home";
import PostJob from "@/pages/PostJob";
import Explore from "@/pages/Explore";
// JobDetailPage removed - using unified JobDetailsCard via JobCardFix

import AuthPage from "@/pages/auth-page";
import BusinessRegister from "@/pages/BusinessRegister";
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
import EmailVerified from "@/pages/EmailVerified";
import StripeConnectOnboarding from "@/components/StripeConnectOnboarding";
import WalletPage from "@/pages/wallet-page";
import EnterpriseDashboard from "@/pages/EnterpriseDashboard";
import { AuthProvider } from "@/hooks/use-auth";
import { NotificationProvider } from "@/hooks/use-notifications";
import { ProtectedRoute } from "@/lib/protected-route";
import { AccountTypeRoute } from "@/lib/account-type-route";
import { useAuth } from "@/hooks/use-auth";
import { StripeConnectCheck, StripeRequirementsCheck } from "@/components/stripe";
import WelcomeMessage from "@/components/WelcomeMessage";
import { ThemeProvider } from "@/components/theme";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import ContextualTips from "@/components/onboarding/ContextualTips";
import { SimpleToastProvider } from "@/hooks/use-simple-toast";
// import { MessagingDrawer } from "@/components/MessagingDrawer";
import ExpoConnectGuide from "@/components/ExpoConnectGuide";
import JobCardFix from "@/components/JobCardFix";
import { useState, useEffect } from "react";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { ProfilePopup } from "@/components/ProfilePopup";

// Import new system components
import { ErrorBoundarySystem, NetworkErrorRecovery, ChunkErrorRecovery } from "@/components/ErrorBoundarySystem";
import { useAppConnections } from "@/hooks/useAppConnections";
import { WebSocketDebug } from "@/components/WebSocketDebug";

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
      <ProtectedRoute path="/explore" component={Explore} />
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
      {/* Enterprise Dashboard - Only accessible to business accounts */}
      <AccountTypeRoute path="/enterprise-dashboard" component={EnterpriseDashboard} allowedType="enterprise" />
      {/* Payment dashboard is not accessible as there are no job posters */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/business-register" component={BusinessRegister} />
      <Route path="/login" component={RedirectToAuth} />
      <Route path="/register" component={RedirectToAuth} />
      <Route path="/auth/callback" component={() => <div>Processing authentication...</div>} />
      {/* Account type selection is no longer needed */}
      <Route path="/complete-profile" component={CompleteProfile} />
      <Route path="/email-verified" component={EmailVerified} />
      <Route path="/forgot-password" component={() => import('@/pages/ForgotPassword').then(m=>m.default)} />
      <Route path="/reset-password" component={() => import('@/pages/ResetPassword').then(m=>m.default)} />
      <Route component={NotFound} />
    </Switch>
  );
}

// This component uses auth context, so it must be inside the AuthProvider
function AuthenticatedContent() {
  const { user } = useAuth();
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Initialize the comprehensive connection system
  const {
    isConnected,
    connectionStatus,
    notifications,
    unreadCount
  } = useAppConnections();
  
  // Listen for messaging events
  useEffect(() => {
    const handleOpenMessaging = (event: CustomEvent) => {
      setIsMessagingOpen(true);
      // Handle both userId (from UserProfile) and contactId (from JobDetailsCard)
      const targetUserId = event.detail?.userId || event.detail?.contactId;
      if (targetUserId) {
        setSelectedUserId(targetUserId);
      }
    };

    window.addEventListener('open-messaging' as any, handleOpenMessaging);

    return () => {
      window.removeEventListener('open-messaging' as any, handleOpenMessaging);
    };
  }, []);
  
  // Listen for profile popup events
  useEffect(() => {
    const handleOpenProfile = (event: CustomEvent<{ userId: number }>) => {
      setSelectedUserId(event.detail.userId);
      setIsProfileOpen(true);
    };

    window.addEventListener('open-profile', handleOpenProfile as EventListener);
    return () => window.removeEventListener('open-profile', handleOpenProfile as EventListener);
  }, []);
  
  // Update document title with unread count
  useEffect(() => {
    const baseTitle = 'Fixer - Gig Economy Platform';
    document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;
  }, [unreadCount]);
  
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
      
      {/* Connection status indicator */}
      {user && connectionStatus !== 'connected' && (
        <div className="fixed top-4 right-4 z-50 bg-orange-500 text-white px-3 py-1 rounded-md text-sm">
          {connectionStatus === 'connecting' ? 'Connecting...' : 'Reconnecting...'}
        </div>
      )}
      
      <Toaster />
      
      {/* Temporary debug component - remove in production */}
      {process.env.NODE_ENV === 'development' && <WebSocketDebug />}

      {/* Profile popup */}
      <ProfilePopup open={isProfileOpen} onOpenChange={setIsProfileOpen} userId={selectedUserId} />
    </>
  );
}

function App() {
  return (
    <ErrorBoundarySystem 
      queryClient={queryClient}
      onError={(error, errorInfo) => {
        console.error('App Error Boundary:', error, errorInfo);
        // In production, send to error monitoring service
      }}
    >
      <ChunkErrorRecovery>
        <NetworkErrorRecovery>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider defaultTheme="system" storageKey="fixer-theme">
              <TooltipProvider>
                <SimpleToastProvider>
                  <AuthProvider>
                    <NotificationProvider>
                      <PaymentDialogProvider>
                        <OnboardingProvider>
                          <WebSocketProvider>
                            <AuthenticatedContent />
                          </WebSocketProvider>
                        </OnboardingProvider>
                      </PaymentDialogProvider>
                    </NotificationProvider>
                  </AuthProvider>
                </SimpleToastProvider>
              </TooltipProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </NetworkErrorRecovery>
      </ChunkErrorRecovery>
    </ErrorBoundarySystem>
  );
}

export default App;