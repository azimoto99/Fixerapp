import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { MessageSquare, Star, Bug, Lightbulb, Heart, Send, Loader2 } from 'lucide-react';

interface FeedbackFormProps {
  trigger?: React.ReactNode;
  onSubmit?: () => void;
}

export default function FeedbackForm({ trigger, onSubmit }: FeedbackFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState(user?.email || '');

  const submitFeedbackMutation = useMutation({
    mutationFn: async (feedbackData: {
      type: string;
      rating: number;
      title: string;
      description: string;
      email: string;
      userId?: number;
    }) => {
      const response = await apiRequest('POST', '/api/feedback', feedbackData);
      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Thank you!',
        description: 'Your feedback has been submitted successfully. We appreciate your input!',
        variant: 'default',
      });
      resetForm();
      setOpen(false);
      onSubmit?.();
    },
    onError: (error) => {
      toast({
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'Please try again later',
        variant: 'destructive',
      });
    }
  });

  const resetForm = () => {
    setFeedbackType('');
    setRating(0);
    setTitle('');
    setDescription('');
    setEmail(user?.email || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedbackType || !description.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please select a feedback type and provide a description.',
        variant: 'destructive',
      });
      return;
    }

    submitFeedbackMutation.mutate({
      type: feedbackType,
      rating,
      title: title.trim(),
      description: description.trim(),
      email: email.trim(),
      userId: user?.id
    });
  };

  const feedbackTypes = [
    { value: 'suggestion', label: 'Suggestion', icon: Lightbulb, color: 'bg-blue-100 text-blue-800' },
    { value: 'bug', label: 'Bug Report', icon: Bug, color: 'bg-red-100 text-red-800' },
    { value: 'feature', label: 'Feature Request', icon: Star, color: 'bg-purple-100 text-purple-800' },
    { value: 'general', label: 'General Feedback', icon: MessageSquare, color: 'bg-green-100 text-green-800' },
    { value: 'compliment', label: 'Compliment', icon: Heart, color: 'bg-pink-100 text-pink-800' }
  ];

  const selectedType = feedbackTypes.find(type => type.value === feedbackType);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Give Feedback
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Share Your Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve Fixer by sharing your thoughts, suggestions, or reporting issues.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Feedback Type */}
          <div className="space-y-2">
            <Label htmlFor="feedback-type">What type of feedback is this?</Label>
            <Select value={feedbackType} onValueChange={setFeedbackType}>
              <SelectTrigger>
                <SelectValue placeholder="Select feedback type" />
              </SelectTrigger>
              <SelectContent>
                {feedbackTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedType && (
              <Badge className={selectedType.color}>
                <selectedType.icon className="h-3 w-3 mr-1" />
                {selectedType.label}
              </Badge>
            )}
          </div>

          {/* Rating (for general feedback and compliments) */}
          {(feedbackType === 'general' || feedbackType === 'compliment') && (
            <div className="space-y-2">
              <Label>How would you rate your experience?</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button
                    key={star}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRating(star)}
                    className={`p-1 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    <Star className="h-5 w-5 fill-current" />
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of your feedback"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide detailed feedback..."
              className="min-h-[100px]"
              maxLength={1000}
              required
            />
            <div className="text-xs text-muted-foreground text-right">
              {description.length}/1000 characters
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
            <div className="text-xs text-muted-foreground">
              We'll only use this to follow up if needed
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitFeedbackMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitFeedbackMutation.isPending || !feedbackType || !description.trim()}
            >
              {submitFeedbackMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Feedback
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 