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
  Scroll,
  Bell,
  HelpCircle,
  Shield,
  UserPlus,
  ChevronRight
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
            className="fixed top-0 right-0 bottom-0 w-[360px] bg-background shadow-lg transform transition-transform duration-300 animate-in slide-in-from-right overflow-hidden"
            style={{ zIndex: 100000 }}
          >
            {/* Drawer header with elevated design */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md">
              <div className="px-6 pt-6 pb-5">
                {/* Top bar with close button */}
                <div className="flex justify-end mb-3">
                  <button 
                    onClick={closeDrawer}
                    className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 rounded-full w-8 h-8 flex items-center justify-center transform transition-all hover:scale-105 active:scale-95 p-0"
                    aria-label="Close menu"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                {/* User profile section */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-primary-foreground/50">
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.fullName} />
                    <AvatarFallback className="bg-primary/80 text-primary-foreground text-lg">
                      {user.fullName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <div className="font-bold text-xl tracking-tight">{user.fullName}</div>
                    <div className="text-sm text-primary-foreground/80 flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="font-normal capitalize text-xs bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/20">
                        {user.accountType}
                      </Badge>
                      {user.rating && user.rating > 0 && (
                        <div className="flex items-center bg-primary-foreground/10 px-2 py-0.5 rounded text-xs">
                          <StarIcon className="h-3 w-3 text-yellow-300 mr-1 inline" />
                          <span>{user.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-primary-foreground/10 rounded-lg p-2 text-center">
                    <div className="text-xs text-primary-foreground/80">Jobs</div>
                    <div className="text-lg font-semibold">{user.completedJobs || 0}</div>
                  </div>
                  <div className="bg-primary-foreground/10 rounded-lg p-2 text-center">
                    <div className="text-xs text-primary-foreground/80">Rating</div>
                    <div className="text-lg font-semibold flex items-center justify-center">
                      <StarIcon className="h-4 w-4 text-yellow-300 mr-1" />
                      {user.rating?.toFixed(1) || '-'}
                    </div>
                  </div>
                  <div className="bg-primary-foreground/10 rounded-lg p-2 text-center">
                    <div className="text-xs text-primary-foreground/80">Success</div>
                    <div className="text-lg font-semibold">{user.successRate ? `${user.successRate}%` : '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex h-[calc(100vh-198px)] overflow-hidden">
              {/* Enhanced sidebar navigation with tooltips */}
              <TooltipProvider>
                <div className="w-[80px] border-r bg-slate-50 dark:bg-slate-900 py-4 flex flex-col items-center h-full overflow-y-auto">
                  <div className="flex flex-col items-center space-y-1">
                    {/* Main sections */}
                    <div className="mb-2 px-2 py-1 w-full">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => navigateTo('/')}
                            className="flex flex-col items-center justify-center w-full h-14 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300"
                          >
                            <Home className="h-5 w-5 mb-1" />
                            <span className="text-xs">Home</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Return to home page</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <Separator className="my-2 w-10" />

                    {/* User sections */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          onClick={() => handleTabChange("profile")}
                          className={cn(
                            "flex flex-col items-center justify-center w-14 h-14 rounded-lg",
                            activeTab === "profile" 
                              ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary" 
                              : "hover:bg-accent dark:hover:bg-accent/20 text-foreground dark:text-foreground/80"
                          )}
                        >
                          <User className="h-5 w-5 mb-1" />
                          <span className="text-xs">Profile</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>View and edit your profile</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    {/* Reviews with notification badge */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          onClick={() => handleTabChange("reviews")}
                          className={cn(
                            "flex flex-col items-center justify-center w-14 h-14 rounded-lg relative",
                            activeTab === "reviews" 
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" 
                              : "hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300"
                          )}
                        >
                          <StarIcon className="h-5 w-5 mb-1" />
                          <span className="text-xs">Reviews</span>
                          {/* Show notification dot for new reviews */}
                          {user.rating && user.rating > 0 && (
                            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>View your reviews and ratings</p>
                      </TooltipContent>
                    </Tooltip>

                    <Separator className="my-2 w-10" />

                    {/* Financial sections */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          onClick={() => handleTabChange("payments")}
                          className={cn(
                            "flex flex-col items-center justify-center w-14 h-14 rounded-lg",
                            activeTab === "payments" 
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" 
                              : "hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300"
                          )}
                        >
                          <CreditCard className="h-5 w-5 mb-1" />
                          <span className="text-xs">Payments</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Manage your payment methods and history</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    {user.accountType === 'worker' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            onClick={() => handleTabChange("earnings")}
                            className={cn(
                              "flex flex-col items-center justify-center w-14 h-14 rounded-lg",
                              activeTab === "earnings" 
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" 
                                : "hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300"
                            )}
                          >
                            <BarChart2 className="h-5 w-5 mb-1" />
                            <span className="text-xs">Earnings</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Track your earnings and payouts</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    
                    {user.accountType === 'poster' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            onClick={() => navigateTo('/payment-dashboard')}
                            className="flex flex-col items-center justify-center w-14 h-14 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300"
                          >
                            <LayoutDashboard className="h-5 w-5 mb-1" />
                            <span className="text-xs">Dashboard</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>View your payment dashboard</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    <Separator className="my-2 w-10" />

                    {/* Settings */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          onClick={() => handleTabChange("settings")}
                          className={cn(
                            "flex flex-col items-center justify-center w-14 h-14 rounded-lg",
                            activeTab === "settings" 
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" 
                              : "hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300"
                          )}
                        >
                          <Settings className="h-5 w-5 mb-1" />
                          <span className="text-xs">Settings</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Manage account settings and preferences</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    {/* Help & Support */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          onClick={() => window.open('/help', '_blank')}
                          className="flex flex-col items-center justify-center w-14 h-14 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300"
                        >
                          <HelpCircle className="h-5 w-5 mb-1" />
                          <span className="text-xs">Help</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Get help and support</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Logout at bottom */}
                  <div className="mt-auto pb-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="flex flex-col items-center justify-center w-14 h-14 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          onClick={handleLogout}
                        >
                          <LogOut className="h-5 w-5 mb-1" />
                          <span className="text-xs">Logout</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Sign out of your account</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </TooltipProvider>
              
              {/* Enhanced tab content with better styling */}
              <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-950">
                {/* Title bar for current section */}
                <div className="mb-6 pb-4 border-b">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {activeTab === "profile" ? "Your Profile" : 
                     activeTab === "reviews" ? "Reviews & Ratings" :
                     activeTab === "payments" ? "Payment Management" :
                     activeTab === "earnings" ? "Earnings & Analytics" :
                     activeTab === "settings" ? "Account Settings" : "Profile"}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {activeTab === "profile" ? "View and update your personal information" : 
                     activeTab === "reviews" ? "See what others are saying about your work" :
                     activeTab === "payments" ? "Manage your payment methods and transactions" :
                     activeTab === "earnings" ? "Track your earnings and financial performance" :
                     activeTab === "settings" ? "Customize your account settings and preferences" : ""}
                  </p>
                </div>
                
                {/* Content section with smooth fade-in animation */}
                <div className="animate-in fade-in duration-300">
                  {renderTabContent()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserDrawerV2;