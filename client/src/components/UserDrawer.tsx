import React, { useState } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/hooks/use-auth';
import { User, Home, CreditCard, Settings, BarChart2, Star as StarIcon, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
// Simple internal content components instead of importing from separate files
const ProfileContent = ({ user }: { user: any }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Profile</h3>
    <p>Welcome, {user.fullName}!</p>
    <div className="text-sm text-muted-foreground">
      Email: {user.email}<br />
      Account Type: {user.accountType}
    </div>
  </div>
);

const EarningsContent = ({ userId }: { userId: number }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Earnings</h3>
    <p>Your earnings will be displayed here.</p>
    <a href="/earnings" className="text-primary hover:underline">View detailed earnings</a>
  </div>
);

const ReviewsContent = ({ userId }: { userId: number }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Reviews</h3>
    <p>Your reviews will be displayed here.</p>
  </div>
);

const SettingsContent = ({ user }: { user: any }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Settings</h3>
    <p>Account settings and preferences will be displayed here.</p>
  </div>
);

interface UserDrawerProps {
  children?: React.ReactNode;
}

const UserDrawer: React.FC<UserDrawerProps> = ({ children }) => {
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account"
      });
      setLocation('/auth');
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "There was a problem logging out",
        variant: "destructive"
      });
    }
  };

  if (!user) return null;

  const getInitials = (name: string) => {
    return name.split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
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
      <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto">
        <SheetHeader className="pt-6 px-6 border-b pb-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatarUrl || ''} alt={user.fullName} />
              <AvatarFallback className="bg-primary text-white">
                {getInitials(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <SheetTitle className="text-left text-lg font-medium">{user.fullName}</SheetTitle>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex items-center">
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 mr-2">
                  {user.accountType}
                </span>
                {user.rating && user.rating > 0 && (
                  <span className="inline-flex items-center text-amber-500 font-medium text-sm">
                    <StarIcon className="w-4 h-4 mr-1 fill-amber-500" />
                    {user.rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>
        
        <div className="flex h-[calc(100vh-120px)]">
          <div className="w-20 border-r bg-muted/30 py-4">
            <div className="flex flex-col items-center space-y-4">
              <TabsTrigger 
                value="profile" 
                onClick={() => setActiveTab("profile")}
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-16 rounded-lg",
                  activeTab === "profile" 
                    ? "bg-primary/10 text-primary" 
                    : "hover:bg-primary/5"
                )}
              >
                <User className="h-5 w-5 mb-1" />
                <span className="text-xs">Profile</span>
              </TabsTrigger>
              
              {user.accountType === 'worker' && (
                <TabsTrigger 
                  value="earnings" 
                  onClick={() => setActiveTab("earnings")}
                  className={cn(
                    "flex flex-col items-center justify-center w-16 h-16 rounded-lg",
                    activeTab === "earnings" 
                      ? "bg-primary/10 text-primary" 
                      : "hover:bg-primary/5"
                  )}
                >
                  <BarChart2 className="h-5 w-5 mb-1" />
                  <span className="text-xs">Earnings</span>
                </TabsTrigger>
              )}
              
              <TabsTrigger 
                value="reviews" 
                onClick={() => setActiveTab("reviews")}
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-16 rounded-lg",
                  activeTab === "reviews" 
                    ? "bg-primary/10 text-primary" 
                    : "hover:bg-primary/5"
                )}
              >
                <StarIcon className="h-5 w-5 mb-1" />
                <span className="text-xs">Reviews</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="settings" 
                onClick={() => setActiveTab("settings")}
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-16 rounded-lg",
                  activeTab === "settings" 
                    ? "bg-primary/10 text-primary" 
                    : "hover:bg-primary/5"
                )}
              >
                <Settings className="h-5 w-5 mb-1" />
                <span className="text-xs">Settings</span>
              </TabsTrigger>
              
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
            {activeTab === "profile" && <ProfileContent user={user} />}
            {activeTab === "earnings" && <EarningsContent userId={user.id} />}
            {activeTab === "reviews" && <ReviewsContent userId={user.id} />}
            {activeTab === "settings" && <SettingsContent user={user} />}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default UserDrawer;