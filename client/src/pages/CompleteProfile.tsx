import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { SKILLS } from '@shared/schema';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

// Define the schema for profile completion
const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function CompleteProfile() {
  const [_, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  
  // Get query parameters from URL if any
  const location = typeof window !== 'undefined' ? window.location : { search: '' };
  const params = new URLSearchParams(location.search);
  const userId = params.get('id');
  const provider = params.get('provider') || 'local';
  
  // State to hold profile data we might need to fetch
  const [profileData, setProfileData] = useState<ProfileFormValues>({
    fullName: '',
    phone: '',
    bio: '',
    skills: [],
  });
  
  // If we're coming directly from Google auth, we may need to fetch the user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (userId && !user) {
        try {
          // Fetch the user data if we have an ID from URL but no user in context
          const response = await apiRequest('GET', `/api/users/${userId}`);
          if (response.ok) {
            const userData = await response.json();
            setProfileData({
              fullName: userData.fullName || '',
              phone: userData.phone || '',
              bio: userData.bio || '',
              skills: userData.skills || [],
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };
    
    fetchUserData();
  }, [userId, user]);
  
  // Initialize form with user data if available, or profile data from fetch
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || profileData.fullName || '',
      phone: user?.phone || profileData.phone || '',
      bio: user?.bio || profileData.bio || '',
      skills: user?.skills || profileData.skills || [],
    },
  });
  
  // Update form when user data becomes available
  useEffect(() => {
    if (user) {
      form.reset({
        fullName: user.fullName || '',
        phone: user.phone || '',
        bio: user.bio || '',
        skills: user.skills || [],
      });
    } else if (profileData.fullName) {
      form.reset(profileData);
    }
  }, [user, profileData, form]);
  
  // Only redirect to auth if there's no user AND no userId in the URL
  useEffect(() => {
    if (!isLoading && !user && !userId) {
      setLocation('/auth');
    }
    // No need to redirect to account type selection anymore, as all users are workers
  }, [user, isLoading, setLocation, userId]);
  
  // Function to handle form submission
  async function onSubmit(data: ProfileFormValues) {
    setIsSubmitting(true);
    
    try {
      // Get the user ID from URL parameters (for social login flow) or from user object
      const params = new URLSearchParams(window.location.search);
      const idFromUrl = params.get('id');
      const userId = idFromUrl || (user?.id?.toString() || '');
      
      if (!userId) {
        throw new Error('No user ID available');
      }
      
      // Call API to update user profile, set account type to worker, and clear the requiresProfileCompletion flag
      const updatedData = {
        ...data,
        requiresProfileCompletion: false,
        accountType: 'worker' // Automatically set all accounts to worker type
      };
      
      const response = await apiRequest('PATCH', `/api/users/${userId}`, updatedData);
      
      if (response.ok) {
        // Update the cached user data if we're in an authenticated context
        const updatedUser = await response.json();
        if (user) {
          queryClient.setQueryData(['/api/user'], updatedUser);
        }
        
        toast({
          title: 'Profile Updated',
          description: 'Your profile has been successfully updated',
        });
        
        // Always redirect to home page
        setLocation('/');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Please provide a few more details about yourself to complete your profile
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Your phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell us about yourself" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="skills"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Skills</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Select all skills that apply to you
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {SKILLS.map(skill => (
                        <FormField
                          key={skill}
                          control={form.control}
                          name="skills"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={skill}
                                className="flex flex-row items-start space-x-2 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(skill)}
                                    onCheckedChange={(checked) => {
                                      const updatedSkills = checked
                                        ? [...(field.value || []), skill]
                                        : (field.value || []).filter(
                                            (value) => value !== skill
                                          );
                                      field.onChange(updatedSkills);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {skill}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Complete Profile'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        
        <CardFooter className="flex justify-center text-xs text-muted-foreground">
          You can update your profile information anytime from your account settings
        </CardFooter>
      </Card>
    </div>
  );
}