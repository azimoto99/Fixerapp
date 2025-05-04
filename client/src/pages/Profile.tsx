import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Award, Edit } from 'lucide-react';

import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Import profile components
import {
  ProfileImageUploader,
  SkillsManager,
  BadgesDisplay,
  ProfileEditor
} from '@/components/profile';

export default function Profile() {
  const { user, logoutMutation } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('info');
  const [editMode, setEditMode] = useState(false);
  
  // Redirect to login if not authenticated
  if (!user) {
    navigate('/login');
    return null;
  }
  
  // Get user's jobs based on account type
  const { data: userJobs } = useQuery({
    queryKey: [user.accountType === 'poster' 
      ? `/api/jobs?posterId=${user.id}` 
      : `/api/applications/worker/${user.id}`
    ],
    enabled: !!user,
  });
  
  // Get user's badges
  const { data: userBadges = [] } = useQuery({
    queryKey: [`/api/users/${user.id}/badges`],
    enabled: !!user,
  });

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate('/login');
      }
    });
  };
  
  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              {editMode ? (
                <ProfileEditor 
                  user={user} 
                  onCancel={toggleEditMode}
                />
              ) : (
                <div className="flex flex-col md:flex-row md:items-center">
                  <div className="flex flex-col items-center md:items-start">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                      <AvatarFallback className="text-2xl bg-primary text-white">
                        {user.fullName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {userBadges && userBadges.length > 0 && (
                      <div className="flex mt-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-xs flex items-center gap-1 hover:bg-transparent p-0"
                          onClick={() => setActiveTab('badges')}
                        >
                          <Award className="h-3 w-3 text-primary" />
                          {userBadges.length} {userBadges.length === 1 ? 'Badge' : 'Badges'}
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 md:mt-0 md:ml-6 flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">{user.fullName}</h1>
                    <div className="flex items-center mt-1">
                      <Badge variant={user.accountType === 'worker' ? 'primary' : 'secondary'}>
                        {user.accountType === 'worker' ? 'Worker' : 'Job Poster'}
                      </Badge>
                      {user.rating && (
                        <div className="ml-4 flex items-center text-sm">
                          <i className="ri-star-fill text-yellow-400 mr-1"></i>
                          <span>{user.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-gray-600">{user.bio || 'No bio available'}</p>
                  </div>
                  
                  <div className="mt-4 md:mt-0 flex flex-col space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full flex items-center gap-1"
                      onClick={toggleEditMode}
                    >
                      <Edit className="h-4 w-4" />
                      Edit Profile
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleLogout}
                      disabled={logoutMutation.isPending}
                    >
                      {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Tabs */}
          {!editMode && (
            <Tabs defaultValue="info" onValueChange={setActiveTab} value={activeTab}>
              <TabsList className="grid grid-cols-4 mb-6">
                <TabsTrigger value="info">Information</TabsTrigger>
                <TabsTrigger value="jobs">
                  {user.accountType === 'poster' ? 'My Jobs' : 'Applications'}
                </TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="badges">Badges</TabsTrigger>
              </TabsList>
              
              {/* Information Tab */}
              <TabsContent value="info">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Your personal and contact information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Email</h3>
                      <p className="mt-1">{user.email}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                      <p className="mt-1">{user.phone || 'No phone number provided'}</p>
                    </div>
                    
                    {user.accountType === 'worker' && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Skills</h3>
                        <div className="mt-2">
                          <SkillsManager user={user} readOnly={true} />
                        </div>
                      </div>
                    )}
                    
                    {user.accountType === 'worker' && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Performance Metrics</h3>
                        <div className="mt-2 grid grid-cols-3 gap-4">
                          <div className="bg-gray-50 p-3 rounded-md">
                            <p className="text-xs text-gray-500">Completed Jobs</p>
                            <p className="text-lg font-semibold">{user.completedJobs || 0}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <p className="text-xs text-gray-500">Success Rate</p>
                            <p className="text-lg font-semibold">{user.successRate ? `${user.successRate}%` : 'N/A'}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <p className="text-xs text-gray-500">Response Time</p>
                            <p className="text-lg font-semibold">{user.responseTime ? `${user.responseTime}h` : 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" onClick={toggleEditMode}>Update Information</Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              {/* Jobs/Applications Tab */}
              <TabsContent value="jobs">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {user.accountType === 'poster' ? 'My Job Postings' : 'My Applications'}
                    </CardTitle>
                    <CardDescription>
                      {user.accountType === 'poster' 
                        ? 'Jobs you have posted on the platform' 
                        : 'Jobs you have applied for'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!userJobs || userJobs.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-4">
                          {user.accountType === 'poster' 
                            ? 'You haven\'t posted any jobs yet.' 
                            : 'You haven\'t applied to any jobs yet.'}
                        </p>
                        {user.accountType === 'poster' ? (
                          <Link href="/post-job">
                            <Button>Post a Job</Button>
                          </Link>
                        ) : (
                          <Link href="/">
                            <Button>Find Jobs</Button>
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* This would render list of jobs or applications */}
                        <p className="text-gray-500 text-center py-4">No data to display</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Reviews Tab */}
              <TabsContent value="reviews">
                <Card>
                  <CardHeader>
                    <CardTitle>Reviews</CardTitle>
                    <CardDescription>Reviews from your completed jobs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <p className="text-gray-500">You don't have any reviews yet.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Badges Tab */}
              <TabsContent value="badges">
                <Card>
                  <CardHeader>
                    <CardTitle>My Badges</CardTitle>
                    <CardDescription>Badges you've earned for your accomplishments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BadgesDisplay userId={user.id} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
      
      <MobileNav />
    </div>
  );
}
