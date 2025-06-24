import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Briefcase,
  Clock,
  Calendar,
  Target,
  Award,
  DollarSign
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function EnterpriseAnalytics({ businessId }: { businessId: number }) {
  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/enterprise/analytics', businessId],
    queryFn: async () => {
      // Mock data for now - replace with actual API call
      return {
        applicationTrends: [
          { month: 'Jan', applications: 45, hires: 12 },
          { month: 'Feb', applications: 52, hires: 15 },
          { month: 'Mar', applications: 48, hires: 14 },
          { month: 'Apr', applications: 61, hires: 18 },
          { month: 'May', applications: 55, hires: 16 },
          { month: 'Jun', applications: 67, hires: 20 }
        ],
        positionPerformance: [
          { position: 'Software Engineer', applications: 89, avgTimeToHire: 12 },
          { position: 'Designer', applications: 45, avgTimeToHire: 8 },
          { position: 'Product Manager', applications: 34, avgTimeToHire: 15 },
          { position: 'Sales Rep', applications: 67, avgTimeToHire: 7 }
        ],
        applicationStatus: [
          { name: 'Pending', value: 24, color: '#FFBB28' },
          { name: 'Under Review', value: 18, color: '#0088FE' },
          { name: 'Accepted', value: 15, color: '#00C49F' },
          { name: 'Rejected', value: 8, color: '#FF8042' }
        ],
        topMetrics: {
          totalApplications: 234,
          acceptanceRate: 23,
          avgTimeToHire: 11,
          activePositions: 12
        }
      };
    },
    enabled: !!businessId
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.topMetrics.totalApplications}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.topMetrics.acceptanceRate}%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+2%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time to Hire</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.topMetrics.avgTimeToHire} days</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600">+2 days</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.topMetrics.activePositions}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-blue-600">2 new</span> this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Application Trends</CardTitle>
            <CardDescription>Monthly applications and hires</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics?.applicationTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="applications" stroke="#8884d8" name="Applications" />
                <Line type="monotone" dataKey="hires" stroke="#82ca9d" name="Hires" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Application Status */}
        <Card>
          <CardHeader>
            <CardTitle>Application Status</CardTitle>
            <CardDescription>Current status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics?.applicationStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics?.applicationStatus.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Position Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Position Performance</CardTitle>
          <CardDescription>Applications and hiring metrics by position</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics?.positionPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="position" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="applications" fill="#8884d8" name="Applications" />
              <Bar dataKey="avgTimeToHire" fill="#82ca9d" name="Avg. Time to Hire (days)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">🎯 Top Performing Position</h4>
            <p className="text-sm text-blue-800">
              "Software Engineer" has the highest application rate with an average of 89 applications per posting.
            </p>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">⚡ Fastest Hiring</h4>
            <p className="text-sm text-green-800">
              "Sales Rep" positions have the fastest average hiring time at 7 days.
            </p>
          </div>

          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h4 className="font-semibold text-orange-900 mb-2">💡 Improvement Opportunity</h4>
            <p className="text-sm text-orange-800">
              Consider reviewing "Product Manager" requirements - it has a longer average hiring time of 15 days.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 