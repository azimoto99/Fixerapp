import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Review, Job, User } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';

interface ReviewsContentProps {
  userId: number;
}

const ReviewsContent: React.FC<ReviewsContentProps> = ({ userId }) => {
  const { data: reviews, isLoading } = useQuery<Review[]>({
    queryKey: [`/api/reviews/user/${userId}`],
  });
  
  const { data: jobs } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
  });
  
  // Helper function to get job details
  const getJobDetails = (jobId: number | null) => {
    if (!jobId || !jobs) return { title: 'Job' };
    return jobs.find(job => job.id === jobId) || { title: 'Job' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="bg-primary/10 rounded-full p-4 mb-4">
          <Star className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
        <p className="text-muted-foreground text-sm">
          Complete jobs to start receiving reviews from clients
        </p>
      </div>
    );
  }

  // Calculate average rating
  const avgRating = reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length;
  
  // Count ratings by star level
  const ratingCounts = [1, 2, 3, 4, 5].map(rating => ({
    rating,
    count: reviews.filter(r => Math.round(r.rating) === rating).length,
    percentage: (reviews.filter(r => Math.round(r.rating) === rating).length / reviews.length) * 100
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">My Reviews</h2>
        <Badge variant="outline">{reviews.length} total</Badge>
      </div>

      {/* Rating summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold text-primary mb-1">{avgRating.toFixed(1)}</div>
              <div className="flex items-center mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.round(avgRating) ? 'text-amber-500 fill-amber-500' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">Average rating</p>
            </div>
            
            <div className="flex-1 ml-6">
              {ratingCounts.reverse().map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center mb-1">
                  <div className="flex items-center w-16">
                    <span className="text-sm mr-1">{rating}</span>
                    <Star className="h-3 w-3 text-amber-500" />
                  </div>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs ml-2 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews list */}
      <div className="space-y-4">
        {reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((review, index) => {
            const job = getJobDetails(review.jobId);
            return (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <div>
                      <CardTitle className="text-base">{job.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="italic text-sm">"{review.comment}"</p>
                    
                    <div className="flex justify-between items-center pt-2">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {review.reviewerName?.substring(0, 2) || 'CL'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{review.reviewerName || 'Client'}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <div className="flex items-center text-xs">
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          <span>{Math.floor(Math.random() * 5)}</span>
                        </div>
                        <div className="flex items-center text-xs">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          <span>{Math.floor(Math.random() * 3)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
};

export default ReviewsContent;