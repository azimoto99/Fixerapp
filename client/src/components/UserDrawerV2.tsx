import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Settings, 
  LogOut, 
  Star as StarIcon, 
  Wallet,
  X,
  LayoutDashboard,
  Home,
  Scroll,
  Bell,
  HelpCircle,
  Shield,
  UserPlus,
  ChevronRight,
  CreditCard
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ProfileContentV2 from './drawer-contents/ProfileContentV2';
import WalletContent from './WalletContent'; // Ensure this is the main WalletContent in components, not drawer-contents
import ReviewsContent from './drawer-contents/ReviewsContent';
import SettingsContent from './drawer-contents/SettingsContent';
import SupportContent from './drawer-contents/SupportContent';
import PaymentContent from './drawer-contents/PaymentContent';
import EarningsContent from './drawer-contents/EarningsContent';
import NotificationsContent from './drawer-contents/NotificationsContent';

interface UserDrawerProps {
  children?: React.ReactNode;
  onDrawerStateChange?: (isOpen: boolean) => void;
  externalCloseState?: boolean;
  isOpen?: boolean;
}

/**
 * Enhanced User Drawer component with improved organization and layout
 */
const UserDrawerV2: React.FC<UserDrawerProps> = ({ 
  children, 
  onDrawerStateChange,
  externalCloseState,
  isOpen: externalIsOpen 
}) => {
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("profile");
  const [activeSection, setActiveSection] = useState<string>("earnings");
  const [isOpen, setIsOpen] = useState(externalIsOpen || false);
  const [, navigate] = useLocation();
  
  // Listen for external close requests
  useEffect(() => {
    if (externalCloseState === false && isOpen) {
      setIsOpen(false);
    }
  }, [externalCloseState, isOpen]);

  // Listen for tab switching events from other components
  useEffect(() => {
    const handleTabSwitch = (event: CustomEvent) => {
      setActiveTab(event.detail);
    };

    window.addEventListener('switch-user-drawer-tab', handleTabSwitch as EventListener);
    return () => {
      window.removeEventListener('switch-user-drawer-tab', handleTabSwitch as EventListener);
    };
  }, []);
  
  // Listen for external isOpen changes
  useEffect(() => {
    if (externalIsOpen !== undefined) {
      console.log('UserDrawerV2: External isOpen changed to', externalIsOpen);
      setIsOpen(externalIsOpen);
    }
  }, [externalIsOpen]);
  
  // Listen for custom close events from other components
  useEffect(() => {
    const handleCloseEvent = () => {
      console.log('UserDrawerV2: Received close-user-drawer event');
      setIsOpen(false);
    };
    
    const handleTabSwitchEvent = (event: any) => {
      console.log('UserDrawerV2: Received switch-user-drawer-tab event', event.detail);
      setActiveTab(event.detail);
    };
    
    window.addEventListener('close-user-drawer', handleCloseEvent);
    window.addEventListener('switch-user-drawer-tab', handleTabSwitchEvent);
    
    return () => {
      window.removeEventListener('close-user-drawer', handleCloseEvent);
      window.removeEventListener('switch-user-drawer-tab', handleTabSwitchEvent);
    };
  }, []);
  
  // Notify parent when drawer state changes - debounced to avoid quick flickering
  useEffect(() => {
    // Only notify parent about changes after a small delay to avoid rapid state toggling
    const notifyTimeout = setTimeout(() => {
      if (onDrawerStateChange) {
        console.log('UserDrawerV2: Notifying parent of state change:', isOpen);
        onDrawerStateChange(isOpen);
      }
    }, 50);
    
    return () => clearTimeout(notifyTimeout);
  }, [isOpen, onDrawerStateChange]);
  
  const drawerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  // Add click outside handler
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!user) {
    return <>{children || null}</>;
  }

  const handleLogout = () => {
    logoutMutation.mutate();
    setIsOpen(false);
  };

  const closeDrawer = () => {
    setIsOpen(false);
  };
  
  const openDrawer = () => {
    setIsOpen(true);
    console.log('Opening drawer - UserDrawerV2');
  };

  // Navigate to a route and close the drawer
  const navigateTo = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };
  
  // Handle tab switching with logging
  const handleTabChange = (tabName: string) => {
    console.log('UserDrawerV2: Switching to tab:', tabName);
    setActiveTab(tabName);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileContentV2 user={user} onSignOut={handleLogout} />;
      case "wallet":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Wallet
              </h2>
              <div className="flex bg-muted rounded-lg p-1">
                <Button
                  variant={activeSection === 'earnings' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveSection('earnings')}
                  className="text-xs px-3"
                >
                  Earnings
                </Button>
                <Button
                  variant={activeSection === 'payments' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveSection('payments')}
                  className="text-xs px-3"
                >
                  Payments
                </Button>
              </div>
            </div>
            {activeSection === 'earnings' ? (
              <EarningsContent user={user} />
            ) : (
              <PaymentContent user={user} />
            )}
          </div>
        );
      case "reviews":
        return <ReviewsContent user={user} />;
      case "settings":
        return <SettingsContent user={user} />;
      case "support":
        return <SupportContent user={user} />;
      case "notifications":
        return <NotificationsContent user={user} />;
      default:
        return <ProfileContentV2 user={user} onSignOut={handleLogout} />;
    }
  };

  return (
    <div className="relative">
      {children && (
        <div onClick={openDrawer} className="cursor-pointer">
          {children}
        </div>
      )}
      <div
        ref={drawerRef}
        className={cn(
          "fixed inset-0 z-50 flex transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex-1 bg-black/30" />
        <div className="w-80 bg-background shadow-xl flex flex-col h-full border-r border-border/30">
          <div className="flex justify-between items-center p-4 border-b border-border/30">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Account
            </h2>
            <Button variant="ghost" size="icon" onClick={closeDrawer}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar || undefined} />
                  <AvatarFallback>{user.firstName?.charAt(0) || user.username?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <p className="font-medium truncate">{user.firstName || user.username || 'User'}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{user.accountType || 'User'}</span>
                    {user.emailVerified ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Shield className="h-3 w-3 text-blue-500" />
                          </TooltipTrigger>
                          <TooltipContent>Email verified</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <UserPlus className="h-3 w-3 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent>Pending verification</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={activeTab === 'profile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTabChange('profile')}
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Profile
                </Button>
                <Button
                  variant={activeTab === 'wallet' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTabChange('wallet')}
                  className="flex items-center gap-2"
                >
                  <Wallet className="h-4 w-4" />
                  Wallet
                </Button>
                <Button
                  variant={activeTab === 'reviews' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTabChange('reviews')}
                  className="flex items-center gap-2"
                >
                  <StarIcon className="h-4 w-4" />
                  Reviews
                </Button>
                <Button
                  variant={activeTab === 'settings' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTabChange('settings')}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </div>
            </div>
            <Separator className="opacity-50" />
            <div className="flex-1 overflow-y-auto">
              {renderTabContent()}
            </div>
            <Separator className="opacity-50" />
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateTo('/')}
                className="w-full justify-start flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateTo('/explore')}
                className="w-full justify-start flex items-center gap-2"
              >
                <Scroll className="h-4 w-4" />
                Explore
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateTo('/notifications')}
                className="w-full justify-start flex items-center gap-2"
              >
                <Bell className="h-4 w-4" />
                Notifications
                <Badge className="ml-auto">3</Badge>
              </Button>
              <Button
                variant={activeTab === 'support' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTabChange('support')}
                className="w-full justify-start flex items-center gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                Support
              </Button>
              {user.isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateTo('/admin')}
                  className="w-full justify-start flex items-center gap-2"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Admin Panel
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDrawerV2;