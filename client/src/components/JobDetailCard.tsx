import React from 'react';
import { Job } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getCategoryIcon, getCategoryColor, formatCurrency, getTimeAgo } from '@/lib/utils';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface JobDetailCardProps {
  job: Job;
  onClose?: () => void;
}

const JobDetailCard: React.FC<JobDetailCardProps> = ({ job, onClose }) => {
  const { toast } = useToast();
  
  const {
    id,
    title,
    description,
    category,
    paymentType,
    paymentAmount,
    location,
    status,
    datePosted,
    dateNeeded,
    posterId,
  } = job;
  
  // In a real app, we would fetch the poster name from the user data
  const posterName = "Job Poster";
  
  // Calculate service fee and total amount based on payment amount
  const serviceFee = paymentAmount ? Math.max(1.5, paymentAmount * 0.05) : 0;
  const totalAmount = paymentAmount ? paymentAmount + serviceFee : 0;
  
  const handleApply = async () => {
    try {
      // Show a toast that the feature is coming soon
      toast({
        title: "Feature coming soon",
        description: "Job application functionality will be available soon!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to apply for this job. Please try again.",
      });
    }
  };
  
  const categoryIcon = getCategoryIcon(category);
  
  return (
    <Card className="w-full max-w-md animate-slide-up shadow-lg border-primary/20">
      <CardHeader className="pb-2 relative">
        <div className="absolute top-2 right-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-muted"
          >
            <i className="ri-close-line text-lg"></i>
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            <i className={`ri-${categoryIcon} text-xl`}></i>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="px-2 py-0 bg-primary/5 text-primary text-xs">
                {category}
              </Badge>
              {status && (
                <Badge variant={
                  status === 'open' ? 'outline' : 
                  status === 'assigned' ? 'secondary' : 
                  status === 'completed' ? 'default' : 'outline'
                } className="capitalize text-xs">
                  {status}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-2">
          <div className="text-sm text-muted-foreground">
            <i className="ri-map-pin-line mr-1"></i> {location || 'Remote'}
          </div>
          <div className="text-sm text-muted-foreground">
            <i className="ri-time-line mr-1"></i> 
            {datePosted ? getTimeAgo(datePosted) : 'Recently posted'}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 pt-0">
        <div className="p-3 bg-muted/30 rounded-md">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Payment:</span>
            <span className="text-sm font-bold text-primary">
              {paymentType === 'hourly' ? `${formatCurrency(paymentAmount)}/hr` : formatCurrency(paymentAmount)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Service Fee:</span>
            <span className="text-sm">{formatCurrency(serviceFee)}</span>
          </div>
          {paymentType === 'fixed' && (
            <div className="flex justify-between mt-1 pt-1 border-t border-border">
              <span className="text-sm font-medium">Total Amount:</span>
              <span className="text-sm font-bold">{formatCurrency(totalAmount)}</span>
            </div>
          )}
        </div>
        
        {dateNeeded && (
          <div className="flex items-center text-sm">
            <i className="ri-calendar-line mr-1"></i>
            <span>Needed by {new Date(dateNeeded).toLocaleDateString()}</span>
          </div>
        )}
        
        <div>
          <h4 className="text-sm font-medium mb-1">Description</h4>
          <p className="text-sm text-muted-foreground">
            {description || 'No detailed description provided for this job.'}
          </p>
        </div>
        
        {posterName && (
          <div>
            <h4 className="text-sm font-medium mb-1">Posted by</h4>
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-2">
                <i className="ri-user-line"></i>
              </div>
              <span className="text-sm">{posterName}</span>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="gap-2 flex">
        <Button 
          className="w-full" 
          onClick={() => {
            // Trigger the new job details card instead
            window.dispatchEvent(new CustomEvent('open-job-details', { 
              detail: { jobId: id }
            }));
            if (onClose) onClose();
          }}
        >
          View Job Card
        </Button>
      </CardFooter>
    </Card>
  );
};

export default JobDetailCard;