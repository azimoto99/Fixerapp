import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, MapPin, Eye, EyeOff, Upload, X } from 'lucide-react';
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
      setIsEditDialogOpen(false);
      toast({
        title: 'Hub Pin Updated',
        description: 'Your hub pin has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update hub pin',
        variant: 'destructive'
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
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete hub pin',
        variant: 'destructive'
      });
    }
  });

  const HubPinForm = ({ pin, onSubmit, formId = 'hub-pin-form' }: { 
    pin?: HubPin | null; 
    onSubmit: (data: any) => void;
    formId?: string;
  }) => {
    const [formData, setFormData] = useState({
      title: pin?.title || '',
      description: pin?.description || '',
      location: pin?.location || '',
      latitude: pin?.latitude || 0,
      longitude: pin?.longitude || 0,
      pinSize: pin?.pinSize || 'medium',
      pinColor: pin?.pinColor || '#FF6B6B',
      iconUrl: pin?.iconUrl || '',
      priority: pin?.priority || 1,
      isActive: pin?.isActive ?? true
    });

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string>(pin?.iconUrl || '');
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle logo file selection
    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Invalid File Type',
          description: 'Please select a valid image file (JPEG, PNG, GIF, or WebP).',
          variant: 'destructive'
        });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Please select an image smaller than 5MB.',
          variant: 'destructive'
        });
        return;
      }

      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setLogoPreview(imageData);
      };
      reader.readAsDataURL(file);
    };

    // Upload logo to server
    const uploadLogo = async (): Promise<string | null> => {
      if (!logoFile) return logoPreview || null;

      setIsUploadingLogo(true);
      try {
        const formData = new FormData();
        formData.append('logo', logoFile);

        const response = await apiRequest('POST', '/api/enterprise/upload-logo', formData);
        if (!response.ok) {
          throw new Error('Failed to upload logo');
        }

        const result = await response.json();
        return result.logoUrl;
      } catch (error) {
        console.error('Logo upload error:', error);
        toast({
          title: 'Upload Failed',
          description: 'Failed to upload logo. Please try again.',
          variant: 'destructive'
        });
        return null;
      } finally {
        setIsUploadingLogo(false);
      }
    };

    // Remove logo
    const removeLogo = () => {
      setLogoFile(null);
      setLogoPreview('');
      setFormData({ ...formData, iconUrl: '' });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      console.log('Hub Pin Form Data:', formData);
      
      // Validate that we have coordinates
      if (!formData.latitude || !formData.longitude || formData.latitude === 0 || formData.longitude === 0) {
        console.error('Invalid coordinates:', { lat: formData.latitude, lng: formData.longitude });
        toast({
          title: 'Location Required',
          description: 'Please select a valid address from the suggestions to get coordinates.',
          variant: 'destructive'
        });
        return;
      }

      // Validate coordinate ranges (basic sanity check)
      if (Math.abs(formData.latitude) > 90 || Math.abs(formData.longitude) > 180) {
        console.error('Coordinates out of range:', { lat: formData.latitude, lng: formData.longitude });
        toast({
          title: 'Invalid Coordinates',
          description: 'The selected location has invalid coordinates. Please try a different address.',
          variant: 'destructive'
        });
        return;
      }
      
      console.log('Submitting hub pin with valid coordinates:', {
        location: formData.location,
        latitude: formData.latitude,
        longitude: formData.longitude
      });
      
      try {
        // Upload logo if there's a new file
        let logoUrl = formData.iconUrl;
        if (logoFile) {
          const uploadedUrl = await uploadLogo();
          if (uploadedUrl) {
            logoUrl = uploadedUrl;
          }
        }

        // Submit form with logo URL
        const submitData = {
          ...formData,
          iconUrl: logoUrl
        };

        onSubmit(submitData);
      } catch (error) {
        console.error('Error submitting hub pin form:', error);
        toast({
          title: 'Submission Error',
          description: 'An error occurred while submitting the form. Please try again.',
          variant: 'destructive'
        });
      }
    };

    const handleLocationSelect = (address: string, coordinates: { lat: number; lng: number }) => {
      console.log('Location selected:', { address, coordinates });
      
      // Validate coordinates
      if (!coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number') {
        console.error('Invalid coordinates received:', coordinates);
        toast({
          title: 'Invalid Location',
          description: 'The selected location has invalid coordinates. Please try another address.',
          variant: 'destructive'
        });
        return;
      }

      // Check for reasonable coordinate ranges
      if (Math.abs(coordinates.lat) > 90 || Math.abs(coordinates.lng) > 180) {
        console.error('Coordinates out of range:', coordinates);
        toast({
          title: 'Invalid Location',
          description: 'The selected location is outside valid coordinate ranges.',
          variant: 'destructive'
        });
        return;
      }

      setFormData({
        ...formData,
        location: address,
        latitude: coordinates.lat,
        longitude: coordinates.lng
      });

      console.log('Form data updated with coordinates:', {
        location: address,
        latitude: coordinates.lat,
        longitude: coordinates.lng
      });
    };

    return (
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
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
            value={formData.location}
            onLocationSelect={handleLocationSelect}
            placeholder="Search for an address..."
            required
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {formData.latitude && formData.longitude ? 
              `Coordinates: ${formData.latitude.toFixed(6)}, ${formData.longitude.toFixed(6)}` : 
              'Please select an address from the suggestions to get coordinates'
            }
          </p>
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
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
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

        {/* Logo Upload Section */}
        <div>
          <Label>Hub Pin Logo</Label>
          <div className="mt-2 space-y-4">
            {/* Logo Preview */}
            {logoPreview && (
              <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                <div className="relative">
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    className="w-16 h-16 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium">Logo Preview</p>
                  <p className="text-xs text-gray-500">This will appear on your hub pin</p>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {logoPreview ? 'Change Logo' : 'Upload Logo'}
              </Button>
              
              {logoPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={removeLogo}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoSelect}
              className="hidden"
            />

            <p className="text-xs text-gray-500">
              Upload a logo to customize your hub pin appearance. Recommended: Square image, max 5MB.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
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
            <p className="text-xs text-gray-500 mt-1">
              Higher priority pins appear more prominently on the map
            </p>
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
              formId="create-hub-pin-form"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="create-hub-pin-form"
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
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingPin(pin);
                            setIsEditDialogOpen(true);
                          }}
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
                          formId="edit-hub-pin-form"
                        />
                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setEditingPin(null);
                              setIsEditDialogOpen(false);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            form="edit-hub-pin-form"
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
