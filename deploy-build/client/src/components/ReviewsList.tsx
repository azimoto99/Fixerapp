import { useQuery } from '@tanstack/react-query';
import { Review, User } from '@shared/schema';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ReviewsListProps {
  userId?: number;
  jobId?: number;
}

// Extended review interface for frontend display with the reviewer info
interface ExtendedReview extends Review {
  reviewer?: User;
}

export default function ReviewsList({ userId, jobId }: ReviewsListProps) {
  // We can fetch reviews either by user or by job
  const queryKey = userId ? ['/api/reviews/user', userId] : ['/api/reviews/job', jobId];
  
  const { data: reviews, isLoading, error } = useQuery<ExtendedReview[]>({
    queryKey,
    enabled: !!(userId || jobId),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-start space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Skeleton key={star} className="h-4 w-4 mr-1" />
                    ))}
                  </div>
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-4">
        Error loading reviews: {(error as Error).message}
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center text-gray-500 py-6">
        No reviews yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <Avatar>
                <AvatarFallback className="bg-primary/10 text-primary">
                  {review.reviewer?.fullName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">
                    {review.reviewer?.fullName || 'Anonymous User'}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {review.dateReviewed ? new Date(review.dateReviewed).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
                
                <div className="flex mb-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className={`h-4 w-4 ${
                        index < review.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                
                <p className="text-gray-700 text-sm">{review.comment}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}