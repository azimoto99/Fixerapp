import { useState } from 'react';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { insertJobSchema, insertTaskSchema } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useGeolocation } from '@/lib/geolocation';

import Header from '@/components/Header';
import PaymentDetailsForm from '@/components/PaymentDetailsForm';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import TaskEditor, { TaskItemProps } from '@/components/TaskEditor';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { JOB_CATEGORIES, SKILLS } from '@shared/schema';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

const formSchema = insertJobSchema.extend({
  paymentAmount: z.coerce
    .number()
    .min(10, 'Minimum payment amount is $10')
    .positive('Payment amount must be positive'),
  // Handle dateNeeded as string in the form and convert when needed
  dateNeeded: z.string()
});

export default function PostJob() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userLocation } = useGeolocation();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [formData, setFormData] = useState<z.infer<typeof formSchema> | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskItemProps[]>([]);

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
      posterId: user?.id || 1
    }
  });

  // Function to calculate the total amount including service fee
  const calculateTotalAmount = (amount: number) => {
    return amount + 2.50;
  };

  // Handle form submission to move to payment step
  function handleFormSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to post a job",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    if (values.paymentAmount < 10) {
      toast({
        title: "Invalid Payment Amount",
        description: "Minimum payment amount is $10",
        variant: "destructive"
      });
      return;
    }

    // Store form data and show payment form
    setFormData(values);
    setShowPaymentForm(true);
  }

  // Handle payment success
  const handlePaymentSuccess = async (pmId: string) => {
    if (!formData || !user) return;

    try {
      setIsSubmitting(true);
      setPaymentMethodId(pmId);
      
      // Set the poster id from the current user
      const values = { ...formData, posterId: user.id };
      
      // Add the payment method ID to the job data
      const jobData = {
        ...values,
        paymentMethodId: pmId
      };
      
      // Create the job
      const response = await apiRequest('POST', '/api/jobs', jobData);
      const jobResponse = await response.json();
      
      // Create tasks for the job if there are any
      if (tasks.length > 0) {
        try {
          // Submit each task with the job ID
          const taskPromises = tasks.map(task => {
            const taskData = {
              jobId: jobResponse.id,
              description: task.description,
              position: task.position,
              isOptional: task.isOptional,
              dueTime: task.dueTime,
              location: task.location,
              latitude: task.latitude,
              longitude: task.longitude,
              bonusAmount: task.bonusAmount || 0
            };
            
            return apiRequest('POST', '/api/tasks', taskData);
          });
          
          await Promise.all(taskPromises);
          console.log('All tasks created successfully');
        } catch (taskError) {
          console.error('Error creating tasks:', taskError);
          // We don't fail the whole job if tasks fail to be created
        }
      }
      
      // Close the payment form dialog
      setShowPaymentForm(false);
      
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

  // Submit the form directly if it's an hourly job (which doesn't require upfront payment)
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.paymentType === 'hourly') {
      // For hourly jobs, we don't collect payment upfront
      try {
        setIsSubmitting(true);
        
        // Set the poster id from the current user
        if (user) {
          values.posterId = user.id;
        }
        
        // Create the job
        const response = await apiRequest('POST', '/api/jobs', values);
        const jobResponse = await response.json();
        
        // Create tasks for the job if there are any
        if (tasks.length > 0) {
          try {
            // Submit each task with the job ID
            const taskPromises = tasks.map(task => {
              const taskData = {
                jobId: jobResponse.id,
                description: task.description,
                position: task.position,
                isOptional: task.isOptional,
                dueTime: task.dueTime,
                location: task.location,
                latitude: task.latitude,
                longitude: task.longitude,
                bonusAmount: task.bonusAmount || 0
              };
              
              return apiRequest('POST', '/api/tasks', taskData);
            });
            
            await Promise.all(taskPromises);
            console.log('All tasks created successfully');
          } catch (taskError) {
            console.error('Error creating tasks:', taskError);
            // We don't fail the whole job if tasks fail to be created
          }
        }
        
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
    } else {
      // For fixed price jobs, collect payment details
      handleFormSubmit(values);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-card shadow rounded-lg p-6">
            <h1 className="text-2xl font-bold text-foreground mb-6">Post a New Job</h1>
            
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
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                
                {/* Job Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the job in detail..." 
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Payment Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                              <FormLabel className="font-normal">
                                Hourly Rate
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="fixed" />
                              </FormControl>
                              <FormLabel className="font-normal">
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
                        <FormLabel>Amount ($)</FormLabel>
                        <FormControl>
                          <Input type="number" min="10" step="1" {...field} />
                        </FormControl>
                        <FormDescription>
                          {form.watch('paymentType') === 'hourly' 
                            ? 'Enter hourly rate in dollars (min $10)' 
                            : 'Enter total payment in dollars (min $10)'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Service Fee Display */}
                <div className="bg-card p-4 rounded-md border border-border">
                  <div className="flex justify-between text-sm mb-2 text-foreground">
                    <span>
                      {form.watch('paymentType') === 'hourly' 
                        ? 'Hourly Rate:' 
                        : 'Job Amount:'}
                    </span>
                    <span>${parseFloat(String(form.watch('paymentAmount') || '0')).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2 text-foreground">
                    <span>Service Fee:</span>
                    <span>$2.50</span>
                  </div>
                  {form.watch('paymentType') === 'fixed' && (
                    <div className="flex justify-between font-medium border-t border-border pt-2 mt-2 text-foreground">
                      <span>Total Amount:</span>
                      <span>${(parseFloat(String(form.watch('paymentAmount') || '0')) + 2.50).toFixed(2)}</span>
                    </div>
                  )}
                  {form.watch('paymentType') === 'fixed' && (
                    <div className="flex justify-between text-sm mt-2 text-muted-foreground">
                      <span>Worker Receives:</span>
                      <span>${parseFloat(String(form.watch('paymentAmount') || '0')).toFixed(2)}</span>
                    </div>
                  )}
                  {form.watch('paymentType') === 'hourly' && (
                    <div className="flex justify-between text-sm mt-2 text-muted-foreground">
                      <span>Note:</span>
                      <span className="text-right">For hourly jobs, the $2.50 service fee<br/>is added to the total upon completion</span>
                    </div>
                  )}
                </div>
                
                {/* Location with Autocomplete */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <AddressAutocomplete 
                          placeholder="Enter job address or location" 
                          value={field.value}
                          onChange={(value) => {
                            field.onChange(value);
                          }}
                          onLocationSelect={(result) => {
                            if (result.success) {
                              // Update the coordinates in the form data
                              form.setValue("latitude", result.latitude);
                              form.setValue("longitude", result.longitude);
                              console.log("Updated coordinates:", result.latitude, result.longitude);
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Start typing to see address suggestions
                      </FormDescription>
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
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Task Editor */}
                <div className="border border-border rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-medium mb-4">Job Tasks</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add specific tasks that need to be completed. You can set required tasks and optional bonus tasks.
                  </p>
                  <TaskEditor tasks={tasks} setTasks={setTasks} />
                </div>
                
                {/* Required Skills */}
                <FormField
                  control={form.control}
                  name="requiredSkills"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Required Skills</FormLabel>
                        <FormDescription>
                          Select all the skills needed for this job
                        </FormDescription>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {SKILLS.map((skill) => (
                          <FormField
                            key={skill}
                            control={form.control}
                            name="requiredSkills"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={skill}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(skill)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), skill])
                                          : field.onChange(
                                              field.value?.filter?.(
                                                (value) => value !== skill
                                              ) || []
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {skill}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Equipment Provided */}
                <FormField
                  control={form.control}
                  name="equipmentProvided"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Equipment Provided
                        </FormLabel>
                        <FormDescription>
                          Check if you will provide necessary tools and equipment
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Posting...' : 'Post Job'}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </main>
    </div>
  );
}
