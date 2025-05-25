import React, { useState } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription
} from "@/components/ui/sheet";
import { 
  User, 
  Settings, 
  LogOut, 
  Star as StarIcon, 
  BarChart2,
  HelpCircle
} from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import ProfileContent from './drawer-contents/ProfileContent';
import EarningsContent from './drawer-contents/EarningsContent';
import ReviewsContent from './drawer-contents/ReviewsContent';
import SettingsContent from './drawer-contents/SettingsContent';
import FAQContent from './drawer-contents/FAQContent';

interface UserDrawerProps {
  children?: React.ReactNode;
}

const UserDrawer: React.FC<UserDrawerProps> = ({ children }) => {
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("profile");

  if (!user) {
    return <>{children}</>;
  }

  const handleLogout = () => {
    logoutMutation.mutate();
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
      case "faq":
        return <FAQContent />;
      default:
        return <ProfileContent user={user} />;
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <Button variant="ghost" className="relative rounded-full p-2 flex items-center justify-center hover:bg-primary/10 hover:text-primary">
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse-marker"></div>
            <User className="h-5 w-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="p-0 overflow-hidden">
        <SheetHeader className="p-4 pb-3 mb-0 border-b">
          <SheetTitle className="flex items-center">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mr-3">
              <User className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-xl">{user.fullName}</div>
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
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex h-[calc(100vh-90px)]">
          <div className="w-24 border-r bg-muted/20 py-6">
            <div className="flex flex-col items-center space-y-6">
              <button 
                onClick={() => setActiveTab("profile")}
                className={cn(
                  "flex flex-col items-center justify-center w-20 h-16 rounded-lg transition-colors duration-200",
                  activeTab === "profile" 
                    ? "bg-primary/10 text-primary" 
                    : "hover:bg-primary/5 text-foreground/80 hover:text-primary"
                )}
              >
                <User className="h-5 w-5 mb-1.5" />
                <span className="text-xs font-medium">Profile</span>
              </button>
              
              {user.accountType === 'worker' && (
                <button 
                  onClick={() => setActiveTab("earnings")}
                  className={cn(
                    "flex flex-col items-center justify-center w-20 h-16 rounded-lg transition-colors duration-200",
                    activeTab === "earnings" 
                      ? "bg-primary/10 text-primary" 
                      : "hover:bg-primary/5 text-foreground/80 hover:text-primary"
                  )}
                >
                  <BarChart2 className="h-5 w-5 mb-1.5" />
                  <span className="text-xs font-medium">Earnings</span>
                </button>
              )}
              
              <button 
                onClick={() => setActiveTab("reviews")}
                className={cn(
                  "flex flex-col items-center justify-center w-20 h-16 rounded-lg transition-colors duration-200",
                  activeTab === "reviews" 
                    ? "bg-primary/10 text-primary" 
                    : "hover:bg-primary/5 text-foreground/80 hover:text-primary"
                )}
              >
                <StarIcon className="h-5 w-5 mb-1.5" />
                <span className="text-xs font-medium">Reviews</span>
              </button>
              
              <button 
                onClick={() => setActiveTab("settings")}
                className={cn(
                  "flex flex-col items-center justify-center w-20 h-16 rounded-lg transition-colors duration-200",
                  activeTab === "settings" 
                    ? "bg-primary/10 text-primary" 
                    : "hover:bg-primary/5 text-foreground/80 hover:text-primary"
                )}
              >
                <Settings className="h-5 w-5 mb-1.5" />
                <span className="text-xs font-medium">Settings</span>
              </button>
              
              <button 
                onClick={() => setActiveTab("faq")}
                className={cn(
                  "flex flex-col items-center justify-center w-20 h-16 rounded-lg transition-colors duration-200",
                  activeTab === "faq" 
                    ? "bg-primary/10 text-primary" 
                    : "hover:bg-primary/5 text-foreground/80 hover:text-primary"
                )}
              >
                <HelpCircle className="h-5 w-5 mb-1.5" />
                <span className="text-xs font-medium">FAQ</span>
              </button>
              
              <div className="pt-4 w-full px-2">
                <Button 
                  variant="ghost" 
                  className="flex flex-col items-center justify-center w-full py-3 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors duration-200"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5 mb-1.5" />
                  <span className="text-xs font-medium">Logout</span>
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 p-5 overflow-y-auto">
            {renderTabContent()}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default UserDrawer;