import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Star, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MessageSquare,
  Eye,
  Filter
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Application {
  id: number;
  jobId: number;
  workerId: number;
  workerName: string;
  workerRating: number;
  status: string;
  dateApplied: string;
  hourlyRate?: number;
  message?: string;
  job: {
    id: number;
    title: string;
    paymentAmount: number;
  };
}

interface ApplicationsManagerProps {
  applications: Application[];
  isLoading: boolean;
  onApplicationUpdate: () => void;
}

export default function ApplicationsManager({ 
  applications, 
  isLoading, 
  onApplicationUpdate 
}: ApplicationsManagerProps) {
  const [activeTab, setActiveTab] = useState('pending');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const { toast } = useToast();

  const handleApplicationAction = async (applicationId: number, action: 'accept' | 'reject') => {
    setProcessingId(applicationId);
    
    try {
      const response = await apiRequest('PUT', `/api/applications/${applicationId}`, {
        status: action === 'accept' ? 'accepted' : 'rejected'
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: `Application ${action}ed`,
          description: `The application has been ${action}ed successfully.`,
        });
        onApplicationUpdate();
      } else {
        throw new Error(result.message || `Failed to ${action} application`);
      }
    } catch (error) {
      console.error(`Application ${action} error:`, error);
      toast({
        title: `Failed to ${action} application`,
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'accepted': return 'default';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const filterApplications = (status: string) => {
    return applications.filter(app => app.status === status);
  };

  const renderApplicationCard = (application: Application) => (
    <Card key={application.id} className="mb-4">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <Avatar className="h-12 w-12">
              <AvatarImage src={`/api/avatars/${application.workerId}`} />
              <AvatarFallback>
                {application.workerName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold">{application.workerName}</h3>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{application.workerRating}</span>
                </div>
                <Badge variant={getStatusColor(application.status)}>
                  {application.status}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Applied to: <span className="font-medium">{application.job.title}</span>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(application.dateApplied).toLocaleDateString()}</span>
                  </div>
                  {application.hourlyRate && (
                    <div>
                      Proposed rate: <span className="font-medium">${application.hourlyRate}/hour</span>
                    </div>
                  )}
                </div>
                
                {application.message && (
                  <div className="mt-3 p-3 bg-muted rounded-lg">
                    <p className="text-sm italic">"{application.message}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {application.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleApplicationAction(application.id, 'accept')}
                  disabled={processingId === application.id}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplicationAction(application.id, 'reject')}
                  disabled={processingId === application.id}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Decline
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm">
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Applications</CardTitle>
          <CardDescription>Loading applications...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingApplications = filterApplications('pending');
  const acceptedApplications = filterApplications('accepted');
  const rejectedApplications = filterApplications('rejected');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Job Applications</h2>
          <p className="text-muted-foreground">Review and manage applications to your jobs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pending
            {pendingApplications.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingApplications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Accepted
            {acceptedApplications.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {acceptedApplications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected
            {rejectedApplications.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {rejectedApplications.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingApplications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No pending applications</h3>
                <p className="text-muted-foreground">
                  New applications will appear here when workers apply to your jobs
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingApplications.map(renderApplicationCard)
          )}
        </TabsContent>

        <TabsContent value="accepted" className="space-y-4">
          {acceptedApplications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No accepted applications</h3>
                <p className="text-muted-foreground">
                  Applications you accept will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            acceptedApplications.map(renderApplicationCard)
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedApplications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No rejected applications</h3>
                <p className="text-muted-foreground">
                  Applications you decline will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            rejectedApplications.map(renderApplicationCard)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
