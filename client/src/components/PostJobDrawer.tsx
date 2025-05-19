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

// Form schema with validation
const formSchema = insertJobSchema.extend({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  paymentAmount: z.coerce
    .number()
    .min(10, 'Minimum payment amount is $10')
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
          submitJobWithValidData(updatedData);
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
    await submitJobWithValidData(data);
  };
  
  // Function to submit job data after validation and payment method selection (if needed)
  const submitJobWithValidData = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    try {
      // First create the job, then proceed with payment
      const jobData = {
        ...data,
        posterId: user?.id,
        dateNeeded: new Date(data.dateNeeded).toISOString(),
        datePosted: new Date().toISOString(),
        status: 'pending_payment' // Start as pending until payment is processed
      };
      
      console.log('Creating job with data:', jobData);
      
      // Create the job first
      const response = await apiRequest('POST', '/api/jobs', jobData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create job');
      }
      
      const jobResponse = await response.json();
      console.log('Job created successfully:', jobResponse);
      
      // If tasks were provided, create them for the job
      if (tasks.length > 0) {
        try {
          // Format tasks for API
          const taskData = tasks.map((task) => ({
            jobId: jobResponse.id,
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
          await apiRequest('POST', `/api/jobs/${jobResponse.id}/tasks/batch`, { tasks: taskData });
          console.log('Tasks created successfully for job:', jobResponse.id);
        } catch (taskError) {
          console.error("Error creating tasks:", taskError);
        }
      }
      
      // Now process payment with the created job ID
      if (data.paymentMethodId) {
        let paymentSuccessful = false;
        let paymentIntentId = null;
        
        try {
          console.log(`Processing payment for job #${jobResponse.id} with amount $${data.paymentAmount}`);
          
          // Process the actual payment with the real job ID
          const paymentResponse = await apiRequest('POST', `/api/process-payment`, {
            jobId: jobResponse.id,
            paymentMethodId: data.paymentMethodId,
            amount: data.paymentAmount
          });
          
          if (!paymentResponse.ok) {
            const errorData = await paymentResponse.json();
            throw new Error(errorData.message || 'Payment processing failed');
          }
          
          const paymentData = await paymentResponse.json();
          console.log('Payment successful with data:', paymentData);
          
          paymentIntentId = paymentData.paymentId;
          paymentSuccessful = true;
          
          // Update job status to active since payment was successful
          await apiRequest('PATCH', `/api/jobs/${jobResponse.id}`, { 
            status: 'open',
            stripePaymentIntentId: paymentIntentId
          });
          
          // Show success dialog with job details
          toast({
            title: "Job Posted Successfully",
            description: "Your job has been posted and payment has been processed!",
            variant: "default"
          });
          
          // Close the drawer
          onOpenChange(false);
          
          // Show success modal
          setSuccessModalOpen(true);
          setCreatedJobId(jobResponse.id);
          setCreatedJobTitle(jobResponse.title);
          
        } catch (error) {
          console.error('Payment processing error:', error);
          const errorMessage = error instanceof Error ? error.message : 'An error occurred while processing payment';
          
          // Mark the job as payment failed
          await apiRequest('PATCH', `/api/jobs/${jobResponse.id}`, { 
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
          await apiRequest('PATCH', `/api/jobs/${jobResponse.id}`, { 
            status: 'payment_failed'
          });
          
          setIsSubmitting(false);
          onOpenChange(false);
          return;
        }
      }
      
      // We're already done with job creation and payment processing
      setIsSubmitting(false);
      
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
      
      // If there are tasks, create them
      if (tasks.length > 0) {
        try {
          // Format tasks for API
          const taskData = tasks.map((task) => ({
            jobId: jobResponse.id,
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
          await apiRequest('POST', `/api/jobs/${jobResponse.id}/tasks/batch`, { tasks: taskData });
        } catch (taskError) {
          console.error("Error creating tasks:", taskError);
          // We don't fail the entire submission if tasks fail
          toast({
            title: "Job Posted",
            description: "Your job was posted, but there was an error adding tasks.",
            variant: "default"
          });
        }
      }
      
      // For fixed-price jobs, finalize the payment with the job ID
      if (data.paymentType === 'fixed' && data.paymentMethodId) {
        try {
          console.log('Finalizing payment for fixed-price job');
          const paymentResponse = await apiRequest('POST', `/api/payments/process`, {
            jobId: jobResponse.id,
            paymentMethodId: data.paymentMethodId,
            amount: data.paymentAmount
          });
          
          if (!paymentResponse.ok) {
            const errorData = await paymentResponse.json();
            console.error('Payment finalization failed:', errorData);
            
            // The job is already created at this point, but payment finalization failed
            // This is a rare case that would require admin intervention
            toast({
              title: "Payment Finalization Issue",
              description: "Your job was posted, but there was an issue finalizing the payment. An administrator will contact you.",
              variant: "destructive"
            });
          } else {
            console.log('Payment finalized successfully for fixed-price job');
            
            // Show payment success dialog
            toast({
              title: "Payment Successful",
              description: "Your job has been posted and payment has been processed successfully!",
              variant: "default"
            });
          }
        } catch (error) {
          console.error('Payment finalization error:', error);
          
          // The job is already created at this point, but payment finalization failed
          toast({
            title: "Payment Finalization Issue",
            description: "Your job was posted, but there was an issue finalizing the payment. An administrator will review this transaction.",
            variant: "destructive"
          });
        }
      } else {
        // For hourly jobs, just show success
        toast({
          title: "Job Posted",
          description: "Your hourly job has been posted successfully! Find it on the map or in your jobs list.",
          variant: "default"
        });
      }
      
      form.reset();
      setTasks([]);
      onOpenChange(false);
      
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs/nearby/location'] });
      
      // Navigate to home page
      navigate('/');
      
      console.log(`Job created successfully with ID: ${jobResponse.id}`);
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

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-background">
        <DrawerHeader className="border-b border-border">
          <DrawerTitle className="text-foreground">Post a New Job</DrawerTitle>
          <DrawerDescription className="text-muted-foreground">
            Fill out the form below to post a new job
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="px-4 py-4 overflow-y-auto max-h-[50vh]">
          <Form {...form}>
            <form 
              id="post-job-form" 
              onSubmit={form.handleSubmit(
                onSubmit, 
                (errors) => {
                  console.error('Form validation errors:', errors);
                  toast({
                    title: "Form Validation Error",
                    description: "Please check the form fields and try again.",
                    variant: "destructive"
                  });
                }
              )} 
              className="space-y-4">
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
                      {form.watch('paymentType') === 'hourly' ? 'Hourly Rate ($)' : 'Fixed Price ($)'}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="number" min="10" className="pl-9" {...field} />
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
                        <Input 
                          placeholder="Enter job location" 
                          className="pl-9" 
                          {...field} 
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
                      <div className="border border-border rounded-md p-3 h-auto flex flex-wrap gap-2">
                        {SKILLS.map((skill) => {
                          const isSelected = (field.value || []).includes(skill);
                          return (
                            <Badge
                              key={skill}
                              variant={isSelected ? "default" : "outline"}
                              className={`cursor-pointer ${
                                isSelected ? "bg-primary text-primary-foreground" : "bg-secondary/50 hover:bg-secondary"
                              }`}
                              onClick={() => {
                                const currentValue = field.value || [];
                                const updatedSkills = currentValue.includes(skill)
                                  ? currentValue.filter((s: string) => s !== skill)
                                  : [...currentValue, skill];
                                field.onChange(updatedSkills);
                              }}
                            >
                              {skill}
                              {isSelected && (
                                <Check className="h-3 w-3 ml-1" />
                              )}
                            </Badge>
                          );
                        })}
                      </div>
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
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-4">
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
              
              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground flex items-center">
                    <ListChecks className="h-4 w-4 mr-1" />
                    Job Tasks
                  </span>
                </div>
              </div>
              
              {/* Task Editor */}
              <div className="mb-4">
                <TaskEditor
                  tasks={tasks}
                  onChange={handleTasksChange}
                  disabled={isSubmitting}
                />
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
  );
}