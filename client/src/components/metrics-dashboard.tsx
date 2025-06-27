import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface MetricsData {
  cpu: {
    usage: number;
    cores: number;
    load: number[];
  };
  memory: {
    used: number;
    total: number;
    cache: number;
    swap: number;
  };
  network: {
    activeConnections: number;
    inbound: number;
    outbound: number;
  };
  storage: {
    used: number;
    total: number;
    iops: number;
  };
  services: {
    database: {
      status: 'healthy' | 'warning' | 'critical';
      responseTime: number;
      connections: number;
    };
    api: {
      status: 'healthy' | 'warning' | 'critical';
      uptime: number;
      requests: number;
      avgResponse: number;
    };
    cache: {
      status: 'healthy' | 'warning' | 'critical';
      hitRate: number;
      size: number;
    };
  };
  errorRate: number;
  timestamp: string;
}

export function MetricsDashboard() {
  const [metrics, setMetrics] = React.useState<MetricsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();

  const fetchMetrics = React.useCallback(async () => {
    try {
      const res = await apiRequest('GET', '/api/admin/system/performance');
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const data = await res.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch system metrics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (loading || !metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-24" />
          </Card>
        ))}
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>CPU Usage</CardTitle>
          <CardDescription>Current processor utilization</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={metrics.cpu.usage} className="w-full" />
          <p className="mt-2 text-2xl font-bold">{metrics.cpu.usage}%</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Memory</CardTitle>
          <CardDescription>RAM usage</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={metrics.memory.percentage} className="w-full" />
          <p className="mt-2 text-2xl font-bold">{metrics.memory.percentage}%</p>
          <p className="text-sm text-muted-foreground">
            {metrics.memory.used}MB / {metrics.memory.total}MB
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Connections</CardTitle>
          <CardDescription>Current user sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{metrics.activeConnections}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Error Rate</CardTitle>
          <CardDescription>Last 5 minutes</CardDescription>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${metrics.errorRate > 5 ? 'text-red-500' : 'text-green-500'}`}>
            {metrics.errorRate.toFixed(2)}%
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Service Health</CardTitle>
          <CardDescription>Real-time service status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(metrics.services).map(([service, data]) => (
              <div key={service} className="flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize">{service}</p>
                  <p className="text-sm text-muted-foreground">
                    {data.responseTime ? `${data.responseTime}ms` : `${data.uptime}% uptime`}
                  </p>
                </div>
                <span className={`font-medium ${getStatusColor(data.status)}`}>
                  {data.status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
