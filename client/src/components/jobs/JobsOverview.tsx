import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Plus, 
  MapPin, 
  Clock, 
  DollarSign, 
  Users, 
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Filter
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Job {
  id: number;
  title: string;
  description: string;
  category: string;
  location: string;
  paymentAmount: number;
  paymentType: string;
  status: string;
  createdAt: string;
  applicationsCount: number;
  viewsCount: number;
  isUrgent: boolean;
}

interface JobsOverviewProps {
  jobs: Job[];
  isLoading: boolean;
  onJobUpdate: () => void;
  onCreateJob: () => void;
}

export default function JobsOverview({ 
  jobs, 
  isLoading, 
  onJobUpdate, 
  onCreateJob 
}: JobsOverviewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { toast } = useToast();

  const handleDeleteJob = async (jobId: number) => {
    setDeletingId(jobId);
    
    try {
      const response = await apiRequest('DELETE', `/api/jobs/${jobId}`);
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Job deleted',
          description: 'The job has been deleted successfully.',
        });
        onJobUpdate();
      } else {
        throw new Error(result.message || 'Failed to delete job');
      }
    } catch (error) {
      console.error('Delete job error:', error);
      toast({
        title: 'Failed to delete job',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'in_progress': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'in_progress': return 'In Progress';
      default: return status;
    }
  };

  const filterJobs = (status: string) => {
    let filtered = jobs;
    
    if (status !== 'all') {
      filtered = filtered.filter(job => job.status === status);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(job => 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderJobCard = (job: Job) => (
    <Card key={job.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{job.title}</h3>
              {job.isUrgent && (
                <Badge variant="destructive" className="text-xs">
                  Urgent
                </Badge>
              )}
              <Badge variant={getStatusColor(job.status)}>
                {getStatusLabel(job.status)}
              </Badge>
            </div>
            
            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
              {job.description}
            </p>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDate(job.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span>{formatCurrency(job.paymentAmount)} {job.paymentType}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-blue-600">
                <Users className="h-3 w-3" />
                <span>{job.applicationsCount} applications</span>
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <Eye className="h-3 w-3" />
                <span>{job.viewsCount} views</span>
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" />
                Edit Job
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => handleDeleteJob(job.id)}
                disabled={deletingId === job.id}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Job
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">My Jobs</h2>
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  const allJobs = filterJobs('all');
  const activeJobs = filterJobs('active');
  const completedJobs = filterJobs('completed');
  const inProgressJobs = filterJobs('in_progress');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">My Jobs</h2>
          <p className="text-muted-foreground">Manage and track your posted jobs</p>
        </div>
        <Button onClick={onCreateJob}>
          <Plus className="h-4 w-4 mr-2" />
          Post New Job
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All Jobs
            {allJobs.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {allJobs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">
            Active
            {activeJobs.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {activeJobs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            In Progress
            {inProgressJobs.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {inProgressJobs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
            {completedJobs.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {completedJobs.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {allJobs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No jobs posted yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by posting your first job to find skilled workers
                </p>
                <Button onClick={onCreateJob}>
                  <Plus className="h-4 w-4 mr-2" />
                  Post Your First Job
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {allJobs.map(renderJobCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeJobs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No active jobs</h3>
                <p className="text-muted-foreground">
                  Your active job listings will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeJobs.map(renderJobCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="in_progress" className="space-y-4">
          {inProgressJobs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No jobs in progress</h3>
                <p className="text-muted-foreground">
                  Jobs currently being worked on will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {inProgressJobs.map(renderJobCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedJobs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No completed jobs</h3>
                <p className="text-muted-foreground">
                  Your completed jobs will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {completedJobs.map(renderJobCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
