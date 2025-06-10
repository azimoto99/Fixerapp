import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Star, 
  MapPin, 
  DollarSign,
  User,
  Zap,
  Bell,
  Users,
  TrendingUp,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

interface Application {
  id: number;
  workerId: number;
  jobId: number;
  status: string;
  message: string;
  hourlyRate: number;
  expectedDuration: string;
  dateApplied: string;
  worker: {
    id: number;
    username: string;
    fullName: string;
    avatarUrl?: string;
    skills: string[];
    rating: number;
    completedJobs: number;
  };
}

interface RealTimeApplicationsDashboardProps {
  jobId: number;
  className?: string;
}

export function RealTimeApplicationsDashboard({ 
  jobId, 
  className = '' 
}: RealTimeApplicationsDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendRawMessage } = useWebSocket();
  const queryClient = useQueryClient();
  const [newApplications, setNewApplications] = useState<number[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<number | null>(null);

  // Fetch applications for the job
  const { data: applications = [], isLoading } = useQuery({
    queryKey: [`/api/applications/job/${jobId}`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/applications/job/${jobId}`);
      if (!response.ok) throw new Error('Failed to fetch applications');
      const data = await response.json();
      return data.applications || [];
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Accept application mutation
  const acceptMutation = useMutation({
    mutationFn: async (applicationId: number) => {
      const response = await apiRequest('PATCH', `/api/applications/${applicationId}/status`, {
        status: 'accepted'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to accept application');
      }
      return response.json();
    },
    onSuccess: (data, applicationId) => {
      const application = applications.find(app => app.id === applicationId);
      if (application) {
        // Send real-time notification to worker
        sendRawMessage({
          type: 'application_accepted',
          applicationId,
          workerId: application.workerId,
          jobId,
          timestamp: new Date().toISOString()
        });

        toast({
          title: "🎉 Application Accepted!",
          description: `You've selected ${application.worker.fullName} for this job!`,
          duration: 5000,
        });
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/applications/job/${jobId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Accept",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Reject application mutation
  const rejectMutation = useMutation({
    mutationFn: async (applicationId: number) => {
      const response = await apiRequest('PATCH', `/api/applications/${applicationId}/status`, {
        status: 'rejected'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reject application');
      }
      return response.json();
    },
    onSuccess: (data, applicationId) => {
      const application = applications.find(app => app.id === applicationId);
      if (application) {
        // Send real-time notification to worker
        sendRawMessage({
          type: 'application_rejected',
          applicationId,
          workerId: application.workerId,
          jobId,
          timestamp: new Date().toISOString()
        });

        toast({
          title: "Application Rejected",
          description: `Application from ${application.worker.fullName} has been rejected.`,
        });
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/applications/job/${jobId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Reject",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Listen for real-time application updates
  useEffect(() => {
    const handleWebSocketMessage = (message: any) => {
      if (message.type === 'instant_application' && message.jobId === jobId) {
        // Mark as new application
        setNewApplications(prev => [...prev, message.applicationId]);
        
        // Show notification
        toast({
          title: "⚡ New Application!",
          description: `${message.workerName} just applied for your job!`,
          duration: 6000,
        });

        // Refresh applications
        queryClient.invalidateQueries({ queryKey: [`/api/applications/job/${jobId}`] });
      }
    };

    // This would be connected to the WebSocket context
    // For now, we'll use the refetch interval
  }, [jobId, queryClient, toast]);

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const acceptedApplications = applications.filter(app => app.status === 'accepted');
  const rejectedApplications = applications.filter(app => app.status === 'rejected');

  const handleAccept = (applicationId: number) => {
    acceptMutation.mutate(applicationId);
  };

  const handleReject = (applicationId: number) => {
    rejectMutation.mutate(applicationId);
  };

  const ApplicationCard = ({ application }: { application: Application }) => {
    const isNew = newApplications.includes(application.id);
    const isSelected = selectedApplication === application.id;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`relative ${isSelected ? 'ring-2 ring-primary' : ''}`}
      >
        <Card className={`cursor-pointer transition-all hover:shadow-md ${
          isNew ? 'ring-2 ring-blue-400 shadow-lg' : ''
        }`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={application.worker.avatarUrl} />
                  <AvatarFallback>
                    {application.worker.fullName?.charAt(0) || application.worker.username?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <h4 className="font-semibold">{application.worker.fullName}</h4>
                  <p className="text-sm text-muted-foreground">@{application.worker.username}</p>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs">{application.worker.rating || 0}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {application.worker.completedJobs || 0} jobs completed
                    </span>
                  </div>
                </div>
              </div>

              {isNew && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1"
                >
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    <Zap className="h-3 w-3 mr-1" />
                    New
                  </Badge>
                </motion.div>
              )}
            </div>

            {/* Skills */}
            {application.worker.skills && application.worker.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {application.worker.skills.slice(0, 3).map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {application.worker.skills.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{application.worker.skills.length - 3} more
                  </Badge>
                )}
              </div>
            )}

            {/* Application details */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>${application.hourlyRate}/hour</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{application.expectedDuration}</span>
              </div>
            </div>

            {/* Message preview */}
            {application.message && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {application.message}
              </p>
            )}

            {/* Action buttons */}
            {application.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAccept(application.id)}
                  disabled={acceptMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button
                  onClick={() => handleReject(application.id)}
                  disabled={rejectMutation.isPending}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            )}

            {/* Status badge */}
            {application.status !== 'pending' && (
              <div className="flex justify-center">
                <Badge 
                  variant={application.status === 'accepted' ? 'default' : 'secondary'}
                  className={application.status === 'accepted' ? 'bg-green-100 text-green-800' : ''}
                >
                  {application.status === 'accepted' ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                </Badge>
              </div>
            )}

            {/* Applied time */}
            <p className="text-xs text-muted-foreground text-center mt-2">
              Applied {format(new Date(application.dateApplied), 'MMM d, h:mm a')}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Applications
            {applications.length > 0 && (
              <Badge variant="secondary">{applications.length}</Badge>
            )}
          </div>
          
          {pendingApplications.length > 0 && (
            <Badge className="bg-blue-100 text-blue-800">
              <Bell className="h-3 w-3 mr-1" />
              {pendingApplications.length} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {applications.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No applications yet</h3>
            <p className="text-sm text-muted-foreground">
              Applications will appear here in real-time as workers apply.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              <AnimatePresence>
                {pendingApplications.map((application) => (
                  <ApplicationCard key={application.id} application={application} />
                ))}
                
                {acceptedApplications.length > 0 && (
                  <div className="pt-4">
                    <h4 className="font-medium text-green-700 mb-2">Accepted</h4>
                    {acceptedApplications.map((application) => (
                      <ApplicationCard key={application.id} application={application} />
                    ))}
                  </div>
                )}
                
                {rejectedApplications.length > 0 && (
                  <div className="pt-4">
                    <h4 className="font-medium text-muted-foreground mb-2">Rejected</h4>
                    {rejectedApplications.map((application) => (
                      <ApplicationCard key={application.id} application={application} />
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
