import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  Mail,
  Phone,
  MapPin,
  Star,
  DollarSign,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Application {
  id: number;
  status: 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn';
  coverLetter?: string;
  expectedSalary?: number;
  availableStartDate?: string;
  createdAt: string;
  position: {
    id: number;
    title: string;
  };
  applicant: {
    id: number;
    fullName: string;
    email: string;
    phone?: string;
    skills?: string[];
    rating?: number;
  };
}

export default function ApplicationsManager({ businessId }: { businessId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [reviewingApplication, setReviewingApplication] = useState<Application | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Fetch applications
  const { data: applications, isLoading } = useQuery({
    queryKey: ['/api/enterprise/applications', businessId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/enterprise/applications?businessId=${businessId}`);
      if (!res.ok) throw new Error('Failed to fetch applications');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!businessId
  });

  // Update application status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const res = await apiRequest('PUT', `/api/enterprise/applications/${id}/status`, { status, notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/applications'] });
      setReviewingApplication(null);
      setReviewNotes('');
      toast({
        title: 'Application Updated',
        description: 'The application status has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update application',
        variant: 'destructive'
      });
    }
  });

  const filteredApplications = applications?.filter((app: Application) => 
    selectedStatus === 'all' || app.status === selectedStatus
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'reviewing': return 'bg-blue-100 text-blue-800';
      case 'withdrawn': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'reviewing': return <Eye className="h-4 w-4 text-blue-600" />;
      default: return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const handleStatusUpdate = (status: string) => {
    if (!reviewingApplication) return;
    
    updateStatusMutation.mutate({
      id: reviewingApplication.id,
      status,
      notes: reviewNotes || undefined
    });
  };

  const ApplicationCard = ({ application }: { application: Application }) => (
    <Card className="mb-4">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {application.applicant.fullName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{application.applicant.fullName}</h3>
              <p className="text-sm text-muted-foreground mb-1">
                Applied for: {application.position.title}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(new Date(application.createdAt), 'MMM d, yyyy')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(application.status)}>
              {getStatusIcon(application.status)}
              <span className="ml-1 capitalize">{application.status}</span>
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReviewingApplication(application)}
            >
              Review
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-3 w-3 text-muted-foreground" />
              {application.applicant.email}
            </div>
            {application.applicant.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3 w-3 text-muted-foreground" />
                {application.applicant.phone}
              </div>
            )}
            {application.applicant.rating && (
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-3 w-3 text-yellow-500" />
                {application.applicant.rating}/5 rating
              </div>
            )}
          </div>
          <div className="space-y-2">
            {application.expectedSalary && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                Expected: ${application.expectedSalary.toLocaleString()}
              </div>
            )}
            {application.availableStartDate && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                Available: {format(new Date(application.availableStartDate), 'MMM d, yyyy')}
              </div>
            )}
          </div>
        </div>

        {application.applicant.skills && application.applicant.skills.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Skills</h4>
            <div className="flex flex-wrap gap-1">
              {application.applicant.skills.map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {application.coverLetter && (
          <div>
            <h4 className="text-sm font-medium mb-2">Cover Letter</h4>
            <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
              {application.coverLetter}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Applications</h2>
          <p className="text-muted-foreground">
            {filteredApplications.length} applications
          </p>
        </div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Applications</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewing">Under Review</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Applications list */}
      {filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Applications Yet</h3>
            <p className="text-muted-foreground">
              {selectedStatus === 'all' 
                ? "You haven't received any applications yet."
                : `No ${selectedStatus} applications found.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div>
          {filteredApplications.map((application: Application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
      )}

      {/* Review dialog */}
      <Dialog open={!!reviewingApplication} onOpenChange={() => setReviewingApplication(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Application</DialogTitle>
            <DialogDescription>
              Review and update the status of this application.
            </DialogDescription>
          </DialogHeader>

          {reviewingApplication && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {reviewingApplication.applicant.fullName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{reviewingApplication.applicant.fullName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {reviewingApplication.position.title}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Review Notes (Optional)
                </label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about this applicant..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleStatusUpdate('accepted')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={updateStatusMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept
                </Button>
                <Button
                  onClick={() => handleStatusUpdate('rejected')}
                  variant="destructive"
                  disabled={updateStatusMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleStatusUpdate('reviewing')}
                  variant="outline"
                  disabled={updateStatusMutation.isPending}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Mark as Reviewing
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 
