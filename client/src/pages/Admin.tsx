import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  AlertTriangle, 
  Shield,
  TrendingUp,
  Activity,
  Settings,
  Eye,
  Ban,
  Edit,
  Search,
  Filter,
  MoreHorizontal,
  UserX,
  UserCheck,
  Flag,
  CheckCircle,
  XCircle,
  Clock,
  Bell,
  Send,
  FileText,
  Calendar,
  Download,
  Zap,
  MessageSquare,
  BarChart3,
  PieChart,
  Wallet,
  CreditCard,
  Ticket,
  Mail,
  Globe,
  Database,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  RefreshCw,
  Plus,
  Minus,
  Home,
  LineChart,
  Target,
  Award,
  Star,
  MapPin,
  Phone,
  Lock,
  Unlock,
  Key,
  Trash2,
  Archive,
  AlertCircle,
  CheckCircle2,
  XOctagon,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Share2,
  Copy,
  ExternalLink,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

// Admin Analytics Dashboard Component
function AnalyticsDashboard() {
  const { data: analytics } = useQuery({
    queryKey: ['/api/admin/analytics'],
  });

  const { data: users } = useQuery({
    queryKey: ['/api/admin/users/stats'],
  });

  const { data: jobs } = useQuery({
    queryKey: ['/api/admin/jobs/stats'],
  });

  const { data: financial } = useQuery({
    queryKey: ['/api/admin/financial/stats'],
  });

  const stats = [
    {
      title: "Total Users",
      value: dashboardStats?.totalUsers || 0,
      change: dashboardStats?.todaySignups || 0,
      icon: Users,
      color: "text-blue-600",
      subtitle: "registered users"
    },
    {
      title: "Active Jobs",
      value: dashboardStats?.activeJobs || 0,
      change: dashboardStats?.todayJobs || 0,
      icon: Briefcase,
      color: "text-green-600",
      subtitle: "open positions"
    },
    {
      title: "Platform Revenue",
      value: `$${(dashboardStats?.totalRevenue || 0).toLocaleString()}`,
      change: financialData?.monthlyRevenue || 0,
      icon: DollarSign,
      color: "text-purple-600",
      subtitle: "total earnings"
    },
    {
      title: "Pending Reports",
      value: dashboardStats?.pendingReports || 0,
      change: 0,
      icon: AlertTriangle,
      color: "text-orange-600",
      subtitle: "need attention"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className={`text-xs ${stat.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change >= 0 ? '+' : ''}{stat.change}% from yesterday
                  </p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Real-time Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-time Platform Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm">New job posted: "House Cleaning in Downtown"</span>
              </div>
              <span className="text-xs text-muted-foreground">2 min ago</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm">User Sarah K. completed lawn mowing job</span>
              </div>
              <span className="text-xs text-muted-foreground">5 min ago</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm">Payment processed: $125.00</span>
              </div>
              <span className="text-xs text-muted-foreground">8 min ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// User Management Component
function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: users, refetch } = useQuery({
    queryKey: ['/api/admin/users', searchTerm, statusFilter],
  });

  const handleUserAction = async (userId: number, action: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        refetch(); // Refresh user list
      }
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Status: {statusFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Users</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("active")}>Active</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("banned")}>Banned</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("pending")}>Pending Review</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Account Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Jobs Completed</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users && users.length > 0 ? users.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>{user.fullName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.fullName}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.accountType === 'worker' ? 'default' : 'secondary'}>
                      {user.accountType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'destructive'}>
                      {user.isActive ? 'Active' : 'Banned'}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.completedJobs || 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      ⭐ {user.rating?.toFixed(1) || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleUserAction(user.id, 'view')}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUserAction(user.id, 'edit')}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        {user.isActive ? (
                          <DropdownMenuItem 
                            onClick={() => handleUserAction(user.id, 'ban')}
                            className="text-red-600"
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Ban User
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => handleUserAction(user.id, 'unban')}
                            className="text-green-600"
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Unban User
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Moderation Queue Component
function ModerationQueue() {
  const { data: reports } = useQuery({
    queryKey: ['/api/admin/reports'],
  });

  const { data: alerts } = useQuery({
    queryKey: ['/api/admin/alerts'],
  });

  return (
    <div className="space-y-6">
      {/* System Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts && alerts.length > 0 ? alerts.map((alert: any) => (
              <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`h-5 w-5 ${
                    alert.severity === 'critical' ? 'text-red-500' :
                    alert.severity === 'high' ? 'text-orange-500' :
                    'text-yellow-500'
                  }`} />
                  <div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={alert.isResolved ? 'default' : 'destructive'}>
                    {alert.isResolved ? 'Resolved' : 'Active'}
                  </Badge>
                  <Button size="sm" variant="outline">
                    {alert.isResolved ? 'View' : 'Resolve'}
                  </Button>
                </div>
              </div>
            )) : (
              <p className="text-center py-8 text-muted-foreground">No active alerts</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-500" />
            User Reports Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reports && reports.length > 0 ? reports.map((report: any) => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Flag className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium">{report.category}</p>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Reported by: {report.reporterName} • {new Date(report.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    report.priority === 'critical' ? 'destructive' :
                    report.priority === 'high' ? 'secondary' : 'outline'
                  }>
                    {report.priority}
                  </Badge>
                  <Button size="sm" variant="outline">
                    Review
                  </Button>
                </div>
              </div>
            )) : (
              <p className="text-center py-8 text-muted-foreground">No pending reports</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Admin Dashboard
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Comprehensive platform management and oversight</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-600 border-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
              System Online
            </Badge>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
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
            <TabsTrigger value="moderation" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Moderation
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="communications" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Communications
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Automation
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="jobs">
            <Card>
              <CardContent className="p-6">
                <p className="text-center">Job Management section coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial">
            <Card>
              <CardContent className="p-6">
                <p className="text-center">Financial Overview section coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="moderation">
            <ModerationQueue />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationCenter />
          </TabsContent>

          <TabsContent value="communications">
            <BulkCommunications />
          </TabsContent>

          <TabsContent value="reports">
            <AdvancedReports />
          </TabsContent>

          <TabsContent value="automation">
            <PolicyAutomation />
          </TabsContent>

          <TabsContent value="system">
            <SystemMonitoring />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Enhanced Notification Center Component
function NotificationCenter() {
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [alertSettings, setAlertSettings] = useState({
    criticalAlerts: true,
    userReports: true,
    systemIssues: true,
    paymentAlerts: true,
    securityAlerts: true
  });
  const { toast } = useToast();

  const notifications = [
    {
      id: 1,
      type: "critical",
      title: "High Dispute Volume Alert",
      message: "Dispute rate increased by 25% in the last 24 hours",
      timestamp: "2 minutes ago",
      priority: "critical"
    },
    {
      id: 2,
      type: "warning", 
      title: "Payment Processing Delay",
      message: "Stripe processing delays detected for 3 users",
      timestamp: "15 minutes ago",
      priority: "high"
    },
    {
      id: 3,
      type: "info",
      title: "Daily Platform Report",
      message: "24-hour summary: 45 new jobs, 32 completions",
      timestamp: "1 hour ago",
      priority: "normal"
    }
  ];

  const updateAlertSettings = useMutation({
    mutationFn: async (settings: typeof alertSettings) => {
      return apiRequest("POST", "/api/admin/notification-settings", settings);
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Notification preferences saved successfully"
      });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Notification Center</h2>
        <Button onClick={() => updateAlertSettings.mutate(alertSettings)}>
          <Settings className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alert Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alert Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(alertSettings).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <Label htmlFor={key} className="text-sm font-medium">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </Label>
                <Switch
                  id={key}
                  checked={value}
                  onCheckedChange={(checked) => 
                    setAlertSettings(prev => ({ ...prev, [key]: checked }))
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div key={notification.id} 
                     className={`p-4 rounded-lg border-l-4 ${
                       notification.priority === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                       notification.priority === 'high' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                       'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                     }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{notification.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {notification.message}
                      </p>
                    </div>
                    <Badge variant={
                      notification.priority === 'critical' ? 'destructive' :
                      notification.priority === 'high' ? 'secondary' : 'default'
                    }>
                      {notification.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{notification.timestamp}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Bulk Communications Component
function BulkCommunications() {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [messageType, setMessageType] = useState("announcement");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const sendBulkMessage = useMutation({
    mutationFn: async (data: { userType: string; message: string; subject: string }) => {
      return apiRequest("POST", "/api/admin/bulk-message", data);
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Bulk communication sent successfully"
      });
      setMessage("");
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Bulk Communications</h2>
        <Button 
          onClick={() => sendBulkMessage.mutate({
            userType: selectedUsers.join(','),
            message,
            subject: `${messageType} - Platform Update`
          })}
          disabled={!message || selectedUsers.length === 0}
        >
          <Send className="h-4 w-4 mr-2" />
          Send Message
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Composer */}
        <Card>
          <CardHeader>
            <CardTitle>Compose Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="messageType">Message Type</Label>
              <Select value={messageType} onValueChange={setMessageType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">Platform Announcement</SelectItem>
                  <SelectItem value="maintenance">Maintenance Notice</SelectItem>
                  <SelectItem value="policy">Policy Update</SelectItem>
                  <SelectItem value="marketing">Marketing Campaign</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="message">Message Content</Label>
              <Textarea
                id="message"
                placeholder="Enter your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={10}
              />
            </div>
          </CardContent>
        </Card>

        {/* Audience Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Audience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { id: "all-users", label: "All Users", count: "1,234" },
              { id: "workers", label: "Workers Only", count: "856" },
              { id: "job-posters", label: "Job Posters Only", count: "378" },
              { id: "premium-users", label: "Premium Users", count: "89" },
              { id: "inactive-users", label: "Inactive Users (30+ days)", count: "156" }
            ].map((audience) => (
              <div key={audience.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={audience.id}
                  checked={selectedUsers.includes(audience.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUsers(prev => [...prev, audience.id]);
                    } else {
                      setSelectedUsers(prev => prev.filter(id => id !== audience.id));
                    }
                  }}
                  className="rounded"
                />
                <Label htmlFor={audience.id} className="flex-1">
                  {audience.label}
                </Label>
                <Badge variant="outline">{audience.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Advanced Reports Component
function AdvancedReports() {
  const [dateRange, setDateRange] = useState("last-30-days");
  const [reportType, setReportType] = useState("revenue");
  const { toast } = useToast();

  const generateReport = useMutation({
    mutationFn: async (params: { type: string; dateRange: string }) => {
      return apiRequest("POST", "/api/admin/generate-report", params);
    },
    onSuccess: () => {
      toast({
        title: "Report Generated",
        description: "Your custom report has been generated successfully"
      });
    }
  });

  const reports = [
    {
      name: "Revenue Analysis",
      description: "Detailed breakdown of platform revenue and trends",
      lastGenerated: "2 hours ago",
      type: "revenue"
    },
    {
      name: "User Growth Report",
      description: "User acquisition, retention, and engagement metrics",
      lastGenerated: "1 day ago", 
      type: "users"
    },
    {
      name: "Job Performance Analytics",
      description: "Job completion rates, categories, and success metrics",
      lastGenerated: "3 hours ago",
      type: "jobs"
    },
    {
      name: "Financial Reconciliation",
      description: "Payment processing, disputes, and financial health",
      lastGenerated: "6 hours ago",
      type: "financial"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Advanced Reports</h2>
        <Button 
          onClick={() => generateReport.mutate({ type: reportType, dateRange })}
          disabled={generateReport.isPending}
        >
          <FileText className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Generator */}
        <Card>
          <CardHeader>
            <CardTitle>Custom Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Revenue Analysis</SelectItem>
                  <SelectItem value="users">User Analytics</SelectItem>
                  <SelectItem value="jobs">Job Performance</SelectItem>
                  <SelectItem value="financial">Financial Report</SelectItem>
                  <SelectItem value="compliance">Compliance Audit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dateRange">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                  <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                  <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                  <SelectItem value="last-year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={() => generateReport.mutate({ type: reportType, dateRange })}
              className="w-full"
              disabled={generateReport.isPending}
            >
              {generateReport.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate & Download
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Available Reports */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Available Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports.map((report, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">{report.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {report.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Last generated: {report.lastGenerated}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Policy Automation Component  
function PolicyAutomation() {
  const [autoModeration, setAutoModeration] = useState(true);
  const [autoRefunds, setAutoRefunds] = useState(false);
  const [autoSuspension, setAutoSuspension] = useState(true);
  const { toast } = useToast();

  const updatePolicySettings = useMutation({
    mutationFn: async (settings: any) => {
      return apiRequest("POST", "/api/admin/policy-settings", settings);
    },
    onSuccess: () => {
      toast({
        title: "Policies Updated",
        description: "Automation settings saved successfully"
      });
    }
  });

  const automationRules = [
    {
      name: "Auto-Suspend Repeat Offenders",
      description: "Automatically suspend users with 3+ violations in 30 days",
      enabled: true,
      lastTriggered: "2 hours ago"
    },
    {
      name: "Auto-Refund Disputes",
      description: "Process refunds automatically for disputes under $50",
      enabled: false,
      lastTriggered: "Never"
    },
    {
      name: "Content Moderation",
      description: "Auto-flag inappropriate content using AI detection",
      enabled: true,
      lastTriggered: "15 minutes ago"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Policy Automation</h2>
        <Button 
          onClick={() => updatePolicySettings.mutate({
            autoModeration,
            autoRefunds,
            autoSuspension
          })}
        >
          <Zap className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Automation Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Automation Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Auto Moderation</Label>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Automatically review and flag suspicious content
                </p>
              </div>
              <Switch
                checked={autoModeration}
                onCheckedChange={setAutoModeration}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Auto Refunds</Label>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Process small dispute refunds automatically
                </p>
              </div>
              <Switch
                checked={autoRefunds}
                onCheckedChange={setAutoRefunds}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Auto Suspension</Label>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Suspend accounts with multiple violations
                </p>
              </div>
              <Switch
                checked={autoSuspension}
                onCheckedChange={setAutoSuspension}
              />
            </div>
          </CardContent>
        </Card>

        {/* Active Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Automation Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {automationRules.map((rule, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold flex items-center gap-2">
                        {rule.name}
                        <Badge variant={rule.enabled ? "default" : "secondary"}>
                          {rule.enabled ? "Active" : "Disabled"}
                        </Badge>
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {rule.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Last triggered: {rule.lastTriggered}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>Edit Rule</DropdownMenuItem>
                        <DropdownMenuItem>View Logs</DropdownMenuItem>
                        <DropdownMenuItem>
                          {rule.enabled ? "Disable" : "Enable"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// System Monitoring Component
function SystemMonitoring() {
  const systemMetrics = [
    { name: "API Response Time", value: "145ms", status: "good", trend: "+2%" },
    { name: "Database Connections", value: "23/100", status: "good", trend: "-5%" },
    { name: "Memory Usage", value: "67%", status: "warning", trend: "+12%" },
    { name: "Error Rate", value: "0.2%", status: "good", trend: "-8%" },
    { name: "Active Sessions", value: "1,234", status: "good", trend: "+15%" },
    { name: "Storage Usage", value: "2.3TB", status: "good", trend: "+3%" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">System Monitoring</h2>
        <Badge variant="outline" className="text-green-600">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          All Systems Operational
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {systemMetrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {metric.name}
                  </p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      metric.status === "good" ? "default" :
                      metric.status === "warning" ? "secondary" : "destructive"
                    }
                  >
                    {metric.status}
                  </Badge>
                  <p className={`text-sm mt-1 ${
                    metric.trend.startsWith("+") ? "text-green-600" : "text-red-600"
                  }`}>
                    {metric.trend}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent System Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { time: "2:45 PM", event: "Database backup completed successfully", type: "info" },
              { time: "1:30 PM", event: "High memory usage detected on server-2", type: "warning" },
              { time: "12:15 PM", event: "Payment gateway connection restored", type: "success" },
              { time: "11:45 AM", event: "Scheduled maintenance completed", type: "info" }
            ].map((event, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className={`w-3 h-3 rounded-full ${
                  event.type === "success" ? "bg-green-500" :
                  event.type === "warning" ? "bg-yellow-500" :
                  event.type === "error" ? "bg-red-500" : "bg-blue-500"
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm">{event.event}</p>
                  <p className="text-xs text-gray-500">{event.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}