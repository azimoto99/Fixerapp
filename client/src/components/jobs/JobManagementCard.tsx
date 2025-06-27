import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Job } from '@/types';
import { MapPin, DollarSign, Calendar, Eye, Edit, Trash2 } from 'lucide-react';

interface JobManagementCardProps {
  job: Job;
  onView?: (job: Job) => void;
  onEdit?: (job: Job) => void;
  onDelete?: (job: Job) => void;
}

export default function JobManagementCard({ 
  job, 
  onView, 
  onEdit, 
  onDelete 
}: JobManagementCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'default';
      case 'in_progress': return 'secondary';
      case 'completed': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Open';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2">{job.title}</CardTitle>
          <Badge variant={getStatusColor(job.status)}>
            {getStatusText(job.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {job.description}
        </p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{job.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>${job.paymentAmount} {job.paymentType === 'hourly' ? '/hr' : ''}</span>
          </div>
          {job.dateNeeded && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Due: {new Date(job.dateNeeded).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onView && (
            <Button variant="outline" size="sm" onClick={() => onView(job)}>
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
          )}
          {onEdit && job.status === 'open' && (
            <Button variant="outline" size="sm" onClick={() => onEdit(job)}>
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" size="sm" onClick={() => onDelete(job)}>
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
