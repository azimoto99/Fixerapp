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
import { Plus, Edit, Trash2, MapPin, Eye, EyeOff } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AddressAutocompleteInput } from '@/components/AddressAutocompleteInput';

interface HubPin {
  id: number;
  title: string;
  description?: string;
  location: string;
  latitude: number;
  longitude: number;
  pinSize: string;
  pinColor: string;
  iconUrl?: string;
  priority: number;
  isActive: boolean;
  positionCount?: number;
}

export default function HubPinManager({ businessId }: { businessId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPin, setEditingPin] = useState<HubPin | null>(null);

  // Fetch hub pins
  const { data: hubPins, isLoading } = useQuery({
    queryKey: ['/api/enterprise/hub-pins', businessId],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/enterprise/hub-pins');
      return res.json();
    },
    enabled: !!businessId
  });

  // Create hub pin mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/enterprise/hub-pins', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/hub-pins'] });
      setIsCreateDialogOpen(false);
      toast({
        title: 'Hub Pin Created',
        description: 'Your new hub pin has been created successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create hub pin',
        variant: 'destructive'
      });
    }
  });

  // Update hub pin mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest('PUT', `/api/enterprise/hub-pins/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/hub-pins'] });
      setEditingPin(null);
      toast({
        title: 'Hub Pin Updated',
        description: 'Your hub pin has been updated successfully.',
      });
    }
  });

  // Delete hub pin mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/enterprise/hub-pins/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/hub-pins'] });
      toast({
        title: 'Hub Pin Deleted',
        description: 'Your hub pin has been deleted successfully.',
      });
    }
  });

  const handleLocationSelect = (address: string, coordinates: { lat: number; lng: number }) => {
    // Update form with selected location
    const form = document.getElementById('hub-pin-form') as HTMLFormElement;
    if (form) {
      (form.elements.namedItem('location') as HTMLInputElement).value = address;
      (form.elements.namedItem('latitude') as HTMLInputElement).value = coordinates.lat.toString();
      (form.elements.namedItem('longitude') as HTMLInputElement).value = coordinates.lng.toString();
    }
  };

  const HubPinForm = ({ pin, onSubmit }: { pin?: HubPin | null; onSubmit: (data: any) => void }) => {
    const [formData, setFormData] = useState({
      title: pin?.title || '',
      description: pin?.description || '',
      location: pin?.location || '',
      latitude: pin?.latitude || 0,
      longitude: pin?.longitude || 0,
      pinSize: pin?.pinSize || 'large',
      pinColor: pin?.pinColor || '#FF6B6B',
      iconUrl: pin?.iconUrl || '',
      priority: pin?.priority || 1,
      isActive: pin?.isActive ?? true
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(formData);
    };

    return (
      <form id="hub-pin-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Pin Title *</Label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            placeholder="Main Office, Downtown Location, etc."
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of this location..."
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="location">Location *</Label>
          <AddressAutocompleteInput
            onLocationSelect={(address, coords) => {
              setFormData({
                ...formData,
                location: address,
                latitude: coords.lat,
                longitude: coords.lng
              });
            }}
            defaultValue={formData.location}
            placeholder="Search for an address..."
            required
          />
          <input type="hidden" name="latitude" value={formData.latitude} />
          <input type="hidden" name="longitude" value={formData.longitude} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pinSize">Pin Size</Label>
            <Select
              value={formData.pinSize}
              onValueChange={(value) => setFormData({ ...formData, pinSize: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="xlarge">Extra Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="pinColor">Pin Color</Label>
            <div className="flex gap-2">
              <Input
                id="pinColor"
                type="color"
                value={formData.pinColor}
                onChange={(e) => setFormData({ ...formData, pinColor: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                value={formData.pinColor}
                onChange={(e) => setFormData({ ...formData, pinColor: e.target.value })}
                placeholder="#FF6B6B"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="priority">Priority (1-10)</Label>
            <Input
              id="priority"
              type="number"
              min="1"
              max="10"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div>
            <Label htmlFor="iconUrl">Custom Icon URL (Optional)</Label>
            <Input
              id="iconUrl"
              value={formData.iconUrl}
              onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
              placeholder="https://example.com/icon.png"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="h-4 w-4"
          />
          <Label htmlFor="isActive" className="cursor-pointer">
            Active (visible on map)
          </Label>
        </div>
      </form>
    );
  };

  if (isLoading) {
    return <div>Loading hub pins...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          Create hub pins to mark your business locations on the map
        </p>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Hub Pin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Hub Pin</DialogTitle>
              <DialogDescription>
                Add a new location pin that will be featured on the map
              </DialogDescription>
            </DialogHeader>
            <HubPinForm
              onSubmit={(data) => createMutation.mutate(data)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="hub-pin-form"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Hub Pin'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hubPins && hubPins.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hubPins.map((pin: HubPin) => (
            <Card key={pin.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: pin.pinColor }}
                      />
                      {pin.title}
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {pin.location}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={pin.isActive ? 'default' : 'secondary'}>
                      {pin.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline">
                      Priority: {pin.priority}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {pin.description && (
                  <p className="text-sm text-muted-foreground mb-3">{pin.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {pin.positionCount || 0} active positions
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => pin.isActive ? 
                        updateMutation.mutate({ id: pin.id, isActive: false }) :
                        updateMutation.mutate({ id: pin.id, isActive: true })
                      }
                    >
                      {pin.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingPin(pin)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Edit Hub Pin</DialogTitle>
                        </DialogHeader>
                        <HubPinForm
                          pin={editingPin}
                          onSubmit={(data) => updateMutation.mutate({ id: pin.id, ...data })}
                        />
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEditingPin(null)}>
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            form="hub-pin-form"
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? 'Updating...' : 'Update Hub Pin'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this hub pin?')) {
                          deleteMutation.mutate(pin.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No hub pins created yet</p>
            <Button
              size="sm"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Hub Pin
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 