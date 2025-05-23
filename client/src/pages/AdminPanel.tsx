import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  Users,
  Briefcase,
  DollarSign,
  AlertTriangle,
  Settings,
  HelpCircle,
  BarChart3,
  Search,
  RefreshCw,
  Ban,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  MessageSquare,
  Download,
  Filter,
  Plus,
  Edit,
  FileText,
  Activity,
  TrendingUp,
  Clock,
  MapPin,
  Star,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  AlertCircle,
  Info,
  UserCheck,
  UserX,
  Bookmark,
  Flag,
  Hash,
  Globe,
  Server,
  Database,
  Zap,
  Wifi,
  Monitor,
  HardDrive,
  Cpu,
  MemoryStick
} from 'lucide-react';

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  accountType: 'worker' | 'poster';
  isActive: boolean;
  isAdmin: boolean;
  rating: number;
  createdAt: string;
  lastLogin?: string;
  totalEarnings?: number;
  completedJobs?: number;
  postedJobs?: number;
  avatarUrl?: string;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
}

interface Job {
  id: number;
  title: string;
  description: string;
  category: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  budget: number;
  location: string;
  posterId: number;
  workerId?: number;
  createdAt: string;
  completedAt?: string;
  posterName?: string;
  workerName?: string;
}

interface Transaction {
  id: number;
  amount: number;
  type: 'payment' | 'refund' | 'fee' | 'payout';
  status: 'pending' | 'completed' | 'failed';
  userId: number;
  jobId?: number;
  createdAt: string;
  description: string;
}

interface SupportTicket {
  id: number;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  userId: number;
  assignedTo?: number;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  category: 'technical' | 'billing' | 'dispute' | 'general';
}

interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalJobs: number;
  completedJobs: number;
  totalRevenue: number;
  pendingSupport: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  userGrowth: number;
  jobGrowth: number;
  revenueGrowth: number;
}

// Component starts here
export default function AdminPanel() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for filters and search
  const [userSearch, setUserSearch] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [supportSearch, setSupportSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Check admin access
  useEffect(() => {
    if (!user || !user.isAdmin) {
      navigate('/');
      toast({
        title: 'Access Denied',
        description: 'Admin privileges required to access this page.',
        variant: 'destructive',
      });
    }
  }, [user, navigate]);

  // Dashboard Stats Query
  const { data: dashboardStats, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['/api/admin/dashboard-stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/dashboard-stats');
      if (!res.ok) throw new Error('Failed to fetch dashboard stats');
      return res.json() as Promise<DashboardStats>;
    }
  });

  // Users Query
  const { data: users = [], isLoading: isUsersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['/api/admin/users', userSearch],
    queryFn: async () => {
      const searchParam = userSearch ? `?search=${encodeURIComponent(userSearch)}` : '';
      const res = await apiRequest('GET', `/api/admin/users${searchParam}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json() as Promise<User[]>;
    }
  });

  // Jobs Query
  const { data: jobs = [], isLoading: isJobsLoading, refetch: refetchJobs } = useQuery({
    queryKey: ['/api/admin/jobs', jobSearch],
    queryFn: async () => {
      const searchParam = jobSearch ? `?search=${encodeURIComponent(jobSearch)}` : '';
      const res = await apiRequest('GET', `/api/admin/jobs${searchParam}`);
      if (!res.ok) throw new Error('Failed to fetch jobs');
      return res.json() as Promise<Job[]>;
    }
  });

  // Transactions Query
  const { data: transactions = [], isLoading: isTransactionsLoading } = useQuery({
    queryKey: ['/api/admin/transactions'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/transactions');
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json() as Promise<Transaction[]>;
    }
  });

  // Support Tickets Query
  const { data: supportTickets = [], isLoading: isSupportLoading, refetch: refetchSupport } = useQuery({
    queryKey: ['/api/admin/support', supportSearch],
    queryFn: async () => {
      const searchParam = supportSearch ? `?search=${encodeURIComponent(supportSearch)}` : '';
      const res = await apiRequest('GET', `/api/admin/support${searchParam}`);
      if (!res.ok) throw new Error('Failed to fetch support tickets');
      return res.json() as Promise<SupportTicket[]>;
    }
  });

  // System Metrics Query
  const { data: systemMetrics = [], isLoading: isSystemLoading } = useQuery({
    queryKey: ['/api/admin/system-metrics'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/system-metrics');
      if (!res.ok) throw new Error('Failed to fetch system metrics');
      return res.json() as Promise<SystemMetric[]>;
    }
  });

  // User Actions Mutation
  const userActionMutation = useMutation({
    mutationFn: async ({ userId, action, reason }: { userId: number; action: string; reason?: string }) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/${action}`, { reason });
      if (!res.ok) throw new Error(`Failed to ${action} user`);
      return res.json();
    },
    onSuccess: () => {
      refetchUsers();
      toast({
        title: 'Success',
        description: 'User action completed successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Job Actions Mutation
  const jobActionMutation = useMutation({
    mutationFn: async ({ jobId, action, reason }: { jobId: number; action: string; reason?: string }) => {
      const res = await apiRequest('POST', `/api/admin/jobs/${jobId}/${action}`, { reason });
      if (!res.ok) throw new Error(`Failed to ${action} job`);
      return res.json();
    },
    onSuccess: () => {
      refetchJobs();
      toast({
        title: 'Success',
        description: 'Job action completed successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Support Actions Mutation
  const supportActionMutation = useMutation({
    mutationFn: async ({ ticketId, action, note }: { ticketId: number; action: string; note?: string }) => {
      const res = await apiRequest('POST', `/api/admin/support/${ticketId}/${action}`, { note });
      if (!res.ok) throw new Error(`Failed to ${action} ticket`);
      return res.json();
    },
    onSuccess: () => {
      refetchSupport();
      toast({
        title: 'Success',
        description: 'Support ticket updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'completed':
      case 'verified':
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'in_progress':
      case 'open':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
      case 'cancelled':
      case 'rejected':
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!user || !user.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
              <p className="text-gray-600 dark:text-gray-400">Platform Management & Control Center</p>
            </div>
          </div>
          <Button 
            onClick={() => {
              queryClient.invalidateQueries();
              toast({ title: 'Data Refreshed', description: 'All admin data has been updated.' });
            }}
            size="sm" 
            variant="outline" 
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh All
          </Button>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Jobs
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financial
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Support
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              System
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats?.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    +{dashboardStats?.userGrowth || 0}% from last month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats?.totalJobs || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    +{dashboardStats?.jobGrowth || 0}% from last month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(dashboardStats?.totalRevenue || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    +{dashboardStats?.revenueGrowth || 0}% from last month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Support Tickets</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats?.pendingSupport || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Pending resolution
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* System Health Overview */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {systemMetrics.map((metric, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            metric.status === 'good' ? 'bg-green-500' :
                            metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <span className="text-sm font-medium">{metric.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono">{metric.value}{metric.unit}</div>
                          <div className={`text-xs ${
                            metric.trend === 'up' ? 'text-green-600' :
                            metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {metric.trend === 'up' ? '↗' : metric.trend === 'down' ? '↘' : '→'} {metric.trend}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm">New user registered</p>
                        <p className="text-xs text-gray-500">2 minutes ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-4 w-4 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm">Job posted: "Web Development"</p>
                        <p className="text-xs text-gray-500">5 minutes ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm">Payment processed: $150</p>
                        <p className="text-xs text-gray-500">8 minutes ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-4 w-4 text-yellow-600" />
                      <div className="flex-1">
                        <p className="text-sm">New support ticket opened</p>
                        <p className="text-xs text-gray-500">12 minutes ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-80"
                />
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
              <Button onClick={() => refetchUsers()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user accounts, permissions, and verification status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isUsersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-blue-600">
                                  {user.fullName?.charAt(0) || user.username.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium">{user.fullName || user.username}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.accountType === 'worker' ? 'default' : 'secondary'}>
                              {user.accountType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(user.isActive ? 'active' : 'inactive')}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-400 fill-current" />
                              <span>{user.rating?.toFixed(1) || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(user.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedUser(user)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant={user.isActive ? "destructive" : "default"}
                                onClick={() => {
                                  userActionMutation.mutate({
                                    userId: user.id,
                                    action: user.isActive ? 'ban' : 'unban'
                                  });
                                }}
                              >
                                {user.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Search jobs..."
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  className="w-80"
                />
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
              <Button onClick={() => refetchJobs()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Job Management</CardTitle>
                <CardDescription>
                  Monitor and moderate job posts across the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isJobsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Budget</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Posted</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{job.title}</div>
                              <div className="text-sm text-gray-500 line-clamp-1">
                                {job.description}
                              </div>
                              <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {job.location}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{job.category}</Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(job.budget)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(job.status)}>
                              {job.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(job.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedJob(job)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  jobActionMutation.mutate({
                                    jobId: job.id,
                                    action: 'remove'
                                  });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(dashboardStats?.totalRevenue || 0)}</div>
                  <p className="text-sm text-green-600">+12.5% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Platform Fees
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency((dashboardStats?.totalRevenue || 0) * 0.1)}</div>
                  <p className="text-sm text-gray-600">10% commission rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Pending Payouts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(2850)}</div>
                  <p className="text-sm text-yellow-600">Awaiting processing</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  Monitor all financial transactions on the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isTransactionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>#{transaction.id}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{transaction.type}</Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(transaction.status)}>
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {transaction.description}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Search support tickets..."
                  value={supportSearch}
                  onChange={(e) => setSupportSearch(e.target.value)}
                  className="w-80"
                />
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button onClick={() => refetchSupport()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Open Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {supportTickets.filter(t => t.status === 'open').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">In Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {supportTickets.filter(t => t.status === 'in_progress').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Resolved Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {supportTickets.filter(t => t.status === 'resolved').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Avg Response Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">2.3h</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Support Tickets</CardTitle>
                <CardDescription>
                  Manage customer support requests and help tickets
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSupportLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supportTickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">#{ticket.id} {ticket.title}</div>
                              <div className="text-sm text-gray-500">
                                by {ticket.userName || `User ${ticket.userId}`}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{ticket.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(ticket.status)}>
                              {ticket.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedTicket(ticket)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  supportActionMutation.mutate({
                                    ticketId: ticket.id,
                                    action: 'assign'
                                  });
                                }}
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Server Status</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">Online</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Uptime: 99.9%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Database</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">Healthy</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Response: 12ms
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">API Status</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">Operational</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Requests: 1.2K/min
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Storage</CardTitle>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">78%</div>
                  <p className="text-xs text-muted-foreground">
                    Used: 156GB / 200GB
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {systemMetrics.map((metric, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            metric.status === 'good' ? 'bg-green-500' :
                            metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <span className="text-sm font-medium">{metric.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono">{metric.value}{metric.unit}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                      <Switch id="maintenance-mode" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="new-registrations">New User Registrations</Label>
                      <Switch id="new-registrations" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="job-posting">Job Posting</Label>
                      <Switch id="job-posting" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="payments">Payment Processing</Label>
                      <Switch id="payments" defaultChecked />
                    </div>
                    <Separator />
                    <Button className="w-full" variant="outline">
                      <Settings className="h-4 w-4 mr-2" />
                      Advanced Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    User Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Generate comprehensive user activity and engagement reports
                  </p>
                  <Button className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Financial Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Export transaction history and revenue analytics
                  </p>
                  <Button className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Performance Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    System performance and usage statistics
                  </p>
                  <Button className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Custom Report Builder</CardTitle>
                <CardDescription>
                  Create custom reports with specific date ranges and filters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="report-type">Report Type</Label>
                    <select className="w-full p-2 border border-gray-300 rounded-md">
                      <option>User Activity</option>
                      <option>Financial Summary</option>
                      <option>Job Analytics</option>
                      <option>Support Metrics</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-range">Date Range</Label>
                    <select className="w-full p-2 border border-gray-300 rounded-md">
                      <option>Last 7 days</option>
                      <option>Last 30 days</option>
                      <option>Last 3 months</option>
                      <option>Custom range</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Generate & Download
                  </Button>
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* User Detail Modal */}
        {selectedUser && (
          <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>User Details: {selectedUser.fullName || selectedUser.username}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm text-gray-600">{selectedUser.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Account Type</Label>
                    <p className="text-sm text-gray-600">{selectedUser.accountType}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge className={getStatusColor(selectedUser.isActive ? 'active' : 'inactive')}>
                      {selectedUser.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Rating</Label>
                    <p className="text-sm text-gray-600">{selectedUser.rating?.toFixed(1) || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Joined</Label>
                    <p className="text-sm text-gray-600">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Last Login</Label>
                    <p className="text-sm text-gray-600">
                      {selectedUser.lastLogin ? formatDate(selectedUser.lastLogin) : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedUser(null)}>
                  Close
                </Button>
                <Button 
                  variant={selectedUser.isActive ? "destructive" : "default"}
                  onClick={() => {
                    userActionMutation.mutate({
                      userId: selectedUser.id,
                      action: selectedUser.isActive ? 'ban' : 'unban'
                    });
                    setSelectedUser(null);
                  }}
                >
                  {selectedUser.isActive ? 'Ban User' : 'Unban User'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Job Detail Modal */}
        {selectedJob && (
          <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Job Details: {selectedJob.title}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-gray-600">{selectedJob.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Category</Label>
                    <p className="text-sm text-gray-600">{selectedJob.category}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Budget</Label>
                    <p className="text-sm text-gray-600">{formatCurrency(selectedJob.budget)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge className={getStatusColor(selectedJob.status)}>
                      {selectedJob.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Location</Label>
                    <p className="text-sm text-gray-600">{selectedJob.location}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Posted</Label>
                    <p className="text-sm text-gray-600">{formatDate(selectedJob.createdAt)}</p>
                  </div>
                  {selectedJob.completedAt && (
                    <div>
                      <Label className="text-sm font-medium">Completed</Label>
                      <p className="text-sm text-gray-600">{formatDate(selectedJob.completedAt)}</p>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedJob(null)}>
                  Close
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    jobActionMutation.mutate({
                      jobId: selectedJob.id,
                      action: 'remove'
                    });
                    setSelectedJob(null);
                  }}
                >
                  Remove Job
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Support Ticket Detail Modal */}
        {selectedTicket && (
          <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Support Ticket #{selectedTicket.id}</DialogTitle>
                <DialogDescription>{selectedTicket.title}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-gray-600">{selectedTicket.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Category</Label>
                    <Badge variant="outline">{selectedTicket.category}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Priority</Label>
                    <Badge className={getPriorityColor(selectedTicket.priority)}>
                      {selectedTicket.priority}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge className={getStatusColor(selectedTicket.status)}>
                      {selectedTicket.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">User</Label>
                    <p className="text-sm text-gray-600">
                      {selectedTicket.userName || `User ${selectedTicket.userId}`}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Created</Label>
                    <p className="text-sm text-gray-600">{formatDate(selectedTicket.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Last Update</Label>
                    <p className="text-sm text-gray-600">{formatDate(selectedTicket.updatedAt)}</p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="admin-response" className="text-sm font-medium">Admin Response</Label>
                  <Textarea 
                    id="admin-response"
                    placeholder="Type your response here..."
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSelectedTicket(null)}>
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    supportActionMutation.mutate({
                      ticketId: selectedTicket.id,
                      action: 'assign'
                    });
                    setSelectedTicket(null);
                  }}
                >
                  Assign to Me
                </Button>
                <Button 
                  onClick={() => {
                    supportActionMutation.mutate({
                      ticketId: selectedTicket.id,
                      action: 'resolve'
                    });
                    setSelectedTicket(null);
                  }}
                >
                  Mark Resolved
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}