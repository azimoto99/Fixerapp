import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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

export default function Profile() {
  const { user, logout } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('info');
  
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                  <AvatarFallback className="text-2xl">{user.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
                
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
                  <Button variant="outline" className="w-full">
                    Edit Profile
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Tabs */}
          <Tabs defaultValue="info" onValueChange={setActiveTab} value={activeTab}>
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="info">Information</TabsTrigger>
              <TabsTrigger value="jobs">
                {user.accountType === 'poster' ? 'My Jobs' : 'Applications'}
              </TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
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
                      <div className="mt-2 flex flex-wrap gap-1">
                        {user.skills && user.skills.length > 0 ? (
                          user.skills.map((skill, index) => (
                            <Badge key={index} variant="secondary">
                              {skill}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-gray-500">No skills added</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline">Update Information</Button>
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
          </Tabs>
        </div>
      </main>
      
      <MobileNav />
    </div>
  );
}
