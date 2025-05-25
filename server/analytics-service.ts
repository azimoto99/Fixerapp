import { storage } from './storage';

interface AnalyticsMetrics {
  userGrowth: {
    totalUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
    growthRate: number;
    retentionRate: number;
  };
  jobMetrics: {
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
    completionRate: number;
    averageJobValue: number;
    topCategories: Array<{ category: string; count: number; revenue: number }>;
  };
  financialMetrics: {
    totalRevenue: number;
    monthlyRevenue: number;
    platformFees: number;
    averageTransactionValue: number;
    revenueGrowth: number;
    paymentSuccess: number;
  };
  platformUsage: {
    dailyActiveUsers: number;
    monthlyActiveUsers: number;
    peakUsageHours: Array<{ hour: number; users: number }>;
    geographicDistribution: Array<{ location: string; users: number }>;
    deviceTypes: { mobile: number; desktop: number; tablet: number };
  };
  systemHealth: {
    uptime: number;
    averageResponseTime: number;
    errorRate: number;
    activeConnections: number;
    databaseHealth: 'healthy' | 'warning' | 'critical';
  };
}

interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

class AnalyticsService {
  async getComprehensiveAnalytics(startDate?: Date, endDate?: Date): Promise<AnalyticsMetrics> {
    const end = endDate || new Date();
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    const [users, jobs, payments, earnings] = await Promise.all([
      storage.getAllUsers(),
      storage.getAllJobs(),
      storage.getAllPayments(),
      storage.getAllEarnings()
    ]);

    // Filter data by date range
    const filteredUsers = users.filter(user => {
      const userDate = user.createdAt || new Date(user.datePosted || 0);
      return userDate >= start && userDate <= end;
    });

    const filteredJobs = jobs.filter(job => {
      const jobDate = job.createdAt || new Date(job.datePosted || 0);
      return jobDate >= start && jobDate <= end;
    });

    const filteredPayments = payments.filter(payment => {
      const paymentDate = payment.createdAt || new Date();
      return paymentDate >= start && paymentDate <= end;
    });

    return {
      userGrowth: this.calculateUserGrowth(users, filteredUsers),
      jobMetrics: this.calculateJobMetrics(jobs, filteredJobs),
      financialMetrics: this.calculateFinancialMetrics(payments, filteredPayments, earnings),
      platformUsage: this.calculatePlatformUsage(users, jobs),
      systemHealth: this.calculateSystemHealth()
    };
  }

  private calculateUserGrowth(allUsers: any[], periodUsers: any[]) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const newUsersToday = allUsers.filter(user => {
      const userDate = user.createdAt || new Date(user.datePosted || 0);
      return userDate >= todayStart;
    }).length;

    const newUsersThisWeek = allUsers.filter(user => {
      const userDate = user.createdAt || new Date(user.datePosted || 0);
      return userDate >= weekStart;
    }).length;

    const newUsersThisMonth = allUsers.filter(user => {
      const userDate = user.createdAt || new Date(user.datePosted || 0);
      return userDate >= monthStart;
    }).length;

    const newUsersLastMonth = allUsers.filter(user => {
      const userDate = user.createdAt || new Date(user.datePosted || 0);
      return userDate >= lastMonthStart && userDate <= lastMonthEnd;
    }).length;

    const growthRate = newUsersLastMonth > 0 
      ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100 
      : 0;

    // Calculate retention rate (users who were active in last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = allUsers.filter(user => {
      const lastActive = user.lastActive ? new Date(user.lastActive) : new Date(user.datePosted || 0);
      return lastActive >= thirtyDaysAgo;
    }).length;

    const retentionRate = allUsers.length > 0 ? (activeUsers / allUsers.length) * 100 : 0;

    return {
      totalUsers: allUsers.length,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      growthRate: Math.round(growthRate * 100) / 100,
      retentionRate: Math.round(retentionRate * 100) / 100
    };
  }

  private calculateJobMetrics(allJobs: any[], periodJobs: any[]) {
    const activeJobs = allJobs.filter(job => job.status === 'open' || job.status === 'in_progress');
    const completedJobs = allJobs.filter(job => job.status === 'completed');
    
    const completionRate = allJobs.length > 0 
      ? (completedJobs.length / allJobs.length) * 100 
      : 0;

    const totalValue = periodJobs.reduce((sum, job) => sum + (job.paymentAmount || 0), 0);
    const averageJobValue = periodJobs.length > 0 ? totalValue / periodJobs.length : 0;

    // Calculate top categories
    const categoryStats = allJobs.reduce((acc, job) => {
      const category = job.category || 'Other';
      if (!acc[category]) {
        acc[category] = { count: 0, revenue: 0 };
      }
      acc[category].count++;
      acc[category].revenue += job.paymentAmount || 0;
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    const topCategories = Object.entries(categoryStats)
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalJobs: allJobs.length,
      activeJobs: activeJobs.length,
      completedJobs: completedJobs.length,
      completionRate: Math.round(completionRate * 100) / 100,
      averageJobValue: Math.round(averageJobValue * 100) / 100,
      topCategories
    };
  }

  private calculateFinancialMetrics(allPayments: any[], periodPayments: any[], earnings: any[]) {
    const completedPayments = allPayments.filter(p => p.status === 'completed');
    const periodCompletedPayments = periodPayments.filter(p => p.status === 'completed');
    
    const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const monthlyRevenue = periodCompletedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const platformFees = completedPayments.reduce((sum, p) => sum + (p.serviceFee || 0), 0);
    
    const averageTransactionValue = completedPayments.length > 0 
      ? totalRevenue / completedPayments.length 
      : 0;

    // Calculate growth rate
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const lastMonthPayments = allPayments.filter(p => {
      const paymentDate = p.createdAt || new Date();
      return paymentDate >= lastMonthStart && paymentDate <= lastMonthEnd && p.status === 'completed';
    });
    
    const lastMonthRevenue = lastMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const revenueGrowth = lastMonthRevenue > 0 
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    const paymentSuccess = allPayments.length > 0 
      ? (completedPayments.length / allPayments.length) * 100 
      : 0;

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      platformFees: Math.round(platformFees * 100) / 100,
      averageTransactionValue: Math.round(averageTransactionValue * 100) / 100,
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      paymentSuccess: Math.round(paymentSuccess * 100) / 100
    };
  }

  private calculatePlatformUsage(users: any[], jobs: any[]) {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dailyActiveUsers = users.filter(user => {
      const lastActive = user.lastActive ? new Date(user.lastActive) : new Date(user.datePosted || 0);
      return lastActive >= dayAgo;
    }).length;

    const monthlyActiveUsers = users.filter(user => {
      const lastActive = user.lastActive ? new Date(user.lastActive) : new Date(user.datePosted || 0);
      return lastActive >= monthAgo;
    }).length;

    // Generate peak usage hours (simulated based on typical patterns)
    const peakUsageHours = Array.from({ length: 24 }, (_, hour) => {
      // Simulate peak hours: 9-11 AM, 2-4 PM, 7-9 PM
      let baseUsers = dailyActiveUsers * 0.02; // 2% base activity per hour
      
      if ((hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16) || (hour >= 19 && hour <= 21)) {
        baseUsers *= 3; // Peak hours
      } else if (hour >= 22 || hour <= 6) {
        baseUsers *= 0.3; // Low activity hours
      }
      
      return {
        hour,
        users: Math.round(baseUsers)
      };
    });

    // Geographic distribution based on job locations
    const locationStats = jobs.reduce((acc, job) => {
      const location = job.location || 'Unknown';
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const geographicDistribution = Object.entries(locationStats)
      .map(([location, users]) => ({ location, users }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 10);

    // Device types (simulated based on typical web app usage)
    const deviceTypes = {
      mobile: Math.round(dailyActiveUsers * 0.6), // 60% mobile
      desktop: Math.round(dailyActiveUsers * 0.35), // 35% desktop
      tablet: Math.round(dailyActiveUsers * 0.05) // 5% tablet
    };

    return {
      dailyActiveUsers,
      monthlyActiveUsers,
      peakUsageHours,
      geographicDistribution,
      deviceTypes
    };
  }

  private calculateSystemHealth() {
    // In a real implementation, these would come from actual monitoring systems
    return {
      uptime: 99.8, // percentage
      averageResponseTime: 145, // milliseconds
      errorRate: 0.2, // percentage
      activeConnections: 42,
      databaseHealth: 'healthy' as const
    };
  }

  async getTimeSeriesData(metric: string, startDate: Date, endDate: Date): Promise<TimeSeriesData[]> {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const data: TimeSeriesData[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      // Get actual data for this date
      let value = 0;
      
      switch (metric) {
        case 'users':
          const users = await storage.getAllUsers();
          value = users.filter(user => {
            const userDate = new Date(user.createdAt || user.datePosted || 0);
            return userDate.toDateString() === date.toDateString();
          }).length;
          break;
          
        case 'jobs':
          const jobs = await storage.getAllJobs();
          value = jobs.filter(job => {
            const jobDate = new Date(job.createdAt || job.datePosted || 0);
            return jobDate.toDateString() === date.toDateString();
          }).length;
          break;
          
        case 'revenue':
          const payments = await storage.getAllPayments();
          value = payments
            .filter(payment => {
              const paymentDate = new Date(payment.createdAt || 0);
              return paymentDate.toDateString() === date.toDateString() && payment.status === 'completed';
            })
            .reduce((sum, payment) => sum + (payment.amount || 0), 0);
          break;
          
        default:
          value = Math.random() * 100; // Fallback
      }
      
      data.push({
        date: dateStr,
        value: Math.round(value * 100) / 100
      });
    }

    return data;
  }

  async generateReport(type: 'summary' | 'detailed', format: 'json' | 'csv', startDate?: Date, endDate?: Date) {
    const analytics = await this.getComprehensiveAnalytics(startDate, endDate);
    
    if (format === 'csv') {
      return this.generateCSVReport(analytics, type);
    }
    
    return {
      generatedAt: new Date().toISOString(),
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      },
      type,
      data: type === 'summary' ? this.getSummaryData(analytics) : analytics
    };
  }

  private generateCSVReport(analytics: AnalyticsMetrics, type: string): string {
    const headers = ['Metric', 'Value', 'Category'];
    const rows = [headers.join(',')];

    // Add user metrics
    rows.push(`Total Users,${analytics.userGrowth.totalUsers},User Growth`);
    rows.push(`New Users Today,${analytics.userGrowth.newUsersToday},User Growth`);
    rows.push(`Growth Rate,${analytics.userGrowth.growthRate}%,User Growth`);
    rows.push(`Retention Rate,${analytics.userGrowth.retentionRate}%,User Growth`);

    // Add job metrics
    rows.push(`Total Jobs,${analytics.jobMetrics.totalJobs},Job Metrics`);
    rows.push(`Completion Rate,${analytics.jobMetrics.completionRate}%,Job Metrics`);
    rows.push(`Average Job Value,$${analytics.jobMetrics.averageJobValue},Job Metrics`);

    // Add financial metrics
    rows.push(`Total Revenue,$${analytics.financialMetrics.totalRevenue},Financial`);
    rows.push(`Monthly Revenue,$${analytics.financialMetrics.monthlyRevenue},Financial`);
    rows.push(`Platform Fees,$${analytics.financialMetrics.platformFees},Financial`);

    return rows.join('\n');
  }

  private getSummaryData(analytics: AnalyticsMetrics) {
    return {
      userGrowth: {
        totalUsers: analytics.userGrowth.totalUsers,
        growthRate: analytics.userGrowth.growthRate,
        retentionRate: analytics.userGrowth.retentionRate
      },
      jobPerformance: {
        totalJobs: analytics.jobMetrics.totalJobs,
        completionRate: analytics.jobMetrics.completionRate,
        averageValue: analytics.jobMetrics.averageJobValue
      },
      financial: {
        totalRevenue: analytics.financialMetrics.totalRevenue,
        monthlyRevenue: analytics.financialMetrics.monthlyRevenue,
        revenueGrowth: analytics.financialMetrics.revenueGrowth
      },
      systemHealth: analytics.systemHealth
    };
  }
}

export const analyticsService = new AnalyticsService();