import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  DollarSign, 
  Calendar, 
  Clock, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Job } from '@/types';
import LocationInput from '@/components/LocationInput';

interface JobPostingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated: (job: Job) => void;
}

interface JobFormData {
  title: string;
  description: string;
  category: string;
  location: string;
  latitude: number;
  longitude: number;
  paymentType: 'fixed' | 'hourly';
  paymentAmount: number;
  estimatedHours?: number;
  dateNeeded: string;
  skills: string[];
  equipmentProvided: boolean;
  urgency: 'low' | 'medium' | 'high';
}

const JOB_CATEGORIES = [
  'Home Repair',
  'Cleaning',
  'Moving',
  'Delivery',
  'Assembly',
  'Landscaping',
  'Painting',
  'Plumbing',
  'Electrical',
  'Handyman',
  'Pet Care',
  'Tutoring',
  'Other'
];

const COMMON_SKILLS = [
  'General Labor',
  'Tool Usage',
  'Heavy Lifting',
  'Attention to Detail',
  'Time Management',
  'Customer Service',
  'Problem Solving',
  'Physical Fitness',
  'Reliability',
  'Communication'
];

export default function JobPostingWizard({ isOpen, onClose, onJobCreated }: JobPostingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<JobFormData>({
    defaultValues: {
      paymentType: 'fixed',
      equipmentProvided: false,
      urgency: 'medium',
      skills: []
    }
  });

  const watchedValues = watch();
  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleLocationSelect = (location: any) => {
    setValue('location', location.displayName);
    setValue('latitude', location.latitude);
    setValue('longitude', location.longitude);
  };

  const toggleSkill = (skill: string) => {
    const currentSkills = watchedValues.skills || [];
    const newSkills = currentSkills.includes(skill)
      ? currentSkills.filter(s => s !== skill)
      : [...currentSkills, skill];
    setValue('skills', newSkills);
  };

  const onSubmit = async (data: JobFormData) => {
    setIsSubmitting(true);
    
    try {
      const response = await apiRequest('POST', '/api/jobs', {
        ...data,
        dateNeeded: new Date(data.dateNeeded).toISOString(),
        status: 'open'
      });

      if (response.success) {
        toast({
          title: 'Job posted successfully!',
          description: 'Your job is now live and workers can apply.',
        });
        onJobCreated(response.job);
      } else {
        throw new Error(response.message || 'Failed to post job');
      }
    } catch (error) {
      console.error('Job posting error:', error);
      toast({
        title: 'Failed to post job',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Fix leaky kitchen faucet"
                {...register('title', { required: 'Job title is required' })}
              />
              {errors.title && (
                <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Job Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what needs to be done, any specific requirements, and what you're looking for in a worker..."
                rows={4}
                {...register('description', { required: 'Job description is required' })}
              />
              {errors.description && (
                <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select onValueChange={(value) => setValue('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>
              )}
            </div>

            <div>
              <Label>Urgency Level</Label>
              <div className="flex gap-2 mt-2">
                {[
                  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
                  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
                  { value: 'high', label: 'High', color: 'bg-red-100 text-red-800' }
                ].map((urgency) => (
                  <Button
                    key={urgency.value}
                    type="button"
                    variant={watchedValues.urgency === urgency.value ? 'default' : 'outline'}
                    onClick={() => setValue('urgency', urgency.value as any)}
                    className="flex-1"
                  >
                    {urgency.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label>Job Location *</Label>
              <LocationInput
                placeholder="Enter the job address"
                onLocationSelect={handleLocationSelect}
              />
              {errors.location && (
                <p className="text-sm text-red-600 mt-1">{errors.location.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="dateNeeded">Date Needed *</Label>
              <Input
                id="dateNeeded"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                {...register('dateNeeded', { required: 'Date needed is required' })}
              />
              {errors.dateNeeded && (
                <p className="text-sm text-red-600 mt-1">{errors.dateNeeded.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="estimatedHours">Estimated Hours</Label>
              <Input
                id="estimatedHours"
                type="number"
                min="0.5"
                step="0.5"
                placeholder="e.g., 2.5"
                {...register('estimatedHours', { valueAsNumber: true })}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Optional: Help workers understand the time commitment
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="equipmentProvided"
                {...register('equipmentProvided')}
                className="rounded"
              />
              <Label htmlFor="equipmentProvided">
                I will provide tools/equipment needed
              </Label>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label>Payment Type *</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  type="button"
                  variant={watchedValues.paymentType === 'fixed' ? 'default' : 'outline'}
                  onClick={() => setValue('paymentType', 'fixed')}
                  className="h-auto p-4 flex flex-col items-center"
                >
                  <DollarSign className="h-6 w-6 mb-2" />
                  <span className="font-medium">Fixed Price</span>
                  <span className="text-xs text-muted-foreground">One-time payment</span>
                </Button>
                <Button
                  type="button"
                  variant={watchedValues.paymentType === 'hourly' ? 'default' : 'outline'}
                  onClick={() => setValue('paymentType', 'hourly')}
                  className="h-auto p-4 flex flex-col items-center"
                >
                  <Clock className="h-6 w-6 mb-2" />
                  <span className="font-medium">Hourly Rate</span>
                  <span className="text-xs text-muted-foreground">Pay per hour</span>
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="paymentAmount">
                {watchedValues.paymentType === 'fixed' ? 'Total Amount' : 'Hourly Rate'} *
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="paymentAmount"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder={watchedValues.paymentType === 'fixed' ? '150.00' : '25.00'}
                  className="pl-10"
                  {...register('paymentAmount', { 
                    required: 'Payment amount is required',
                    valueAsNumber: true,
                    min: { value: 1, message: 'Amount must be at least $1' }
                  })}
                />
              </div>
              {errors.paymentAmount && (
                <p className="text-sm text-red-600 mt-1">{errors.paymentAmount.message}</p>
              )}
            </div>

            {watchedValues.paymentAmount && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p>Payment breakdown:</p>
                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span>Job payment:</span>
                        <span>${watchedValues.paymentAmount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Service fee (10%):</span>
                        <span>${(watchedValues.paymentAmount * 0.1).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span>Total you pay:</span>
                        <span>${(watchedValues.paymentAmount * 1.1).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label>Required Skills (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select skills that would be helpful for this job
              </p>
              <div className="grid grid-cols-2 gap-2">
                {COMMON_SKILLS.map((skill) => (
                  <Button
                    key={skill}
                    type="button"
                    variant={watchedValues.skills?.includes(skill) ? 'default' : 'outline'}
                    onClick={() => toggleSkill(skill)}
                    className="justify-start text-sm h-auto py-2"
                  >
                    {skill}
                  </Button>
                ))}
              </div>
              {watchedValues.skills && watchedValues.skills.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium mb-2">Selected skills:</p>
                  <div className="flex flex-wrap gap-1">
                    {watchedValues.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Job Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Job Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-medium">{watchedValues.title}</h4>
                  <p className="text-sm text-muted-foreground">{watchedValues.category}</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4" />
                  <span>{watchedValues.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4" />
                  <span>
                    ${watchedValues.paymentAmount} 
                    {watchedValues.paymentType === 'hourly' ? '/hour' : ' total'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>Needed by {watchedValues.dateNeeded}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Post a New Job
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Content */}
          <form onSubmit={handleSubmit(onSubmit)}>
            {renderStep()}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={
                    (currentStep === 1 && (!watchedValues.title || !watchedValues.description)) ||
                    (currentStep === 2 && (!watchedValues.location || !watchedValues.dateNeeded)) ||
                    (currentStep === 3 && !watchedValues.paymentAmount)
                  }
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Posting Job...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Post Job
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
