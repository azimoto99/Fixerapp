import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { User, ContactPreferences, Availability } from '@shared/schema';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Card, 
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Check, Mail, Phone, Bell, Calendar, Clock } from 'lucide-react';
import { ProfileImageUploader } from './ProfileImageUploader';
import { SkillsManager } from './SkillsManager';

interface ProfileEditorProps {
  user: User;
  onCancel: () => void;
}

const profileFormSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  // Contact preferences
  contactPreferences: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
    push: z.boolean().default(true),
  }),
  // Availability
  availability: z.object({
    weekdays: z.array(z.boolean()).length(5),
    weekend: z.array(z.boolean()).length(2),
    hourStart: z.number().min(0).max(23),
    hourEnd: z.number().min(1).max(24),
  }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfileEditor({ user, onCancel }: ProfileEditorProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("basic");

  // Build default values for form, including new fields
  const defaultContactPreferences: ContactPreferences = {
    email: user.contactPreferences?.email ?? true,
    sms: user.contactPreferences?.sms ?? false,
    push: user.contactPreferences?.push ?? true,
  };

  const defaultAvailability: Availability = {
    weekdays: user.availability?.weekdays ?? [true, true, true, true, true],
    weekend: user.availability?.weekend ?? [false, false],
    hourStart: user.availability?.hourStart ?? 9,
    hourEnd: user.availability?.hourEnd ?? 17,
  };

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      bio: user.bio || '',
      contactPreferences: defaultContactPreferences,
      availability: defaultAvailability,
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const response = await apiRequest(
        'PATCH',
        `/api/users/${user.id}`,
        values
      );
      return response.json();
    },
    onSuccess: (updatedUser) => {
      // Update the cache with new user data
      queryClient.setQueryData(['/api/user'], updatedUser);
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      });
      
      setIsSubmitting(false);
      onCancel(); // Close the editor
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
      
      setIsSubmitting(false);
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    setIsSubmitting(true);
    updateProfileMutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="contact">Contact Preferences</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
          </TabsList>
          
          {/* Basic Info Tab */}
          <TabsContent value="basic">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/3 flex justify-center">
                <ProfileImageUploader user={user} />
              </div>
              
              <div className="md:w-2/3 space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Your email" {...field} />
                      </FormControl>
                      <FormMessage />
                      {!user.emailVerified && (
                        <div className="mt-1 text-sm text-orange-600 flex items-center">
                          <span className="mr-2">Not verified</span>
                          <Button size="sm" variant="outline" type="button" className="h-7 text-xs">
                            Verify Email
                          </Button>
                        </div>
                      )}
                      {user.emailVerified && (
                        <div className="mt-1 text-sm text-green-600 flex items-center">
                          <Check className="h-4 w-4 mr-1" /> Verified
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="Your phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                      {field.value && !user.phoneVerified && (
                        <div className="mt-1 text-sm text-orange-600 flex items-center">
                          <span className="mr-2">Not verified</span>
                          <Button size="sm" variant="outline" type="button" className="h-7 text-xs">
                            Verify Phone
                          </Button>
                        </div>
                      )}
                      {field.value && user.phoneVerified && (
                        <div className="mt-1 text-sm text-green-600 flex items-center">
                          <Check className="h-4 w-4 mr-1" /> Verified
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us about yourself"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Brief description about yourself and your experience
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {user.accountType === 'worker' && (
                  <div>
                    <FormLabel>Skills</FormLabel>
                    <div className="mt-2">
                      <SkillsManager user={user} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* Contact Preferences Tab */}
          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Contact Preferences</CardTitle>
                <CardDescription>
                  Choose how you would like to be notified about new jobs, messages, and updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="contactPreferences.email"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center">
                          <Mail className="h-4 w-4 mr-2" />
                          Email Notifications
                        </FormLabel>
                        <FormDescription>
                          Receive notifications about new jobs and messages via email
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contactPreferences.sms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center">
                          <Phone className="h-4 w-4 mr-2" />
                          SMS Notifications
                        </FormLabel>
                        <FormDescription>
                          Receive text messages for urgent notifications and updates
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!user.phone}
                        />
                      </FormControl>
                      {!user.phone && (
                        <FormDescription className="text-orange-600 text-xs absolute right-20">
                          Add phone number first
                        </FormDescription>
                      )}
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contactPreferences.push"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center">
                          <Bell className="h-4 w-4 mr-2" />
                          Push Notifications
                        </FormLabel>
                        <FormDescription>
                          Receive push notifications in the mobile app
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Availability Tab */}
          <TabsContent value="availability">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Work Availability</CardTitle>
                <CardDescription>
                  Set your regular working hours to help match you with appropriate jobs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Days Available
                  </h3>
                  <div className="grid grid-cols-7 gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                      // First 5 are weekdays, last 2 are weekend
                      const isWeekend = index >= 5;
                      const fieldName = isWeekend ? 
                        `availability.weekend.${index - 5}` : 
                        `availability.weekdays.${index}`;
                      
                      return (
                        <FormField
                          key={day}
                          control={form.control}
                          name={fieldName as any} // TypeScript workaround for indexed access
                          render={({ field }) => (
                            <FormItem className="flex flex-col items-center space-y-2">
                              <FormLabel>{day}</FormLabel>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  className="h-6 w-6"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      );
                    })}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Hours Available
                  </h3>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <FormField
                        control={form.control}
                        name="availability.hourStart"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Time</FormLabel>
                            <Select 
                              value={field.value.toString()} 
                              onValueChange={(value) => field.onChange(parseInt(value))}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select start time" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.from({ length: 24 }).map((_, i) => (
                                  <SelectItem key={i} value={i.toString()}>
                                    {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div>
                      <FormField
                        control={form.control}
                        name="availability.hourEnd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Time</FormLabel>
                            <Select 
                              value={field.value.toString()} 
                              onValueChange={(value) => field.onChange(parseInt(value))}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select end time" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.from({ length: 24 }).map((_, i) => {
                                  const hour = i + 1;
                                  return (
                                    <SelectItem key={hour} value={hour.toString()}>
                                      {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}