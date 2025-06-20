import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { Job } from '@/types';
import { Edit, Save, X } from 'lucide-react';

interface EditJobModalProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const JOB_CATEGORIES = [
  'Cleaning',
  'Handyman',
  'Moving',
  'Delivery',
  'Yard Work',
  'Pet Care',
  'Tutoring',
  'Tech Support',
  'Other'
];

export function EditJobModal({ job, open, onOpenChange }: EditJobModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    paymentAmount: '',
    location: '',
    dateNeeded: '',
    estimatedHours: '',
    shiftStartTime: '',
    shiftEndTime: '',
    equipmentProvided: false,
    requiredSkills: [] as string[],
  });

  // Initialize form data when job changes
  useEffect(() => {
    if (job) {
      setFormData({
        title: job.title || '',
        description: job.description || '',
        category: job.category || '',
        paymentAmount: job.paymentAmount?.toString() || '',
        location: job.location || '',
        dateNeeded: job.dateNeeded ? new Date(job.dateNeeded).toISOString().split('T')[0] : '',
        estimatedHours: job.estimatedHours?.toString() || '',
        shiftStartTime: job.shiftStartTime || '',
        shiftEndTime: job.shiftEndTime || '',
        equipmentProvided: job.equipmentProvided || false,
        requiredSkills: job.requiredSkills || [],
      });
    }
  }, [job]);

  const updateJobMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      if (!job?.id) throw new Error('Job ID is required');
      
      const response = await apiRequest('PUT', `/api/jobs/${job.id}`, updatedData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update job');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs/my-posted-jobs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({
        title: "Job Updated",
        description: "Your job has been updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update job",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Job title is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Job description is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.paymentAmount || parseFloat(formData.paymentAmount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Valid payment amount is required",
        variant: "destructive",
      });
      return;
    }

    const updatedData = {
      ...formData,
      paymentAmount: parseFloat(formData.paymentAmount),
      estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : null,
      dateNeeded: formData.dateNeeded ? new Date(formData.dateNeeded).toISOString() : null,
    };

    updateJobMutation.mutate(updatedData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Job: {job.title}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter job title"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the job in detail"
                rows={4}
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="paymentAmount">Payment Amount ($) *</Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                min="0"
                value={formData.paymentAmount}
                onChange={(e) => handleInputChange('paymentAmount', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Job location"
              />
            </div>

            <div>
              <Label htmlFor="dateNeeded">Date Needed</Label>
              <Input
                id="dateNeeded"
                type="date"
                value={formData.dateNeeded}
                onChange={(e) => handleInputChange('dateNeeded', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="estimatedHours">Estimated Hours</Label>
              <Input
                id="estimatedHours"
                type="number"
                min="1"
                value={formData.estimatedHours}
                onChange={(e) => handleInputChange('estimatedHours', e.target.value)}
                placeholder="Hours"
              />
            </div>

            <div>
              <Label htmlFor="shiftStartTime">Start Time</Label>
              <Input
                id="shiftStartTime"
                type="time"
                value={formData.shiftStartTime}
                onChange={(e) => handleInputChange('shiftStartTime', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="shiftEndTime">End Time</Label>
              <Input
                id="shiftEndTime"
                type="time"
                value={formData.shiftEndTime}
                onChange={(e) => handleInputChange('shiftEndTime', e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="equipmentProvided"
                  checked={formData.equipmentProvided}
                  onCheckedChange={(checked) => handleInputChange('equipmentProvided', checked)}
                />
                <Label htmlFor="equipmentProvided">Equipment/tools will be provided</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateJobMutation.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateJobMutation.isPending}
            >
              {updateJobMutation.isPending ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Job
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
