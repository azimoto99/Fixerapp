import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import { Star, Clock, BriefcaseBusiness, Award, AlertTriangle, MapPin, Calendar, ThumbsUp, ChevronDown, ChevronRight, CheckCircle2, Eye, MapIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';

interface WorkerHistoryProps {
  workerId: number;
  className?: string;
  onHire?: (workerId: number) => void;
}

interface WorkerProfile {
  id: number;
  username: string;
  fullName: string;
  email?: string;
  bio?: string;
  avatarUrl?: string;
  rating?: number;
  skills?: string[];
  skillsVerified?: Record<string, boolean>;
  createdAt?: string;
  successRate?: number;
  responseTime?: number;
  [key: string]: any;
}

interface WorkerJob {
  id: number;
  title: string;
  description?: string;
  category?: string;
  paymentAmount?: number;
  location?: string;
  datePosted: string;
  dateCompleted?: string;
  dateNeeded?: string;
  review?: WorkerReview;
  [key: string]: any;
}

interface WorkerReview {
  id: number;
  rating: number;
  comment?: string;
  content?: string;
  title?: string;
  dateCreated?: string;
  dateReviewed?: string;
  [key: string]: any;
}

const WorkerHistory: React.FC<WorkerHistoryProps> = ({ workerId, className, onHire }) => {
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Fetch worker's user profile
  const { data: worker, isLoading: isWorkerLoading } = useQuery<WorkerProfile>({
    queryKey: ['/api/users', workerId],
    enabled: !!workerId
  });

  // Fetch past jobs that the worker has completed
  const { data: pastJobs, isLoading: isJobsLoading } = useQuery<WorkerJob[]>({
    queryKey: ['/api/jobs/worker', workerId, 'completed'],
    enabled: !!workerId
  });

  // Fetch reviews for the worker
  const { data: reviews, isLoading: isReviewsLoading } = useQuery<WorkerReview[]>({
    queryKey: ['/api/reviews/user', workerId],
    enabled: !!workerId
  });

  const isLoading = isWorkerLoading || isJobsLoading || isReviewsLoading;

  // Calculate metrics and stats
  const calculateMetrics = () => {
    const emptyMetrics = {
      completedJobs: 0,
      successRate: 0,
      averageRating: 0,
      responseTime: 0,
      totalEarnings: 0,
      topCategories: [] as string[]
    };

    if (!worker || !pastJobs || !reviews) {
      return emptyMetrics;
    }

    const completedJobs = pastJobs.length;
    const averageRating = reviews.length > 0 
      ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length 
      : 0;
    
    // Calculate total earnings from completed jobs
    const totalEarnings = pastJobs.reduce((acc, job) => {
      return acc + (job.paymentAmount || 0);
    }, 0);
    
    // Find top job categories
    const categoryCount: Record<string, number> = {};
    pastJobs.forEach(job => {
      if (job.category) {
        categoryCount[job.category] = (categoryCount[job.category] || 0) + 1;
      }
    });
    
    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);
    
    return {
      completedJobs,
      successRate: worker.successRate || 0,
      averageRating: averageRating || worker.rating || 0,
      responseTime: worker.responseTime || 0,
      totalEarnings,
      topCategories
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

  // Helper function to safely format dates
  const formatDateSafely = (dateString: string | undefined): string => {
    if (!dateString) return formatDistanceToNow(new Date(), { addSuffix: true });
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return formatDistanceToNow(new Date(), { addSuffix: true });
    }
  };

  // Render job details with collapsible content
  const renderJobDetails = (job: WorkerJob) => {
    const isExpanded = expandedJobId === job.id;
    
    return (
      <div key={job.id} className="rounded-lg border p-3 text-sm">
        <Collapsible
          open={isExpanded}
          onOpenChange={() => setExpandedJobId(isExpanded ? null : job.id)}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <div className="font-medium">{job.title}</div>
                {job.review && (
                  <div className="ml-2">
                    {renderStars(job.review.rating)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Calendar className="h-3 w-3" />
                <span>Completed {formatDistanceToNow(new Date(job.dateCompleted || job.datePosted), { addSuffix: true })}</span>
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent className="mt-2">
            <div className="space-y-2 pt-2 border-t mt-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-muted-foreground">Category</div>
                  <div className="font-medium">{job.category}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Payment</div>
                  <div className="font-medium">{formatCurrency(job.paymentAmount || 0)}</div>
                </div>
              </div>
              
              {job.location && (
                <div className="flex items-start gap-1 text-xs">
                  <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{job.location}</span>
                </div>
              )}
              
              {job.review && (
                <div className="bg-muted/50 p-2 rounded-md mt-2">
                  <div className="text-xs font-medium">Feedback from job poster:</div>
                  <p className="text-xs mt-1">{job.review.comment}</p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Worker Profile</CardTitle>
          <CardDescription>View this worker's experience and performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Worker profile section */}
          {worker && (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={worker.avatarUrl || undefined} alt={worker.fullName} />
                  <AvatarFallback>{worker.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-xl font-medium">{worker.fullName}</div>
                  <div className="text-sm text-muted-foreground">
                    Member since {formatDistanceToNow(new Date(worker.createdAt || Date.now()), { addSuffix: true })}
                  </div>
                  {renderSkills()}
                </div>
              </div>
              
              {onHire && (
                <Button 
                  className="mt-4 md:mt-0"
                  onClick={() => onHire(workerId)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Hire Worker
                </Button>
              )}
            </div>
          )}

          <Separator className="my-2" />
          
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="jobs">Job History</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 pt-4">
              {/* Performance metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="text-sm text-muted-foreground mb-1">Completed Jobs</div>
                  <div className="flex items-center">
                    <BriefcaseBusiness className="h-5 w-5 mr-1 text-blue-500" />
                    <span className="text-lg font-semibold">{metrics.completedJobs}</span>
                  </div>
                </div>
                
                <div className="rounded-lg border p-3">
                  <div className="text-sm text-muted-foreground mb-1">Success Rate</div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-lg font-semibold">{metrics.successRate}%</span>
                    </div>
                    <Progress value={metrics.successRate} className="h-2" />
                  </div>
                </div>
                
                <div className="rounded-lg border p-3">
                  <div className="text-sm text-muted-foreground mb-1">Rating</div>
                  <div>
                    {renderStars(metrics.averageRating)}
                  </div>
                </div>
                
                <div className="rounded-lg border p-3">
                  <div className="text-sm text-muted-foreground mb-1">Response Time</div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-1 text-blue-500" />
                    <span className="text-lg font-semibold">{metrics.responseTime} min</span>
                  </div>
                </div>
              </div>
              
              {/* Top categories/expertise */}
              {metrics.topCategories.length > 0 && (
                <div className="rounded-lg border p-4">
                  <h3 className="text-sm font-medium mb-2">Top Expertise</h3>
                  <div className="flex flex-wrap gap-2">
                    {metrics.topCategories.map((category, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Latest review */}
              {hasReviews && (
                <div className="rounded-lg border p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium">Latest Feedback</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setActiveTab('reviews')}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View All
                    </Button>
                  </div>
                  
                  <div className="bg-muted/30 rounded-md p-3">
                    <div className="flex justify-between items-start">
                      <div className="font-medium">{reviews[0].title || 'Job Review'}</div>
                      <div>{renderStars(reviews[0].rating)}</div>
                    </div>
                    <p className="text-sm mt-1">{reviews[0].comment || reviews[0].content}</p>
                    <div className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(reviews[0].dateCreated || reviews[0].dateReviewed || Date.now()), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              )}
              
              {!hasPastJobs && !hasReviews && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                  <div className="text-sm text-yellow-700 dark:text-yellow-400">
                    This worker has not completed any jobs or received reviews yet.
                  </div>
                </div>
              )}
            </TabsContent>
            
            {/* Jobs Tab */}
            <TabsContent value="jobs" className="space-y-4 pt-4">
              <h3 className="text-sm font-medium mb-2">Completed Jobs</h3>
              
              {!hasPastJobs && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No completed jobs yet
                </div>
              )}
              
              {hasPastJobs && (
                <div className="space-y-3">
                  {pastJobs.map((job) => renderJobDetails(job))}
                </div>
              )}
            </TabsContent>
            
            {/* Reviews Tab */}
            <TabsContent value="reviews" className="space-y-4 pt-4">
              <h3 className="text-sm font-medium mb-2">Client Reviews</h3>
              
              {!hasReviews && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No reviews yet
                </div>
              )}
              
              {hasReviews && (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <div key={review.id} className="rounded-lg border p-3">
                      <div className="flex justify-between items-start">
                        <div className="font-medium">{review.title || 'Job Review'}</div>
                        <div>{renderStars(review.rating)}</div>
                      </div>
                      <p className="text-sm mt-1">{review.comment || review.content}</p>
                      <div className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(review.dateCreated || review.dateReviewed || Date.now()), { addSuffix: true })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkerHistory;