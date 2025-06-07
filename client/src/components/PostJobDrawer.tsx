import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { insertJobSchema, JOB_CATEGORIES, SKILLS, insertTaskSchema, type InsertTask } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useGeolocation } from '@/lib/geolocation';
import { AddressAutocompleteInput } from '@/components/AddressAutocompleteInput';
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
import { Badge } from '@/components/ui/badge';
import { MapPin, DollarSign, Calendar, Check, ListChecks, Clock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import TaskEditor, { Task } from '@/components/TaskEditor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePaymentDialog } from '@/components/payments/PaymentDialogManager';
import PostJobSuccessModal from '@/components/PostJobSuccessModal';

// Form schema with enhanced validation and formatting
const formSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters')
    .transform(val => val.trim()), // Remove trailing whitespace
  description: z.string()
    .min(5, 'Description must be at least 5 characters')
    .max(5000, 'Description must be less than 5000 characters')
    .transform(val => val.trim()), // Remove trailing whitespace
  category: z.string().min(1, 'Please select a category'),
  posterId: z.number(),
  status: z.string().default('pending'),
  paymentType: z.string().min(1, 'Please select a payment type'),
  paymentAmount: z.coerce
    .number()
    .min(10, 'Minimum payment amount is $10')
    .max(10000, 'Maximum payment amount is $10,000')
    .positive('Payment amount must be positive')
    .transform(val => Math.round(val * 100) / 100), // Round to 2 decimal places
  location: z.string()
    .min(1, 'Location is required')
    .transform(val => val.trim()), // Ensure location is properly trimmed
  latitude: z.number()
    .min(-90, 'Invalid latitude')
    .max(90, 'Invalid latitude')
    .transform(val => Number(val.toFixed(6))), // Format to 6 decimal places
  longitude: z.number()
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude')
    .transform(val => Number(val.toFixed(6))), // Format to 6 decimal places
  dateNeeded: z.string().min(1, 'Date needed is required'), // Keep as ISO string format
  requiredSkills: z.array(z.string()).default([]),
  equipmentProvided: z.boolean().default(false),
  autoAccept: z.boolean().default(false),
  shiftStartTime: z.string().optional(),
  shiftEndTime: z.string().optional(),
  paymentMethodId: z.string().optional(),
  autoAcceptApplicants: z.boolean().default(false),
  isTestJob: z.boolean().default(false),
});

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
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [pendingJobData, setPendingJobData] = useState<any>(null);
  const { openPaymentMethodsDialog } = usePaymentDialog();
  
  // For success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<number | null>(null);
  const [createdJobTitle, setCreatedJobTitle] = useState<string>('');

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
      posterId: user?.id || 0,
      isTestJob: false
    }
  });

  const handleTasksChange = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    console.log('PostJobDrawer form submitted with data:', data);
    
    if (!user) {
      console.warn('No user found when submitting job');
      toast({
        title: "Login Required",
        description: "Please login to post a job",
        variant: "destructive"
      });
      return;
    }

    // Validate location is provided
    if (!data.location || data.location.trim().length === 0) {
      toast({
        title: "Location Required",
        description: "Please provide a location for your job",
        variant: "destructive"
      });
      return;
    }

    // Validate date is in the future
    const selectedDate = new Date(data.dateNeeded);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      toast({
        title: "Invalid Date",
        description: "Please select a future date for your job",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Final data formatting and validation before submission
      const jobDataToSubmit = {
        ...data,
        // Format all text fields
        title: data.title.trim().replace(/\b\w/g, c => c.toUpperCase()),
        description: data.description.trim(),
        location: data.location.trim(),
        // Ensure we have properly formatted numbers
        latitude: Number(Number(data.latitude).toFixed(6)),
        longitude: Number(Number(data.longitude).toFixed(6)),
        paymentAmount: Number(Number(data.paymentAmount).toFixed(2)),
        // Ensure posterId is set
        posterId: user.id,
      };
      
      // Check if this is a test job
      if (data.isTestJob) {
        console.log('Processing test job - bypassing payment');
        await processTestJob(jobDataToSubmit);
        return;
      }
      
      // Store the pending job data
      setPendingJobData(jobDataToSubmit);
      
      // Open the payment method selection dialog
      openPaymentMethodsDialog({
        onSelect: (paymentMethodId) => {
          console.log('Payment method selected:', paymentMethodId);
          
          // Update the form with the selected payment method
          form.setValue('paymentMethodId', paymentMethodId);
          
          // Continue with submission
          const updatedData = {
            ...jobDataToSubmit,
            paymentMethodId
          };
          processPaymentAndCreateJob(updatedData);
        },
        onClose: () => {
          console.log('Payment method dialog closed without selection');
          setIsSubmitting(false);
          toast({
            title: "Payment Method Required",
            description: "You need to select a payment method to post a job",
            variant: "destructive"
          });
        }
      });
    } catch (error) {
      console.error('Error in job posting preparation:', error);
      setIsSubmitting(false);
      toast({
        title: "Job Posting Failed",
        description: error instanceof Error ? error.message : "Failed to prepare job posting",
        variant: "destructive"
      });
    }
  };
  
  // Function to process test job without payment
  const processTestJob = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Calculate total amount (payment amount + service fee)
      const serviceFee = 2.5; // Default service fee
      const totalAmount = data.paymentAmount + serviceFee;
      
      // Create test job without payment processing
      const payload = { 
        ...data, 
        tasks, 
        isTestJob: true,
        serviceFee,
        totalAmount
      };
      const response = await apiRequest('POST', '/api/jobs/test', payload);
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to post test job');
      }
      
      const result = await response.json();
      
      // Show success
      toast({ 
        title: 'Test Job Posted', 
        description: 'Your test job has been posted successfully (no payment required)' 
      });
      
      // Reset form and close drawer
      form.reset();
      setTasks([]);
      onOpenChange(false);
      
      // Show success modal
      setShowSuccessModal(true);
      setCreatedJobId(result.job.id);
      setCreatedJobTitle(result.job.title);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      
    } catch (error) {
      console.error('Error posting test job:', error);
      const msg = error instanceof Error ? error.message : 'Error posting test job';
      toast({ 
        title: 'Error', 
        description: msg, 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Function to process payment and create job
  const processPaymentAndCreateJob = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Delegate job creation and payment to server
      const payload = { ...data, tasks };
      const response = await apiRequest('POST', '/api/jobs/payment-first', payload);
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to post job');
      }
      
      const result = await response.json();
      
      // Show success
      toast({ 
        title: 'Job Posted', 
        description: 'Your job has been posted successfully' 
      });
      
      // Reset form and close drawer
      form.reset();
      setTasks([]);
      onOpenChange(false);
      
      // Show success modal
      setShowSuccessModal(true);
      setCreatedJobId(result.job.id);
      setCreatedJobTitle(result.job.title);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      
    } catch (error) {
      console.error('Error posting job:', error);
      const msg = error instanceof Error ? error.message : 'Error posting job';
      toast({ 
        title: 'Error', 
        description: msg, 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PostJobSuccessModal 
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        jobId={createdJobId || 0}
        jobTitle={createdJobTitle}
      />
      
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh] flex flex-col">
          <DrawerHeader className="border-b border-border">
            <DrawerTitle>Post a New Job</DrawerTitle>
            <DrawerDescription>
              Fill out the details for your job posting.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-4 pb-16">
            <Form {...form}>
              <form id="post-job-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 relative">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Lawn Mowing" 
                          onChange={(e) => {
                            // Auto-capitalize first letter of each word
                            const value = e.target.value.replace(/\b\w/g, (char) => char.toUpperCase());
                            field.onChange(value);
                          }}
                          onBlur={(e) => {
                            // Final trim and formatting on blur
                            const value = e.target.value.trim();
                            // Ensure first letter is capitalized and limit to 100 chars
                            const formattedValue = value.charAt(0).toUpperCase() + value.slice(1, 100);
                            field.onChange(formattedValue);
                          }}
                          value={field.value}
                        />
                      </FormControl>
                      <FormMessage />
                      <FormDescription>
                        {field.value?.length || 0}/100 characters
                      </FormDescription>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the job in detail..." 
                          className="min-h-[100px]"
                          onChange={(e) => {
                            // Allow regular typing with spaces
                            const value = e.target.value;
                            field.onChange(value);
                          }}
                          onBlur={(e) => {
                            // Final trim on blur
                            const cleanValue = e.target.value.trim();
                            field.onChange(cleanValue);
                          }}
                          value={field.value}
                        />
                      </FormControl>
                      <FormMessage />
                      <FormDescription>
                        {field.value?.length || 0}/5000 characters
                      </FormDescription>
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent position="popper" sideOffset={4}>
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
                  
                  <FormField
                    control={form.control}
                    name="requiredSkills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Required Skills (Optional)</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            const currentSkills = field.value || [];
                            if (!currentSkills.includes(value)) {
                              field.onChange([...currentSkills, value]);
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select skills" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent position="popper" sideOffset={4}>
                            {SKILLS.filter(skill => !field.value?.includes(skill)).map((skill) => (
                              <SelectItem key={skill} value={skill}>
                                {skill}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          {field.value?.map((skill) => (
                            <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                              {skill}
                              <button 
                                type="button"
                                className="ml-1 rounded-full hover:bg-secondary h-4 w-4 inline-flex items-center justify-center text-xs"
                                onClick={() => {
                                  field.onChange(field.value?.filter(s => s !== skill));
                                }}
                              >
                                ✕
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="fixed" id="fixed" />
                              <label htmlFor="fixed" className="font-medium cursor-pointer">Fixed Price</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="hourly" id="hourly" />
                              <label htmlFor="hourly" className="font-medium cursor-pointer">Hourly Rate</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="paymentAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Amount ($)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              min="5"
                              step="0.01"
                              className="pl-9"
                              placeholder="0.00"
                              onChange={(e) => {
                                // Format to 2 decimal places and parse to number
                                const value = e.target.value;
                                const numValue = parseFloat(value);
                                if (!isNaN(numValue)) {
                                  // Only update if it's a valid number
                                  field.onChange(numValue);
                                } else {
                                  field.onChange(0);
                                }
                              }}
                              value={field.value === 0 ? '' : field.value}
                              onBlur={(e) => {
                                // On blur, format to 2 decimal places for display
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value)) {
                                  field.onChange(parseFloat(value.toFixed(2)));
                                }
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                        <FormDescription>
                          {form.watch('paymentType') === 'fixed' 
                            ? 'Total amount for the job'
                            : 'Hourly rate'
                          }
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Location</FormLabel>
                        <FormControl>
                          <AddressAutocompleteInput
                            value={field.value}
                            onChange={(value, latitude, longitude) => {
                              // Update the location field with the address
                              field.onChange(value);
                              
                              // If coordinates are provided, update them too
                              if (latitude && longitude) {
                                // Format to exactly 6 decimal places
                                const formattedLat = Number(latitude.toFixed(6));
                                const formattedLng = Number(longitude.toFixed(6));
                                
                                // Update the form with the geocoded coordinates
                                form.setValue('latitude', formattedLat);
                                form.setValue('longitude', formattedLng);
                                console.log(`Location geocoded: ${value} => [${formattedLat}, ${formattedLng}]`);
                              }
                            }}
                            placeholder="Enter job address, city, or coordinates"
                            className="w-full"
                          />
                        </FormControl>
                        <FormDescription>
                          Enter a street address, city name, or coordinates (latitude,longitude)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="dateNeeded"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Needed</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="date"
                              className="pl-9"
                              min={new Date().toISOString().split('T')[0]}
                              onChange={(e) => {
                                // Make sure we have a valid date
                                const inputDate = e.target.value;
                                if (inputDate) {
                                  try {
                                    // Ensure date is properly formatted as ISO string (YYYY-MM-DD)
                                    const date = new Date(inputDate);
                                    const formattedDate = date.toISOString().split('T')[0];
                                    field.onChange(formattedDate);
                                  } catch (error) {
                                    // If date is invalid, keep the current value
                                    console.error("Invalid date format:", error);
                                  }
                                } else {
                                  // Default to tomorrow if empty
                                  const tomorrow = new Date();
                                  tomorrow.setDate(tomorrow.getDate() + 1);
                                  field.onChange(tomorrow.toISOString().split('T')[0]);
                                }
                              }}
                              value={field.value}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                        <FormDescription>
                          When do you need this job completed?
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
                
                {form.watch('paymentType') === 'hourly' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="shiftStartTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shift Start Time</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="time"
                                className="pl-9"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                          <FormDescription>
                            When the shift is scheduled to start
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="shiftEndTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shift End Time</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="time"
                                className="pl-9"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                          <FormDescription>
                            When the shift is scheduled to end
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                <FormField
                  control={form.control}
                  name="equipmentProvided"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 border border-border">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer">
                          Equipment Provided
                        </FormLabel>
                        <FormDescription>
                          Check if you will provide the equipment needed for this job
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="autoAcceptApplicants"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mb-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer">
                          Auto-accept applicants
                        </FormLabel>
                        <FormDescription>
                          Automatically accept qualified workers without manual review
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isTestJob"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mb-4 bg-yellow-50 border-yellow-200">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer text-yellow-800">
                          Test Job (No Payment Required)
                        </FormLabel>
                        <FormDescription className="text-yellow-700">
                          Post this job for testing purposes without payment processing. Test jobs are marked clearly and can be used to test functionality.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="bg-muted/30 p-3 rounded-md border border-border mb-4">
                  <div className="flex items-center mb-2">
                    <ListChecks className="mr-2 h-5 w-5 text-primary" />
                    <span className="font-medium">
                      Job Tasks (Optional)
                    </span>
                  </div>
                  
                  {/* Task Editor */}
                  <div className="mb-4">
                    <TaskEditor
                      tasks={tasks}
                      onChange={handleTasksChange}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </form>
            </Form>
          </div>
          
          <DrawerFooter className="border-t border-border">
            <Button 
              type="submit"
              form="post-job-form"
              className="bg-primary text-primary-foreground hover:bg-primary/90" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Posting...' : 'Post Job'}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="border-border hover:bg-accent hover:text-accent-foreground">
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}