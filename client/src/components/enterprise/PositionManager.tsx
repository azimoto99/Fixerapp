import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Briefcase, Users, DollarSign, Calendar, Eye, EyeOff } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { SkillsManagerForm } from '@/components/profile/SkillsManagerForm';

interface Position {
  id: number;
  title: string;
  description: string;
  positionType: string;
  paymentType: string;
  paymentAmount: number;
  paymentFrequency?: string;
  requiredSkills: string[];
  benefits?: string;
  schedule?: string;
  positionsAvailable: number;
  isActive: boolean;
  hubPinId?: number;
  applicationCount?: number;
}

export default function PositionManager({ businessId }: { businessId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [activeTab, setActiveTab] = useState('active');

  // Fetch positions
  const { data: positions, isLoading } = useQuery({
    queryKey: ['/api/enterprise/positions', businessId],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/enterprise/positions');
      return res.json();
    },
    enabled: !!businessId
  });

  // Fetch hub pins for position assignment
  const { data: hubPins } = useQuery({
    queryKey: ['/api/enterprise/hub-pins', businessId],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/enterprise/hub-pins');
      return res.json();
    },
    enabled: !!businessId
  });

  // Create position mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/enterprise/positions', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/positions'] });
      setIsCreateDialogOpen(false);
      toast({
        title: 'Position Created',
        description: 'Your new position has been created successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create position',
        variant: 'destructive'
      });
    }
  });

  // Update position mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest('PUT', `/api/enterprise/positions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/positions'] });
      setEditingPosition(null);
      toast({
        title: 'Position Updated',
        description: 'Your position has been updated successfully.',
      });
    }
  });

  // Delete position mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/enterprise/positions/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/positions'] });
      toast({
        title: 'Position Deleted',
        description: 'Your position has been deleted successfully.',
      });
    }
  });

  const PositionForm = ({ position, onSubmit }: { position?: Position | null; onSubmit: (data: any) => void }) => {
    const [formData, setFormData] = useState({
      title: position?.title || '',
      description: position?.description || '',
      positionType: position?.positionType || 'full-time',
      paymentType: position?.paymentType || 'hourly',
      paymentAmount: position?.paymentAmount || 0,
      paymentFrequency: position?.paymentFrequency || 'bi-weekly',
      requiredSkills: position?.requiredSkills || [],
      benefits: position?.benefits || '',
      schedule: position?.schedule || '',
      positionsAvailable: position?.positionsAvailable || 1,
      hubPinId: position?.hubPinId || undefined,
      isActive: position?.isActive ?? true
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(formData);
    };

    return (
      <form id="position-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Position Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            placeholder="e.g. Senior Software Engineer, Customer Service Representative"
          />
        </div>

        <div>
          <Label htmlFor="description">Job Description *</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            placeholder="Describe the role, responsibilities, and requirements..."
            rows={5}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="positionType">Position Type</Label>
            <Select
              value={formData.positionType}
              onValueChange={(value) => setFormData({ ...formData, positionType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full-time">Full-time</SelectItem>
                <SelectItem value="part-time">Part-time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="temporary">Temporary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="positionsAvailable">Positions Available</Label>
            <Input
              id="positionsAvailable"
              type="number"
              min="1"
              value={formData.positionsAvailable}
              onChange={(e) => setFormData({ ...formData, positionsAvailable: parseInt(e.target.value) || 1 })}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="paymentType">Payment Type</Label>
            <Select
              value={formData.paymentType}
              onValueChange={(value) => setFormData({ ...formData, paymentType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="salary">Salary</SelectItem>
                <SelectItem value="project">Project-based</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="paymentAmount">Amount *</Label>
            <Input
              id="paymentAmount"
              type="number"
              min="0"
              step="0.01"
              value={formData.paymentAmount}
              onChange={(e) => setFormData({ ...formData, paymentAmount: parseFloat(e.target.value) || 0 })}
              required
              placeholder="0.00"
            />
          </div>

          {formData.paymentType === 'salary' && (
            <div>
              <Label htmlFor="paymentFrequency">Frequency</Label>
              <Select
                value={formData.paymentFrequency}
                onValueChange={(value) => setFormData({ ...formData, paymentFrequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="schedule">Schedule</Label>
          <Input
            id="schedule"
            value={formData.schedule}
            onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
            placeholder="e.g. Monday-Friday, 9 AM - 5 PM"
          />
        </div>

        <div>
          <Label>Required Skills</Label>
          <SkillsManagerForm
            initialSkills={formData.requiredSkills}
            onSkillsChange={(skills) => setFormData({ ...formData, requiredSkills: skills })}
            showTitle={false}
          />
        </div>

        <div>
          <Label htmlFor="benefits">Benefits</Label>
          <Textarea
            id="benefits"
            value={formData.benefits}
            onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
            placeholder="Health insurance, 401k, paid time off, etc."
            rows={3}
          />
        </div>

        {hubPins && hubPins.length > 0 && (
          <div>
            <Label htmlFor="hubPinId">Assign to Hub Pin (Optional)</Label>
            <Select
              value={formData.hubPinId?.toString()}
              onValueChange={(value) => setFormData({ ...formData, hubPinId: value ? parseInt(value) : undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a hub pin..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No specific location</SelectItem>
                {hubPins.map((pin: any) => (
                  <SelectItem key={pin.id} value={pin.id.toString()}>
                    {pin.title} - {pin.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="h-4 w-4"
          />
          <Label htmlFor="isActive" className="cursor-pointer">
            Active (accepting applications)
          </Label>
        </div>
      </form>
    );
  };

  if (isLoading) {
    return <div>Loading positions...</div>;
  }

  const activePositions = positions?.filter((p: Position) => p.isActive) || [];
  const inactivePositions = positions?.filter((p: Position) => !p.isActive) || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          Create and manage job positions for your business
        </p>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Position
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Position</DialogTitle>
              <DialogDescription>
                Add a new job position to your business
              </DialogDescription>
            </DialogHeader>
            <PositionForm
              onSubmit={(data) => createMutation.mutate(data)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="position-form"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Position'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            Active ({activePositions.length})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive ({inactivePositions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activePositions.length > 0 ? (
            activePositions.map((position: Position) => (
              <Card key={position.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{position.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {position.positionType} • ${position.paymentAmount}/
                        {position.paymentType === 'hourly' ? 'hr' : position.paymentFrequency}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {position.positionsAvailable} position{position.positionsAvailable !== 1 ? 's' : ''}
                      </Badge>
                      <Badge>
                        {position.applicationCount || 0} applicants
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {position.description}
                  </p>
                  {position.requiredSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {position.requiredSkills.slice(0, 3).map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {position.requiredSkills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{position.requiredSkills.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateMutation.mutate({ id: position.id, isActive: false })}
                    >
                      <EyeOff className="h-4 w-4" />
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingPosition(position)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Position</DialogTitle>
                        </DialogHeader>
                        <PositionForm
                          position={editingPosition}
                          onSubmit={(data) => updateMutation.mutate({ id: position.id, ...data })}
                        />
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEditingPosition(null)}>
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            form="position-form"
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? 'Updating...' : 'Update Position'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this position?')) {
                          deleteMutation.mutate(position.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No active positions</p>
                <Button
                  size="sm"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Position
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          {inactivePositions.length > 0 ? (
            inactivePositions.map((position: Position) => (
              <Card key={position.id} className="opacity-75">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{position.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {position.positionType} • ${position.paymentAmount}/
                        {position.paymentType === 'hourly' ? 'hr' : position.paymentFrequency}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">Inactive</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateMutation.mutate({ id: position.id, isActive: true })}
                    >
                      <Eye className="h-4 w-4" />
                      Reactivate
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this position?')) {
                          deleteMutation.mutate(position.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No inactive positions</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 