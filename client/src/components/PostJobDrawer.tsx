import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { insertJobSchema, JOB_CATEGORIES, SKILLS } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useGeolocation } from '@/lib/geolocation';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, DollarSign, Calendar, Check, X } from 'lucide-react';
import PaymentDetailsForm from '@/components/payments/JobPaymentForm';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { useQueryClient } from '@tanstack/react-query';
import TaskEditor, { TaskItemProps } from '@/components/TaskEditor';

// Form schema with validation
const formSchema = insertJobSchema.extend({
  paymentAmount: z.coerce
    .number()
    .min(10, 'Minimum payment amount is $10')
    .positive('Payment amount must be positive'),
  // Handle dateNeeded as string in the form and convert when needed
  dateNeeded: z.string(),
  // Ensure location is a string
  location: z.string().min(1, 'Please select a location'),
});

// Available skill options for the job
const SKILL_OPTIONS = [
  'Carpentry',
  'Plumbing',
  'Electrical',
  'Painting',
  'Cleaning',
  'Moving',
  'Gardening',
  'Pet Care',
  'Tech Support',
  'Assembly',
  'Delivery',
  'Tutoring',
  'Design',
  'Photography',
  'Web Development',
  'Writing',
  'Translation',
  'Cooking',
  'Event Planning',
  'Administrative',
];

interface PostJobDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PostJobDrawer({ isOpen, onOpenChange }: PostJobDrawerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userLocation } = useGeolocation();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [formData, setFormData] = useState<z.infer<typeof formSchema> | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskItemProps[]>([]);
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      category: JOB_CATEGORIES[0],
      paymentType: 'hourly',
      paymentAmount: 25,
      location: '',
      latitude: userLocation?.latitude || 37.7749,
      longitude: userLocation?.longitude || -122.4194,
      dateNeeded: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      requiredSkills: [],
      equipmentProvided: false,
      posterId: user?.id || 0
    }
  });

  // Function to calculate the total amount including service fee
  const calculateTotalAmount = (amount: number) => {
    return amount + 2.50;
  };

  // Handle form submission
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to post a job",
        variant: "destructive"
      });
      return;
    }

    setFormData(data);
    setShowPaymentForm(true);
  };

  // Handle payment success from the payment form
  const handlePaymentSuccess = async (paymentMethodId: string) => {
    if (!formData) return;
    
    setIsSubmitting(true);
    setPaymentMethodId(paymentMethodId);
    
    try {
      // Post the job data to the API
      const jobData = {
        ...formData,
        posterId: user?.id,
        dateNeeded: new Date(formData.dateNeeded).toISOString(),
        datePosted: new Date().toISOString(),
        status: 'open',
        paymentMethodId
      };
      
      const response = await apiRequest(
        'POST',
        '/api/jobs',
        jobData
      );
      
      const jobResponse = await response.json();
      
      // Add tasks if any
      if (tasks.length > 0) {
        for (const task of tasks) {
          await apiRequest(
            'POST',
            '/api/tasks',
            {
              jobId: jobResponse.id,
              title: task.title,
              description: task.description || '',
              status: 'pending',
              order: task.order
            }
          );
        }
      }
      
      // Reset the form and state
      form.reset();
      setTasks([]);
      setShowPaymentForm(false);
      
      // Close the drawer
      onOpenChange(false);
      
      // Invalidate jobs queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs/nearby/location'] });
      
      toast({
        title: "Job Posted",
        description: "Your job has been posted successfully!"
      });
      
      // Navigate to the job details page
      navigate(`/job/${jobResponse.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post job. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle payment cancellation
  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
  };

  // Handle location selection from autocomplete
  const handleLocationSelect = (location: any) => {
    if (location) {
      form.setValue('location', location.description);
      form.setValue('latitude', location.latitude);
      form.setValue('longitude', location.longitude);
    }
  };

  return (
    <>
      {/* Payment Details Dialog */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="sm:max-w-lg">
          {formData && (
            <PaymentDetailsForm
              amount={calculateTotalAmount(formData.paymentAmount)}
              jobTitle={formData.title}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentCancel={handlePaymentCancel}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] overflow-y-auto">
          <div className="mx-auto w-full max-w-lg">
            <DrawerHeader>
              <DrawerTitle className="text-2xl">Post a New Job</DrawerTitle>
              <DrawerDescription>
                Fill out the form below to post a new job. Preview how it will look to potential applicants.
              </DrawerDescription>
            </DrawerHeader>
            
            <div className="px-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {/* Job Title */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Lawn Mowing, Furniture Assembly" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Job Category */}
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {JOB_CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Job Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe the job in detail..." className="min-h-28" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Tasks */}
                  <div className="space-y-2">
                    <FormLabel>Tasks (Optional)</FormLabel>
                    <TaskList 
                      tasks={tasks} 
                      setTasks={setTasks} 
                      className="border rounded-md p-3"
                    />
                  </div>
                  
                  {/* Payment Type */}
                  <FormField
                    control={form.control}
                    name="paymentType"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Payment Type</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="hourly" />
                              </FormControl>
                              <FormLabel className="font-normal">Hourly Rate</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="fixed" />
                              </FormControl>
                              <FormLabel className="font-normal">Fixed Price</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Payment Amount */}
                  <FormField
                    control={form.control}
                    name="paymentAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {form.watch('paymentType') === 'hourly' ? 'Hourly Rate' : 'Fixed Price'}
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="number" min="0" className="pl-9" {...field} />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Price should reflect the complexity and time required for the job
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Location */}
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <AddressAutocomplete
                              onLocationSelect={handleLocationSelect}
                              defaultValue={field.value}
                              className="pl-9"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Date Needed */}
                  <FormField
                    control={form.control}
                    name="dateNeeded"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Needed</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="date" min={new Date().toISOString().split('T')[0]} className="pl-9" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Required Skills */}
                  <FormField
                    control={form.control}
                    name="requiredSkills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Required Skills</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={SKILL_OPTIONS.map(skill => ({ label: skill, value: skill }))}
                            selected={field.value.map(skill => ({ label: skill, value: skill }))}
                            onChange={(selected) => {
                              field.onChange(selected.map(item => item.value));
                            }}
                            placeholder="Select required skills..."
                            className="w-full"
                          />
                        </FormControl>
                        <FormDescription>
                          Select skills that are required for this job
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Equipment Provided */}
                  <FormField
                    control={form.control}
                    name="equipmentProvided"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Equipment Provided</FormLabel>
                          <FormDescription>
                            Check if you will provide necessary tools and equipment
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <DrawerFooter className="px-0">
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? 'Posting...' : 'Post Job'}
                    </Button>
                    <DrawerClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </form>
              </Form>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}