import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';

interface AdminStats {
  total_users: number;
  active_jobs: number;
  total_revenue: number;
  pending_disputes: number;
  daily_signups: number;
  daily_jobs: number;
  completed_jobs: number;
  platform_health: string;
  avg_response_time: number;
  active_sessions: number;
}

interface AdminUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  accountType: string;
  isActive: boolean;
  lastActive: string;
  stats: {
    jobsPosted: number;
    jobsCompleted: number;
    avgRating: number | null;
  };
}

interface AdminJob {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  paymentAmount: number;
  location: string;
  datePosted: string;
  posterName: string;
  workerName: string | null;
}

interface AdminTransaction {
  id: number;
  amount: number;
  type: string;
  status: string;
  userId: number;
  jobId: number | null;
  createdAt: string;
  description: string;
}

interface SupportTicket {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  userId: number;
  assignedTo: number | null;
  createdAt: string;
  updatedAt: string;
  userName: string;
  category: string;
}

export function useAdminSystem() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is admin
  const isAdmin = user?.isAdmin === true || user?.id === 20; // User 20 (azi) is verified admin

  // Get dashboard stats
  const { data: dashboardStats, isLoading: loadingStats } = useQuery({
    queryKey: ['/api/admin/dashboard-stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/dashboard-stats');
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      return await response.json();
    },
    enabled: isAdmin,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Get all users
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/users');
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Failed to read error response text');
        throw new Error(`Failed to fetch users: ${response.status} ${response.statusText} - ${errorText}`);
      }
      return await response.json();
    },
    enabled: isAdmin
  });

  // Get all jobs
  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['/api/admin/jobs'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/jobs');
      if (!response.ok) throw new Error('Failed to fetch jobs');
      return await response.json();
    },
    enabled: isAdmin
  });

  // Get transactions
  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ['/api/admin/transactions'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/transactions');
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return await response.json();
    },
    enabled: isAdmin
  });

  // Get support tickets
  const { data: supportTickets = [], isLoading: loadingSupport } = useQuery({
    queryKey: ['/api/admin/support'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/support');
      if (!response.ok) throw new Error('Failed to fetch support tickets');
      return await response.json();
    },
    enabled: isAdmin
  });

  // Get system metrics
  const { data: systemMetrics = [], isLoading: loadingMetrics } = useQuery({
    queryKey: ['/api/admin/system-metrics'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/system-metrics');
      if (!response.ok) throw new Error('Failed to fetch system metrics');
      return await response.json();
    },
    enabled: isAdmin,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // User management actions
  const banUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: number; reason?: string }) => {
      const response = await apiRequest('POST', `/api/admin/users/${userId}/ban`, { reason });
      if (!response.ok) throw new Error('Failed to ban user');
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "User banned successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to ban user", description: error.message, variant: "destructive" });
    }
  });

  const unbanUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: number; reason?: string }) => {
      const response = await apiRequest('POST', `/api/admin/users/${userId}/unban`, { reason });
      if (!response.ok) throw new Error('Failed to unban user');
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "User unbanned successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to unban user", description: error.message, variant: "destructive" });
    }
  });

  const verifyUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest('POST', `/api/admin/users/${userId}/verify`);
      if (!response.ok) throw new Error('Failed to verify user');
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "User verified successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to verify user", description: error.message, variant: "destructive" });
    }
  });

  // Job management actions
  const removeJobMutation = useMutation({
    mutationFn: async ({ jobId, reason }: { jobId: number; reason?: string }) => {
      const response = await apiRequest('POST', `/api/admin/jobs/${jobId}/remove`, { reason });
      if (!response.ok) throw new Error('Failed to remove job');
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Job removed successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/jobs'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove job", description: error.message, variant: "destructive" });
    }
  });

  const featureJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const response = await apiRequest('POST', `/api/admin/jobs/${jobId}/feature`);
      if (!response.ok) throw new Error('Failed to feature job');
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Job featured successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/jobs'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to feature job", description: error.message, variant: "destructive" });
    }
  });

  // Support ticket actions
  const assignTicketMutation = useMutation({
    mutationFn: async ({ ticketId, adminId, note }: { ticketId: number; adminId: number; note?: string }) => {
      const response = await apiRequest('POST', `/api/admin/support/${ticketId}/assign`, { adminId, note });
      if (!response.ok) throw new Error('Failed to assign ticket');
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Ticket assigned successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign ticket", description: error.message, variant: "destructive" });
    }
  });

  const resolveTicketMutation = useMutation({
    mutationFn: async ({ ticketId, note }: { ticketId: number; note?: string }) => {
      const response = await apiRequest('POST', `/api/admin/support/${ticketId}/resolve`, { note });
      if (!response.ok) throw new Error('Failed to resolve ticket');
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Ticket resolved successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to resolve ticket", description: error.message, variant: "destructive" });
    }
  });

  const closeTicketMutation = useMutation({
    mutationFn: async ({ ticketId, note }: { ticketId: number; note?: string }) => {
      const response = await apiRequest('POST', `/api/admin/support/${ticketId}/close`, { note });
      if (!response.ok) throw new Error('Failed to close ticket');
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Ticket closed successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to close ticket", description: error.message, variant: "destructive" });
    }
  });

  // System health check
  const { data: systemHealth } = useQuery({
    queryKey: ['/api/admin/system-health'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/system-health');
      if (!response.ok) throw new Error('Failed to fetch system health');
      return await response.json();
    },
    enabled: isAdmin,
    refetchInterval: 15000 // Check every 15 seconds
  });

  return {
    // Access control
    isAdmin,
    
    // Data
    dashboardStats,
    users,
    jobs,
    transactions,
    supportTickets,
    systemMetrics,
    systemHealth,
    
    // Loading states
    loadingStats,
    loadingUsers,
    loadingJobs,
    loadingTransactions,
    loadingSupport,
    loadingMetrics,
    
    // User actions
    banUser: banUserMutation.mutate,
    unbanUser: unbanUserMutation.mutate,
    verifyUser: verifyUserMutation.mutate,
    
    // Job actions
    removeJob: removeJobMutation.mutate,
    featureJob: featureJobMutation.mutate,
    
    // Support actions
    assignTicket: assignTicketMutation.mutate,
    resolveTicket: resolveTicketMutation.mutate,
    closeTicket: closeTicketMutation.mutate,
    
    // Mutation states
    banUserMutation,
    unbanUserMutation,
    verifyUserMutation,
    removeJobMutation,
    featureJobMutation,
    assignTicketMutation,
    resolveTicketMutation,
    closeTicketMutation
  };
}
