import { useEffect, useRef, useState } from "react";
import { 
  X, User, StarIcon, Home, Settings, CreditCard, LogOut, BarChart2, LayoutDashboard,
  Mail, Phone, MapPin, Briefcase, FileText, Pencil, Calendar, DollarSign, CheckCircle, 
  Clock, AlertCircle, ThumbsUp, Award, ShieldCheck, Cog, Zap, Moon, Sun, Info
} from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useSimpleToast } from "@/hooks/use-simple-toast";
import { apiRequest } from "@/lib/queryClient";
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

const EarningsContent = ({ userId }: any) => {
  const [earnings, setEarnings] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState({
    amount: 0,
    count: 0
  });
  const [totalStats, setTotalStats] = useState({
    amount: 0,
    count: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch earnings data when component mounts
  useEffect(() => {
    const fetchEarningsData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch earnings for user
        const earningsRes = await apiRequest('GET', `/api/earnings/worker/${userId}`);
        if (earningsRes.ok) {
          const earningsData = await earningsRes.json();
          setEarnings(earningsData || []);
          
          // Calculate stats
          if (earningsData && earningsData.length > 0) {
            // Get current month and year
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            // Filter for current month and calculate total
            const thisMonthEarnings = earningsData.filter((earning: any) => {
              const earningDate = new Date(earning.createdAt);
              return earningDate.getMonth() === currentMonth && earningDate.getFullYear() === currentYear;
            });
            
            const monthlyTotal = thisMonthEarnings.reduce(
              (sum: number, earning: any) => sum + earning.amount, 
              0
            );
            
            const totalAmount = earningsData.reduce(
              (sum: number, earning: any) => sum + earning.amount, 
              0
            );
            
            setMonthlyStats({
              amount: monthlyTotal,
              count: thisMonthEarnings.length
            });
            
            setTotalStats({
              amount: totalAmount,
              count: earningsData.length
            });
          }
        }
      } catch (error) {
        console.error('Error fetching earnings data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userId) {
      fetchEarningsData();
    }
  }, [userId]);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  // Format currency for display
  const formatCurrency = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">Earnings</h2>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <div className="flex-1 border rounded-lg p-4 bg-emerald-600/5">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 mb-2">
                <DollarSign className="h-4 w-4" />
                <span>This Month</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(monthlyStats.amount)}</p>
              <p className="text-xs text-muted-foreground">
                {monthlyStats.count} job{monthlyStats.count !== 1 ? 's' : ''} completed
              </p>
            </div>
            
            <div className="flex-1 border rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <Calendar className="h-4 w-4" />
                <span>Total</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(totalStats.amount)}</p>
              <p className="text-xs text-muted-foreground">
                {totalStats.count} job{totalStats.count !== 1 ? 's' : ''} total
              </p>
            </div>
          </div>
          
          <div className="border rounded-lg">
            <div className="p-3 border-b">
              <h3 className="font-medium">Recent Earnings</h3>
            </div>
            
            {earnings.length > 0 ? (
              <div className="divide-y">
                {earnings.slice(0, 4).map((earning, index) => (
                  <div key={index} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{earning.jobTitle || `Job #${earning.jobId}`}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(earning.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="font-semibold">{formatCurrency(earning.amount)}</p>
                      <div className={cn(
                        "text-xs flex items-center gap-1",
                        earning.status === "paid" ? "text-emerald-600" : "text-amber-500"
                      )}>
                        {earning.status === "paid" ? 
                          <CheckCircle className="h-3 w-3" /> : 
                          <Clock className="h-3 w-3" />
                        }
                        <span className="capitalize">{earning.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No earnings recorded yet
              </div>
            )}
          </div>
          
          <Button 
            className="w-full" 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = '/earnings'}
          >
            View All Earnings
          </Button>
        </>
      )}
    </div>
  );
};

const PaymentsContent = ({ userId }: any) => {
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch payment methods and transactions when component mounts
  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch payment methods
        const methodsRes = await apiRequest('GET', `/api/stripe/payment-methods`);
        if (methodsRes.ok) {
          const methodsData = await methodsRes.json();
          setPaymentMethods(methodsData.paymentMethods || []);
        }
        
        // Fetch transactions/payments
        const paymentsRes = await apiRequest('GET', `/api/payments/user/${userId}`);
        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          setTransactions(paymentsData.slice(0, 4) || []); // Show only 4 most recent
        }
      } catch (error) {
        console.error('Error fetching payment data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userId) {
      fetchPaymentData();
    }
  }, [userId]);
  
  // Helper function to format card number display
  const formatCardDisplay = (card: any) => {
    return `•••• ${card.last4}`;
  };
  
  // Helper function to get payment status display elements
  const getStatusDisplay = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    
    const statusConfig = {
      completed: { icon: <CheckCircle className="h-3 w-3" />, color: "text-emerald-600", label: "Completed" },
      successful: { icon: <CheckCircle className="h-3 w-3" />, color: "text-emerald-600", label: "Successful" },
      pending: { icon: <Clock className="h-3 w-3" />, color: "text-amber-500", label: "Pending" },
      processing: { icon: <Clock className="h-3 w-3" />, color: "text-amber-500", label: "Processing" },
      failed: { icon: <AlertCircle className="h-3 w-3" />, color: "text-red-500", label: "Failed" },
      refunded: { icon: <Clock className="h-3 w-3" />, color: "text-amber-500", label: "Refunded" }
    };
    
    // Default fallback if status not recognized
    const defaultStatus = { icon: <Info className="h-3 w-3" />, color: "text-muted-foreground", label: status };
    
    // Return appropriate display config based on status
    const displayConfig = (statusConfig as any)[normalizedStatus] || defaultStatus;
    
    return {
      icon: displayConfig.icon,
      colorClass: displayConfig.color,
      label: displayConfig.label
    };
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  // Format amount for display
  const formatAmount = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
  };
  
  return (
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
          <Button size="sm" variant="ghost" onClick={() => window.location.href = '/payment-methods'}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : paymentMethods.length > 0 ? (
          <>
            {paymentMethods.map((method, index) => (
              <div key={index} className="rounded-md bg-background p-3 border mb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{formatCardDisplay(method.card)}</p>
                    <p className="text-xs text-muted-foreground">
                      {method.card.brand} - Expires {method.card.exp_month}/{method.card.exp_year.toString().slice(-2)}
                    </p>
                  </div>
                </div>
                {method.isDefault && (
                  <div className="flex items-center">
                    <span className="text-xs bg-emerald-600/10 text-emerald-600 px-2 py-0.5 rounded-full">Default</span>
                  </div>
                )}
              </div>
            ))}
          </>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No payment methods added yet
          </div>
        )}
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-2"
          onClick={() => window.location.href = '/payment-methods'}
        >
          <Zap className="h-3.5 w-3.5 mr-2" />
          {paymentMethods.length > 0 ? 'Manage Payment Methods' : 'Add Payment Method'}
        </Button>
      </div>
      
      <div className="border rounded-lg">
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="font-medium">Recent Transactions</h3>
          <span 
            className="text-xs text-muted-foreground cursor-pointer hover:text-foreground"
            onClick={() => window.location.href = '/payment-dashboard'}
          >
            View All
          </span>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : transactions.length > 0 ? (
          <div className="divide-y">
            {transactions.map((transaction, index) => {
              const status = getStatusDisplay(transaction.status);
              const isRefund = transaction.type === 'refund';
              
              return (
                <div key={index} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{transaction.description || `Payment #${transaction.id}`}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(transaction.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="font-semibold">
                      {isRefund ? '+' : '-'}{formatAmount(transaction.amount)}
                    </p>
                    <div className={cn("text-xs flex items-center gap-1", status.colorClass)}>
                      {status.icon}
                      <span>{status.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No transaction history yet
          </div>
        )}
      </div>
      
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full"
        onClick={() => window.location.href = '/payment-dashboard'}
      >
        Manage Payment Settings
      </Button>
    </div>
  );
};

const ReviewsContent = ({ userId }: any) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]); 
  const [userRating, setUserRating] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch reviews and badges when component mounts
  useEffect(() => {
    const fetchUserReviewData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch user reviews
        const reviewsRes = await apiRequest('GET', `/api/reviews/user/${userId}`);
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          setReviews(reviewsData || []);
          
          // Calculate average rating
          if (reviewsData && reviewsData.length > 0) {
            const totalRating = reviewsData.reduce((sum: number, review: any) => sum + review.rating, 0);
            setUserRating(totalRating / reviewsData.length);
            setReviewCount(reviewsData.length);
          }
        }
        
        // Fetch user badges
        const badgesRes = await apiRequest('GET', `/api/users/${userId}/badges`);
        if (badgesRes.ok) {
          const badgesData = await badgesRes.json();
          setBadges(badgesData || []);
        }
      } catch (error) {
        console.error('Error fetching user review data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userId) {
      fetchUserReviewData();
    }
  }, [userId]);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">Reviews</h2>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                <StarIcon className="h-7 w-7 text-yellow-500 fill-yellow-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{userRating ? userRating.toFixed(1) : 'No ratings'}</div>
                <div className="text-xs text-muted-foreground">
                  {reviewCount > 0 ? `Based on ${reviewCount} review${reviewCount !== 1 ? 's' : ''}` : 'No reviews yet'}
                </div>
              </div>
            </div>
            
            {userRating > 0 && (
              <div className="flex gap-1 items-center">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarIcon
                      key={star}
                      className={cn(
                        "h-4 w-4",
                        star <= Math.round(userRating) 
                          ? "text-yellow-500 fill-yellow-500" 
                          : "text-gray-300"
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Recent Reviews</h3>
              {reviews.length > 3 && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-xs h-8"
                  onClick={() => window.location.href = `/profile/${userId}/reviews`}
                >
                  View All
                </Button>
              )}
            </div>
            
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.slice(0, 3).map((review, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-600/10 flex items-center justify-center text-emerald-600">
                          {review.reviewerName ? review.reviewerName.charAt(0) : 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{review.reviewerName || 'Anonymous User'}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
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
                    {review.jobTitle && (
                      <div className="mt-2 text-xs bg-muted inline-flex items-center px-2 py-1 rounded-full">
                        <Briefcase className="h-3 w-3 mr-1" />
                        {review.jobTitle}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No reviews yet
              </div>
            )}
          </div>
          
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-5 w-5 text-emerald-600" />
              <h3 className="font-medium">Badges Earned</h3>
            </div>
            
            {badges.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {badges.map((badge, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "flex items-center gap-1 border px-3 py-1.5 rounded-full",
                      badge.category === 'Reputation' ? "bg-primary/5" :
                      badge.category === 'Skill Mastery' ? "bg-emerald-600/5" :
                      badge.category === 'Job Completion' ? "bg-yellow-500/5" :
                      "bg-muted/50"
                    )}
                  >
                    {badge.category === 'Reputation' ? (
                      <ShieldCheck className="h-4 w-4 text-primary" />
                    ) : badge.category === 'Skill Mastery' ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    ) : badge.category === 'Job Completion' ? (
                      <ThumbsUp className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <Award className="h-4 w-4 text-blue-500" />
                    )}
                    <span className="text-xs font-medium">{badge.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-2 text-sm text-muted-foreground">
                No badges earned yet
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

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
    <Portal zIndex={9999}>
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'all',
        zIndex: 9999
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
            pointerEvents: 'all',
            zIndex: 10000
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