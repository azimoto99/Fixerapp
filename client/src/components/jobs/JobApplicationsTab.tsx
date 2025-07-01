import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCheck, X, User, MessageCircle, Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface JobApplicationsTabProps {
  applications: any[];
  jobId: number;
}

const JobApplicationsTab: React.FC<JobApplicationsTabProps> = ({ applications, jobId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingApplicationId, setProcessingApplicationId] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState<'date' | 'rating' | 'hourlyRate'>('date');

  const sortedApplications = React.useMemo(() => {
    const apps = [...applications];
    switch (sortOption) {
      case 'rating':
        return apps.sort((a, b) => (b.worker?.rating || 0) - (a.worker?.rating || 0));
      case 'hourlyRate':
        return apps.sort((a, b) => (b.hourlyRate || 0) - (a.hourlyRate || 0));
      default:
        return apps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [applications, sortOption]);

  // Handle application actions (accept/reject)
  const handleApplicationAction = (applicationId: number, status: 'accepted' | 'rejected') => {
    setProcessingApplicationId(applicationId);
    
    updateApplicationMutation.mutate({ applicationId, status });
  };

  // Update application status
  const updateApplicationMutation = useMutation({
    mutationFn: async ({ applicationId, status }: { applicationId: number, status: 'accepted' | 'rejected' }) => {
      const response = await apiRequest('PATCH', `/api/applications/${applicationId}`, {
        status
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${status === 'accepted' ? 'accept' : 'reject'} application`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Updated",
        description: "Application status has been updated successfully",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId, 'applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId] });
      
      setProcessingApplicationId(null);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: error.message,
      });
      setProcessingApplicationId(null);
    }
  });

  // Get application badge class
  const getApplicationClass = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  if (!applications || applications.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
          <User className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">No Applications Yet</h3>
        <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
          No one has applied to this job yet. Applications will appear here when workers apply.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Applications ({applications.length})</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Select value={sortOption} onValueChange={(val: 'date' | 'rating' | 'hourlyRate') => setSortOption(val)}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Recent</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
              <SelectItem value="hourlyRate">Hourly Rate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {sortedApplications.map((application) => (
        <div 
          key={application.id} 
          className="application-card transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10 border">
                <AvatarImage src={application.worker?.profileImage} alt={application.worker?.username} />
                <AvatarFallback>{application.worker?.username?.charAt(0)?.toUpperCase() || 'W'}</AvatarFallback>
              </Avatar>
              
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: application.workerId } }))}
                      className="hover:underline text-left"
                    >
                      {application.worker?.fullName || application.worker?.username || 'Worker'}
                    </button>
                  </h4>
                  <Badge className={getApplicationClass(application.status)}>
                    {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    <span>{application.expectedDuration}</span>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <DollarSign className="h-3.5 w-3.5 mr-1" />
                    <span>${application.hourlyRate}/hr</span>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <MessageCircle className="h-3.5 w-3.5 mr-1" />
                    <span>Applied {format(new Date(application.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                
                {application.message && (
                  <p className="text-sm mt-2 text-muted-foreground">
                    {application.message}
                  </p>
                )}
              </div>
            </div>
            
            {application.status === 'pending' && (
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-green-200 hover:border-green-300 hover:bg-green-50 transition-colors"
                  onClick={() => handleApplicationAction(application.id, 'accepted')}
                  disabled={processingApplicationId === application.id}
                >
                  {processingApplicationId === application.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4 text-green-500 mr-1" />
                  )}
                  <span>Accept</span>
                </Button>
                
                <Button 
                  size="sm" 
                  variant="outline"
                  className="border-red-200 hover:border-red-300 hover:bg-red-50 transition-colors"
                  onClick={() => handleApplicationAction(application.id, 'rejected')}
                  disabled={processingApplicationId === application.id}
                >
                  {processingApplicationId === application.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span>Reject</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default JobApplicationsTab;