import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Settings, 
  LogOut, 
  Star as StarIcon, 
  BarChart2,
  X,
  CreditCard,
  LayoutDashboard,
  Home,
  Scroll
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from "@/components/ui/separator";
import ProfileContent from './drawer-contents/ProfileContent';
import EarningsContent from './drawer-contents/EarningsContent';
import ReviewsContent from './drawer-contents/ReviewsContent';
import SettingsContent from './drawer-contents/SettingsContent';
import PaymentsContent from './drawer-contents/PaymentsContent';

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
  const [isOpen, setIsOpen] = useState(externalIsOpen || false);
  const [, navigate] = useLocation();
  
  // Listen for external close requests
  useEffect(() => {
    if (externalCloseState === false && isOpen) {
      setIsOpen(false);
    }
  }, [externalCloseState, isOpen]);
  
  // Listen for external isOpen changes
  useEffect(() => {
    if (externalIsOpen !== undefined) {
      console.log('UserDrawerV2: External isOpen changed to', externalIsOpen);
      setIsOpen(externalIsOpen);
    }
  }, [externalIsOpen]);
  
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
        return <ProfileContent user={user} />;
      case "earnings":
        return <EarningsContent userId={user.id} />;
      case "payments":
        return <PaymentsContent userId={user.id} />;
      case "reviews":
        return <ReviewsContent userId={user.id} />;
      case "settings":
        return <SettingsContent user={user} />;
      default:
        return <ProfileContent user={user} />;
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" style={{ zIndex: 99999 }}>
          <div
            ref={drawerRef}
            className="fixed top-0 right-0 bottom-0 w-[320px] bg-background shadow-lg transform transition-transform duration-300 animate-in slide-in-from-right overflow-hidden"
            style={{ zIndex: 100000 }}
          >
            {/* Drawer header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-600/10 text-emerald-600 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-lg">{user.fullName}</div>
                    <div className="text-sm text-muted-foreground flex items-center">
                      <span className="capitalize">{user.accountType}</span>
                      {user.rating && user.rating > 0 && (
                        <span className="flex items-center ml-2">
                          •
                          <StarIcon className="h-3 w-3 text-yellow-500 ml-2 mr-1 inline" />
                          {user.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={closeDrawer}
                  className="bg-primary text-white shadow-lg rounded-full w-8 h-8 flex items-center justify-center transform transition-all hover:scale-105 active:scale-95 p-0"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex h-[calc(100vh-72px)] overflow-hidden">
              {/* Sidebar navigation */}
              <div className="w-[72px] border-r bg-muted/30 py-4 flex flex-col items-center h-full overflow-y-auto">
                <div className="flex flex-col items-center space-y-1">
                  {/* Main sections */}
                  <div className="mb-2 px-2 py-1 w-full">
                    <button
                      onClick={() => navigateTo('/')}
                      className="flex flex-col items-center justify-center w-full h-14 rounded-lg hover:bg-emerald-600/5 text-gray-600"
                      title="Home"
                    >
                      <Home className="h-5 w-5 mb-1" />
                      <span className="text-xs">Home</span>
                    </button>
                  </div>

                  <Separator className="my-2 w-10" />

                  {/* User sections */}
                  <button 
                    onClick={() => handleTabChange("profile")}
                    className={cn(
                      "flex flex-col items-center justify-center w-14 h-14 rounded-lg",
                      activeTab === "profile" 
                        ? "bg-emerald-600/10 text-emerald-600" 
                        : "hover:bg-emerald-600/5 text-gray-600"
                    )}
                    title="Profile"
                  >
                    <User className="h-5 w-5 mb-1" />
                    <span className="text-xs">Profile</span>
                  </button>
                  
                  {/* Reviews */}
                  <button 
                    onClick={() => handleTabChange("reviews")}
                    className={cn(
                      "flex flex-col items-center justify-center w-14 h-14 rounded-lg",
                      activeTab === "reviews" 
                        ? "bg-emerald-600/10 text-emerald-600" 
                        : "hover:bg-emerald-600/5 text-gray-600"
                    )}
                    title="Reviews"
                  >
                    <StarIcon className="h-5 w-5 mb-1" />
                    <span className="text-xs">Reviews</span>
                  </button>

                  <Separator className="my-2 w-10" />

                  {/* Financial sections */}
                  <button 
                    onClick={() => handleTabChange("payments")}
                    className={cn(
                      "flex flex-col items-center justify-center w-14 h-14 rounded-lg",
                      activeTab === "payments" 
                        ? "bg-emerald-600/10 text-emerald-600" 
                        : "hover:bg-emerald-600/5 text-gray-600"
                    )}
                    title="Payments"
                  >
                    <CreditCard className="h-5 w-5 mb-1" />
                    <span className="text-xs">Payments</span>
                  </button>
                  
                  {user.accountType === 'worker' && (
                    <button 
                      onClick={() => handleTabChange("earnings")}
                      className={cn(
                        "flex flex-col items-center justify-center w-14 h-14 rounded-lg",
                        activeTab === "earnings" 
                          ? "bg-emerald-600/10 text-emerald-600" 
                          : "hover:bg-emerald-600/5 text-gray-600"
                      )}
                      title="Earnings"
                    >
                      <BarChart2 className="h-5 w-5 mb-1" />
                      <span className="text-xs">Earnings</span>
                    </button>
                  )}
                  
                  {user.accountType === 'poster' && (
                    <button 
                      onClick={() => navigateTo('/payment-dashboard')}
                      className="flex flex-col items-center justify-center w-14 h-14 rounded-lg hover:bg-emerald-600/5 text-gray-600"
                      title="Dashboard"
                    >
                      <LayoutDashboard className="h-5 w-5 mb-1" />
                      <span className="text-xs">Dashboard</span>
                    </button>
                  )}

                  <Separator className="my-2 w-10" />

                  {/* Settings */}  
                  <button 
                    onClick={() => handleTabChange("settings")}
                    className={cn(
                      "flex flex-col items-center justify-center w-14 h-14 rounded-lg",
                      activeTab === "settings" 
                        ? "bg-emerald-600/10 text-emerald-600" 
                        : "hover:bg-emerald-600/5 text-gray-600"
                    )}
                    title="Settings"
                  >
                    <Settings className="h-5 w-5 mb-1" />
                    <span className="text-xs">Settings</span>
                  </button>
                </div>

                {/* Logout at bottom */}
                <div className="mt-auto pb-4">
                  <Button 
                    variant="ghost" 
                    className="flex flex-col items-center justify-center w-14 h-14 rounded-lg hover:bg-red-100 hover:text-red-600"
                    onClick={handleLogout}
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5 mb-1" />
                    <span className="text-xs">Logout</span>
                  </Button>
                </div>
              </div>
              
              {/* Tab content */}
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