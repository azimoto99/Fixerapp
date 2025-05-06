import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Settings, 
  LogOut, 
  Star as StarIcon, 
  BarChart2,
  X,
  CreditCard,
  LayoutDashboard
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import ProfileContent from './drawer-contents/ProfileContent';
import EarningsContent from './drawer-contents/EarningsContent';
import ReviewsContent from './drawer-contents/ReviewsContent';
import SettingsContent from './drawer-contents/SettingsContent';
import PaymentsContent from './drawer-contents/PaymentsContent';

interface SimpleUserDrawerProps {
  children?: React.ReactNode;
  onDrawerStateChange?: (isOpen: boolean) => void;
  externalCloseState?: boolean;
}

const SimpleUserDrawer: React.FC<SimpleUserDrawerProps> = ({ 
  children, 
  onDrawerStateChange,
  externalCloseState 
}) => {
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("profile");
  const [isOpen, setIsOpen] = useState(false);
  const [, navigate] = useLocation();
  
  // Listen for external close requests
  useEffect(() => {
    if (externalCloseState === false && isOpen) {
      setIsOpen(false);
    }
  }, [externalCloseState]);
  
  // Notify parent when drawer state changes
  useEffect(() => {
    if (onDrawerStateChange) {
      onDrawerStateChange(isOpen);
    }
  }, [isOpen, onDrawerStateChange]);
  const drawerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

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
      <div onClick={() => setIsOpen(true)} className="cursor-pointer">
        {children || (
          <div className="bg-primary text-white shadow-lg rounded-full w-10 h-10 flex items-center justify-center transform transition-all hover:scale-105 active:scale-95">
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse-marker"></div>
            {isOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5" />
            )}
          </div>
        )}
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[99998] animate-in fade-in duration-200"
        >
          <div
            ref={drawerRef}
            className="fixed top-0 right-0 bottom-0 w-80 bg-background shadow-lg z-[99999] transform transition-transform ease-in-out duration-300 animate-in slide-in-from-right"
          >
            <div className="p-4 border-b flex justify-between items-start">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-emerald-600/10 text-emerald-600 rounded-full flex items-center justify-center mr-3">
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
                onClick={() => setIsOpen(false)}
                className="bg-primary text-white shadow-lg rounded-full w-8 h-8 flex items-center justify-center transform transition-all hover:scale-105 active:scale-95 p-0"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex h-[calc(100vh-90px)]">
              <div className="w-20 border-r bg-muted/30 py-4">
                <div className="flex flex-col items-center space-y-4">
                  <button 
                    onClick={() => setActiveTab("profile")}
                    className={cn(
                      "flex flex-col items-center justify-center w-16 h-16 rounded-lg",
                      activeTab === "profile" 
                        ? "bg-emerald-600/10 text-emerald-600" 
                        : "hover:bg-emerald-600/5 text-gray-600"
                    )}
                  >
                    <User className="h-5 w-5 mb-1" />
                    <span className="text-xs">Profile</span>
                  </button>
                  
                  {user.accountType === 'worker' && (
                    <button 
                      onClick={() => setActiveTab("earnings")}
                      className={cn(
                        "flex flex-col items-center justify-center w-16 h-16 rounded-lg",
                        activeTab === "earnings" 
                          ? "bg-emerald-600/10 text-emerald-600" 
                          : "hover:bg-emerald-600/5 text-gray-600"
                      )}
                    >
                      <BarChart2 className="h-5 w-5 mb-1" />
                      <span className="text-xs">Earnings</span>
                    </button>
                  )}
                  
                  {/* Payments tab - available for all users */}
                  <button 
                    onClick={() => setActiveTab("payments")}
                    className={cn(
                      "flex flex-col items-center justify-center w-16 h-16 rounded-lg user-drawer-payment-button",
                      activeTab === "payments" 
                        ? "bg-emerald-600/10 text-emerald-600" 
                        : "hover:bg-emerald-600/5 text-gray-600"
                    )}
                  >
                    <CreditCard className="h-5 w-5 mb-1" />
                    <span className="text-xs">Payments</span>
                  </button>
                  
                  {/* Payment Dashboard - only for job posters */}
                  {user.accountType === 'poster' && (
                    <button 
                      onClick={() => {
                        setIsOpen(false);
                        navigate('/payment-dashboard');
                      }}
                      className="flex flex-col items-center justify-center w-16 h-16 rounded-lg hover:bg-emerald-600/5 text-gray-600"
                    >
                      <LayoutDashboard className="h-5 w-5 mb-1" />
                      <span className="text-xs">Dashboard</span>
                    </button>
                  )}
                  
                  <button 
                    onClick={() => setActiveTab("reviews")}
                    className={cn(
                      "flex flex-col items-center justify-center w-16 h-16 rounded-lg",
                      activeTab === "reviews" 
                        ? "bg-emerald-600/10 text-emerald-600" 
                        : "hover:bg-emerald-600/5 text-gray-600"
                    )}
                  >
                    <StarIcon className="h-5 w-5 mb-1" />
                    <span className="text-xs">Reviews</span>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab("settings")}
                    className={cn(
                      "flex flex-col items-center justify-center w-16 h-16 rounded-lg",
                      activeTab === "settings" 
                        ? "bg-emerald-600/10 text-emerald-600" 
                        : "hover:bg-emerald-600/5 text-gray-600"
                    )}
                  >
                    <Settings className="h-5 w-5 mb-1" />
                    <span className="text-xs">Settings</span>
                  </button>
                  
                  <Button 
                    variant="ghost" 
                    className="flex flex-col items-center justify-center w-16 h-16 rounded-lg hover:bg-red-100 hover:text-red-600"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5 mb-1" />
                    <span className="text-xs">Logout</span>
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto">
                {renderTabContent()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SimpleUserDrawer;