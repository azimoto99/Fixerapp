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
  autoAcceptApplicants: z.boolean().default(false),
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

    setIsSubmitting(true);
    
    // Enhanced logging to debug job posting
    console.log('Job posting initiated for user:', user.id);
    console.log('Payment amount:', data.paymentAmount);
    
    try {
      // Make sure location is set to at least an empty string if undefined
      const jobDataToSubmit = {
        ...data,
        location: data.location || "",
        posterId: user.id,
      };
      
      // For regular users, proceed with payment flow
      console.log('Regular user detected, initiating payment flow');
      
      // Store the pending job data
      setPendingJobData(jobDataToSubmit);
      
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
  
  // Function to process payment and create job
  const processPaymentAndCreateJob = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    try {
      // Prepare the job data
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
      
      console.log('Processing payment and creating job with data:', jobData);
      
      if (!data.paymentMethodId) {
        throw new Error('Payment method is required to post a job');
      }
      
      // STEP 1: Create a payment intent to verify the payment can be processed
      console.log(`Pre-verifying payment with method ID ${data.paymentMethodId}`);
      
      const verifyPaymentResponse = await apiRequest('POST', '/api/stripe/create-payment-intent', {
        amount: Number(data.paymentAmount),
        description: `Payment for job: ${data.title}`,
        metadata: {
          jobTitle: data.title,
          paymentType: data.paymentType
        },
        return_url: window.location.origin + '/jobs' // Add return URL for better payment flow
      });
      
      if (!verifyPaymentResponse.ok) {
        const errorData = await verifyPaymentResponse.json();
        throw new Error(errorData.message || "Payment verification failed");
      }
      
      // Use clone to avoid the error "body already consumed"
      const verifyPaymentResponseClone = verifyPaymentResponse.clone();
      const { clientSecret, paymentIntentId } = await verifyPaymentResponseClone.json();
      console.log("Payment intent created successfully:", paymentIntentId);
      
      // STEP 2: Create the job with the payment intent ID
      const enrichedJobData = {
        ...jobData,
        paymentIntentId: paymentIntentId
      };
      
      console.log('Creating job with payment intent ID:', paymentIntentId);
      const jobResponse = await apiRequest('POST', '/api/jobs', enrichedJobData);
      
      if (!jobResponse.ok) {
        const errorData = await jobResponse.json();
        throw new Error(errorData.message || 'Failed to create job');
      }
      
      const createdJob = await jobResponse.json();
      console.log('Job created successfully:', createdJob);
      
      // STEP 3: Add tasks if provided
      if (tasks.length > 0) {
        try {
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
          
          await apiRequest('POST', `/api/jobs/${createdJob.id}/tasks/batch`, { tasks: taskData });
          console.log('Tasks created successfully for job:', createdJob.id);
        } catch (taskError) {
          console.error("Error creating tasks:", taskError);
          // Continue with payment even if tasks fail
        }
      }
      
      // STEP 4: Process the payment
      console.log(`Processing payment for job #${createdJob.id} with amount $${data.paymentAmount}`);
      
      const paymentResponse = await apiRequest('POST', `/api/payment/process-payment`, {
        jobId: createdJob.id,
        paymentMethodId: data.paymentMethodId,
        amount: Number(data.paymentAmount),
        paymentType: data.paymentType,
        paymentIntentId: paymentIntentId,
        return_url: window.location.origin + '/jobs' // Include return URL
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
        
        // Mark the job as payment failed
        await apiRequest('PATCH', `/api/jobs/${createdJob.id}`, { 
          status: 'payment_failed'
        });
        
        throw new Error(errorMessage);
      }
      
      const paymentData = await paymentResponse.json();
      console.log('Payment successful with data:', paymentData);
      
      // STEP 5: Update job status and finalize
      await apiRequest('PATCH', `/api/jobs/${createdJob.id}`, { 
        status: 'open'
      });
      
      // STEP 6: Show success message and update UI
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
    } catch (error) {
      console.error('Error in payment/job creation process:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      toast({
        title: "Job Posting Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      // Always ensure submitting is set to false
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
                          <SelectContent>
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
                              {...field}
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
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <AddressAutocompleteInput
                              value={field.value}
                              onChange={(value, lat, lng) => {
                                field.onChange(value);
                                // Make sure we're dealing with valid numbers
                                if (typeof lat === 'number' && typeof lng === 'number') {
                                  form.setValue('latitude', lat);
                                  form.setValue('longitude', lng);
                                  console.log(`Address set with coords: ${lat}, ${lng}`);
                                }
                              }}
                              placeholder="Enter job address"
                              className="pl-9"
                            />
                          </div>
                        </FormControl>
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
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
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