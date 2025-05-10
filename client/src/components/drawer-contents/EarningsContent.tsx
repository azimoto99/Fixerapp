import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Earning, Job, Application, Review } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import StripeConnectSetup from '@/components/stripe/StripeConnectSetup';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { 
  Loader2, 
  ArrowUpRight, 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  Clock, 
  Calendar, 
  Award, 
  Star, 
  Download,
  CheckCircle2,
  CreditCard
} from 'lucide-react';

interface EarningsContentProps {
  userId: number;
}

const EarningsContent: React.FC<EarningsContentProps> = ({ userId }) => {
  const [timeframe, setTimeframe] = useState('all');
  
  const { data: earnings, isLoading } = useQuery<Earning[]>({
    queryKey: [`/api/earnings/worker/${userId}`],
  });
  
  const { data: jobs } = useQuery<Job[]>({
    queryKey: ['/api/jobs', { workerId: userId }],
    queryFn: async () => {
      const res = await fetch(`/api/jobs?workerId=${userId}`);
      return res.json();
    },
  });
  
  // Get reviews for the worker
  const { data: reviews } = useQuery<Review[]>({
    queryKey: [`/api/reviews/user/${userId}`],
  });
  
  // Get applications for the worker
  const { data: applications } = useQuery<Application[]>({
    queryKey: [`/api/applications/worker/${userId}`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!earnings || earnings.length === 0) {
    return (
      <div className="space-y-6">
        <StripeConnectSetup />
        
        <div className="flex flex-col items-center justify-center text-center p-8">
          <div className="bg-primary/10 rounded-full p-4 mb-4">
            <DollarSign className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No earnings yet</h3>
          <p className="text-muted-foreground text-sm">
            Complete jobs to start tracking your earnings here
          </p>
        </div>
      </div>
    );
  }

  // Calculate total and pending earnings
  const totalEarnings = earnings.reduce((acc, curr) => acc + curr.amount, 0);
  const paidEarnings = earnings
    .filter(e => e.status === 'paid')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const pendingEarnings = totalEarnings - paidEarnings;

  // Format dates for the charts
  const formatDate = (dateString: Date | string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString.toString());
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // Filter earnings by timeframe
  const getFilteredEarnings = () => {
    if (timeframe === 'all') return earnings;
    
    const now = new Date();
    let startDate = new Date();
    
    if (timeframe === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeframe === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeframe === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    }
    
    return earnings.filter(e => e.dateEarned ? new Date(e.dateEarned) >= startDate : false);
  };

  const filteredEarnings = getFilteredEarnings();
  
  // Prepare data for the bar chart
  const chartData = filteredEarnings.map(earning => ({
    date: formatDate(earning.dateEarned),
    amount: earning.amount,
    jobTitle: jobs?.find(j => j.id === earning.jobId)?.title || 'Job',
  }));

  // Status distribution for pie chart
  const statusData = [
    {
      name: 'Paid',
      value: filteredEarnings.filter(e => e.status === 'paid').length,
    },
    {
      name: 'Pending',
      value: filteredEarnings.filter(e => e.status === 'pending').length,
    },
  ];

  const COLORS = ['#0088FE', '#FFBB28'];

  // Calculate average earning
  const averageEarning = 
    filteredEarnings.length > 0 
      ? filteredEarnings.reduce((acc, curr) => acc + curr.amount, 0) / filteredEarnings.length 
      : 0;

  return (
    <div className="space-y-6">
      <StripeConnectSetup />
      
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Earnings Dashboard</h2>
        <Tabs defaultValue="all" className="w-auto">
          <TabsList>
            <TabsTrigger 
              value="week" 
              onClick={() => setTimeframe('week')}
              className={timeframe === 'week' ? 'bg-primary text-white' : ''}
            >
              Week
            </TabsTrigger>
            <TabsTrigger 
              value="month"
              onClick={() => setTimeframe('month')}
              className={timeframe === 'month' ? 'bg-primary text-white' : ''}
            >
              Month
            </TabsTrigger>
            <TabsTrigger 
              value="year"
              onClick={() => setTimeframe('year')}
              className={timeframe === 'year' ? 'bg-primary text-white' : ''}
            >
              Year
            </TabsTrigger>
            <TabsTrigger 
              value="all"
              onClick={() => setTimeframe('all')}
              className={timeframe === 'all' ? 'bg-primary text-white' : ''}
            >
              All
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Total Earnings</span>
              <div className="flex items-center space-x-1">
                <span className="text-2xl font-bold">${totalEarnings.toFixed(2)}</span>
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Pending</span>
              <div className="flex items-center space-x-1">
                <span className="text-2xl font-bold">${pendingEarnings.toFixed(2)}</span>
                <Badge variant="outline" className="ml-2">
                  {earnings.filter(e => e.status === 'pending').length} jobs
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings over time chart */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Earnings Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 20,
                  left: 20,
                  bottom: 60,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip
                  formatter={(value, name, props) => [`$${value}`, props.payload.jobTitle]}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Payment Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">Average Earning</span>
              </div>
              <span className="font-medium">${averageEarning.toFixed(2)}</span>
            </div>
            
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center">
                <Wallet className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">Completed Jobs</span>
              </div>
              <span className="font-medium">{filteredEarnings.length}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">Pending Payments</span>
              </div>
              <Badge variant="outline">
                {filteredEarnings.filter(e => e.status === 'pending').length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEarnings.slice(0, 5).map((earning, index) => {
              const job = jobs?.find(j => j.id === earning.jobId);
              return (
                <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{job?.title || 'Job'}</p>
                    <p className="text-sm text-muted-foreground">
                      {earning.dateEarned ? new Date(earning.dateEarned.toString()).toLocaleDateString() : 'No date'}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Badge variant={earning.status === 'paid' ? 'default' : 'secondary'} className="mr-2">
                      {earning.status}
                    </Badge>
                    <span className="font-semibold">${earning.amount.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EarningsContent;