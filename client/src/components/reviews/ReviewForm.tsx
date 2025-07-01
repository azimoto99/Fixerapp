import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';

// Define the review form schema
const reviewFormSchema = z.object({
  jobId: z.number(),
  reviewerId: z.number(),
  revieweeId: z.number(),
  rating: z.number().min(1, "Please select a rating").max(5),
  comment: z.string().min(5, "Please provide at least 5 characters of feedback")
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

interface ReviewFormProps {
  jobId: number;
  reviewerId: number;
  revieweeId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  jobId,
  reviewerId,
  revieweeId,
  onSuccess,
  onCancel,
}) => {
  const { toast } = useToast();
  const [selectedRating, setSelectedRating] = React.useState<number>(0);
  
  // Initialize the form with react-hook-form
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      jobId,
      reviewerId,
      revieweeId,
      rating: 0,
      comment: '',
    },
  });

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async (data: ReviewFormValues) => {
      const res = await apiRequest('POST', '/api/reviews', data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to submit review');
      }
      return res.json();
    }
  });

  // Handle form submission
  const onSubmit = (data: ReviewFormValues) => {
    submitReviewMutation.mutate(data, {
      onSuccess: () => {
        toast({
          title: 'Review submitted successfully',
          description: 'Your review has been posted.'
        });
        queryClient.invalidateQueries({ queryKey: ['/api/reviews/user', revieweeId] });
        queryClient.invalidateQueries({ queryKey: ['/api/reviews/job', jobId] });
        onSuccess();
      },
      onError: (error: Error) => {
        toast({
          title: 'Failed to submit review',
          description: error.message,
          variant: 'destructive'
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rating</FormLabel>
              <FormControl>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      className="p-1 focus:outline-none"
                      onClick={() => {
                        setSelectedRating(rating);
                        field.onChange(rating);
                      }}
                    >
                      <Star
                        className={`h-8 w-8 ${
                          rating <= selectedRating || rating <= field.value
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </FormControl>
              <FormDescription>
                Rate your experience from 1 to 5 stars
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
                  placeholder="Share your experience..."
                  className="resize-none min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Be honest and constructive in your feedback
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitReviewMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
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
        </div>
      </form>
    </Form>
  );
};

export default ReviewForm;