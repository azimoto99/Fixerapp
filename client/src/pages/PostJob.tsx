import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { insertJobSchema } from '@shared/schema';
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
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  dateNeeded: z.string(),
});

export default function PostJob() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userLocation } = useGeolocation();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [formData, setFormData] = useState<z.infer<typeof formSchema> | null>(
    null
  );
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
      dateNeeded: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      requiredSkills: [],
      equipmentProvided: false,
    },
  });

  useEffect(() => {
    if (userLocation) {
      form.setValue('latitude', userLocation.latitude);
      form.setValue('longitude', userLocation.longitude);
    }
  }, [userLocation, form]);

  useEffect(() => {
    if (user) {
      form.setValue('posterId', user.id);
    }
  }, [user, form]);

  // Function to calculate the total amount including service fee
  const calculateTotalAmount = (amount: number) => {
    return amount + 2.5;
  };

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
        paymentMethodId: pmId,
      };

      // Create the job using the payment-first endpoint
      const response = await apiRequest(
        'POST',
        '/api/jobs/payment-first',
        jobData
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create job');
      }

      const jobResponse = await response.json();

      // Create tasks for the job if there are any
      if (tasks.length > 0) {
        try {
          // Submit each task with the job ID
          const taskPromises = tasks.map(async (task) => {
            const taskData = {
              jobId: jobResponse.job.id,
              description: task.description,
              position: task.position,
              isOptional: task.isOptional,
              dueTime: task.dueTime,
              location: task.location,
              latitude: task.latitude,
              longitude: task.longitude,
              bonusAmount: task.bonusAmount || 0,
            };

            const taskResponse = await apiRequest('POST', '/api/tasks', taskData);
            if (!taskResponse.ok) {
              console.error('Failed to create task:', task.description);
            }
            return taskResponse;
          });

          await Promise.all(taskPromises);
          console.log('All tasks created successfully');
        } catch (taskError) {
          console.error('Error creating tasks:', taskError);
          // We don't fail the whole job if tasks fail to be created
          toast({
            title: 'Warning',
            description:
              'Job created but some tasks failed to save. You can add them later.',
            variant: 'default',
          });
        }
      }

      // Close the payment form dialog
      setShowPaymentForm(false);

      toast({
        title: 'Job Posted',
        description: 'Your job has been posted successfully!',
      });

      // Navigate to the job details page
      navigate(`/job/${jobResponse.job.id}`);
    } catch (error) {
      console.error('Error posting job:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to post job. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle payment cancellation
  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
  };

  // All jobs now require payment-first workflow for security
  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log('Form submitted with values:', values);

    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to post a job',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    // ALL jobs now require payment-first workflow for security
    // Store form data and show payment form
    setFormData(values);
    setShowPaymentForm(true);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-card shadow rounded-lg p-6">
            <h1 className="text-2xl font-bold text-foreground mb-6">
              Post a New Job
            </h1>

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
              <form
                onSubmit={form.handleSubmit(onSubmit, (errors) => {
                  console.error('Form validation errors:', errors);
                  toast({
                    title: 'Form Validation Error',
                    description:
                      'Please check the form fields and try again.',
                    variant: 'destructive',
                  });
                })}
                className="space-y-6"
              >
                {/* Job Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Lawn Mowing, Furniture Assembly"
                          {...field}
                        />
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
                          placeholder="Provide a detailed description of the job"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
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
                        <AddressAutocomplete
                          onLocationSelect={(location) => {
                            field.onChange(location.address);
                            form.setValue('latitude', location.lat);
                            form.setValue('longitude', location.lng);
                          }}
                        />
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
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Payment */}
                <Card>
                  <CardContent className="pt-6">
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
                            <FormLabel>Payment Amount</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormDescription>
                              Minimum $10. A $2.50 service fee will be added.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Tasks */}
                <TaskEditor tasks={tasks} setTasks={setTasks} />

                {/* Skills & Equipment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="requiredSkills"
                    render={() => (
                      <FormItem>
                        <FormLabel>Required Skills</FormLabel>
                        <div className="grid grid-cols-2 gap-2">
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
                                            ? field.onChange([
                                                ...field.value,
                                                skill,
                                              ])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== skill
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
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
                            Check this if you will provide the necessary
                            equipment for the job.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? 'Submitting...'
                    : 'Proceed to Payment'}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </main>
    </div>
  );
}
