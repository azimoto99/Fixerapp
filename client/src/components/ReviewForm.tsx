import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Job } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const reviewSchema = z.object({
  jobId: z.number(),
  revieweeId: z.number(),
  reviewerId: z.number(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(5, 'Please provide a comment of at least 5 characters'),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  job: Job;
  onComplete?: () => void;
}

export default function ReviewForm({ job, onComplete }: ReviewFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hoveredRating, setHoveredRating] = useState(0);
  
  // Determine whether to review the poster or the worker
  const isReviewingPoster = user?.id === job.workerId;
  const targetUserId = isReviewingPoster ? job.posterId : job.workerId;
  
  // Create the form
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      jobId: job.id,
      revieweeId: targetUserId || 0,
      reviewerId: user?.id || 0,
      rating: 0,
      comment: '',
    },
  });
  
  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async (data: ReviewFormValues) => {
      const res = await apiRequest('POST', '/api/reviews', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/job', job.id] });
      toast({
        title: 'Review submitted',
        description: 'Thank you for your feedback!',
      });
      if (onComplete) onComplete();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to submit review',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Form submission handler
  const onSubmit = (data: ReviewFormValues) => {
    submitReviewMutation.mutate(data);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave a Review</CardTitle>
        <CardDescription>
          {isReviewingPoster 
            ? 'Rate your experience with the job poster' 
            : 'Rate the worker who completed this job'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating</FormLabel>
                  <FormControl>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <Star
                          key={rating}
                          className={`h-8 w-8 cursor-pointer ${
                            (hoveredRating || field.value) >= rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                          onMouseEnter={() => setHoveredRating(rating)}
                          onMouseLeave={() => setHoveredRating(0)}
                          onClick={() => field.onChange(rating)}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Click on a star to rate from 1 to 5
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comments</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share your experience with this job/worker..."
                      className="resize-none min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Your feedback helps the community
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onComplete}>
          Skip Review
        </Button>
        <Button 
          onClick={form.handleSubmit(onSubmit)}
          disabled={submitReviewMutation.isPending}
        >
          {submitReviewMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Review'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}