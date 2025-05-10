import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Star, Clock, BriefcaseBusiness, Award, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

interface WorkerHistoryProps {
  workerId: number;
  className?: string;
}

const WorkerHistory: React.FC<WorkerHistoryProps> = ({ workerId, className }) => {
  // Fetch worker's user profile
  const { data: worker, isLoading: isWorkerLoading } = useQuery({
    queryKey: ['/api/users', workerId],
    enabled: !!workerId
  });

  // Fetch past jobs that the worker has completed
  const { data: pastJobs, isLoading: isJobsLoading } = useQuery({
    queryKey: ['/api/jobs/worker', workerId, 'completed'],
    enabled: !!workerId
  });

  // Fetch reviews for the worker
  const { data: reviews, isLoading: isReviewsLoading } = useQuery({
    queryKey: ['/api/reviews/user', workerId],
    enabled: !!workerId
  });

  const isLoading = isWorkerLoading || isJobsLoading || isReviewsLoading;

  // Calculate metrics and stats
  const calculateMetrics = () => {
    if (!worker || !pastJobs || !reviews) {
      return {
        completedJobs: 0,
        successRate: 0,
        averageRating: 0,
        responseTime: 0
      };
    }

    const completedJobs = pastJobs.length;
    const averageRating = reviews.length > 0 
      ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length 
      : 0;
    
    return {
      completedJobs,
      successRate: worker.successRate || 0,
      averageRating: averageRating || worker.rating || 0,
      responseTime: worker.responseTime || 0
    };
  };

  const metrics = calculateMetrics();
  const hasReviews = reviews && reviews.length > 0;
  const hasPastJobs = pastJobs && pastJobs.length > 0;

  // Render star rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`h-4 w-4 ${i < Math.round(rating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
          />
        ))}
        <span className="ml-1 text-sm">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // Render loading skeleton
  if (isLoading) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
            <Skeleton className="h-28 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Format worker's skill badges
  const renderSkills = () => {
    if (!worker || !worker.skills || worker.skills.length === 0) {
      return <div className="text-sm text-muted-foreground">No skills listed</div>;
    }

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {worker.skills.map((skill, index) => (
          <Badge key={index} variant="outline" className="text-xs">
            {skill}
            {worker.skillsVerified && worker.skillsVerified[skill] && (
              <Award className="h-3 w-3 ml-1 text-primary" />
            )}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Worker History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Worker profile */}
          {worker && (
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={worker.avatarUrl || undefined} alt={worker.fullName} />
                <AvatarFallback>{worker.fullName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{worker.fullName}</div>
                <div className="text-sm text-muted-foreground">
                  Member since {formatDistanceToNow(new Date(worker.createdAt || Date.now()), { addSuffix: true })}
                </div>
                {renderSkills()}
              </div>
            </div>
          )}

          {/* Performance metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-2">
              <div className="text-sm text-muted-foreground mb-1">Completed Jobs</div>
              <div className="flex items-center">
                <BriefcaseBusiness className="h-5 w-5 mr-1 text-primary" />
                <span className="text-lg font-semibold">{metrics.completedJobs}</span>
              </div>
            </div>
            
            <div className="rounded-lg border p-2">
              <div className="text-sm text-muted-foreground mb-1">Success Rate</div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-lg font-semibold">{metrics.successRate}%</span>
                </div>
                <Progress value={metrics.successRate} className="h-2" />
              </div>
            </div>
            
            <div className="rounded-lg border p-2">
              <div className="text-sm text-muted-foreground mb-1">Average Rating</div>
              <div>
                {renderStars(metrics.averageRating)}
              </div>
            </div>
            
            <div className="rounded-lg border p-2">
              <div className="text-sm text-muted-foreground mb-1">Response Time</div>
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-1 text-primary" />
                <span className="text-lg font-semibold">{metrics.responseTime} min</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Recent reviews */}
          <div>
            <h3 className="text-sm font-medium mb-2">Recent Reviews</h3>
            
            {!hasReviews && (
              <div className="text-center py-3 text-sm text-muted-foreground">
                No reviews yet
              </div>
            )}
            
            {hasReviews && (
              <div className="space-y-3">
                {reviews.slice(0, 3).map((review) => (
                  <div key={review.id} className="rounded-lg border p-3">
                    <div className="flex justify-between items-start">
                      <div className="font-medium">{review.title}</div>
                      <div>{renderStars(review.rating)}</div>
                    </div>
                    <p className="text-sm mt-1">{review.content}</p>
                    <div className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(review.dateCreated), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Job history */}
          <div>
            <h3 className="text-sm font-medium mb-2">Job History</h3>
            
            {!hasPastJobs && (
              <div className="text-center py-3 text-sm text-muted-foreground">
                No completed jobs yet
              </div>
            )}
            
            {hasPastJobs && (
              <div className="space-y-2">
                {pastJobs.slice(0, 3).map((job) => (
                  <div key={job.id} className="rounded-lg border p-2 text-sm">
                    <div className="font-medium">{job.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(job.dateCompleted || job.datePosted), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!hasPastJobs && !hasReviews && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
              <div className="text-sm text-yellow-700 dark:text-yellow-400">
                This worker has not completed any jobs or received reviews yet.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkerHistory;