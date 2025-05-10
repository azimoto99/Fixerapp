import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, ThumbsUp, Clock, Calendar, X, CheckSquare, AlertTriangle } from 'lucide-react';

interface WorkerHistoryProps {
  workerId: number;
  className?: string;
}

const WorkerHistory: React.FC<WorkerHistoryProps> = ({ workerId, className = '' }) => {
  // Fetch worker's job history
  const { data: jobHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['/api/workers/job-history', workerId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/workers/${workerId}/job-history`);
      if (!res.ok) throw new Error('Failed to fetch job history');
      return res.json();
    },
  });

  // Fetch worker's reviews
  const { data: reviews, isLoading: isLoadingReviews } = useQuery({
    queryKey: ['/api/workers/reviews', workerId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/workers/${workerId}/reviews`);
      if (!res.ok) throw new Error('Failed to fetch reviews');
      return res.json();
    },
  });

  // Calculate worker stats
  const stats = React.useMemo(() => {
    if (!jobHistory) return {
      totalJobs: 0,
      completedJobs: 0,
      completionRate: 0,
      averageRating: 0,
      onTimeRate: 0,
    };

    const total = jobHistory.length;
    const completed = jobHistory.filter((job: any) => job.status === 'completed').length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    let totalRating = 0;
    let ratingCount = 0;
    let onTimeCount = 0;
    
    if (reviews && reviews.length > 0) {
      reviews.forEach((review: any) => {
        if (review.rating) {
          totalRating += review.rating;
          ratingCount++;
        }
        if (review.onTime) {
          onTimeCount++;
        }
      });
    }
    
    const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
    const onTimeRate = reviews && reviews.length > 0 ? (onTimeCount / reviews.length) * 100 : 0;

    return {
      totalJobs: total,
      completedJobs: completed,
      completionRate,
      averageRating,
      onTimeRate,
    };
  }, [jobHistory, reviews]);

  // Render job status badge
  const getJobStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600"><CheckSquare className="h-3 w-3 mr-1" /> Completed</Badge>;
      case 'in_progress':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> In Progress</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  return (
    <div className={className}>
      <Tabs defaultValue="jobs">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="jobs">Job History</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>
        
        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-2 my-4">
          <div className="bg-muted rounded-md p-3 text-center">
            <div className="text-sm text-muted-foreground">Completion Rate</div>
            <div className="text-xl font-semibold mt-1">
              {isLoadingHistory ? (
                <Skeleton className="h-6 w-16 mx-auto" />
              ) : (
                `${stats.completionRate.toFixed(0)}%`
              )}
            </div>
          </div>
          <div className="bg-muted rounded-md p-3 text-center">
            <div className="text-sm text-muted-foreground">Avg. Rating</div>
            <div className="text-xl font-semibold mt-1 flex items-center justify-center">
              {isLoadingReviews ? (
                <Skeleton className="h-6 w-16 mx-auto" />
              ) : (
                <>
                  {stats.averageRating.toFixed(1)}
                  <Star className="h-4 w-4 text-yellow-500 ml-1" />
                </>
              )}
            </div>
          </div>
          <div className="bg-muted rounded-md p-3 text-center">
            <div className="text-sm text-muted-foreground">On-Time Rate</div>
            <div className="text-xl font-semibold mt-1">
              {isLoadingReviews ? (
                <Skeleton className="h-6 w-16 mx-auto" />
              ) : (
                `${stats.onTimeRate.toFixed(0)}%`
              )}
            </div>
          </div>
        </div>
        
        {/* Jobs tab */}
        <TabsContent value="jobs" className="space-y-4">
          {isLoadingHistory ? (
            Array(3).fill(0).map((_, index) => (
              <div key={index} className="border rounded-md p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))
          ) : !jobHistory || jobHistory.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border rounded-md">
              <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-yellow-500 opacity-60" />
              <p>This worker has no job history yet</p>
            </div>
          ) : (
            jobHistory.map((job: any) => (
              <div key={job.id} className="border rounded-md p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{job.title}</h3>
                    <div className="text-sm text-muted-foreground mt-1 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(job.dateCompleted || job.datePosted)}
                      </span>
                      {job.category && (
                        <Badge variant="outline" className="capitalize">{job.category}</Badge>
                      )}
                    </div>
                  </div>
                  {getJobStatusBadge(job.status)}
                </div>
                {job.description && (
                  <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">
                    {job.description}
                  </p>
                )}
              </div>
            ))
          )}
        </TabsContent>
        
        {/* Reviews tab */}
        <TabsContent value="reviews" className="space-y-4">
          {isLoadingReviews ? (
            Array(3).fill(0).map((_, index) => (
              <div key={index} className="border rounded-md p-4 space-y-2">
                <Skeleton className="h-5 w-1/4" />
                <div className="flex gap-1 my-1">
                  {Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-4 rounded-full" />
                  ))}
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))
          ) : !reviews || reviews.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border rounded-md">
              <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-yellow-500 opacity-60" />
              <p>This worker has no reviews yet</p>
            </div>
          ) : (
            reviews.map((review: any) => (
              <div key={review.id} className="border rounded-md p-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium">{review.jobTitle || 'Job Review'}</h3>
                  <Badge variant="outline" className="flex items-center gap-1">
                    {review.onTime ? (
                      <><ThumbsUp className="h-3 w-3" /> On Time</>
                    ) : (
                      <><Clock className="h-3 w-3" /> Delayed</>
                    )}
                  </Badge>
                </div>
                
                <div className="flex items-center mt-1 mb-2">
                  {Array(5).fill(0).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}`}
                    />
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">
                    {formatDate(review.dateCreated)}
                  </span>
                </div>
                
                <p className="text-sm">
                  {review.comment || <span className="italic text-muted-foreground">No comment provided</span>}
                </p>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WorkerHistory;