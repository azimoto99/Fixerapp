import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Check,
  X,
  Loader2,
  User,
  Clock,
  DollarSign,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface JobApplicationsTabProps {
  applications: any[];
  jobId: number;
}

const JobApplicationsTab: React.FC<JobApplicationsTabProps> = ({ applications, jobId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingApplicationId, setProcessingApplicationId] = React.useState<number | null>(null);

  // Handle application actions (accept/reject)
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
    onSuccess: (_, variables) => {
      const status = variables.status;
      toast({
        title: status === 'accepted' ? 'Application Accepted' : 'Application Rejected',
        description: status === 'accepted' 
          ? 'Worker has been notified and assigned to the job' 
          : 'Worker has been notified of the rejection',
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

  const handleApplicationAction = (applicationId: number, status: 'accepted' | 'rejected') => {
    setProcessingApplicationId(applicationId);
    updateApplicationMutation.mutate({ applicationId, status });
  };

  const getApplicationClass = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  if (applications.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <User className="h-12 w-12 mx-auto mb-2 opacity-20" />
        <p>No applications yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {applications.map((app) => (
        <Card key={app.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={app.worker?.profileImage || ''} alt={`Worker #${app.workerId}`} />
                    <AvatarFallback>{app.worker?.username?.[0] || app.workerId}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {app.worker?.username || `Worker #${app.workerId}`}
                    </div>
                    <Badge variant="outline" className={getApplicationClass(app.status)}>
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                {app.status === 'pending' && (
                  <div className="flex items-center space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                      onClick={() => handleApplicationAction(app.id, 'accepted')}
                      disabled={!!processingApplicationId}
                    >
                      {processingApplicationId === app.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Accept
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => handleApplicationAction(app.id, 'rejected')}
                      disabled={!!processingApplicationId}
                    >
                      {processingApplicationId === app.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 mr-1" />
                      )}
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-4 text-sm">
              <div>
                <div className="flex items-center text-muted-foreground mb-1">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>Duration</span>
                </div>
                <div className="font-medium">{app.expectedDuration || 'Not specified'}</div>
              </div>
              
              <div>
                <div className="flex items-center text-muted-foreground mb-1">
                  <DollarSign className="h-3 w-3 mr-1" />
                  <span>Rate</span>
                </div>
                <div className="font-medium">${app.hourlyRate?.toFixed(2) || 'Not specified'}</div>
              </div>
              
              <div>
                <div className="flex items-center text-muted-foreground mb-1">
                  <MessageCircle className="h-3 w-3 mr-1" />
                  <span>Message</span>
                </div>
                <div className="font-medium">{app.message || 'No message'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default JobApplicationsTab;