import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  User,
  MapPin,
  Calendar,
  Star,
  Award,
  MessageCircle,
  Check,
  Clock,
  Briefcase,
  CheckCircle2,
  DollarSign,
  UserPlus
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const userId = parseInt(id);
  const { user: currentUser } = useAuth();
  const [_, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('about');
  const isOwnProfile = currentUser?.id === userId;
  
  // Fetch user profile
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['/api/users', userId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/users/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      return response.json();
    },
    enabled: !!userId,
  });
  
  // Fetch user's posted jobs (if job poster)
  const { data: postedJobs = [] } = useQuery({
    queryKey: ['/api/jobs/posted', userId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/jobs/posted/${userId}`);
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    enabled: !!userId,
  });
  
  // Fetch user's completed jobs (if worker)
  const { data: completedJobs = [] } = useQuery({
    queryKey: ['/api/jobs/completed', userId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/jobs/completed/${userId}`);
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    enabled: !!userId,
  });
  
  // Fetch user's badges
  const { data: badges = [] } = useQuery({
    queryKey: ['/api/users', userId, 'badges'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/users/${userId}/badges`);
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    enabled: !!userId,
  });
  
  // Fetch user's reviews
  const { data: reviews = [] } = useQuery({
    queryKey: ['/api/users', userId, 'reviews'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/users/${userId}/reviews`);
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    enabled: !!userId,
  });
  
  // Calculate average rating
  const calculateAverageRating = () => {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((total: number, review: any) => total + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };
  
  const averageRating = calculateAverageRating();
  
  // Handle add to contacts
  const handleAddContact = () => {
    if (profile) {
      apiRequest('POST', '/api/contacts/add', {
        username: profile.username
      })
      .then(response => {
        if (response.ok) {
          alert('Contact added successfully!');
        } else {
          alert('Failed to add contact');
        }
      });
    }
  };
  
  // Handle message user
  const handleMessageUser = () => {
    // Open messaging drawer with this user pre-selected
    window.dispatchEvent(new CustomEvent('open-messaging', { 
      detail: { userId: userId }
    }));
  };
  
  if (loadingProfile) {
    return (
      <div className="container mx-auto p-4 min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
        <p className="text-muted-foreground mb-6">The user you're looking for doesn't exist or is unavailable.</p>
        <Button onClick={() => navigate('/')}>Go Back Home</Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 pb-16">
      {/* Profile header */}
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        <div className="md:w-1/3">
          <Card>
            <CardHeader className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage src={profile.profileImage} alt={profile.username} />
                <AvatarFallback className="text-xl">
                  {profile.username?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl">{profile.fullName || profile.username}</CardTitle>
              <CardDescription>@{profile.username}</CardDescription>
              
              <div className="flex justify-center mt-2">
                {profile.accountType === 'worker' && (
                  <Badge variant="secondary" className="mr-2">Worker</Badge>
                )}
                {profile.accountType === 'poster' && (
                  <Badge variant="secondary" className="mr-2">Job Poster</Badge>
                )}
                {profile.isAdmin && (
                  <Badge variant="destructive">Admin</Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                {profile.location && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">{profile.location}</span>
                  </div>
                )}
                
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">
                    Joined {profile.createdAt ? format(new Date(profile.createdAt), 'MMM yyyy') : 'Recently'}
                  </span>
                </div>
                
                {profile.accountType === 'worker' && (
                  <div className="flex items-center">
                    <Star className="h-4 w-4 mr-2 text-yellow-500" />
                    <span className="text-sm">
                      {averageRating} Rating ({reviews.length} reviews)
                    </span>
                  </div>
                )}
                
                {profile.jobCompletionCount !== undefined && (
                  <div className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-sm">
                      {profile.jobCompletionCount} Jobs Completed
                    </span>
                  </div>
                )}
              </div>
              
              {!isOwnProfile && (
                <div className="mt-6 space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleMessageUser}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                  
                  <Button 
                    variant="default" 
                    className="w-full"
                    onClick={handleAddContact}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add to Contacts
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="md:w-2/3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="jobs">
                {profile.accountType === 'worker' ? 'Completed Jobs' : 'Posted Jobs'}
              </TabsTrigger>
              <TabsTrigger value="skills">Skills & Badges</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>
            
            <TabsContent value="about" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>About {profile.fullName || profile.username}</CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.bio ? (
                    <p className="text-sm whitespace-pre-line">{profile.bio}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No bio information available.
                    </p>
                  )}
                  
                  {profile.hourlyRate && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-1">Hourly Rate</h4>
                      <p className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1 text-green-500" />
                        ${profile.hourlyRate.toFixed(2)}/hour
                      </p>
                    </div>
                  )}
                  
                  {isOwnProfile && (
                    <div className="mt-6">
                      <Button variant="outline" onClick={() => navigate('/settings')}>
                        Edit Profile
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="jobs" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {profile.accountType === 'worker' ? 'Completed Jobs' : 'Posted Jobs'}
                  </CardTitle>
                  <CardDescription>
                    {profile.accountType === 'worker' 
                      ? `Jobs completed by ${profile.username}`
                      : `Jobs posted by ${profile.username}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(profile.accountType === 'worker' ? completedJobs : postedJobs).length > 0 ? (
                    <div className="space-y-4">
                      {(profile.accountType === 'worker' ? completedJobs : postedJobs).map((job: any) => (
                        <div key={job.id} className="border rounded-md p-3 hover:bg-muted transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{job.title}</h3>
                              <p className="text-sm text-muted-foreground truncate max-w-[400px]">
                                {job.description}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {job.location}
                                </span>
                                <span className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {job.dateNeeded ? format(new Date(job.dateNeeded), 'MMM d, yyyy') : 'Flexible'}
                                </span>
                                <span className="flex items-center">
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  ${job.paymentAmount}
                                  {job.paymentType === 'hourly' ? '/hr' : ' total'}
                                </span>
                              </div>
                            </div>
                            <Badge variant={job.status === 'completed' ? 'secondary' : 'default'}>
                              {job.status === 'open' && 'Open'}
                              {job.status === 'assigned' && 'Assigned'}
                              {job.status === 'in_progress' && 'In Progress'}
                              {job.status === 'completed' && 'Completed'}
                              {job.status === 'canceled' && 'Canceled'}
                            </Badge>
                          </div>
                          
                          {job.completionDate && (
                            <div className="text-xs text-muted-foreground mt-2">
                              Completed on {format(new Date(job.completionDate), 'MMM d, yyyy')}
                            </div>
                          )}
                          
                          <div className="mt-3">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs h-7 px-2"
                              onClick={() => navigate(`/job/${job.id}/details`)}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>
                        {profile.accountType === 'worker' 
                          ? 'No completed jobs yet'
                          : 'No jobs posted yet'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="skills" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Skills & Badges</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Skills section */}
                  {profile.skills && profile.skills.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-medium mb-2">Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.skills.map((skill: any, index: number) => (
                          <div key={index} className="flex items-center">
                            <Badge variant="outline" className="mr-1">
                              {skill.name}
                            </Badge>
                            {skill.isVerified && (
                              <Check className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Badges section */}
                  {badges.length > 0 ? (
                    <div>
                      <h3 className="font-medium mb-2">Earned Badges</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {badges.map((badge: any) => (
                          <div key={badge.id} className="border rounded-md p-3 text-center">
                            <Award className="h-8 w-8 mx-auto mb-2 text-primary" />
                            <h4 className="font-medium text-sm">{badge.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {badge.description}
                            </p>
                            <p className="text-xs mt-2">
                              Earned on {format(new Date(badge.awardedAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No badges earned yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="reviews" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Reviews</CardTitle>
                  {reviews.length > 0 && (
                    <CardDescription>
                      {averageRating}/5 from {reviews.length} reviews
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map((review: any) => (
                        <div key={review.id} className="border rounded-md p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center">
                              <Avatar className="h-8 w-8 mr-2">
                                <AvatarImage src={review.reviewerImage} alt={review.reviewerName} />
                                <AvatarFallback>
                                  {review.reviewerName?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{review.reviewerName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(review.createdAt), 'MMM d, yyyy')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-500 mr-1" />
                              <span className="font-medium">{review.rating}</span>
                              <span className="text-xs text-muted-foreground">/5</span>
                            </div>
                          </div>
                          
                          <p className="text-sm whitespace-pre-line">{review.comment}</p>
                          
                          {review.jobTitle && (
                            <div className="mt-2 text-xs">
                              <span className="text-muted-foreground">For job: </span>
                              <span className="font-medium">{review.jobTitle}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No reviews yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;