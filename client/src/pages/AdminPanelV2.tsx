import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Loader2, RefreshCw, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye,
  Trash2,
  UserX,
  MessageSquare,
  CreditCard,
  ShieldCheck,
  Settings,
  BarChart3,
  Activity,
  Menu,
  X
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";

interface AdminStats {
  totalUsers: number;
  totalJobs: number;
  totalRevenue: number;
  pendingDisputes: number;
  activeJobs: number;
  completedJobs: number;
  totalEarnings: number;
  platformFees: number;
}

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  accountType: string;
  isActive: boolean;
  isAdmin: boolean;
  lastActive: string;
  rating?: number;
}

interface Job {
  id: number;
  title: string;
  description: string;
  status: string;
  paymentAmount: number;
  posterId: number;
  workerId?: number;
  datePosted: string;
  location: string;
}

interface SupportTicket {
  id: number;
  userId: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  userEmail?: string;
  userName?: string;
}

interface Payment {
  id: number;
  userId: number;
  amount: number;
  type: string;
  status: string;
  createdAt: string;
  description: string;
}

export default function AdminPanelV2() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Enhanced state management for better UX
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [ticketResponse, setTicketResponse] = useState("");
  
  // Enhanced UI state for responsive design
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Performance optimization - debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterStatus, selectedTab]);

  // Enhanced data fetching with comprehensive analytics and real-time monitoring
  const { data: dashboardStats, isLoading: isDashboardLoading, error: dashboardError } = useQuery<AdminStats>({
    queryKey: ["/api/admin/analytics/comprehensive"],
    queryFn: () => apiRequest('GET', '/api/admin/analytics/comprehensive').then(res => res.json()),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
    retry: 3,
  });

  // Real-time system health monitoring
  const { data: systemHealth, isLoading: isSystemLoading, error: systemHealthError } = useQuery({
    queryKey: ["/api/admin/system/health"],
    queryFn: () => apiRequest('GET', '/api/admin/system/health').then(res => res.json()),
    refetchInterval: 15000, // Refresh every 15 seconds for real-time monitoring
    staleTime: 5000,
  });

  // Performance metrics for advanced monitoring
  const { data: performanceMetrics, isLoading: isPerformanceLoading, error: performanceMetricsError } = useQuery({
    queryKey: ["/api/admin/system/performance"],
    queryFn: () => apiRequest('GET', '/api/admin/system/performance').then(res => res.json()),
    refetchInterval: 20000, // Refresh every 20 seconds
    staleTime: 8000,
  });

  // Optimized data fetching with pagination and filtering
  const usersQueryKey = useMemo(() => [
    "/api/admin/analytics/users",
    { 
      page: currentPage, 
      pageSize, 
      search: debouncedSearch, 
      status: filterStatus, 
      sortBy, 
      sortOrder 
    }
  ], [currentPage, pageSize, debouncedSearch, filterStatus, sortBy, sortOrder]);

  const { data: usersResponse, isLoading: isUsersLoading, refetch: refetchUsers } = useQuery({
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
      
      const response = await apiRequest('GET', `/api/admin/analytics/users?${params}`);
      return response.json();
    },
    enabled: selectedTab === "users",
    staleTime: 5000,
  });

  // Enhanced jobs fetching with filtering
  const jobsQueryKey = useMemo(() => [
    "/api/admin/analytics/jobs",
    { 
      page: currentPage, 
      pageSize, 
      search: debouncedSearch, 
      status: filterStatus, 
      sortBy, 
      sortOrder 
    }
  ], [currentPage, pageSize, debouncedSearch, filterStatus, sortBy, sortOrder]);

  const { data: jobsResponse, isLoading: isJobsLoading, refetch: refetchJobs } = useQuery({
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
      
      const response = await apiRequest('GET', `/api/admin/analytics/jobs?${params}`);
      return response.json();
    },
    enabled: selectedTab === "jobs",
    staleTime: 5000,
  });

  // Extract paginated data
  const users = usersResponse?.users || [];
  const totalUsers = usersResponse?.total || 0;
  const jobs = jobsResponse?.jobs || [];
  const totalJobs = jobsResponse?.total || 0;

  const { data: supportResponse, isLoading: isSupportLoading, refetch: refetchSupport } = useQuery({
    queryKey: ["/api/admin/analytics/support"],
    queryFn: () => apiRequest('GET', '/api/admin/analytics/support').then(res => res.json()),
    enabled: selectedTab === "support",
  });

  const { data: financialResponse, isLoading: isTransactionsLoading } = useQuery({
    queryKey: ["/api/admin/analytics/financials"],
    queryFn: () => apiRequest('GET', '/api/admin/analytics/financials').then(res => res.json()),
    enabled: selectedTab === "financials",
  });

  // Extract data from analytics responses
  const supportTickets = supportResponse?.tickets || [];
  const transactions = financialResponse?.transactions || [];

  const { data: systemMetrics = [], isLoading: isSystemMetricsLoading } = useQuery({
    queryKey: ["/api/admin/system-metrics"],
    queryFn: () => apiRequest('GET', '/api/admin/system-metrics').then(res => res.json()),
    enabled: selectedTab === "overview",
  });

  // User management mutations
  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => apiRequest("DELETE", `/api/admin/users/${userId}`),
    onSuccess: () => {
      toast({ title: "User deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/users"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete user", variant: "destructive" });
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/users/${userId}`, { isActive }),
    onSuccess: () => {
      toast({ title: "User status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/users"] });
    },
    onError: () => {
      toast({ title: "Failed to update user status", variant: "destructive" });
    },
  });

  const banUserMutation = useMutation({
    mutationFn: (userId: number) => apiRequest("PUT", `/api/admin/users/${userId}/ban`),
    onSuccess: () => {
      toast({ title: "User updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/users"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update user", variant: "destructive" });
    },
  });

  const promoteUserMutation = useMutation({
    mutationFn: (userId: number) => apiRequest("PUT", `/api/admin/users/${userId}/promote`),
    onSuccess: () => {
      toast({ title: "User promoted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/users"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to promote user", variant: "destructive" });
    },
  });

  // Job management mutations
  const deleteJobMutation = useMutation({
    mutationFn: (jobId: number) => apiRequest("DELETE", `/api/admin/jobs/${jobId}`),
    onSuccess: () => {
      toast({ title: "Job deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/jobs"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete job", variant: "destructive" });
    },
  });

  const updateJobStatusMutation = useMutation({
    mutationFn: ({ jobId, status }: { jobId: number; status: string }) =>
      apiRequest("PUT", `/api/admin/jobs/${jobId}/status`, { status }),
    onSuccess: () => {
      toast({ title: "Job status updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/jobs"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update job status", variant: "destructive" });
    },
  });

  // Support ticket mutations
  const updateTicketStatusMutation = useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: number; status: string }) =>
      apiRequest("PUT", `/api/admin/support/${ticketId}/status`, { status }),
    onSuccess: () => {
      toast({ title: "Ticket status updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/support"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update ticket status", variant: "destructive" });
    },
  });

  const addTicketResponseMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: number; message: string }) => 
      apiRequest("POST", `/api/admin/support-tickets/${ticketId}/responses`, { message }),
    onSuccess: () => {
      toast({ title: "Response sent successfully" });
      setTicketResponse("");
      setIsTicketDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/support"] });
    },
    onError: () => {
      toast({ title: "Failed to send response", variant: "destructive" });
    },
  });

  const deleteTicketMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/support-tickets/${ticketId}`);
      return response.json();
    },
    onSuccess: () => {
      refetchSupport();
      toast({ title: "Ticket deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete ticket", variant: "destructive" });
    }
  });

  const respondToTicketMutation = useMutation({
    mutationFn: ({ ticketId, response }: { ticketId: number; response: string }) =>
      apiRequest("POST", `/api/admin/support/${ticketId}/respond`, { response }),
    onSuccess: () => {
      toast({ title: "Response sent successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/support"] });
      setIsTicketDialogOpen(false);
      setTicketResponse("");
    },
    onError: () => {
      toast({ title: "Failed to send response", variant: "destructive" });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "open":
      case "completed":
        return "bg-green-500";
      case "pending":
      case "in_progress":
        return "bg-yellow-500";
      case "inactive":
      case "closed":
      case "canceled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "urgent":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6"
      style={{ zIndex: 1000, position: 'relative' }}
    >
      <div className="max-w-7xl mx-auto" style={{ zIndex: 1010, position: 'relative' }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <ShieldCheck className="h-10 w-10 text-blue-600" />
            Fixer Admin Panel
          </h1>
          <p className="text-gray-600">Manage your platform with comprehensive admin tools</p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white shadow-sm border" style={{ zIndex: 1120, position: 'relative' }}>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Jobs
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Support
            </TabsTrigger>
            <TabsTrigger value="financials" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financials
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {isDashboardLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)
              ) : dashboardError ? (
                <div className="col-span-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                  <strong className="font-bold">Error!</strong>
                  <span className="block sm:inline"> Failed to load dashboard stats. Please try again later.</span>
                </div>
              ) : dashboardStats ? (
                <>
                  <StatCard title="Total Users" value={dashboardStats.totalUsers} icon={Users} />
                  <StatCard title="Active Jobs" value={dashboardStats.activeJobs} icon={Briefcase} />
                  <StatCard title="Total Revenue" value={`$${dashboardStats.totalRevenue.toLocaleString()}`} icon={DollarSign} />
                  <StatCard title="Pending Disputes" value={dashboardStats.pendingDisputes} icon={AlertTriangle} />
                </>
              ) : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mt-4">
              {isSystemLoading ? (
                <Skeleton className="h-24" />
              ) : systemHealthError ? (
                <Card>
                  <CardHeader>
                    <CardTitle>System Health Error</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-red-500">Failed to load system health.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>System Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>Status: <span className={`font-semibold ${systemHealth?.status === 'OK' ? 'text-green-500' : 'text-red-500'}`}>{systemHealth?.status}</span></p>
                  </CardContent>
                </Card>
              )}
              {isPerformanceLoading ? (
                <Skeleton className="h-24" />
              ) : performanceMetricsError ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics Error</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-red-500">Failed to load performance metrics.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>API Latency: {performanceMetrics?.apiLatency}ms</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="bg-white shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">User Management</CardTitle>
                <CardDescription>Manage platform users and their permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user: User) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{user.fullName}</h3>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {user.accountType}
                            </Badge>
                            <Badge className={`text-xs ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            {user.isAdmin && (
                              <Badge className="text-xs bg-purple-100 text-purple-800">Admin</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedUser(user);
                            setIsUserDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleUserStatusMutation.mutate({ userId: user.id, isActive: !user.isActive })}
                        >
                          {user.isActive ? <UserX className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteUserMutation.mutate(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <Card className="bg-white shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">Job Management</CardTitle>
                <CardDescription>Monitor and manage all platform jobs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {jobs.map((job: Job) => (
                    <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <Briefcase className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{job.title}</h3>
                          <p className="text-sm text-gray-500">{job.location}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge className={`text-xs ${getStatusColor(job.status)} text-white`}>
                              {job.status}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              ${job.paymentAmount}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedJob(job);
                            setIsJobDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteJobMutation.mutate(job.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-6">
            <Card className="bg-white shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">Support Tickets</CardTitle>
                <CardDescription>Manage customer support and resolve issues</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {supportTickets.map((ticket: SupportTicket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                          <MessageSquare className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{ticket.title}</h3>
                          <p className="text-sm text-gray-500">{ticket.userName || `User ${ticket.userId}`}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge className={`text-xs ${getStatusColor(ticket.status)} text-white`}>
                              {ticket.status}
                            </Badge>
                            <Badge className={`text-xs ${getPriorityColor(ticket.priority)} text-white`}>
                              {ticket.priority}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {ticket.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setIsTicketDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View & Respond
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateTicketStatusMutation.mutate({ 
                            ticketId: ticket.id, 
                            status: ticket.status === "open" ? "in_progress" : "resolved"
                          })}
                          disabled={ticket.status === "resolved" || ticket.status === "closed"}
                        >
                          {ticket.status === "open" ? "Start" : "Resolve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteTicketMutation.mutate(ticket.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financials Tab */}
          <TabsContent value="financials" className="space-y-6">
            <Card className="bg-white shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">Financial Overview</CardTitle>
                <CardDescription>Track payments, earnings, and platform revenue</CardDescription>
              </CardHeader>
              <CardContent>
                {isTransactionsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : transactions.length > 0 ? (
                  <div className="space-y-4">
                    {transactions.map((transaction: any) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                            <CreditCard className="h-6 w-6 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">${transaction.amount?.toFixed(2) || '0.00'}</h3>
                            <p className="text-sm text-gray-500">{transaction.description || transaction.type || 'Transaction'}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge className={`text-xs ${getStatusColor(transaction.status)} text-white`}>
                                {transaction.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {transaction.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {new Date(transaction.createdAt || Date.now()).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-600">No Transactions Yet</h3>
                    <p className="text-sm text-gray-500">Financial transactions will appear here when jobs are completed</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* User Detail Dialog */}
        <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
          <DialogContent className="max-w-2xl" style={{ zIndex: 1080 }} onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <p className="text-sm text-gray-900">{selectedUser.fullName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-sm text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Account Type</label>
                    <p className="text-sm text-gray-900">{selectedUser.accountType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <p className="text-sm text-gray-900">{selectedUser.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                  {selectedUser.rating && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Rating</label>
                      <p className="text-sm text-gray-900">{selectedUser.rating.toFixed(1)} ⭐</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Last Active</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedUser.lastActive).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Job Detail Dialog */}
        <Dialog open={isJobDialogOpen} onOpenChange={setIsJobDialogOpen}>
          <DialogContent className="max-w-2xl" style={{ zIndex: 1080 }} onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>Job Details</DialogTitle>
            </DialogHeader>
            {selectedJob && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700">Title</label>
                    <p className="text-sm text-gray-900">{selectedJob.title}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <p className="text-sm text-gray-900">{selectedJob.description}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <p className="text-sm text-gray-900">{selectedJob.status}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Payment</label>
                    <p className="text-sm text-gray-900">${selectedJob.paymentAmount}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700">Location</label>
                    <p className="text-sm text-gray-900">{selectedJob.location}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Posted</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedJob.datePosted).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Support Ticket Dialog */}
        <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
          <DialogContent className="max-w-2xl" style={{ zIndex: 1080 }} onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>Support Ticket Details</DialogTitle>
            </DialogHeader>
            {selectedTicket && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">User</label>
                    <p className="text-sm text-gray-900">{selectedTicket.userName || `User ${selectedTicket.userId}`}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Category</label>
                    <p className="text-sm text-gray-900">{selectedTicket.category}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Priority</label>
                    <Badge className={`${getPriorityColor(selectedTicket.priority)} text-white`}>
                      {selectedTicket.priority}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <Badge className={`${getStatusColor(selectedTicket.status)} text-white`}>
                      {selectedTicket.status}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700">Issue Description</label>
                    <p className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded-md">
                      {selectedTicket.description}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Created</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedTicket.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Admin Response</label>
                    <Textarea
                      value={ticketResponse}
                      onChange={(e) => setTicketResponse(e.target.value)}
                      placeholder="Type your response to the user..."
                      className="mt-2"
                      rows={4}
                    />
                  </div>
                  
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setIsTicketDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (ticketResponse.trim()) {
                          addTicketResponseMutation.mutate({
                            ticketId: selectedTicket.id,
                            message: ticketResponse.trim()
                          });
                        }
                      }}
                      disabled={!ticketResponse.trim() || addTicketResponseMutation.isPending}
                    >
                      {addTicketResponseMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Response'
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => updateTicketStatusMutation.mutate({ 
                        ticketId: selectedTicket.id, 
                        status: "resolved"
                      })}
                      disabled={updateTicketStatusMutation.isPending}
                    >
                      {updateTicketStatusMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Resolving...
                        </>
                      ) : (
                        'Mark as Resolved'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}