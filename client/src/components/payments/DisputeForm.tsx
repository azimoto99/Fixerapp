import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, FileText, DollarSign, Clock, Shield } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface DisputeFormProps {
  jobId: number;
  job: {
    id: number;
    title: string;
    paymentAmount: number;
    status: string;
    posterId: number;
    workerId: number | null;
  };
  trigger?: React.ReactNode;
}

interface DisputeData {
  type: 'payment_not_received' | 'payment_incorrect' | 'work_not_completed' | 'work_quality' | 'other';
  description: string;
  expectedAmount?: number;
  evidence?: string[];
}

export default function DisputeForm({ jobId, job, trigger }: DisputeFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isOpen, setIsOpen] = useState(false);
  const [disputeType, setDisputeType] = useState<DisputeData['type']>('payment_not_received');
  const [description, setDescription] = useState('');
  const [expectedAmount, setExpectedAmount] = useState<number>(job.paymentAmount);
  const [evidence, setEvidence] = useState('');

  const isWorker = user?.id === job.workerId;
  const isPoster = user?.id === job.posterId;
  const canDispute = (isWorker || isPoster) && job.status === 'completed';

  // Create dispute mutation
  const createDisputeMutation = useMutation({
    mutationFn: async (disputeData: DisputeData) => {
      const response = await apiRequest('POST', `/api/disputes`, {
        jobId,
        type: disputeData.type,
        description: disputeData.description,
        expectedAmount: disputeData.expectedAmount,
        evidence: disputeData.evidence ? [disputeData.evidence] : [],
        reportedBy: user?.id
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create dispute');
      }
      
      return response.json();
    },
    onSuccess: (dispute) => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId] });
      queryClient.invalidateQueries({ queryKey: ['/api/disputes'] });
      
      toast({
        title: 'Dispute Created',
        description: `Dispute #${dispute.id} has been submitted. Our team will review it within 24-48 hours.`,
      });
      
      setIsOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Create Dispute',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const resetForm = () => {
    setDisputeType('payment_not_received');
    setDescription('');
    setExpectedAmount(job.paymentAmount);
    setEvidence('');
  };

  const handleSubmit = () => {
    if (!description.trim()) {
      toast({
        title: 'Description Required',
        description: 'Please provide a detailed description of the issue.',
        variant: 'destructive',
      });
      return;
    }

    createDisputeMutation.mutate({
      type: disputeType,
      description: description.trim(),
      expectedAmount: disputeType === 'payment_incorrect' ? expectedAmount : undefined,
      evidence: evidence.trim() ? [evidence.trim()] : undefined
    });
  };

  const getDisputeTypeDescription = (type: DisputeData['type']) => {
    switch (type) {
      case 'payment_not_received':
        return 'Payment has not been received after job completion';
      case 'payment_incorrect':
        return 'Payment amount is incorrect or different from agreed amount';
      case 'work_not_completed':
        return 'Work was not completed as agreed';
      case 'work_quality':
        return 'Work quality does not meet expectations';
      case 'other':
        return 'Other payment or job-related issue';
      default:
        return '';
    }
  };

  if (!canDispute) {
    return null;
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10">
      <AlertTriangle className="h-4 w-4 mr-2" />
      Report Issue
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2 text-destructive" />
            Report Payment Dispute
          </DialogTitle>
          <DialogDescription>
            Report an issue with payment or job completion for "{job.title}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Disputes should only be filed for legitimate payment or work completion issues. 
              False disputes may result in account penalties.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <label className="text-sm font-medium">Dispute Type</label>
            <Select value={disputeType} onValueChange={(value: DisputeData['type']) => setDisputeType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="payment_not_received">Payment Not Received</SelectItem>
                <SelectItem value="payment_incorrect">Incorrect Payment Amount</SelectItem>
                <SelectItem value="work_not_completed">Work Not Completed</SelectItem>
                <SelectItem value="work_quality">Poor Work Quality</SelectItem>
                <SelectItem value="other">Other Issue</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {getDisputeTypeDescription(disputeType)}
            </p>
          </div>

          {disputeType === 'payment_incorrect' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Expected Payment Amount</label>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <input
                  type="number"
                  value={expectedAmount}
                  onChange={(e) => setExpectedAmount(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 border rounded-md"
                  min="0"
                  step="0.01"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Current job amount: ${job.paymentAmount.toFixed(2)}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Description *</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide a detailed explanation of the issue, including dates, communications, and any relevant details..."
              className="min-h-[100px]"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/1000 characters
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Supporting Evidence (Optional)</label>
            <Textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Include any relevant evidence such as screenshots, message excerpts, or additional documentation..."
              className="min-h-[80px]"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {evidence.length}/500 characters
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              What happens next?
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Our team will review your dispute within 24-48 hours</li>
              <li>• We may contact both parties for additional information</li>
              <li>• Resolution typically takes 3-5 business days</li>
              <li>• You'll receive email updates on the dispute status</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createDisputeMutation.isPending || !description.trim()}
              className="flex-1"
            >
              {createDisputeMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Submit Dispute
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 