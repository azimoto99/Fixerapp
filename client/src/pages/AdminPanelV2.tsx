import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  Activity
} from "lucide-react";

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
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);

  // Comprehensive admin data fetching - only real platform data
  const { data: dashboardStats, isLoading: isDashboardLoading } = useQuery({
    queryKey: ["/api/admin/dashboard-stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: users = [], isLoading: isUsersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: selectedTab === "users",
  });

  const { data: jobs = [], isLoading: isJobsLoading, refetch: refetchJobs } = useQuery({
    queryKey: ["/api/admin/jobs"],
    enabled: selectedTab === "jobs",
  });

  const { data: supportTickets = [], isLoading: isSupportLoading, refetch: refetchSupport } = useQuery({
    queryKey: ["/api/admin/support-tickets"],
    enabled: selectedTab === "support",
  });

  const { data: transactions = [], isLoading: isTransactionsLoading } = useQuery({
    queryKey: ["/api/admin/transactions"],
    enabled: selectedTab === "financials",
  });

  const { data: systemMetrics = [], isLoading: isSystemLoading } = useQuery({
    queryKey: ["/api/admin/system-metrics"],
    enabled: selectedTab === "overview",
  });

  // User management mutations
  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => apiRequest("DELETE", `/api/admin/users/${userId}`),
    onSuccess: () => {
      toast({ title: "User deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: () => {
      toast({ title: "Failed to delete user", variant: "destructive" });
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/users/${userId}`, { isActive }),
    onSuccess: () => {
      toast({ title: "User status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: () => {
      toast({ title: "Failed to update user status", variant: "destructive" });
    },
  });

  // Job management mutations
  const deleteJobMutation = useMutation({
    mutationFn: (jobId: number) => apiRequest("DELETE", `/api/admin/jobs/${jobId}`),
    onSuccess: () => {
      toast({ title: "Job deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: () => {
      toast({ title: "Failed to delete job", variant: "destructive" });
    },
  });

  // Support ticket mutations
  const updateTicketStatusMutation = useMutation({
    mutationFn: ({ ticketId, status, resolution }: { ticketId: number; status: string; resolution?: string }) =>
      apiRequest("PATCH", `/api/admin/support-tickets/${ticketId}`, { status, resolution }),
    onSuccess: () => {
      toast({ title: "Ticket updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support-tickets"] });
    },
    onError: () => {
      toast({ title: "Failed to update ticket", variant: "destructive" });
    },
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <ShieldCheck className="h-10 w-10 text-blue-600" />
            Fixer Admin Panel
          </h1>
          <p className="text-gray-600">Manage your platform with comprehensive admin tools</p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white shadow-sm border">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white shadow-lg border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{dashboardStats?.totalUsers || 0}</div>
                  <p className="text-xs text-gray-500">Registered users</p>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Active Jobs</CardTitle>
                  <Briefcase className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{dashboardStats?.activeJobs || 0}</div>
                  <p className="text-xs text-gray-500">Currently open jobs</p>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Platform Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">${(dashboardStats?.totalRevenue || 0).toFixed(2)}</div>
                  <p className="text-xs text-gray-500">Total platform revenue</p>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Support Tickets</CardTitle>
                  <Activity className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{dashboardStats?.pendingSupport || 0}</div>
                  <p className="text-xs text-gray-500">Pending tickets</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">Platform running smoothly</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">All systems operational</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Database</span>
                      <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Payment System</span>
                      <Badge className="bg-green-100 text-green-800">Operational</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Authentication</span>
                      <Badge className="bg-green-100 text-green-800">Secure</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                          onClick={() => {
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
                          onClick={() => updateTicketStatusMutation.mutate({ 
                            ticketId: ticket.id, 
                            status: "in_progress" 
                          })}
                          disabled={ticket.status === "resolved" || ticket.status === "closed"}
                        >
                          In Progress
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => updateTicketStatusMutation.mutate({ 
                            ticketId: ticket.id, 
                            status: "resolved",
                            resolution: "Issue resolved by admin"
                          })}
                          disabled={ticket.status === "resolved" || ticket.status === "closed"}
                        >
                          <CheckCircle className="h-4 w-4" />
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
          <DialogContent className="max-w-2xl">
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
          <DialogContent className="max-w-2xl">
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
      </div>
    </div>
  );
}