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
import { Badge } from '@/components/ui/badge';
import { MapPin, DollarSign, Calendar, Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

// Form schema with validation
const formSchema = insertJobSchema.extend({
  paymentAmount: z.coerce
    .number()
    .min(10, 'Minimum payment amount is $10')
    .positive('Payment amount must be positive'),
  dateNeeded: z.string(),
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

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to post a job",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const jobData = {
        ...data,
        posterId: user?.id,
        dateNeeded: new Date(data.dateNeeded).toISOString(),
        datePosted: new Date().toISOString(),
        status: 'open'
      };
      
      const response = await apiRequest('POST', '/api/jobs', jobData);
      const jobResponse = await response.json();
      
      form.reset();
      onOpenChange(false);
      
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs/nearby/location'] });
      
      toast({
        title: "Job Posted",
        description: "Your job has been posted successfully!"
      });
      
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
            <form id="post-job-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            </form>
          </Form>
        </div>
        
        <DrawerFooter className="border-t border-border">
          <Button 
            form="post-job-form"
            type="submit"
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