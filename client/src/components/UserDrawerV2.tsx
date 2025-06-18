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
      default:
        return <ProfileContentV2 user={user} onSignOut={handleLogout} />;
    }
  };

  return (
    <>
      {/* Children are now optional (only for backward compatibility) */}
      {children && (
        <div 
          className="cursor-pointer user-drawer-trigger"
          onClick={() => {
            setIsOpen(true);
            console.log('UserDrawerV2 trigger clicked, setting isOpen to true');
          }}
        >
          {children}
        </div>
      )}

      {/* Drawer overlay and container with maximum z-index to ensure it's on top */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm user-drawer-backdrop">
          <div
            ref={drawerRef}
            className="fixed top-0 right-0 bottom-0 w-[480px] max-w-[90vw] bg-background shadow-xl transform transition-transform duration-300 animate-in slide-in-from-right overflow-hidden user-drawer"
          >
            {/* Modernized drawer header with cleaner design */}
            <div className="bg-primary/95 text-primary-foreground shadow-md">
              <div className="px-4 pt-4 pb-3 relative">
                {/* Top bar with close button - absolute positioning */}
                <button 
                  onClick={closeDrawer}
                  className="absolute top-2 right-2 bg-primary-foreground/20 backdrop-blur-sm text-primary-foreground hover:bg-primary-foreground/30 rounded-full w-7 h-7 flex items-center justify-center transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
                {/* Header content */}
                <div className="flex items-center gap-3 mt-2">
                  <Avatar className="w-12 h-12 border-2 border-primary-foreground/30">
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.fullName || user.username} />
                    <AvatarFallback>{user.fullName?.charAt(0) || user.username.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-semibold truncate">{user.fullName || user.username}</h1>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs opacity-90">@{user.username}</span>
                      {user.isAdmin && (
                        <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground px-2 py-0.5 h-auto text-[10px] font-medium uppercase tracking-wide">
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer content with scrollable area */}
            <div className="flex h-[calc(100vh-80px)] overflow-hidden">
              {/* Sidebar navigation - fixed width, scrollable on small screens */}
              <div className="w-36 bg-muted/50 border-r border-muted-foreground/10 overflow-y-auto hidden md:block">
                <nav className="p-2 space-y-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-sm px-3 py-2 h-9",
                      activeTab === "profile" && "bg-background/80 border border-muted-foreground/20"
                    )}
                    onClick={() => handleTabChange("profile")}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-sm px-3 py-2 h-9",
                      activeTab === "wallet" && "bg-background/80 border border-muted-foreground/20"
                    )}
                    onClick={() => handleTabChange("wallet")}
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Wallet
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-sm px-3 py-2 h-9",
                      activeTab === "reviews" && "bg-background/80 border border-muted-foreground/20"
                    )}
                    onClick={() => handleTabChange("reviews")}
                  >
                    <StarIcon className="h-4 w-4 mr-2" />
                    Reviews
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-sm px-3 py-2 h-9",
                      activeTab === "notifications" && "bg-background/80 border border-muted-foreground/20"
                    )}
                    onClick={() => handleTabChange("notifications")}
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-sm px-3 py-2 h-9",
                      activeTab === "settings" && "bg-background/80 border border-muted-foreground/20"
                    )}
                    onClick={() => handleTabChange("settings")}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-sm px-3 py-2 h-9",
                      activeTab === "support" && "bg-background/80 border border-muted-foreground/20"
                    )}
                    onClick={() => handleTabChange("support")}
                  >
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Support
                  </Button>
                  {user.isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-sm px-3 py-2 h-9",
                        activeTab === "admin" && "bg-background/80 border border-muted-foreground/20"
                      )}
                      onClick={() => handleTabChange("admin")}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Admin
                    </Button>
                  )}
                  <Separator className="my-1 opacity-50" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-sm text-destructive/80 hover:text-destructive px-3 py-2 h-9"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </nav>
              </div>

              {/* Main content area - takes remaining space */}
              <div className="flex-1 overflow-y-auto p-4">
                {renderTabContent()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserDrawerV2;