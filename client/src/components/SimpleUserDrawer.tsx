import { useEffect, useRef, useState } from "react";
import { X, User, StarIcon, Home, Settings, CreditCard, LogOut, BarChart2, LayoutDashboard } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
// Simplified placeholder content for tabs
const ProfileContent = ({ user }: any) => (
  <div>
    <h2 className="text-xl font-bold mb-4">Profile</h2>
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-1">Full Name</h3>
        <p>{user.fullName}</p>
      </div>
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-1">Email</h3>
        <p>{user.email}</p>
      </div>
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-1">Account Type</h3>
        <p className="capitalize">{user.accountType}</p>
      </div>
    </div>
  </div>
);

const EarningsContent = ({ userId }: any) => (
  <div>
    <h2 className="text-xl font-bold mb-4">Earnings</h2>
    <p className="text-muted-foreground">Your earnings information will be displayed here (ID: {userId})</p>
  </div>
);

const PaymentsContent = ({ userId }: any) => (
  <div>
    <h2 className="text-xl font-bold mb-4">Payments</h2>
    <p className="text-muted-foreground">Your payment information will be displayed here (ID: {userId})</p>
  </div>
);

const ReviewsContent = ({ userId }: any) => (
  <div>
    <h2 className="text-xl font-bold mb-4">Reviews</h2>
    <p className="text-muted-foreground">Your reviews will be displayed here (ID: {userId})</p>
  </div>
);

const SettingsContent = ({ user }: any) => (
  <div>
    <h2 className="text-xl font-bold mb-4">Settings</h2>
    <p className="text-muted-foreground">Your settings will be displayed here ({user.username})</p>
  </div>
);

interface SimpleUserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const SimpleUserDrawer = ({ isOpen, onClose }: SimpleUserDrawerProps) => {
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("profile");
  const [, navigate] = useLocation();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logoutMutation.mutate();
    onClose();
  };

  // Navigate to a route and close the drawer
  const navigateTo = (path: string) => {
    onClose();
    navigate(path);
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

  if (!isOpen) {
    return null;
  }

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999999 
    }}>
      <div
        ref={drawerRef}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '320px',
          backgroundColor: 'var(--background)',
          boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.2)',
          zIndex: 10000000,
          overflowY: 'auto',
          animation: 'slide-in 0.3s ease-out',
        }}
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
              onClick={onClose}
              className="bg-primary text-white shadow-lg rounded-full w-8 h-8 flex items-center justify-center transform transition-all hover:scale-105 active:scale-95 p-0"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex h-[calc(100vh-72px)]">
          {/* Sidebar navigation */}
          <div className="w-[72px] border-r bg-muted/30 py-4 flex flex-col items-center">
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
                onClick={() => setActiveTab("profile")}
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
                onClick={() => setActiveTab("reviews")}
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
                onClick={() => setActiveTab("payments")}
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
                  onClick={() => setActiveTab("earnings")}
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
                onClick={() => setActiveTab("settings")}
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
            <div className="mt-auto">
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
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default SimpleUserDrawer;