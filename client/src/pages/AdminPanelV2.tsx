import { useState, useEffect, useMemo } from "react";
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
import { RefreshCw, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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

export default function AdminPanelV2() {
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

  const { data: dashboardStats, isLoading: isDashboardLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 30000,
  });

  const usersQueryKey = useMemo(() => [
    "/api/admin/users",
    { page: currentPage, pageSize, search: debouncedSearch, status: filterStatus, sortBy, sortOrder }
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
      const response = await apiRequest('GET', `/api/admin/users?${params.toString()}`);
      return response.json();
    },
    enabled: selectedTab === "users",
  });
  const users = usersResponse?.users || [];
  const totalUsers = usersResponse?.total || 0;

  const jobsQueryKey = useMemo(() => [
    "/api/admin/jobs",
    { page: currentPage, pageSize, search: debouncedSearch, status: filterStatus, sortBy, sortOrder }
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
      const response = await apiRequest('GET', `/api/admin/jobs?${params.toString()}`);
      return response.json();
    },
    enabled: selectedTab === "jobs",
  });
  const jobs = jobsResponse?.jobs || [];
  const totalJobs = jobsResponse?.total || 0;

  const supportQueryKey = useMemo(() => [
    "/api/admin/support-tickets",
    { page: currentPage, pageSize, search: debouncedSearch, status: ticketFilterStatus, priority: ticketFilterPriority, sortBy, sortOrder }
  ], [currentPage, pageSize, debouncedSearch, ticketFilterStatus, ticketFilterPriority, sortBy, sortOrder]);

  const { data: supportResponse, isLoading: isSupportLoading, refetch: refetchSupport } = useQuery({
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
      return response.json();
    },
    enabled: selectedTab === "support",
  });
  const supportTickets = supportResponse?.tickets || [];
  const totalTickets = supportResponse?.total || 0;

  const paymentsQueryKey = useMemo(() => [
    "/api/admin/payments",
    { page: currentPage, pageSize, search: debouncedSearch, status: paymentFilterStatus, type: paymentFilterType, sortBy, sortOrder }
  ], [currentPage, pageSize, debouncedSearch, paymentFilterStatus, paymentFilterType, sortBy, sortOrder]);

  const { data: paymentsResponse, isLoading: isTransactionsLoading, refetch: refetchPayments } = useQuery({
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
      return response.json();
    },
    enabled: selectedTab === "financials",
  });
  const transactions = paymentsResponse || [];
  const totalTransactions = paymentsResponse?.length || 0;

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
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Admin</h1>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-600 dark:text-gray-300">
            <X size={24} />
          </button>
        </div>
        <nav className="mt-4">
          <TabsList className="flex flex-col items-start p-2 space-y-1">
            <TabsTrigger value="overview" className="w-full text-left justify-start" onClick={() => setSelectedTab('overview')}>Overview</TabsTrigger>
            <TabsTrigger value="users" className="w-full text-left justify-start" onClick={() => setSelectedTab('users')}>Users</TabsTrigger>
            <TabsTrigger value="jobs" className="w-full text-left justify-start" onClick={() => setSelectedTab('jobs')}>Jobs</TabsTrigger>
            <TabsTrigger value="support" className="w-full text-left justify-start" onClick={() => setSelectedTab('support')}>Support Tickets</TabsTrigger>
            <TabsTrigger value="financials" className="w-full text-left justify-start" onClick={() => setSelectedTab('financials')}>Financials</TabsTrigger>
          </TabsList>
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden mb-4 p-2 rounded-md bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300">
          <Menu size={24} />
        </button>
        
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsContent value="overview">
             {isDashboardLoading ? (
                <Skeleton className="h-[125px] w-full rounded-xl" />
            ) : (
                <Card>
                  <CardHeader><CardTitle>Platform Overview</CardTitle></CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div>Total Users: {dashboardStats?.totalUsers}</div>
                      <div>Total Jobs: {dashboardStats?.totalJobs}</div>
                      <div>Total Revenue: ${dashboardStats?.totalRevenue?.toFixed(2)}</div>
                      <div>Pending Disputes: {dashboardStats?.pendingDisputes}</div>
                  </CardContent>
                </Card>
            )}
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
            <div className="rounded-lg border">
              {isUsersLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : users.length === 0 ? (
                <div className="text-center p-8">No users found.</div>
              ) : (
                users.map((user) => (
                  <div key={user.id} className="border-b last:border-b-0 p-4 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleUserSelect(user)}>
                    <div className="grid grid-cols-4 gap-4 items-center">
                        <p className="font-semibold">{user.username}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p>{user.accountType}</p>
                        <Badge variant={user.isActive ? "default" : "destructive"}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
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
            <div className="rounded-lg border">
                {isJobsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                ) : jobs.length === 0 ? (
                    <div className="text-center p-8">No jobs found.</div>
                ) : (
                    jobs.map((job) => (
                      <div key={job.id} className="border-b last:border-b-0 p-4 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleJobSelect(job)}>
                          <p>{job.title}</p>
                      </div>
                    ))
                )}
            </div>
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
            <div className="rounded-lg border">
              {isSupportLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : supportTickets.length === 0 ? (
                  <div className="text-center p-8">No support tickets found.</div>
              ) : (
                  supportTickets.map((ticket) => (
                    <div key={ticket.id} className="border-b last:border-b-0 p-4 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleTicketSelect(ticket)}>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                              <p className="font-semibold">{ticket.title}</p>
                              <p className="text-sm text-muted-foreground">#{ticket.id} from {ticket.userName || ticket.userEmail}</p>
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                              <Badge variant="secondary" className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                              <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
                          </div>
                        </div>
                    </div>
                  ))
              )}
            </div>
            {totalTickets > 0 && (
              <div className="flex justify-end items-center gap-2 mt-4">
                <span className="text-sm text-muted-foreground">Page {currentPage} of {Math.ceil(totalTickets / pageSize)}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /> Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalTickets / pageSize)))} disabled={currentPage * pageSize >= totalTickets}>Next <ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="financials">
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

                <div className="rounded-lg border">
                  {isTransactionsLoading ? (
                    Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                  ) : transactions.length === 0 ? (
                    <div className="text-center p-8">No transactions found.</div>
                  ) : (
                    transactions.map((transaction: Payment) => (
                      <div key={transaction.id} className="border-b last:border-b-0 p-4">
                        <div className="grid grid-cols-5 gap-4 items-center">
                          <p className="font-semibold col-span-2">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">{transaction.userEmail}</p>
                          <p className="font-semibold text-right">${transaction.amount.toFixed(2)}</p>
                          <div className="flex justify-end">
                            <Badge>{transaction.status}</Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

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
            <DialogHeader><DialogTitle>User Details</DialogTitle></DialogHeader>
            {selectedUser && (
              <div>
                <p><strong>Username:</strong> {selectedUser.username}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
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

      </main>
    </div>
  );
}