import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Zap, 
  CheckCircle, 
  Clock, 
  Star, 
  MapPin, 
  DollarSign,
  Send,
  Loader2
} from 'lucide-react';
import { Job } from '@shared/schema';
import { motion, AnimatePresence } from 'framer-motion';

interface InstantApplyButtonProps {
  job: Job;
  className?: string;
  variant?: 'default' | 'compact' | 'card';
}

export function InstantApplyButton({ 
  job, 
  className = '', 
  variant = 'default' 
}: InstantApplyButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendRawMessage } = useWebSocket();
  const queryClient = useQueryClient();
  const [isApplying, setIsApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const response = await apiRequest('POST', '/api/applications/instant', {
        jobId: job.id,
        workerId: user.id,
        message: `Hi! I'm interested in your ${job.title} job. I have the required skills and am available to start immediately.`,
        hourlyRate: job.paymentAmount, // Match the job's rate
        expectedDuration: '1-2 hours', // Default estimate
        instantApply: true
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to apply');
      }
      
      return response.json();
    },
    onMutate: () => {
      setIsApplying(true);
    },
    onSuccess: (data) => {
      setHasApplied(true);
      setIsApplying(false);
      
      // Send real-time notification to job poster
      sendRawMessage({
        type: 'instant_application',
        jobId: job.id,
        posterId: job.posterId,
        workerId: user?.id,
        workerName: user?.fullName || user?.username,
        workerSkills: user?.skills || [],
        workerRating: user?.rating || 0,
        applicationId: data.application.id,
        timestamp: new Date().toISOString()
      });
      
      // Show success toast with fun animation
      toast({
        title: "⚡ Application Sent!",
        description: `Your application for "${job.title}" was sent instantly!`,
        duration: 4000,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${job.id}/applications`] });
    },
    onError: (error: Error) => {
      setIsApplying(false);
      toast({
        title: "Application Failed",
        description: error.message || "Failed to apply. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleInstantApply = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to apply for jobs.",
        variant: "destructive",
      });
      return;
    }

    if (user.accountType !== 'worker') {
      toast({
        title: "Worker Account Required",
        description: "You need a worker account to apply for jobs.",
        variant: "destructive",
      });
      return;
    }

    applyMutation.mutate();
  };

  if (variant === 'compact') {
    return (
      <AnimatePresence mode="wait">
        {hasApplied ? (
          <motion.div
            key="applied"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className={`flex items-center gap-2 ${className}`}
          >
            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Applied
            </Badge>
          </motion.div>
        ) : (
          <motion.div
            key="apply"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <Button
              onClick={handleInstantApply}
              disabled={isApplying}
              size="sm"
              className={`bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white ${className}`}
            >
              {isApplying ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Zap className="h-3 w-3" />
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={`border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-medium">Quick Apply</span>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Instant
            </Badge>
          </div>
          
          <div className="space-y-2 mb-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span>${job.paymentAmount}/{job.paymentType}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Available immediately</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {hasApplied ? (
              <motion.div
                key="applied"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="flex items-center justify-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200"
              >
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">Application Sent!</span>
              </motion.div>
            ) : (
              <motion.div
                key="apply"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <Button
                  onClick={handleInstantApply}
                  disabled={isApplying}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                  size="lg"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Apply Instantly
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <AnimatePresence mode="wait">
      {hasApplied ? (
        <motion.div
          key="applied"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`flex items-center gap-2 ${className}`}
        >
          <Button disabled className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-4 w-4 mr-2" />
            Applied Successfully
          </Button>
        </motion.div>
      ) : (
        <motion.div
          key="apply"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          <Button
            onClick={handleInstantApply}
            disabled={isApplying}
            className={`bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white ${className}`}
            size="lg"
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Apply Instantly
              </>
            )}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
