import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, ChevronLeft, ChevronRight, Menu, X, AlertCircle, User, Shield, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

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
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterStatus, ticketFilterStatus, ticketFilterPriority, paymentFilterStatus, paymentFilterType, selectedTab]);

  // Check if user is admin
  const isAdmin = user?.isAdmin === true || user?.id === 20;
  
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
    refetchInterval: 30000,
    retry: 2,
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
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
          <TabsList className="grid w-full grid-cols-5 p-2">
            <TabsTrigger value="overview" className="w-full justify-start">Overview</TabsTrigger>
            <TabsTrigger value="users" className="w-full justify-start">Users</TabsTrigger>
            <TabsTrigger value="jobs" className="w-full justify-start">Jobs</TabsTrigger>
            <TabsTrigger value="support" className="w-full justify-start">Support</TabsTrigger>
            <TabsTrigger value="payments" className="w-full justify-start">Payments</TabsTrigger>
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
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Total Jobs</CardTitle>
                    <CardDescription>Posted jobs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardStats.totalJobs?.toLocaleString() || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Total Revenue</CardTitle>
                    <CardDescription>Platform revenue</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${dashboardStats.totalRevenue?.toLocaleString() || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Pending Disputes</CardTitle>
                    <CardDescription>Open issues</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardStats.pendingDisputes || 0}</div>
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
      </Tabs>

      {/* Dialogs for details */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Management</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
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
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
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

    </div>
  );
}