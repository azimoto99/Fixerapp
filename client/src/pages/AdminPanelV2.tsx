import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X as XIcon, 
  AlertCircle, 
  User, 
  Shield, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  MoreHorizontal, 
  Ban, 
  Eye, 
  MapPin, 
  Briefcase, 
  TrendingUp,
  XCircle,
  Settings,
  Save
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line, PieChart, Pie, Cell } from "recharts";
import { useToast } from "@/hooks/use-toast";

interface AdminStats {
  totalUsers: number;
  totalJobs: number;
  totalRevenue: number;
  pendingDisputes: number;
}

interface User {
  id: number;
  username: string;
  email: string;
  accountType: string;
  isActive: boolean;
  isAdmin: boolean;
  strikes?: UserStrike[];
}

interface Job {
  id: number;
  title: string;
  status: string;
}

interface SupportTicket {
  id: number;
  title: string;
  userName?: string;
  userEmail?: string;
  priority: string;
  status: string;
}

interface Payment {
  id: number;
  description: string;
  userEmail?: string;
  amount: number;
  status: string;
  userId: number;
}

interface UserStrike {
  id: number;
  type: string;
  reason: string;
  details?: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
}

// NEW: typed API responses for paginated endpoints
interface UsersApiResponse {
  users: User[];
  total: number;
}

interface JobsApiResponse {
  jobs: Job[];
  total: number;
}

interface SupportApiResponse {
  tickets: SupportTicket[];
  total: number;
}

interface PaymentsApiResponse {
  payments: Payment[];
  total: number;
}

// Platform Settings Manager Component
function PlatformSettingsManager() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Default settings structure
  const defaultSettings = {
    // General Settings
    platformName: 'Fixer',
    supportEmail: 'support@fixer.com',
    maxFileSize: 10,
    sessionTimeout: 60,
    maintenanceMode: false,
    registrationEnabled: true,
    
    // Payment Settings
    platformFee: 5.0,
    minPayout: 20,
    maxJobValue: 10000,
    paymentProcessingFee: 2.9,
    instantPayoutFee: 1.5,
    
    // Security Settings
    requireEmailVerification: true,
    require2FA: false,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    sessionSecure: true,
    
    // Moderation Settings
    autoModerationEnabled: true,
    profanityFilterEnabled: true,
    imageModeration: true,
    maxReportsBeforeReview: 3,
    
    // Notification Settings
    emailNotificationsEnabled: true,
    smsNotificationsEnabled: false,
    pushNotificationsEnabled: true,
    
    // Feature Flags
    locationVerificationEnabled: true,
    enterpriseAccountsEnabled: true,
    hubPinsEnabled: true,
    analyticsEnabled: true
  };

  // Fetch current settings
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('/admin/settings/platform');
      const fetchedSettings = response.settings || {};
      
      // Merge with defaults to ensure all settings exist
      setSettings({ ...defaultSettings, ...fetchedSettings });
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast({
        title: "Error",
        description: "Failed to load platform settings",
        variant: "destructive"
      });
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Save settings
  const saveSettings = useCallback(async () => {
    try {
      setIsSaving(true);
      await apiRequest('/admin/settings/platform', {
        method: 'PUT',
        body: JSON.stringify({ settings })
      });
      
      toast({
        title: "Success",
        description: "Platform settings updated successfully"
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: "Error",
        description: "Failed to save platform settings",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [settings, toast]);

  // Update individual setting
  const updateSetting = useCallback((key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* General Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">General Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="platform-name">Platform Name</Label>
            <Input 
              id="platform-name" 
              value={settings.platformName || ''} 
              onChange={(e) => updateSetting('platformName', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="support-email">Support Email</Label>
            <Input 
              id="support-email" 
              type="email"
              value={settings.supportEmail || ''} 
              onChange={(e) => updateSetting('supportEmail', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="max-file-size">Max File Size (MB)</Label>
            <Input 
              id="max-file-size" 
              type="number" 
              value={settings.maxFileSize || 10} 
              onChange={(e) => updateSetting('maxFileSize', parseInt(e.target.value))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
            <Input 
              id="session-timeout" 
              type="number" 
              value={settings.sessionTimeout || 60} 
              onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">Temporarily disable platform access</p>
            </div>
            <Button 
              variant={settings.maintenanceMode ? "destructive" : "outline"} 
              size="sm"
              onClick={() => updateSetting('maintenanceMode', !settings.maintenanceMode)}
            >
              {settings.maintenanceMode ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>User Registration</Label>
              <p className="text-sm text-muted-foreground">Allow new user registrations</p>
            </div>
            <Button 
              variant={settings.registrationEnabled ? "default" : "outline"} 
              size="sm"
              onClick={() => updateSetting('registrationEnabled', !settings.registrationEnabled)}
            >
              {settings.registrationEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Payment Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Payment Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="platform-fee">Platform Fee (%)</Label>
            <Input 
              id="platform-fee" 
              type="number" 
              step="0.1"
              value={settings.platformFee || 5} 
              onChange={(e) => updateSetting('platformFee', parseFloat(e.target.value))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="min-payout">Minimum Payout ($)</Label>
            <Input 
              id="min-payout" 
              type="number" 
              value={settings.minPayout || 20} 
              onChange={(e) => updateSetting('minPayout', parseInt(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-job-value">Maximum Job Value ($)</Label>
            <Input 
              id="max-job-value" 
              type="number" 
              value={settings.maxJobValue || 10000} 
              onChange={(e) => updateSetting('maxJobValue', parseInt(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-processing-fee">Payment Processing Fee (%)</Label>
            <Input 
              id="payment-processing-fee" 
              type="number" 
              step="0.1"
              value={settings.paymentProcessingFee || 2.9} 
              onChange={(e) => updateSetting('paymentProcessingFee', parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>
      
      {/* Security Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Security Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Email Verification Required</Label>
              <p className="text-sm text-muted-foreground">Require email verification for new accounts</p>
            </div>
            <Button 
              variant={settings.requireEmailVerification ? "default" : "outline"} 
              size="sm"
              onClick={() => updateSetting('requireEmailVerification', !settings.requireEmailVerification)}
            >
              {settings.requireEmailVerification ? 'Required' : 'Optional'}
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">Require 2FA for admin accounts</p>
            </div>
            <Button 
              variant={settings.require2FA ? "default" : "outline"} 
              size="sm"
              onClick={() => updateSetting('require2FA', !settings.require2FA)}
            >
              {settings.require2FA ? 'Required' : 'Optional'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="max-login-attempts">Max Login Attempts</Label>
              <Input 
                id="max-login-attempts" 
                type="number" 
                value={settings.maxLoginAttempts || 5} 
                onChange={(e) => updateSetting('maxLoginAttempts', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password-min-length">Minimum Password Length</Label>
              <Input 
                id="password-min-length" 
                type="number" 
                value={settings.passwordMinLength || 8} 
                onChange={(e) => updateSetting('passwordMinLength', parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Feature Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Location Verification</Label>
              <p className="text-sm text-muted-foreground">Enable GPS-based location verification</p>
            </div>
            <Button 
              variant={settings.locationVerificationEnabled ? "default" : "outline"} 
              size="sm"
              onClick={() => updateSetting('locationVerificationEnabled', !settings.locationVerificationEnabled)}
            >
              {settings.locationVerificationEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Enterprise Accounts</Label>
              <p className="text-sm text-muted-foreground">Allow enterprise business accounts</p>
            </div>
            <Button 
              variant={settings.enterpriseAccountsEnabled ? "default" : "outline"} 
              size="sm"
              onClick={() => updateSetting('enterpriseAccountsEnabled', !settings.enterpriseAccountsEnabled)}
            >
              {settings.enterpriseAccountsEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Hub Pins</Label>
              <p className="text-sm text-muted-foreground">Enable business hub pin locations</p>
            </div>
            <Button 
              variant={settings.hubPinsEnabled ? "default" : "outline"} 
              size="sm"
              onClick={() => updateSetting('hubPinsEnabled', !settings.hubPinsEnabled)}
            >
              {settings.hubPinsEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Analytics Tracking</Label>
              <p className="text-sm text-muted-foreground">Enable platform analytics and tracking</p>
            </div>
            <Button 
              variant={settings.analyticsEnabled ? "default" : "outline"} 
              size="sm"
              onClick={() => updateSetting('analyticsEnabled', !settings.analyticsEnabled)}
            >
              {settings.analyticsEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </div>
      </div>

      {/* Moderation Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Content Moderation</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto Moderation</Label>
              <p className="text-sm text-muted-foreground">Automatically moderate content using AI</p>
            </div>
            <Button 
              variant={settings.autoModerationEnabled ? "default" : "outline"} 
              size="sm"
              onClick={() => updateSetting('autoModerationEnabled', !settings.autoModerationEnabled)}
            >
              {settings.autoModerationEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Profanity Filter</Label>
              <p className="text-sm text-muted-foreground">Filter inappropriate language</p>
            </div>
            <Button 
              variant={settings.profanityFilterEnabled ? "default" : "outline"} 
              size="sm"
              onClick={() => updateSetting('profanityFilterEnabled', !settings.profanityFilterEnabled)}
            >
              {settings.profanityFilterEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-reports">Max Reports Before Review</Label>
            <Input 
              id="max-reports" 
              type="number" 
              value={settings.maxReportsBeforeReview || 3} 
              onChange={(e) => updateSetting('maxReportsBeforeReview', parseInt(e.target.value))}
            />
          </div>
        </div>
      </div>
      
      {/* Save Button */}
      <div className="pt-6 border-t flex gap-4">
        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
        <Button variant="outline" onClick={fetchSettings} disabled={isLoading}>
          Reset to Saved
        </Button>
      </div>
    </div>
  );
}

export default function AdminPanelV2() {
  const { user } = useAuth();
  
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [ticketResponse, setTicketResponse] = useState("");
  
  // Enhanced user management state
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'suspend' | 'ban' | 'strike' | 'warn';
    userId: number;
    username: string;
  } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionDetails, setActionDetails] = useState("");
  const [suspensionDuration, setSuspensionDuration] = useState("7"); // days
  const [isStrikesDialogOpen, setIsStrikesDialogOpen] = useState(false);
  const [isBusinessDetailsDialogOpen, setIsBusinessDetailsDialogOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<any | null>(null);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [ticketFilterStatus, setTicketFilterStatus] = useState<string>("all");
  const [ticketFilterPriority, setTicketFilterPriority] = useState<string>("all");
  const [paymentFilterStatus, setPaymentFilterStatus] = useState<string>("all");
  const [paymentFilterType, setPaymentFilterType] = useState<string>("all");
  
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedEnterpriseSearch, setDebouncedEnterpriseSearch] = useState("");
  
  const [enterpriseSearch, setEnterpriseSearch] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEnterpriseSearch(enterpriseSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [enterpriseSearch]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterStatus, ticketFilterStatus, ticketFilterPriority, paymentFilterStatus, paymentFilterType, selectedTab]);

  // Check if user is admin
  const isAdmin = user?.isAdmin === true;
  
  // Early return if not admin
  if (!user) {
    return (
      <div className="container mx-auto py-6 max-w-7xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please log in to access the admin panel.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-6 max-w-7xl">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have admin privileges. Access denied.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { data: dashboardStats, isLoading: isDashboardLoading, error: dashboardError } = useQuery<AdminStats, Error>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/stats');
      return (await response.json()) as AdminStats;
    },
    enabled: isAdmin,
    refetchInterval: isAdmin ? 30000 : false,
    retry: isAdmin ? 2 : false,
    retryDelay: 1000,
  });

  if (dashboardError) {
    console.error('Dashboard stats error:', dashboardError);
  }

  const usersQueryKey = useMemo(() => [
    "/api/admin/users",
    { page: currentPage, pageSize, search: debouncedSearch, status: filterStatus, sortBy, sortOrder }
  ], [currentPage, pageSize, debouncedSearch, filterStatus, sortBy, sortOrder]);

  const { data: usersResponse, isLoading: isUsersLoading, refetch: refetchUsers, error: usersError } = useQuery<UsersApiResponse, Error>({
    queryKey: usersQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        search: debouncedSearch,
        ...(filterStatus !== "all" && { status: filterStatus }),
        sortBy,
        sortOrder
      });
      const response = await apiRequest('GET', `/api/admin/users?${params.toString()}`);
      return (await response.json()) as UsersApiResponse;
    },
    enabled: isAdmin,
    retry: 2,
    retryDelay: 1000,
  });

  const users: User[] = usersResponse?.users ?? [];
  const totalUsers = usersResponse?.total ?? users.length;

  const jobsQueryKey = useMemo(() => [
    "/api/admin/jobs",
    { page: currentPage, pageSize, search: debouncedSearch, status: filterStatus, sortBy, sortOrder }
  ], [currentPage, pageSize, debouncedSearch, filterStatus, sortBy, sortOrder]);

  const { data: jobsResponse, isLoading: isJobsLoading, refetch: refetchJobs, error: jobsError } = useQuery<JobsApiResponse, Error>({
    queryKey: jobsQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        search: debouncedSearch,
        ...(filterStatus !== "all" && { status: filterStatus }),
        sortBy,
        sortOrder
      });
      const response = await apiRequest('GET', `/api/admin/jobs?${params.toString()}`);
      return (await response.json()) as JobsApiResponse;
    },
    enabled: isAdmin,
    retry: 3,
    retryDelay: (attempt) => Math.min(attempt * 1000, 3000),
  });

  const jobs: Job[] = jobsResponse?.jobs ?? [];
  const totalJobs = jobsResponse?.total ?? jobs.length;

  const supportQueryKey = useMemo(() => [
    "/api/admin/support-tickets",
    { page: currentPage, pageSize, search: debouncedSearch, status: ticketFilterStatus, priority: ticketFilterPriority, sortBy, sortOrder }
  ], [currentPage, pageSize, debouncedSearch, ticketFilterStatus, ticketFilterPriority, sortBy, sortOrder]);

  const { data: supportResponse, isLoading: isSupportLoading, refetch: refetchSupport, error: supportError } = useQuery<SupportApiResponse, Error>({
    queryKey: supportQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        search: debouncedSearch,
        ...(ticketFilterStatus !== "all" && { status: ticketFilterStatus }),
        ...(ticketFilterPriority !== "all" && { priority: ticketFilterPriority }),
        sortBy,
        sortOrder
      });
      const response = await apiRequest('GET', `/api/admin/support-tickets?${params.toString()}`);
      return (await response.json()) as SupportApiResponse;
    },
    enabled: isAdmin,
    retry: 2,
    retryDelay: 1000,
  });

  const supportTickets: SupportTicket[] = supportResponse?.tickets ?? [];
  const totalTickets = supportResponse?.total ?? supportTickets.length;

  const paymentsQueryKey = useMemo(() => [
    "/api/admin/payments",
    { page: currentPage, pageSize, search: debouncedSearch, status: paymentFilterStatus, type: paymentFilterType, sortBy, sortOrder }
  ], [currentPage, pageSize, debouncedSearch, paymentFilterStatus, paymentFilterType, sortBy, sortOrder]);

  const { data: paymentsResponse, isLoading: isTransactionsLoading, refetch: refetchPayments, error: paymentsError } = useQuery<PaymentsApiResponse, Error>({
    queryKey: paymentsQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        search: debouncedSearch,
        ...(paymentFilterStatus !== 'all' && { status: paymentFilterStatus }),
        ...(paymentFilterType !== 'all' && { type: paymentFilterType }),
        sortBy,
        sortOrder,
      });
      const response = await apiRequest('GET', `/api/admin/payments?${params.toString()}`);
      return (await response.json()) as PaymentsApiResponse;
    },
    retry: 2,
    retryDelay: 1000,
  });

  const payments: Payment[] = paymentsResponse?.payments ?? [];
  const totalTransactions = paymentsResponse?.total ?? payments.length;

  // User management functions
  const handleUserAction = async (userId: number, action: 'ban' | 'unban' | 'verify' | 'makeAdmin' | 'removeAdmin') => {
    try {
      let endpoint = '';
      let body = {};
      
      switch (action) {
        case 'ban':
          endpoint = `/api/admin/users/${userId}/ban`;
          body = { reason: 'Administrative action' };
          break;
        case 'unban':
          endpoint = `/api/admin/users/${userId}/unban`;
          body = { reason: 'Administrative action' };
          break;
        case 'verify':
          endpoint = `/api/admin/users/${userId}/verify`;
          break;
        case 'makeAdmin':
          endpoint = `/api/admin/users/${userId}`;
          body = { isAdmin: true };
          break;
        case 'removeAdmin':
          endpoint = `/api/admin/users/${userId}`;
          body = { isAdmin: false };
          break;
      }
      
      const method = action === 'makeAdmin' || action === 'removeAdmin' ? 'PATCH' : 'POST';
      await apiRequest(method, endpoint, body);
      
      // Refetch users data
      refetchUsers();
      
      // Close dialog
      setIsUserDialogOpen(false);
    } catch (error) {
      console.error(`Error performing ${action} on user:`, error);
    }
  };

  const handleEnhancedAction = (type: 'suspend' | 'ban' | 'strike' | 'warn', userId: number, username: string) => {
    setPendingAction({ type, userId, username });
    setActionReason("");
    setActionDetails("");
    setSuspensionDuration("7");
    setIsActionDialogOpen(true);
  };

  const executeEnhancedAction = async () => {
    if (!pendingAction) return;
    
    try {
      let endpoint = '';
      let body: any = {
        reason: actionReason,
        details: actionDetails
      };
      
      switch (pendingAction.type) {
        case 'suspend':
          endpoint = `/api/admin/users/${pendingAction.userId}/suspend`;
          body.duration = parseInt(suspensionDuration);
          break;
        case 'ban':
          endpoint = `/api/admin/users/${pendingAction.userId}/ban`;
          break;
        case 'strike':
          endpoint = `/api/admin/users/${pendingAction.userId}/strike`;
          body.type = 'strike';
          break;
        case 'warn':
          endpoint = `/api/admin/users/${pendingAction.userId}/strike`;
          body.type = 'warning';
          break;
      }
      
      await apiRequest('POST', endpoint, body);
      
      // Refetch users data
      refetchUsers();
      
      // Close dialogs
      setIsActionDialogOpen(false);
      setIsUserDialogOpen(false);
      setPendingAction(null);
    } catch (error) {
      console.error(`Error performing ${pendingAction.type} on user:`, error);
    }
  };

  const viewUserStrikes = async (userId: number) => {
    try {
      const response = await apiRequest('GET', `/api/admin/users/${userId}/strikes`);
      const strikes = await response.json();
      setSelectedUser(prev => prev ? { ...prev, strikes } : null);
      setIsStrikesDialogOpen(true);
    } catch (error) {
      console.error('Error fetching user strikes:', error);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setIsUserDialogOpen(true);
  };

  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
    setIsJobDialogOpen(true);
  };

  const handleTicketSelect = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setTicketResponse("");
    setIsTicketDialogOpen(true);
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500 text-white';
      case 'in_progress': return 'bg-yellow-500 text-white';
      case 'resolved': return 'bg-green-500 text-white';
      case 'closed': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'urgent': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  // Enterprise data queries
  const { data: enterpriseBusinesses, isLoading: isEnterpriseLoading, refetch: refetchEnterprise } = useQuery({
    queryKey: ['/api/admin/enterprise/businesses', { search: debouncedEnterpriseSearch }],
    queryFn: async () => {
      const params = new URLSearchParams({ search: debouncedEnterpriseSearch });
      const res = await apiRequest('GET', `/api/admin/enterprise/businesses?${params.toString()}`);
      return res.json();
    },
    enabled: isAdmin && selectedTab === 'enterprise',
  });

  // Placeholder data for missing enterprise endpoints
  const hubPins: any[] = [];
  const hubPinStats = { totalActive: 0 };
  // Placeholder for enterprise position statistics to prevent runtime errors
  // TODO: Replace with real data fetched from the API once the endpoint is available
  const positionStats = {
    total: 0,
    active: 0,
    totalApplications: 0,
    avgApplications: 0,
  };
  const enterpriseGrowthData: any[] = [];
  const topBusinesses: any[] = [];
  const positionTypeData: any[] = [];
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const { toast } = useToast();

  const handleViewBusinessDetails = (business: any) => {
    setSelectedBusiness(business);
    setIsBusinessDetailsDialogOpen(true);
  };
  const handleSuspendBusiness = (id: number) => toast({ title: "Info", description: `Suspending business ${id}` });
  const handleEditHubPin = (id: number) => toast({ title: "Info", description: `Editing hub pin ${id}` });

  const { mutate: verifyBusinessMutation } = useMutation({
    mutationFn: ({ id, status }: { id: number, status: 'verified' | 'rejected' }) => {
      return apiRequest('PUT', `/api/admin/enterprise/businesses/${id}/verify`, { status });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Business status updated." });
      refetchEnterprise();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to update status: ${error.message}`, variant: 'destructive' });
    }
  });

  const handleVerifyBusiness = (id: number, status: 'verified' | 'rejected') => {
    verifyBusinessMutation({ id, status });
  };

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">Manage platform operations and view analytics</p>
          <div className="flex items-center gap-2 mt-2">
            <User className="h-4 w-4" />
            <span className="text-sm">Logged in as: {user.username}</span>
            {isAdmin && <Badge variant="secondary" className="text-xs"><Shield className="h-3 w-3 mr-1" />Admin</Badge>}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => {
              refetchUsers();
              refetchJobs();
              refetchSupport();
              refetchPayments();
            }}
            className="rounded-full"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="md:hidden" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <XIcon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {(dashboardError || usersError || jobsError || supportError || paymentsError) && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Some data couldn't be loaded. Please check your connection and try refreshing.
            {dashboardError && <div>Dashboard: {dashboardError.message}</div>}
            {usersError && <div>Users: {usersError.message}</div>}
            {jobsError && <div>Jobs: {jobsError.message}</div>}
            {supportError && <div>Support: {supportError.message}</div>}
            {paymentsError && <div>Payments: {paymentsError.message}</div>}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <div className={`md:block ${isMobileMenuOpen ? 'block' : 'hidden'} mb-6 md:mb-0`}>
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 p-2">
            <TabsTrigger value="overview" className="w-full justify-start text-xs lg:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="users" className="w-full justify-start text-xs lg:text-sm">Users</TabsTrigger>
            <TabsTrigger value="jobs" className="w-full justify-start text-xs lg:text-sm">Jobs</TabsTrigger>
            <TabsTrigger value="support" className="w-full justify-start text-xs lg:text-sm">Support</TabsTrigger>
            <TabsTrigger value="payments" className="w-full justify-start text-xs lg:text-sm">Payments</TabsTrigger>
            <TabsTrigger value="analytics" className="w-full justify-start text-xs lg:text-sm">Analytics</TabsTrigger>
            <TabsTrigger value="maintenance" className="w-full justify-start text-xs lg:text-sm">Maintenance</TabsTrigger>
            <TabsTrigger value="settings" className="w-full justify-start text-xs lg:text-sm">Settings</TabsTrigger>
            <TabsTrigger value="enterprise" className="w-full justify-start text-xs lg:text-sm">Enterprise</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="overview" className="mt-0 md:mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
            {isDashboardLoading ? (
              <>
                <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
              </>
            ) : dashboardError ? (
              <>
                <Card className="border-destructive/30 bg-destructive/5"><CardHeader className="pb-2"><CardTitle>Total Users</CardTitle></CardHeader><CardContent><p className="text-destructive">Error loading data</p></CardContent></Card>
                <Card className="border-destructive/30 bg-destructive/5"><CardHeader className="pb-2"><CardTitle>Total Jobs</CardTitle></CardHeader><CardContent><p className="text-destructive">Error loading data</p></CardContent></Card>
                <Card className="border-destructive/30 bg-destructive/5"><CardHeader className="pb-2"><CardTitle>Total Revenue</CardTitle></CardHeader><CardContent><p className="text-destructive">Error loading data</p></CardContent></Card>
                <Card className="border-destructive/30 bg-destructive/5"><CardHeader className="pb-2"><CardTitle>Pending Disputes</CardTitle></CardHeader><CardContent><p className="text-destructive">Error loading data</p></CardContent></Card>
              </>
            ) : dashboardStats ? (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Total Users</CardTitle>
                    <CardDescription>Registered users</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardStats.totalUsers?.toLocaleString() || 0}</div>
                    <p className="text-sm text-muted-foreground">Platform members</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Jobs</CardTitle>
                    <CardDescription>Platform activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardStats.activeJobs?.toLocaleString() || 0}</div>
                    <p className="text-sm text-muted-foreground">
                      {dashboardStats.completedJobs || 0} completed · {dashboardStats.totalJobs || 0} total
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Revenue</CardTitle>
                    <CardDescription>Platform earnings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${(dashboardStats.totalRevenue || 0).toLocaleString()}</div>
                    <p className="text-sm text-muted-foreground">
                      ${(dashboardStats.platformFees || 0).toLocaleString()} in fees
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Disputes</CardTitle>
                    <CardDescription>Support status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardStats.pendingDisputes || 0}</div>
                    <p className="text-sm text-muted-foreground">Pending resolution</p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card className="border-muted bg-muted/5"><CardHeader className="pb-2"><CardTitle>Total Users</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">No data available</p></CardContent></Card>
                <Card className="border-muted bg-muted/5"><CardHeader className="pb-2"><CardTitle>Total Jobs</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">No data available</p></CardContent></Card>
                <Card className="border-muted bg-muted/5"><CardHeader className="pb-2"><CardTitle>Total Revenue</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">No data available</p></CardContent></Card>
                <Card className="border-muted bg-muted/5"><CardHeader className="pb-2"><CardTitle>Pending Disputes</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">No data available</p></CardContent></Card>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Input placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-64" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => refetchUsers()} variant="outline" size="sm" disabled={isUsersLoading}>
              <RefreshCw className={`h-4 w-4 ${isUsersLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <ScrollArea className="rounded-lg border h-[500px]">
            {isUsersLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : users.length === 0 ? (
              <div className="text-center p-8">No users found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: User) => (
                    <TableRow key={user.id} className="cursor-pointer" onClick={() => handleUserSelect(user)}>
                      <TableCell className="font-semibold">{user.username}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>{user.accountType}</TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "destructive"}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
                        {user.isAdmin && (
                          <Badge variant="secondary" className="ml-2"><Shield className="h-3 w-3 mr-1" />Admin</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleUserAction(user.id, user.isActive ? 'ban' : 'unban'); }}>
                          {user.isActive ? 'Ban' : 'Unban'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleUserAction(user.id, user.isAdmin ? 'removeAdmin' : 'makeAdmin'); }}>
                          {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
          {totalUsers > 0 && (
            <div className="flex justify-end items-center gap-2 mt-4">
              <span className="text-sm text-muted-foreground">Page {currentPage} of {Math.ceil(totalUsers / pageSize)}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /> Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalUsers / pageSize)))} disabled={currentPage * pageSize >= totalUsers}>Next <ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="jobs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <Input placeholder="Search jobs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-64" />
            </div>
            <Button onClick={() => refetchJobs()} variant="outline" size="sm" disabled={isJobsLoading}><RefreshCw className={`h-4 w-4 ${isJobsLoading ? 'animate-spin' : ''}`} /></Button>
          </div>
          <ScrollArea className="rounded-lg border h-[500px]">
            {isJobsLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : jobs.length === 0 ? (
              <div className="text-center p-8">No jobs found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job: Job) => (
                    <TableRow key={job.id} className="cursor-pointer" onClick={() => handleJobSelect(job)}>
                      <TableCell className="font-semibold">{job.title}</TableCell>
                      <TableCell>
                        <Badge>{job.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
          {totalJobs > 0 && (
              <div className="flex justify-end items-center gap-2 mt-4">
                <span className="text-sm text-muted-foreground">Page {currentPage} of {Math.ceil(totalJobs / pageSize)}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /> Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalJobs / pageSize)))} disabled={currentPage * pageSize >= totalJobs}>Next <ChevronRight className="h-4 w-4" /></Button>
              </div>
          )}
        </TabsContent>
        
        <TabsContent value="support">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Input placeholder="Search tickets..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-64"/>
              <Select value={ticketFilterStatus} onValueChange={setTicketFilterStatus}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={ticketFilterPriority} onValueChange={setTicketFilterPriority}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by priority" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => refetchSupport()} variant="outline" size="sm" disabled={isSupportLoading}><RefreshCw className={`h-4 w-4 ${isSupportLoading ? 'animate-spin' : ''}`} /></Button>
          </div>
          <ScrollArea className="rounded-lg border h-[500px]">
            {isSupportLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : supportTickets.length === 0 ? (
              <div className="text-center p-8">No support tickets found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supportTickets.map((ticket: SupportTicket) => (
                    <TableRow key={ticket.id} className="cursor-pointer" onClick={() => handleTicketSelect(ticket)}>
                      <TableCell className="font-semibold space-y-1">
                        <div>{ticket.title}</div>
                        <div className="text-xs text-muted-foreground">#{ticket.id} • {ticket.userName || ticket.userEmail}</div>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge></TableCell>
                      <TableCell><Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
          {totalTickets > 0 && (
            <div className="flex justify-end items-center gap-2 mt-4">
              <span className="text-sm text-muted-foreground">Page {currentPage} of {Math.ceil(totalTickets / pageSize)}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /> Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalTickets / pageSize)))} disabled={currentPage * pageSize >= totalTickets}>Next <ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Financial Overview</CardTitle>
              <CardDescription>Monitor all platform transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Input placeholder="Search transactions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-64" />
                  <Select value={paymentFilterStatus} onValueChange={setPaymentFilterStatus}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="succeeded">Succeeded</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={paymentFilterType} onValueChange={setPaymentFilterType}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="withdrawal">Withdrawal</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => refetchPayments()} variant="outline" size="sm" disabled={isTransactionsLoading}>
                  <RefreshCw className={`h-4 w-4 ${isTransactionsLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <ScrollArea className="rounded-lg border h-[500px]">
                {isTransactionsLoading ? (
                  Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                ) : payments.length === 0 ? (
                  <div className="text-center p-8">No transactions found.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((transaction: Payment) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-semibold">{transaction.description}</TableCell>
                          <TableCell className="text-muted-foreground">{transaction.userEmail}</TableCell>
                          <TableCell className="text-right">${transaction.amount.toFixed(2)}</TableCell>
                          <TableCell><Badge>{transaction.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>

              {totalTransactions > 0 && (
                <div className="flex justify-end items-center gap-2 mt-4">
                  <span className="text-sm text-muted-foreground">Page {currentPage} of {Math.ceil(totalTransactions / pageSize)}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /> Previous</Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalTransactions / pageSize)))} disabled={currentPage * pageSize >= totalTransactions}>Next <ChevronRight className="h-4 w-4" /></Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Enterprise Analytics</CardTitle>
              <CardDescription>
                Overview of enterprise account performance and metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-3">Business Growth</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={enterpriseGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="businesses" stroke="#8884d8" name="Businesses" />
                      <Line type="monotone" dataKey="hubPins" stroke="#82ca9d" name="Hub Pins" />
                      <Line type="monotone" dataKey="positions" stroke="#ffc658" name="Positions" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Top Businesses by Hires</h4>
                    <div className="space-y-2">
                      {topBusinesses?.map((business: any, index: number) => (
                        <div key={business.id} className="flex items-center justify-between">
                          <span className="text-sm">{business.businessName}</span>
                          <Badge variant="secondary">{business.hireCount} hires</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Position Types Distribution</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={positionTypeData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                        >
                          {positionTypeData?.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>System Maintenance</CardTitle>
              <CardDescription>
                Platform maintenance tools and system health monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">System Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">Operational</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Database</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">Connected</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Storage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">Available</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Payments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">Processing</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Maintenance Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="justify-start h-auto p-4">
                    <div className="text-left">
                      <div className="font-medium">Clear Cache</div>
                      <div className="text-sm text-muted-foreground">Clear application cache and temporary files</div>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="justify-start h-auto p-4">
                    <div className="text-left">
                      <div className="font-medium">Database Cleanup</div>
                      <div className="text-sm text-muted-foreground">Remove old logs and optimize database</div>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="justify-start h-auto p-4">
                    <div className="text-left">
                      <div className="font-medium">Backup System</div>
                      <div className="text-sm text-muted-foreground">Create system backup</div>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="justify-start h-auto p-4">
                    <div className="text-left">
                      <div className="font-medium">Update Indexes</div>
                      <div className="text-sm text-muted-foreground">Rebuild search indexes</div>
                    </div>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>
                Configure platform-wide settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <PlatformSettingsManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enterprise" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enterprise Business Management</CardTitle>
              <CardDescription>
                Manage enterprise accounts, verify businesses, and monitor hub pins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="businesses" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="businesses">Businesses</TabsTrigger>
                  <TabsTrigger value="hub-pins">Hub Pins</TabsTrigger>
                  <TabsTrigger value="positions">Positions</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>
                
                <TabsContent value="businesses" className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Registered Businesses</h3>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search businesses..."
                        className="w-64"
                        onChange={(e) => setEnterpriseSearch(e.target.value)}
                      />
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business Name</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Hub Pins</TableHead>
                        <TableHead>Active Positions</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enterpriseBusinesses?.map((business: any) => (
                        <TableRow key={business.id}>
                          <TableCell className="font-medium">
                            <div>
                              <p>{business.businessName}</p>
                              <p className="text-sm text-muted-foreground">{business.businessEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>{business.user?.fullName || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={
                              business.verificationStatus === 'verified' ? 'default' :
                              business.verificationStatus === 'rejected' ? 'destructive' :
                              'secondary'
                            }>
                              {business.verificationStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>{business.hubPinCount || 0}</TableCell>
                          <TableCell>{business.activePositionCount || 0}</TableCell>
                          <TableCell>{format(new Date(business.createdAt), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewBusinessDetails(business)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {business.verificationStatus === 'pending' && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleVerifyBusiness(business.id, 'verified')}>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Verify Business
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleVerifyBusiness(business.id, 'rejected')}>
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Reject Verification
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleSuspendBusiness(business.id)}
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Suspend Business
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
                
                <TabsContent value="hub-pins" className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Active Hub Pins</h3>
                    <Badge variant="secondary">
                      {hubPinStats?.totalActive || 0} Active Pins
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {hubPins?.map((pin: any) => (
                      <Card key={pin.id}>
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-base">{pin.title}</CardTitle>
                              <CardDescription className="text-xs">
                                {pin.business?.businessName}
                              </CardDescription>
                            </div>
                            <Badge variant={pin.isActive ? 'default' : 'secondary'}>
                              {pin.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-3">
                          <div className="text-sm space-y-1">
                            <p className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {pin.location}
                            </p>
                            <p className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {pin.positionCount || 0} positions
                            </p>
                            <p className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              Priority: {pin.priority}
                            </p>
                          </div>
                        </CardContent>
                        <CardFooter className="pt-3 pb-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleEditHubPin(pin.id)}
                          >
                            Edit Pin
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="positions" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Enterprise Position Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Total Positions</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold">{positionStats?.total || 0}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Active Positions</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold text-green-600">{positionStats?.active || 0}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Total Applications</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold">{positionStats?.totalApplications || 0}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Avg. Applications/Position</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold">{positionStats?.avgApplications || 0}</p>
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="analytics" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Enterprise Analytics</CardTitle>
                      <CardDescription>
                        Overview of enterprise account performance and metrics
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-sm font-medium mb-3">Business Growth</h4>
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={enterpriseGrowthData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <Tooltip />
                              <Line type="monotone" dataKey="businesses" stroke="#8884d8" name="Businesses" />
                              <Line type="monotone" dataKey="hubPins" stroke="#82ca9d" name="Hub Pins" />
                              <Line type="monotone" dataKey="positions" stroke="#ffc658" name="Positions" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium mb-2">Top Businesses by Hires</h4>
                            <div className="space-y-2">
                              {topBusinesses?.map((business: any, index: number) => (
                                <div key={business.id} className="flex items-center justify-between">
                                  <span className="text-sm">{business.businessName}</span>
                                  <Badge variant="secondary">{business.hireCount} hires</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium mb-2">Position Types Distribution</h4>
                            <ResponsiveContainer width="100%" height={200}>
                              <PieChart>
                                <Pie
                                  data={positionTypeData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  fill="#8884d8"
                                >
                                  {positionTypeData?.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Enhanced User Management Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Management</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold">{selectedUser.username}</h3>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={selectedUser.isActive ? "default" : "destructive"}>
                    {selectedUser.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {selectedUser.isAdmin && (
                    <Badge variant="secondary">
                      <Shield className="h-3 w-3 mr-1" />Admin
                    </Badge>
                  )}
                  {selectedUser.strikes && selectedUser.strikes.length > 0 && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {selectedUser.strikes.filter(s => s.isActive).length} Active Strikes
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Basic Actions */}
                <Button 
                  variant={selectedUser.isActive ? "destructive" : "default"}
                  onClick={() => handleUserAction(selectedUser.id, selectedUser.isActive ? 'ban' : 'unban')}
                >
                  {selectedUser.isActive ? 'Ban User' : 'Unban User'}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => handleUserAction(selectedUser.id, selectedUser.isAdmin ? 'removeAdmin' : 'makeAdmin')}
                >
                  {selectedUser.isAdmin ? 'Remove Admin' : 'Make Admin'}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => handleUserAction(selectedUser.id, 'verify')}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Verify User
                </Button>

                {/* Enhanced Actions */}
                <Button 
                  variant="outline"
                  onClick={() => handleEnhancedAction('suspend', selectedUser.id, selectedUser.username)}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Suspend
                </Button>

                <Button 
                  variant="outline"
                  onClick={() => handleEnhancedAction('strike', selectedUser.id, selectedUser.username)}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Issue Strike
                </Button>

                <Button 
                  variant="outline"
                  onClick={() => handleEnhancedAction('warn', selectedUser.id, selectedUser.username)}
                >
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Issue Warning
                </Button>
              </div>

              {/* View Strikes */}
              <div className="pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={() => viewUserStrikes(selectedUser.id)}
                  className="w-full"
                >
                  View Strike History
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isJobDialogOpen} onOpenChange={setIsJobDialogOpen}>
          <DialogContent>
              <DialogHeader><DialogTitle>Job Details</DialogTitle></DialogHeader>
              {selectedJob && <div><p>{selectedJob.title}</p></div>}
          </DialogContent>
      </Dialog>

      <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
          <DialogContent>
              <DialogHeader><DialogTitle>Support Ticket</DialogTitle></DialogHeader>
              {selectedTicket && (
                  <div>
                      <p><strong>Title:</strong> {selectedTicket.title}</p>
                      <Textarea value={ticketResponse} onChange={(e) => setTicketResponse(e.target.value)} placeholder="Respond to ticket..."/>
                      <Button>Send Response</Button>
                  </div>
              )}
          </DialogContent>
      </Dialog>

      {/* Enhanced Action Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction?.type === 'suspend' && 'Suspend User'}
              {pendingAction?.type === 'ban' && 'Ban User'}
              {pendingAction?.type === 'strike' && 'Issue Strike'}
              {pendingAction?.type === 'warn' && 'Issue Warning'}
            </DialogTitle>
          </DialogHeader>
          
          {pendingAction && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  You are about to {pendingAction.type} user: <strong>{pendingAction.username}</strong>
                </p>
              </div>

              {pendingAction.type === 'suspend' && (
                <div className="space-y-2">
                  <Label htmlFor="duration">Suspension Duration</Label>
                  <Select value={suspensionDuration} onValueChange={setSuspensionDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Day</SelectItem>
                      <SelectItem value="3">3 Days</SelectItem>
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="14">14 Days</SelectItem>
                      <SelectItem value="30">30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reason">Reason *</Label>
                <Input
                  id="reason"
                  placeholder="Enter reason for this action..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">Additional Details</Label>
                <Textarea
                  id="details"
                  placeholder="Additional context or details..."
                  value={actionDetails}
                  onChange={(e) => setActionDetails(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={executeEnhancedAction}
              disabled={!actionReason.trim()}
              variant={pendingAction?.type === 'ban' ? "destructive" : "default"}
            >
              Confirm {pendingAction?.type}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Strikes Dialog */}
      <Dialog open={isStrikesDialogOpen} onOpenChange={setIsStrikesDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Strike History - {selectedUser?.username}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedUser?.strikes && selectedUser.strikes.length > 0 ? (
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {selectedUser.strikes.map((strike) => (
                    <Card key={strike.id} className={strike.isActive ? "border-red-200" : "border-gray-200"}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={strike.type === 'warning' ? "secondary" : "destructive"}>
                                {strike.type}
                              </Badge>
                              <Badge variant={strike.isActive ? "destructive" : "secondary"}>
                                {strike.isActive ? "Active" : "Expired"}
                              </Badge>
                            </div>
                            <p className="font-medium">{strike.reason}</p>
                            {strike.details && (
                              <p className="text-sm text-muted-foreground">{strike.details}</p>
                            )}
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <p>Issued: {new Date(strike.createdAt).toLocaleDateString()}</p>
                            {strike.expiresAt && (
                              <p>Expires: {new Date(strike.expiresAt).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No strikes found for this user.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Business Details Dialog */}
      <Dialog open={isBusinessDetailsDialogOpen} onOpenChange={setIsBusinessDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Business Details</DialogTitle>
          </DialogHeader>
          
          {selectedBusiness && (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Business Name</Label>
                      <p className="text-sm font-semibold">{selectedBusiness.businessName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Business Email</Label>
                      <p className="text-sm">{selectedBusiness.businessEmail}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                      <p className="text-sm">{selectedBusiness.businessPhone || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Website</Label>
                      <p className="text-sm">{selectedBusiness.businessWebsite || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Industry</Label>
                      <p className="text-sm">{selectedBusiness.industry || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Company Size</Label>
                      <p className="text-sm">{selectedBusiness.companySize || 'N/A'}</p>
                    </div>
                  </div>
                  
                  {selectedBusiness.businessDescription && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                      <p className="text-sm mt-1">{selectedBusiness.businessDescription}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Address Information */}
              {(selectedBusiness.businessAddress || selectedBusiness.businessCity || selectedBusiness.businessState) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Address Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                        <p className="text-sm">{selectedBusiness.businessAddress || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">City</Label>
                        <p className="text-sm">{selectedBusiness.businessCity || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">State</Label>
                        <p className="text-sm">{selectedBusiness.businessState || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">ZIP Code</Label>
                        <p className="text-sm">{selectedBusiness.businessZip || 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Account Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Account Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Verification Status</Label>
                      <div className="mt-1">
                        <Badge variant={
                          selectedBusiness.verificationStatus === 'verified' ? 'default' :
                          selectedBusiness.verificationStatus === 'rejected' ? 'destructive' :
                          'secondary'
                        }>
                          {selectedBusiness.verificationStatus}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Account Created</Label>
                      <p className="text-sm">{format(new Date(selectedBusiness.createdAt), 'MMM d, yyyy')}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                      <p className="text-sm">{format(new Date(selectedBusiness.updatedAt), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Owner Information */}
              {selectedBusiness.user && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Owner Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                        <p className="text-sm">{selectedBusiness.user.fullName || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                        <p className="text-sm">{selectedBusiness.user.email || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Username</Label>
                        <p className="text-sm">{selectedBusiness.user.username || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Account Type</Label>
                        <p className="text-sm">{selectedBusiness.user.accountType || 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Activity Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Activity Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{selectedBusiness.hubPinCount || 0}</p>
                      <p className="text-sm text-muted-foreground">Hub Pins</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{selectedBusiness.activePositionCount || 0}</p>
                      <p className="text-sm text-muted-foreground">Active Positions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{selectedBusiness.totalApplications || 0}</p>
                      <p className="text-sm text-muted-foreground">Total Applications</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{selectedBusiness.totalHires || 0}</p>
                      <p className="text-sm text-muted-foreground">Total Hires</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                {selectedBusiness.verificationStatus === 'pending' && (
                  <>
                    <Button 
                      onClick={() => {
                        handleVerifyBusiness(selectedBusiness.id, 'verified');
                        setIsBusinessDetailsDialogOpen(false);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify Business
                    </Button>
                    <Button 
                      onClick={() => {
                        handleVerifyBusiness(selectedBusiness.id, 'rejected');
                        setIsBusinessDetailsDialogOpen(false);
                      }}
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Verification
                    </Button>
                  </>
                )}
                <Button 
                  onClick={() => {
                    handleSuspendBusiness(selectedBusiness.id);
                    setIsBusinessDetailsDialogOpen(false);
                  }}
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Suspend Business
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
