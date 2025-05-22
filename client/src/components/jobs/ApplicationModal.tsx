import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, X } from 'lucide-react';

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: {
    id: number;
    title: string;
  };
}

const ApplicationModal: React.FC<ApplicationModalProps> = ({ isOpen, onClose, job }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [proposedRate, setProposedRate] = useState<string>('25.00');
  const [expectedDuration, setExpectedDuration] = useState<string>('');
  const [applicationMessage, setApplicationMessage] = useState<string>('');
  
  const applyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/jobs/${job.id}/apply`, {
        hourlyRate: parseFloat(proposedRate),
        expectedDuration,
        message: applicationMessage,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Application Submitted',
        description: 'Your job application was sent successfully!',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${job.id}/applications/worker`] });
      onClose();
      // Reset form
      setProposedRate('25.00');
      setExpectedDuration('');
      setApplicationMessage('');
    },
    onError: (error: any) => {
      toast({
        title: 'Application Failed',
        description: error.message || 'Failed to submit application. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  const handleApply = () => {
    if (!proposedRate) {
      toast({
        title: 'Missing Information',
        description: 'Please enter your proposed hourly rate.',
        variant: 'destructive',
      });
      return;
    }
    applyMutation.mutate();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]" 
         onClick={onClose} 
         style={{ pointerEvents: 'auto' }}>
      <div className="bg-background rounded-lg shadow-lg max-w-md w-full p-6" 
           onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Apply for Job</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <p className="text-muted-foreground mb-6">Submit your application for "{job.title}"</p>
        
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <label htmlFor="hourly-rate" className="text-sm font-medium">
              Your Hourly Rate (USD)
            </label>
            <Input
              id="hourly-rate"
              type="number"
              placeholder="25.00"
              value={proposedRate}
              onChange={(e) => setProposedRate(e.target.value)}
            />
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="duration" className="text-sm font-medium">
              Expected Duration
            </label>
            <Input
              id="duration"
              placeholder="e.g. 2-3 hours"
              value={expectedDuration}
              onChange={(e) => setExpectedDuration(e.target.value)}
            />
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="message" className="text-sm font-medium">
              Message to Job Poster
            </label>
            <Textarea
              id="message"
              placeholder="Introduce yourself and explain why you're a good fit for this job..."
              value={applicationMessage}
              onChange={(e) => setApplicationMessage(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={applyMutation.isPending}>
            {applyMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Application
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApplicationModal;