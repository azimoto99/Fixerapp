import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Earning, Job } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';

interface EarningsSummaryChartProps {
  earnings: (Earning & { job?: Job })[];
  isLoading: boolean;
}

type ChartPeriod = 'week' | 'month' | 'year';

const EarningsSummaryChart: React.FC<EarningsSummaryChartProps> = ({ earnings, isLoading }) => {
  const [period, setPeriod] = useState<ChartPeriod>('month');
  
  // Generate chart data based on period
  const chartData = useMemo(() => {
    if (!earnings?.length) return [];
    
    const now = new Date();
    let dataMap: Record<string, { name: string; value: number }> = {};
    
    // Define period settings
    let days: number;
    let groupByFormat: (date: Date) => string;
    let formatter: (label: string) => string;
    
    switch (period) {
      case 'week':
        days = 7;
        groupByFormat = (date) => date.toLocaleDateString('en-US', { weekday: 'short' });
        formatter = (label) => label; // Keep day name
        break;
      case 'month':
        days = 30;
        groupByFormat = (date) => date.toLocaleDateString('en-US', { day: '2-digit' });
        formatter = (label) => `Day ${label}`;
        break;
      case 'year':
        days = 365;
        groupByFormat = (date) => date.toLocaleDateString('en-US', { month: 'short' });
        formatter = (label) => label; // Keep month name
        break;
    }
    
    // Initialize periods with zero values
    const periodStart = new Date();
    periodStart.setDate(now.getDate() - days);
    
    if (period === 'week') {
      // Initialize all days of the week
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
        dataMap[day] = { name: day, value: 0 };
      });
    } else if (period === 'month') {
      // Initialize all days of the month (simplified to 30 days)
      for (let i = 1; i <= 30; i++) {
        const day = i.toString().padStart(2, '0');
        dataMap[day] = { name: `Day ${i}`, value: 0 };
      }
    } else if (period === 'year') {
      // Initialize all months
      ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].forEach(month => {
        dataMap[month] = { name: month, value: 0 };
      });
    }
    
    // Sum earnings by period
    earnings.forEach(earning => {
      if (!earning.dateEarned) return;
      
      const earnDate = new Date(earning.dateEarned);
      // Skip if before period start
      if (earnDate < periodStart) return;
      
      const group = groupByFormat(earnDate);
      if (!dataMap[group]) {
        dataMap[group] = { name: formatter(group), value: 0 };
      }
      
      dataMap[group].value += earning.amount;
    });
    
    // Convert to array and sort for proper display
    let result: { name: string; value: number }[] = Object.values(dataMap);
    
    if (period === 'week') {
      // Sort by day of week (Sunday first)
      const dayOrder = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
      result.sort((a, b) => dayOrder[a.name as keyof typeof dayOrder] - dayOrder[b.name as keyof typeof dayOrder]);
    } else if (period === 'month') {
      // Sort by day number
      result.sort((a, b) => {
        const dayA = parseInt(a.name.replace('Day ', ''));
        const dayB = parseInt(b.name.replace('Day ', ''));
        return dayA - dayB;
      });
    } else if (period === 'year') {
      // Sort by month
      const monthOrder = { 
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 
      };
      result.sort((a, b) => monthOrder[a.name as keyof typeof monthOrder] - monthOrder[b.name as keyof typeof monthOrder]);
    }
    
    return result;
  }, [earnings, period]);
  
  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-md p-2 shadow-md text-sm">
          <p className="font-medium">{label}</p>
          <p className="text-primary">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };
  
  // Get total for this period
  const periodTotal = chartData.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Earnings Summary</CardTitle>
            <CardDescription>
              Your earnings over time
            </CardDescription>
          </div>
          <Tabs 
            value={period} 
            onValueChange={(value) => setPeriod(value as ChartPeriod)}
            className="mt-2 md:mt-0"
          >
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !earnings?.length ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No earnings data available</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                Total for this {period}: 
                <span className="font-medium text-foreground ml-1">
                  {formatCurrency(periodTotal)}
                </span>
              </p>
            </div>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 5, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ strokeOpacity: 0.2 }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${value}`}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ strokeOpacity: 0.2 }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EarningsSummaryChart;