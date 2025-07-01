import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Review } from '@shared/schema';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, Loader2, MessageSquare } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ReviewsDisplayProps {
  userId?: number;
  jobId?: number;
  title?: string;
}

const ReviewsDisplay: React.FC<ReviewsDisplayProps> = ({ 
  userId, 
  jobId,
  title = 'Reviews'
}) => {
  const { toast } = useToast();

  // We can either fetch by userId or jobId, but not both simultaneously
  const queryKey = userId 
    ? ['/api/reviews/user', userId]
    : ['/api/reviews/job', jobId];

  const { data: reviews, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const endpoint = userId 
        ? `/api/reviews/user/${userId}`
        : `/api/reviews/job/${jobId}`;
      
      const res = await apiRequest('GET', endpoint);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch reviews');
      }
      return res.json();
    },
    enabled: !!(userId || jobId), // Only run the query if either userId or jobId is provided
  });

  React.useEffect(() => {
    if (error) {
      toast({
        title: 'Error loading reviews',
        description: (error as Error).message,
        variant: 'destructive'
      });
    }
  }, [error, toast]);

  // Render the star rating
  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm font-medium">{rating}/5</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !reviews) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No reviews available at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No reviews yet. Be the first to leave a review!
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate average rating
  const totalRating = reviews.reduce((sum: number, review: Review) => sum + review.rating, 0);
  const averageRating = (totalRating / reviews.length).toFixed(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            {title}
          </div>
          {reviews.length > 0 && (
            <Badge variant="outline" className="ml-2">
              <Star className="h-3.5 w-3.5 mr-1 text-yellow-400 fill-yellow-400" />
              {averageRating} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reviews.map((review: any) => (
            <div key={review.id} className="border-b pb-4 last:border-b-0 last:pb-0">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-2">
                    {review.reviewer?.avatarUrl ? (
                      <AvatarImage src={review.reviewer.avatarUrl} alt={review.reviewer?.username || 'User'} />
                    ) : null}
                    <AvatarFallback>
                      {review.reviewer?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {review.reviewer?.fullName || review.reviewer?.username || `User #${review.reviewerId}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(review.dateReviewed)}
                    </div>
                  </div>
                </div>
                <div>
                  {renderRating(review.rating)}
                </div>
              </div>
              {review.comment && (
                <div className="mt-2 text-sm">
                  {review.comment}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewsDisplay;