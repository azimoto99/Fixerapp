import { useEffect, useRef, useState } from "react";
import { 
  X, User, StarIcon, Home, Settings, CreditCard, LogOut, BarChart2, LayoutDashboard,
  Mail, Phone, MapPin, Briefcase, FileText, Pencil, Calendar, DollarSign, CheckCircle, 
  Clock, AlertCircle, ThumbsUp, Award, ShieldCheck, Cog, Zap, Moon, Sun
} from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useSimpleToast } from "@/hooks/use-simple-toast";
import Portal from "./Portal";

// Professional content components with vector UX
const ProfileContent = ({ user }: any) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-semibold mb-4">Profile</h2>
      <div className="flex flex-col items-center mb-6">
        <div className="w-24 h-24 bg-emerald-600/10 text-emerald-600 rounded-full flex items-center justify-center mb-3">
          {user.profileImage ? (
            <img 
              src={user.profileImage} 
              alt={user.fullName} 
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="h-10 w-10" />
          )}
        </div>
        <h3 className="font-semibold text-lg">{user.fullName}</h3>
        <p className="text-sm text-muted-foreground capitalize">{user.accountType}</p>
        
        {user.rating && user.rating > 0 && (
          <div className="flex items-center mt-1 text-sm">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  className={cn(
                    "h-4 w-4",
                    star <= Math.round(user.rating)
                      ? "text-yellow-500 fill-yellow-500"
                      : "text-gray-300"
                  )}
                />
              ))}
            </div>
            <span className="ml-1 text-sm">({user.rating.toFixed(1)})</span>
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        <div className="border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1 text-sm font-medium text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>Email</span>
          </div>
          <p className="text-sm">{user.email || "No email address added"}</p>
        </div>
        
        <div className="border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1 text-sm font-medium text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>Phone</span>
          </div>
          <p className="text-sm">{user.phone || "No phone number added"}</p>
        </div>

        {user.address && (
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1 text-sm font-medium text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Address</span>
            </div>
            <p className="text-sm">{user.address}</p>
          </div>
        )}
      </div>
      
      {user.skills && user.skills.length > 0 && (
        <div className="mt-6">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span>Skills</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {user.skills.map((skill: string, index: number) => (
              <div 
                key={index}
                className="px-3 py-1 bg-emerald-600/10 text-emerald-600 rounded-full text-xs font-medium"
              >
                {skill}
              </div>
            ))}
          </div>
        </div>
      )}

      {user.bio && (
        <div className="mt-6">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Bio</span>
          </h3>
          <p className="text-sm text-muted-foreground">{user.bio}</p>
        </div>
      )}
    </div>
    
    <div className="pt-4">
      <Button className="w-full" size="sm" variant="outline">
        <Pencil className="h-4 w-4 mr-2" />
        Edit Profile
      </Button>
    </div>
  </div>
);

const EarningsContent = ({ userId }: any) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold mb-4">Earnings</h2>
    
    <div className="flex gap-2">
      <div className="flex-1 border rounded-lg p-4 bg-emerald-600/5">
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 mb-2">
          <DollarSign className="h-4 w-4" />
          <span>This Month</span>
        </div>
        <p className="text-2xl font-bold">$827.50</p>
        <p className="text-xs text-muted-foreground">8 jobs completed</p>
      </div>
      
      <div className="flex-1 border rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
          <Calendar className="h-4 w-4" />
          <span>Total</span>
        </div>
        <p className="text-2xl font-bold">$4,235.75</p>
        <p className="text-xs text-muted-foreground">45 jobs total</p>
      </div>
    </div>
    
    <div className="border rounded-lg">
      <div className="p-3 border-b">
        <h3 className="font-medium">Recent Earnings</h3>
      </div>
      
      <div className="divide-y">
        {[
          { job: "Lawn Mowing - Highland Park", date: "May 5, 2025", amount: 85, status: "Paid" },
          { job: "Furniture Assembly", date: "May 3, 2025", amount: 120, status: "Paid" },
          { job: "House Cleaning", date: "Apr 28, 2025", amount: 95, status: "Paid" },
          { job: "Moving Help", date: "Apr 25, 2025", amount: 110, status: "Processing" }
        ].map((earning, index) => (
          <div key={index} className="p-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{earning.job}</p>
              <p className="text-xs text-muted-foreground">{earning.date}</p>
            </div>
            <div className="flex flex-col items-end">
              <p className="font-semibold">${earning.amount}</p>
              <div className={cn(
                "text-xs flex items-center gap-1",
                earning.status === "Paid" ? "text-emerald-600" : "text-amber-500"
              )}>
                {earning.status === "Paid" ? 
                  <CheckCircle className="h-3 w-3" /> : 
                  <Clock className="h-3 w-3" />
                }
                <span>{earning.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    
    <Button className="w-full" variant="outline" size="sm">
      View All Earnings
    </Button>
  </div>
);

const PaymentsContent = ({ userId }: any) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold mb-4">Payments</h2>
    
    <div className="bg-muted/20 rounded-lg p-4 border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Payment Methods</p>
            <p className="text-xs text-muted-foreground">Manage your payment sources</p>
          </div>
        </div>
        <Button size="sm" variant="ghost">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      <div className="rounded-md bg-background p-3 border mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">•••• 4242</p>
            <p className="text-xs text-muted-foreground">Visa - Expires 05/28</p>
          </div>
        </div>
        <div className="flex items-center">
          <span className="text-xs bg-emerald-600/10 text-emerald-600 px-2 py-0.5 rounded-full">Default</span>
        </div>
      </div>
      
      <Button variant="outline" size="sm" className="w-full mt-2">
        <Zap className="h-3.5 w-3.5 mr-2" />
        Add Payment Method
      </Button>
    </div>
    
    <div className="border rounded-lg">
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-medium">Recent Transactions</h3>
        <span className="text-xs text-muted-foreground">View All</span>
      </div>
      
      <div className="divide-y">
        {[
          { service: "Premium Membership", date: "May 1, 2025", amount: 19.99, status: "Successful" },
          { service: "Lawn Service", date: "Apr 22, 2025", amount: 85.00, status: "Successful" },
          { service: "Home Cleaning", date: "Apr 15, 2025", amount: 120.00, status: "Failed" },
          { service: "Dog Walking", date: "Apr 10, 2025", amount: 15.00, status: "Refunded" }
        ].map((transaction, index) => (
          <div key={index} className="p-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{transaction.service}</p>
              <p className="text-xs text-muted-foreground">{transaction.date}</p>
            </div>
            <div className="flex flex-col items-end">
              <p className="font-semibold">
                {transaction.status === "Refunded" ? "+" : "-"}${transaction.amount.toFixed(2)}
              </p>
              <div className={cn(
                "text-xs flex items-center gap-1",
                transaction.status === "Successful" ? "text-emerald-600" : 
                transaction.status === "Failed" ? "text-red-500" : 
                "text-amber-500"
              )}>
                {transaction.status === "Successful" ? 
                  <CheckCircle className="h-3 w-3" /> : 
                transaction.status === "Failed" ?
                  <AlertCircle className="h-3 w-3" /> :
                  <Clock className="h-3 w-3" />
                }
                <span>{transaction.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    
    <Button variant="outline" size="sm" className="w-full">
      Manage Payment Settings
    </Button>
  </div>
);

const ReviewsContent = ({ userId }: any) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold mb-4">Reviews</h2>
    
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
          <StarIcon className="h-7 w-7 text-yellow-500 fill-yellow-500" />
        </div>
        <div>
          <div className="text-2xl font-bold">4.8</div>
          <div className="text-xs text-muted-foreground">Based on 23 reviews</div>
        </div>
      </div>
      
      <div className="flex gap-1 items-center">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon
              key={star}
              className="h-4 w-4 text-yellow-500 fill-yellow-500"
            />
          ))}
        </div>
      </div>
    </div>
    
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Recent Reviews</h3>
        <Button size="sm" variant="ghost" className="text-xs h-8">
          View All
        </Button>
      </div>
      
      <div className="space-y-4">
        {[
          { 
            name: "Sarah Johnson", 
            date: "May 5, 2025", 
            rating: 5,
            comment: "Austin was amazing! Showed up on time and did a fantastic job with my lawn. Would definitely hire again.",
            jobTitle: "Lawn Mowing"
          },
          { 
            name: "Michael Chen", 
            date: "Apr 28, 2025", 
            rating: 4,
            comment: "Great furniture assembly job. Everything was put together correctly and they cleaned up afterward.",
            jobTitle: "Furniture Assembly"
          },
          { 
            name: "Jessica Williams", 
            date: "Apr 15, 2025", 
            rating: 5,
            comment: "Excellent cleaning service! My apartment hasn't been this clean in months.",
            jobTitle: "House Cleaning"
          }
        ].map((review, index) => (
          <div key={index} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-600/10 flex items-center justify-center text-emerald-600">
                  {review.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-sm">{review.name}</p>
                  <p className="text-xs text-muted-foreground">{review.date}</p>
                </div>
              </div>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon
                    key={star}
                    className={cn(
                      "h-3.5 w-3.5",
                      star <= review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="text-sm">{review.comment}</div>
            <div className="mt-2 text-xs bg-muted inline-flex items-center px-2 py-1 rounded-full">
              <Briefcase className="h-3 w-3 mr-1" />
              {review.jobTitle}
            </div>
          </div>
        ))}
      </div>
    </div>
    
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Award className="h-5 w-5 text-emerald-600" />
        <h3 className="font-medium">Badges Earned</h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1 border px-3 py-1.5 rounded-full bg-primary/5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">Top Rated</span>
        </div>
        <div className="flex items-center gap-1 border px-3 py-1.5 rounded-full bg-emerald-600/5">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-medium">Verified</span>
        </div>
        <div className="flex items-center gap-1 border px-3 py-1.5 rounded-full bg-yellow-500/5">
          <ThumbsUp className="h-4 w-4 text-yellow-500" />
          <span className="text-xs font-medium">Highly Recommended</span>
        </div>
      </div>
    </div>
  </div>
);

const SettingsContent = ({ user }: any) => {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });
  
  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (typeof window !== 'undefined') {
      const newTheme = !darkMode ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      document.documentElement.classList.toggle('dark', !darkMode);
      console.log('Initial theme from localStorage:', newTheme);
    }
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">Settings</h2>
      
      <div className="border rounded-lg">
        <div className="p-3 border-b">
          <h3 className="font-medium">Appearance</h3>
        </div>
        
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {darkMode ? (
                <Moon className="h-4 w-4 text-blue-600" />
              ) : (
                <Sun className="h-4 w-4 text-yellow-500" />
              )}
              <div>
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Toggle between light and dark themes</p>
              </div>
            </div>
            <Switch
              checked={darkMode}
              onCheckedChange={toggleTheme}
            />
          </div>
        </div>
      </div>
      
      <div className="border rounded-lg">
        <div className="p-3 border-b">
          <h3 className="font-medium">Notifications</h3>
        </div>
        
        <div className="divide-y">
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email Notifications</p>
              <p className="text-xs text-muted-foreground">Receive job alerts via email</p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">SMS Notifications</p>
              <p className="text-xs text-muted-foreground">Receive job alerts via text message</p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Push Notifications</p>
              <p className="text-xs text-muted-foreground">Receive alerts on this device</p>
            </div>
            <Switch />
          </div>
        </div>
      </div>
      
      <div className="border rounded-lg">
        <div className="p-3 border-b">
          <h3 className="font-medium">Account</h3>
        </div>
        
        <div className="divide-y">
          <div className="p-4">
            <Button variant="outline" size="sm" className="w-full">
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Edit Account Details
            </Button>
          </div>
          
          <div className="p-4">
            <Button variant="outline" size="sm" className="w-full text-amber-600 hover:text-amber-700 hover:bg-amber-50">
              <Cog className="h-3.5 w-3.5 mr-2" />
              Account Preferences
            </Button>
          </div>
          
          <div className="p-4">
            <Button variant="outline" size="sm" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50">
              <X className="h-3.5 w-3.5 mr-2" />
              Delete Account
            </Button>
          </div>
        </div>
      </div>
      
      <div className="border rounded-lg p-4">
        <div className="text-xs text-muted-foreground">
          <p>Account: {user.username}</p>
          <p>Version: 1.0.5</p>
          <p className="mt-1">© 2025 Fixer. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

interface SimpleUserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SimpleUserDrawer2({ isOpen, onClose }: SimpleUserDrawerProps) {
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("profile");
  const [, navigate] = useLocation();
  const drawerRef = useRef<HTMLDivElement>(null);
  const { showToast } = useSimpleToast();

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
    <Portal>
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'all'
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
            overflowY: 'auto',
            animation: 'slide-in 0.3s ease-out',
            pointerEvents: 'all'
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
    </Portal>
  );
}