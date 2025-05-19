import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  CardFooter,
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
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Briefcase,
  CreditCard,
  Bell,
  AlertCircle,
  Shield,
  Search,
  RefreshCw,
  Settings,
  DollarSign,
  BarChart2,
  HelpCircle,
  User,
  Star,
  Calendar,
  Clock,
  FileText,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Ban,
  LockKeyhole,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AdminPanel = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Check if user is authorized to access the admin panel (only azi with ID 20)
  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to continue.",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }
    
    if (user.id !== 20) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin panel.",
        variant: "destructive"
      });
      navigate('/');
    }
  }, [user, navigate, toast]);

  // Dashboard stats query
  const { 
    data: dashboardStats, 
    isLoading: isLoadingStats,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/stats');
      if (!res.ok) {
        throw new Error('Failed to fetch admin stats');
      }
      return res.json();
    }
  });

  // Users query
  const { 
    data: users, 
    isLoading: isLoadingUsers,
    refetch: refetchUsers
  } = useQuery({
    queryKey: ['/api/admin/users', { search: searchQuery }],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/users${searchQuery ? `?search=${searchQuery}` : ''}`);
      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }
      return res.json();
    }
  });

  // Jobs query
  const { 
    data: jobs, 
    isLoading: isLoadingJobs,
    refetch: refetchJobs
  } = useQuery({
    queryKey: ['/api/admin/jobs', { search: searchQuery }],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/jobs${searchQuery ? `?search=${searchQuery}` : ''}`);
      if (!res.ok) {
        throw new Error('Failed to fetch jobs');
      }
      return res.json();
    }
  });

  // Payments query
  const { 
    data: payments, 
    isLoading: isLoadingPayments,
    refetch: refetchPayments
  } = useQuery({
    queryKey: ['/api/admin/payments', { search: searchQuery }],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/payments${searchQuery ? `?search=${searchQuery}` : ''}`);
      if (!res.ok) {
        throw new Error('Failed to fetch payments');
      }
      return res.json();
    }
  });

  // System status query
  const { 
    data: systemStatus, 
    isLoading: isLoadingSystem,
    refetch: refetchSystem
  } = useQuery({
    queryKey: ['/api/admin/system'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/system');
      if (!res.ok) {
        throw new Error('Failed to fetch system status');
      }
      return res.json();
    }
  });

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'users') refetchUsers();
    if (activeTab === 'jobs') refetchJobs();
    if (activeTab === 'payments') refetchPayments();
  };

  // State for confirmation dialogs
  const [confirmationState, setConfirmationState] = useState<{
    open: boolean;
    userId?: number;
    username?: string;
    action?: string;
    title: string;
    description: string;
    dangerous: boolean;
  }>({
    open: false,
    title: '',
    description: '',
    dangerous: false
  });
  
  // Open confirmation dialog for actions that need confirmation
  const openConfirmation = (userId: number, action: string, username: string) => {
    let title = 'Confirm Action';
    let description = `Are you sure you want to perform this action?`;
    let dangerous = false;
    
    if (action === 'delete') {
      title = 'Delete User';
      description = `Are you sure you want to permanently delete the user "${username}"? This action cannot be undone.`;
      dangerous = true;
    } else if (action === 'reset-password') {
      title = 'Reset Password';
      description = `Are you sure you want to reset the password for user "${username}"? They will need to create a new password.`;
      dangerous = false;
    } else if (action === 'deactivate') {
      title = 'Deactivate User';
      description = `Are you sure you want to deactivate user "${username}"? They will no longer be able to access the platform.`;
      dangerous = false;
    }
    
    setConfirmationState({
      open: true,
      userId,
      username,
      action,
      title,
      description,
      dangerous
    });
  };
  
  // Close confirmation dialog
  const closeConfirmation = () => {
    setConfirmationState({
      ...confirmationState,
      open: false
    });
  };

  // Execute the confirmed action
  const executeUserAction = async () => {
    if (!confirmationState.userId || !confirmationState.action) return;
    
    const userId = confirmationState.userId;
    const action = confirmationState.action;
    
    try {
      const res = await apiRequest('POST', '/api/admin/users/action', {
        userId,
        action
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Action failed');
      }

      toast({
        title: 'Success',
        description: `User action "${action}" completed successfully`,
      });

      // Close the confirmation dialog
      closeConfirmation();
      
      // Refresh user data
      refetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to perform action',
        variant: 'destructive',
      });
      
      // Keep the dialog open on error
      setConfirmationState({
        ...confirmationState,
        description: `Error: ${error.message || 'Unknown error occurred'}`
      });
    }
  };
  
  // Handle user actions - determines whether to show confirmation or execute directly
  const handleUserAction = (userId: number, action: string, username: string) => {
    // Actions that require confirmation
    if (['delete', 'reset-password', 'deactivate'].includes(action)) {
      openConfirmation(userId, action, username);
    } else {
      // Actions that can be executed immediately
      executeAction(userId, action);
    }
  };
  
  // Direct execution for actions that don't need confirmation
  const executeAction = async (userId: number, action: string) => {
    try {
      const res = await apiRequest('POST', '/api/admin/users/action', {
        userId,
        action
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Action failed');
      }

      toast({
        title: 'Success',
        description: `User action "${action}" completed successfully`,
      });

      refetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to perform action',
        variant: 'destructive',
      });
    }
  };

  // Handle job actions
  const handleJobAction = async (jobId: number, action: string) => {
    try {
      const res = await apiRequest('POST', '/api/admin/jobs/action', {
        jobId,
        action
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Action failed');
      }

      toast({
        title: 'Success',
        description: `Job action "${action}" completed successfully`,
      });

      refetchJobs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to perform action',
        variant: 'destructive',
      });
    }
  };

  // Handle payment actions
  const handlePaymentAction = async (paymentId: number, action: string) => {
    try {
      const res = await apiRequest('POST', '/api/admin/payments/action', {
        paymentId,
        action
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Action failed');
      }

      toast({
        title: 'Success',
        description: `Payment action "${action}" completed successfully`,
      });

      refetchPayments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to perform action',
        variant: 'destructive',
      });
    }
  };

  // Format status badges
  const PaymentStatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500">Processing</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'refunded':
        return <Badge className="bg-amber-500">Refunded</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6">
      {/* Confirmation Dialog */}
      <AlertDialog open={confirmationState.open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmationState.dangerous && <AlertTriangle className="h-5 w-5 text-red-500" />}
              {confirmationState.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationState.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeConfirmation}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeUserAction}
              className={confirmationState.dangerous ? "bg-red-600 hover:bg-red-700" : ""}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
      
      <Tabs defaultValue="dashboard" onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* User Count Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{dashboardStats?.userCount || 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {isLoadingStats ? (
                    <Skeleton className="h-4 w-24" />
                  ) : (
                    <>+{dashboardStats?.newUserCount || 0} in the last 30 days</>
                  )}
                </p>
              </CardContent>
            </Card>

            {/* Jobs Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{dashboardStats?.activeJobs || 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {isLoadingStats ? (
                    <Skeleton className="h-4 w-24" />
                  ) : (
                    <>{dashboardStats?.completedJobs || 0} completed this month</>
                  )}
                </p>
              </CardContent>
            </Card>

            {/* Revenue Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">${dashboardStats?.revenue?.toFixed(2) || '0.00'}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {isLoadingStats ? (
                    <Skeleton className="h-4 w-24" />
                  ) : (
                    <>+${dashboardStats?.revenueGrowth?.toFixed(2) || '0.00'} from last month</>
                  )}
                </p>
              </CardContent>
            </Card>

            {/* System Status Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${systemStatus?.healthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm font-medium">{systemStatus?.healthy ? 'Healthy' : 'Issues Detected'}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {isLoadingStats ? (
                    <Skeleton className="h-4 w-24" />
                  ) : (
                    <>Last checked: {new Date().toLocaleTimeString()}</>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Activity */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest actions across the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <div className="space-y-2">
                    {Array(5).fill(0).map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : dashboardStats?.recentActivity && dashboardStats.recentActivity.length > 0 ? (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4">
                      {dashboardStats.recentActivity.map((activity: any, i: number) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="rounded-full w-8 h-8 flex items-center justify-center bg-muted">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm">{activity.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Clock className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Platform Metrics */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Platform Metrics</CardTitle>
                <CardDescription>Performance indicators for your platform</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <div className="space-y-4">
                    {Array(4).fill(0).map((_, i) => (
                      <div key={i} className="space-y-1">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Job Completion Rate</span>
                        <span className="font-medium">{dashboardStats?.jobCompletionRate || 0}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary rounded-full h-2" 
                          style={{ width: `${dashboardStats?.jobCompletionRate || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Average Job Value</span>
                        <span className="font-medium">${dashboardStats?.averageJobValue?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-blue-500 rounded-full h-2" 
                          style={{ width: `${Math.min((dashboardStats?.averageJobValue || 0) / 100 * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Worker Application Rate</span>
                        <span className="font-medium">{dashboardStats?.applicationSuccessRate || 0}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-green-500 rounded-full h-2" 
                          style={{ width: `${dashboardStats?.applicationSuccessRate || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Platform Service Fee</span>
                        <span className="font-medium">${dashboardStats?.serviceFeeTotal?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-amber-500 rounded-full h-2" 
                          style={{ width: `${Math.min((dashboardStats?.serviceFeeTotal || 0) / 500 * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">User Management</h2>
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-[200px]"
              />
              <Button type="submit" size="sm" variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingUsers ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : users && users.length > 0 ? (
                    users.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                              {user.fullName?.charAt(0) || user.username?.charAt(0) || '?'}
                            </div>
                            <div>
                              <div className="font-medium">{user.fullName || user.username}</div>
                              <div className="text-xs text-muted-foreground">@{user.username}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.accountType === 'worker' ? 'default' : 'secondary'}>
                            {user.accountType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'outline' : 'destructive'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => window.open(`/user/${user.id}`, '_blank')}>
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleUserAction(user.id, user.isActive ? 'deactivate' : 'activate', user.username)}>
                                {user.isActive ? 'Deactivate User' : 'Activate User'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUserAction(user.id, 'verify', user.username)}>
                                Verify Identity
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleUserAction(user.id, 'reset-password', user.username)}
                                className="text-amber-600 dark:text-amber-400"
                              >
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleUserAction(user.id, 'delete', user.username)}
                                className="text-red-600 dark:text-red-400"
                              >
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Users className="h-8 w-8 mb-2 opacity-50" />
                          <p>No users found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Job Management</h2>
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-[200px]"
              />
              <Button type="submit" size="sm" variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Posted By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingJobs ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : jobs && jobs.length > 0 ? (
                    jobs.map((job: any) => (
                      <TableRow key={job.id}>
                        <TableCell>{job.id}</TableCell>
                        <TableCell className="font-medium">{job.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{job.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              job.status === 'open' ? 'default' : 
                              job.status === 'in_progress' ? 'secondary' : 
                              job.status === 'completed' ? 'outline' : 
                              'destructive'
                            }
                          >
                            {job.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{job.posterName}</TableCell>
                        <TableCell>{new Date(job.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => window.open(`/job/${job.id}`, '_blank')}>
                                View Job
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleJobAction(job.id, 'feature')}>
                                Feature Job
                              </DropdownMenuItem>
                              {job.status === 'open' && (
                                <DropdownMenuItem onClick={() => handleJobAction(job.id, 'close')}>
                                  Close Job
                                </DropdownMenuItem>
                              )}
                              {job.status !== 'open' && (
                                <DropdownMenuItem onClick={() => handleJobAction(job.id, 'reopen')}>
                                  Reopen Job
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleJobAction(job.id, 'delete')}
                                className="text-red-600 dark:text-red-400"
                              >
                                Delete Job
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Briefcase className="h-8 w-8 mb-2 opacity-50" />
                          <p>No jobs found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Payment Management</h2>
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <Input
                placeholder="Search payments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-[200px]"
              />
              <Button type="submit" size="sm" variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingPayments ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : payments && payments.length > 0 ? (
                    payments.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.id}</TableCell>
                        <TableCell className="font-medium">{payment.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {payment.type}
                          </Badge>
                        </TableCell>
                        <TableCell>${payment.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <PaymentStatusBadge status={payment.status} />
                        </TableCell>
                        <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handlePaymentAction(payment.id, 'view')}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {payment.status === 'pending' && (
                                <DropdownMenuItem onClick={() => handlePaymentAction(payment.id, 'process')}>
                                  Process Manually
                                </DropdownMenuItem>
                              )}
                              {payment.status === 'processing' && (
                                <DropdownMenuItem onClick={() => handlePaymentAction(payment.id, 'complete')}>
                                  Mark as Completed
                                </DropdownMenuItem>
                              )}
                              {['completed', 'processing'].includes(payment.status) && (
                                <DropdownMenuItem 
                                  onClick={() => handlePaymentAction(payment.id, 'refund')}
                                  className="text-amber-600 dark:text-amber-400"
                                >
                                  Issue Refund
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handlePaymentAction(payment.id, 'delete')}
                                className="text-red-600 dark:text-red-400"
                              >
                                Delete Record
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <CreditCard className="h-8 w-8 mb-2 opacity-50" />
                          <p>No payments found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">System Status</h2>
            <Button onClick={() => refetchSystem()} size="sm" variant="outline" className="gap-1">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Current status of system components</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSystem ? (
                  <div className="space-y-4">
                    {Array(4).fill(0).map((_, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ))}
                  </div>
                ) : systemStatus?.components ? (
                  <div className="space-y-4">
                    {Object.entries(systemStatus.components).map(([key, value]: [string, any]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="font-medium">{formatSystemComponent(key)}</span>
                        <Badge variant={value.status === 'ok' ? 'default' : 'destructive'}>
                          {value.status === 'ok' ? 'Healthy' : 'Issue'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">System status information unavailable</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* API Status */}
            <Card>
              <CardHeader>
                <CardTitle>External Services</CardTitle>
                <CardDescription>Status of connected services</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSystem ? (
                  <div className="space-y-4">
                    {Array(4).fill(0).map((_, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ))}
                  </div>
                ) : systemStatus?.services ? (
                  <div className="space-y-4">
                    {Object.entries(systemStatus.services).map(([key, value]: [string, any]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="font-medium">{formatServiceName(key)}</span>
                        <Badge variant={value.connected ? 'default' : 'outline'}>
                          {value.connected ? 'Connected' : 'Disconnected'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">Service status information unavailable</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Environment Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Environment Configuration</CardTitle>
              <CardDescription>Server and application configuration</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSystem ? (
                <div className="space-y-4">
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  ))}
                </div>
              ) : systemStatus?.config ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(systemStatus.config).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{formatConfigKey(key)}</span>
                      <span className="text-sm font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Settings className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">Configuration information unavailable</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper functions
const getActivityIcon = (type: string) => {
  switch (type) {
    case 'user':
      return <User className="h-4 w-4 text-blue-500" />;
    case 'job':
      return <Briefcase className="h-4 w-4 text-green-500" />;
    case 'payment':
      return <DollarSign className="h-4 w-4 text-amber-500" />;
    case 'system':
      return <Settings className="h-4 w-4 text-purple-500" />;
    case 'notification':
      return <Bell className="h-4 w-4 text-red-500" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const formatSystemComponent = (key: string) => {
  const componentNames: Record<string, string> = {
    'database': 'Database',
    'redis': 'Redis Cache',
    'server': 'Web Server',
    'queue': 'Task Queue',
    'storage': 'File Storage'
  };
  
  return componentNames[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

const formatServiceName = (key: string) => {
  const serviceNames: Record<string, string> = {
    'stripe': 'Stripe Payments',
    'mapbox': 'Mapbox',
    'aws': 'AWS',
    'smtp': 'Email Service'
  };
  
  return serviceNames[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

const formatConfigKey = (key: string) => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ');
};

export default AdminPanel;