import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Clock, Star, MessageSquare, AlertCircle, DollarSign } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface JobCompletionFlowProps {
  jobId: number;
  job: {
    id: number;
    title: string;
    status: string;
    posterId: number;
    workerId: number | null;
    paymentAmount: number;
    description: string;
  };
  tasks?: Array<{
    id: number;
    description: string;
    isCompleted: boolean;
    completedBy?: number;
  }>;
}

export default function JobCompletionFlow({ jobId, job, tasks = [] }: JobCompletionFlowProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [workerRating, setWorkerRating] = useState(0);
  const [posterRating, setPosterRating] = useState(0);
  const [showRatingDialog, setShowRatingDialog] = useState(false);

  const isWorker = user?.id === job.workerId;
  const isPoster = user?.id === job.posterId;
  const canComplete = job.status === 'in_progress' && (isWorker || isPoster);
  
  // Calculate task completion progress
  const completedTasks = tasks.filter(task => task.isCompleted).length;
  const totalTasks = tasks.length;
  const allTasksComplete = totalTasks === 0 || completedTasks === totalTasks;

  // Mark job as complete mutation
  const completeJobMutation = useMutation({
    mutationFn: async (data: { 
      completionNotes?: string;
      workerRating?: number;
      posterRating?: number;
    }) => {
      const response = await apiRequest('POST', `/api/jobs/${jobId}/complete`, {
        completionNotes: data.completionNotes,
        ...(isWorker && data.posterRating && { posterRating: data.posterRating }),
        ...(isPoster && data.workerRating && { workerRating: data.workerRating })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete job');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId] });
      
      toast({
        title: 'Job Completed Successfully',
        description: 'The job has been marked as complete and payment will be processed.',
      });
      
      setShowCompletionDialog(false);
      setShowRatingDialog(true);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Complete Job',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Request completion approval mutation
  const requestCompletionMutation = useMutation({
    mutationFn: async (data: { completionNotes: string }) => {
      const response = await apiRequest('POST', `/api/jobs/${jobId}/request-completion`, {
        completionNotes: data.completionNotes,
        requestedBy: user?.id
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to request completion');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId] });
      
      toast({
        title: 'Completion Request Sent',
        description: 'The other party has been notified and will review your completion request.',
      });
      
      setShowCompletionDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Request Completion',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleCompleteJob = () => {
    if (allTasksComplete) {
      // If all tasks are complete, allow direct completion
      completeJobMutation.mutate({
        completionNotes,
        ...(isWorker && posterRating > 0 && { posterRating }),
        ...(isPoster && workerRating > 0 && { workerRating })
      });
    } else {
      // If not all tasks are complete, request approval
      requestCompletionMutation.mutate({ completionNotes });
    }
  };

  const renderTaskProgress = () => {
    if (totalTasks === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Task Progress</span>
          <span className="text-sm text-muted-foreground">
            {completedTasks} of {totalTasks} completed
          </span>
        </div>
        
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
          />
        </div>
        
        {!allTasksComplete && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {isWorker 
                ? "Complete all tasks before requesting job completion approval."
                : "Worker must complete all tasks before the job can be marked as finished."
              }
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  const renderCompletionButton = () => {
    if (!canComplete) return null;

    const buttonText = allTasksComplete 
      ? 'Mark Job Complete' 
      : 'Request Completion Approval';
    
    const buttonVariant = allTasksComplete ? 'default' : 'outline';

    return (
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogTrigger asChild>
          <Button 
            variant={buttonVariant}
            className="w-full"
            disabled={completeJobMutation.isPending || requestCompletionMutation.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {buttonText}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {allTasksComplete ? 'Complete Job' : 'Request Completion Approval'}
            </DialogTitle>
            <DialogDescription>
              {allTasksComplete 
                ? 'Confirm that the job has been completed satisfactorily.'
                : 'Request approval from the other party to complete this job.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {renderTaskProgress()}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Completion Notes {allTasksComplete ? '(Optional)' : '(Required)'}
              </label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder={allTasksComplete 
                  ? "Add any final notes about the completed work..."
                  : "Explain why you believe the job should be marked as complete..."
                }
                className="min-h-[80px]"
              />
            </div>
            
            {allTasksComplete && (
              <div className="space-y-3">
                <div className="text-sm font-medium">
                  Rate the {isWorker ? 'Job Poster' : 'Worker'} (Optional)
                </div>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      key={star}
                      variant="ghost"
                      size="sm"
                      className="p-1"
                      onClick={() => {
                        if (isWorker) setPosterRating(star);
                        if (isPoster) setWorkerRating(star);
                      }}
                    >
                      <Star 
                        className={`h-5 w-5 ${
                          star <= (isWorker ? posterRating : workerRating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCompletionDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCompleteJob}
                disabled={
                  completeJobMutation.isPending || 
                  requestCompletionMutation.isPending ||
                  (!allTasksComplete && !completionNotes.trim())
                }
                className="flex-1"
              >
                {completeJobMutation.isPending || requestCompletionMutation.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  buttonText
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const renderPaymentInfo = () => {
    if (job.status !== 'completed') return null;

    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-green-800 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Job Completed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-green-700">Payment Amount:</span>
              <span className="font-medium text-green-800">${job.paymentAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-green-700">Status:</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Payment Processing
              </Badge>
            </div>
            <p className="text-xs text-green-600 mt-2">
              {isWorker 
                ? "Payment will be transferred to your account within 2-3 business days."
                : "Payment has been processed and will be transferred to the worker."
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {renderTaskProgress()}
      {renderCompletionButton()}
      {renderPaymentInfo()}
      
      {/* Rating Dialog - shown after completion */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Job Completed Successfully!</DialogTitle>
            <DialogDescription>
              Thank you for using our platform. Your feedback helps us improve.
            </DialogDescription>
          </DialogHeader>
          
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            
            <div>
              <h3 className="font-semibold text-lg">{job.title}</h3>
              <p className="text-muted-foreground">has been completed</p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Payment Amount:</span>
                <span className="font-bold text-green-600">${job.paymentAmount.toFixed(2)}</span>
              </div>
            </div>
            
            <Button 
              onClick={() => setShowRatingDialog(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 