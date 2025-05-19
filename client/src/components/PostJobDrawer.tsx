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
import { MapPin, DollarSign, Calendar, Check, ListChecks } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import TaskEditor, { Task } from '@/components/TaskEditor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePaymentDialog } from '@/components/payments/PaymentDialogManager';
import PostJobSuccessModal from '@/components/PostJobSuccessModal';

// Form schema with validation
const formSchema = insertJobSchema.extend({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  paymentAmount: z.coerce
    .number()
    .min(5, 'Minimum payment amount is $5')
    .positive('Payment amount must be positive'),
  dateNeeded: z.string(),
  paymentMethodId: z.string().optional(),
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
      posterId: user?.id || 0
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

    // All job types require a payment method
    if (!data.paymentMethodId) {
      console.log('Job posting requires payment method selection');
      
      // Store the pending job data
      setPendingJobData(data);
      
      // Open the payment method selection dialog
      openPaymentMethodsDialog({
        onSelect: (paymentMethodId) => {
          console.log('Payment method selected:', paymentMethodId);
          
          // Update the form with the selected payment method
          form.setValue('paymentMethodId', paymentMethodId);
          
          // Log to confirm we received the payment method ID
          console.log(`Received payment method ID: ${paymentMethodId}`);
          console.log(`Job will proceed with payment method: ${paymentMethodId}`);
          
          // Continue with submission
          const updatedData = {
            ...data,
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
      
      return;
    }
    
    // For hourly jobs or if we already have a payment method
    await processPaymentAndCreateJob(data);
  };
  
  // Function to process payment and create job
  const processPaymentAndCreateJob = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    try {
      // Create the job first
      const jobData = {
        ...data,
        posterId: user?.id,
        // Ensure we have proper coordinates from Mapbox
        latitude: data.latitude ? Number(data.latitude) : userLocation?.latitude || 37.7749,
        longitude: data.longitude ? Number(data.longitude) : userLocation?.longitude || -122.4194,
        // Format payment amount as number
        paymentAmount: Number(data.paymentAmount),
        // Format the date as an ISO string which the server can handle
        dateNeeded: data.dateNeeded ? new Date(data.dateNeeded).toISOString() : new Date().toISOString(),
        // Don't set datePosted, the database will default it to now()
        status: 'pending_payment' // Start as pending until payment is processed
      };
      
      console.log('Creating job with data:', jobData);
      
      // Create the job first
      const jobResponse = await apiRequest('POST', '/api/jobs', jobData);
      
      if (!jobResponse.ok) {
        const errorData = await jobResponse.json();
        throw new Error(errorData.message || 'Failed to create job');
      }
      
      const createdJob = await jobResponse.json();
      console.log('Job created successfully:', createdJob);
      
      // If tasks were provided, create them for the job
      if (tasks.length > 0) {
        try {
          // Format tasks for API
          const taskData = tasks.map((task) => ({
            jobId: createdJob.id,
            description: task.description,
            position: task.position,
            isOptional: task.isOptional,
            dueTime: task.dueTime,
            location: task.location,
            latitude: task.latitude,
            longitude: task.longitude,
            bonusAmount: task.bonusAmount
          }));
          
          // Create tasks in batch
          await apiRequest('POST', `/api/jobs/${createdJob.id}/tasks/batch`, { tasks: taskData });
          console.log('Tasks created successfully for job:', createdJob.id);
        } catch (taskError) {
          console.error("Error creating tasks:", taskError);
        }
      }
      
      // Now process payment with the created job ID
      if (data.paymentMethodId) {
        let paymentSuccessful = false;
        
        try {
          console.log(`Processing payment for job #${createdJob.id} with amount $${data.paymentAmount}`);
          
          // Process the actual payment with the real job ID
          console.log('Sending payment request with data:', {
            jobId: createdJob.id,
            paymentMethodId: data.paymentMethodId,
            amount: data.paymentAmount,
            paymentType: data.paymentType
          });
          
          const paymentResponse = await apiRequest('POST', `/api/payment/process-payment`, {
            jobId: createdJob.id,
            paymentMethodId: data.paymentMethodId,
            amount: Number(data.paymentAmount), // Convert to number to avoid any type issues
            paymentType: data.paymentType
          });
          
          if (!paymentResponse.ok) {
            let errorMessage = 'Payment processing failed';
            try {
              const errorData = await paymentResponse.json();
              errorMessage = errorData.message || errorMessage;
              console.error('Payment error details:', errorData);
            } catch (e) {
              console.error('Could not parse payment error response:', e);
            }
            throw new Error(errorMessage);
          }
          
          const paymentData = await paymentResponse.json();
          console.log('Payment successful with data:', paymentData);
          
          paymentSuccessful = true;
          
          // Update job status to active since payment was successful
          await apiRequest('PATCH', `/api/jobs/${createdJob.id}`, { 
            status: 'open'
          });
          
          // Show success dialog with job details
          toast({
            title: "Job Posted Successfully",
            description: "Your job has been posted and payment has been processed!",
            variant: "default"
          });
          
          // Store the job details for the success modal
          setCreatedJobId(createdJob.id);
          setCreatedJobTitle(createdJob.title);
          
          // Close the drawer and show success modal
          onOpenChange(false);
          setShowSuccessModal(true);
          
          // Refresh job listings
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          
        } catch (error) {
          console.error('Payment processing error:', error);
          const errorMessage = error instanceof Error ? error.message : 'An error occurred while processing payment';
          
          // Mark the job as payment failed
          await apiRequest('PATCH', `/api/jobs/${createdJob.id}`, { 
            status: 'payment_failed'
          });
          
          // Show payment failure dialog
          toast({
            title: "Payment Failed",
            description: `Your job was created but payment failed: ${errorMessage}. Please try again from your jobs dashboard.`,
            variant: "destructive"
          });
          
          setIsSubmitting(false);
          onOpenChange(false);
          return;
        }
        
        if (!paymentSuccessful) {
          // Mark the job as payment failed
          await apiRequest('PATCH', `/api/jobs/${createdJob.id}`, { 
            status: 'payment_failed'
          });
          
          setIsSubmitting(false);
          onOpenChange(false);
          return;
        }
      }
      
      // Reset the form
      form.reset({
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
      });
      
      // Reset tasks
      setTasks([]);
      
      // Done submitting
      setIsSubmitting(false);
      
    } catch (error) {
      console.error('Error creating job:', error);
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create job',
        variant: "destructive"
      });
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
                        <Input placeholder="e.g. Lawn Mowing" {...field} />
                      </FormControl>
                      <FormMessage />
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
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
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
                  
                  <FormField
                    control={form.control}
                    name="dateNeeded"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Needed</FormLabel>
                        <FormControl>
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                            <Input type="date" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
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
                            <FormLabel className="font-normal cursor-pointer">
                              Hourly
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="fixed" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              Fixed Price
                            </FormLabel>
                          </FormItem>
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
                      <FormLabel>
                        {form.watch('paymentType') === 'hourly' ? 'Hourly Rate ($)' : 'Fixed Price ($)'}
                      </FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="number" 
                            min="1" 
                            step="0.01" 
                            placeholder="25.00"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        {/* Calculate and display service fee */}
                        Service fee: ${(Number(field.value || 0) * 0.1).toFixed(2)} (10%)
                      </FormDescription>
                      <FormDescription>
                        {/* Calculate and display total amount */}
                        Total amount: ${(Number(field.value || 0) * 1.1).toFixed(2)}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Location</FormLabel>
                      <FormControl>
                        <AddressAutocompleteInput
                          value={field.value}
                          onChange={(address, lat, lng) => {
                            field.onChange(address);
                            // Update latitude and longitude fields when address changes
                            if (lat && lng) {
                              form.setValue('latitude', lat);
                              form.setValue('longitude', lng);
                              console.log(`Location updated: ${address} (${lat}, ${lng})`);
                            }
                          }}
                          placeholder="Search for an address"
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        Select an address from the dropdown suggestions for accurate job placement on the map
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="requiredSkills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Required Skills</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {SKILLS.map((skill) => (
                          <FormItem
                            key={skill}
                            className="flex items-center space-x-2 bg-muted/40 rounded-md p-2"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(skill)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...(field.value || []), skill]);
                                  } else {
                                    field.onChange(
                                      field.value?.filter((s) => s !== skill) || []
                                    );
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              {skill}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="equipmentProvided"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
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
              onClick={() => {
                console.log('Post Job button clicked directly');
                // Find and submit the form
                document.getElementById('post-job-form')?.dispatchEvent(
                  new Event('submit', { cancelable: true, bubbles: true })
                );
              }}
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