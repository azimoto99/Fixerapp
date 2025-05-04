import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Settings, 
  LogOut, 
  Star as StarIcon, 
  BarChart2,
  X
} from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import ProfileContent from './drawer-contents/ProfileContent';
import EarningsContent from './drawer-contents/EarningsContent';
import ReviewsContent from './drawer-contents/ReviewsContent';
import SettingsContent from './drawer-contents/SettingsContent';

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
          <div className="relative bg-white shadow-lg rounded-full p-2 flex items-center transform transition-all duration-300 hover:scale-110 hover:bg-primary hover:text-white group">
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse-marker"></div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-700 group-hover:text-white transition-colors">
              <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
              <line x1="4" y1="10" x2="20" y2="10"></line>
              <line x1="10" y1="4" x2="10" y2="20"></line>
            </svg>
          </div>
        )}
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[99998]"
        >
          <div
            ref={drawerRef}
            className="fixed top-0 right-0 bottom-0 w-80 bg-white shadow-lg z-[99999] transform transition-transform ease-in-out duration-300"
            style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
          >
            <div className="p-4 border-b flex justify-between items-start">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center mr-3">
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
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex h-[calc(100vh-90px)]">
              <div className="w-20 border-r bg-muted/30 py-4">
                <div className="flex flex-col items-center space-y-4">
                  <button 
                    onClick={() => setActiveTab("profile")}
                    className={cn(
                      "flex flex-col items-center justify-center w-16 h-16 rounded-lg",
                      activeTab === "profile" 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-primary/5 text-gray-600"
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
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-primary/5 text-gray-600"
                      )}
                    >
                      <BarChart2 className="h-5 w-5 mb-1" />
                      <span className="text-xs">Earnings</span>
                    </button>
                  )}
                  
                  <button 
                    onClick={() => setActiveTab("reviews")}
                    className={cn(
                      "flex flex-col items-center justify-center w-16 h-16 rounded-lg",
                      activeTab === "reviews" 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-primary/5 text-gray-600"
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
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-primary/5 text-gray-600"
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