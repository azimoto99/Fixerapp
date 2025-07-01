import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  CheckCircle, 
  AlertCircle, 
  Globe, 
  Phone, 
  Mail,
  Upload,
  Save,
  Settings,
  Shield,
  CreditCard
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface BusinessData {
  id: number;
  businessName: string;
  businessDescription?: string;
  businessLogo?: string;
  businessType: string;
  businessWebsite?: string;
  businessPhone?: string;
  businessEmail?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function BusinessSettings({ businessData }: { businessData: BusinessData }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    businessName: businessData?.businessName || '',
    businessDescription: businessData?.businessDescription || '',
    businessWebsite: businessData?.businessWebsite || '',
    businessPhone: businessData?.businessPhone || '',
    businessEmail: businessData?.businessEmail || '',
    businessType: businessData?.businessType || 'company',
    businessLogo: businessData?.businessLogo || ''
  });

  // Update business profile mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('🏢 Updating business profile with data:', data);
      
      try {
        const res = await apiRequest('PUT', '/api/enterprise/business/profile', data, {
          timeout: 45000 // 45 second timeout specifically for this request
        });
        console.log('🏢 Business profile update response received');
        return res.json();
      } catch (error) {
        console.error('🏢 Business profile update error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('🏢 Business profile updated successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/business'] });
      setIsEditing(false);
      toast({
        title: 'Business Profile Updated',
        description: 'Your business profile has been updated successfully.',
      });
      setFormData({
        businessName: data?.businessName || '',
        businessDescription: data?.businessDescription || '',
        businessWebsite: data?.businessWebsite || '',
        businessPhone: data?.businessPhone || '',
        businessEmail: data?.businessEmail || '',
        businessType: data?.businessType || 'company',
        businessLogo: data?.businessLogo || ''
      });
    },
    onError: (error: any) => {
      console.error('🏢 Business profile update mutation error:', error);
      toast({
        title: 'Error Updating Business Profile',
        description: error.message || 'Failed to update business profile. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Keep form data in sync when businessData prop changes (e.g., after refetch)
  useEffect(() => {
    if (!isEditing && businessData) {
      setFormData({
        businessName: businessData.businessName || '',
        businessDescription: businessData.businessDescription || '',
        businessWebsite: businessData.businessWebsite || '',
        businessPhone: businessData.businessPhone || '',
        businessEmail: businessData.businessEmail || '',
        businessType: businessData.businessType || 'company',
        businessLogo: businessData.businessLogo || ''
      });
    }
  }, [businessData, isEditing]);

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData({
      businessName: businessData?.businessName || '',
      businessDescription: businessData?.businessDescription || '',
      businessWebsite: businessData?.businessWebsite || '',
      businessPhone: businessData?.businessPhone || '',
      businessEmail: businessData?.businessEmail || '',
      businessType: businessData?.businessType || 'company',
      businessLogo: businessData?.businessLogo || ''
    });
    setIsEditing(false);
  };

  const getVerificationBadge = () => {
    switch (businessData?.verificationStatus) {
      case 'verified':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending Verification
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Business Profile</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Business Information
                  </CardTitle>
                  <CardDescription>
                    Update your business profile information
                  </CardDescription>
                </div>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    disabled={!isEditing}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="businessType">Business Type</Label>
                  <Select
                    value={formData.businessType}
                    onValueChange={(value) => setFormData({ ...formData, businessType: value })}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="corporation">Corporation</SelectItem>
                      <SelectItem value="llc">LLC</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                      <SelectItem value="sole-proprietorship">Sole Proprietorship</SelectItem>
                      <SelectItem value="non-profit">Non-Profit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="businessDescription">Business Description</Label>
                <Textarea
                  id="businessDescription"
                  value={formData.businessDescription}
                  onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
                  disabled={!isEditing}
                  rows={3}
                  placeholder="Tell us about your business..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessWebsite">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="businessWebsite"
                      value={formData.businessWebsite}
                      onChange={(e) => setFormData({ ...formData, businessWebsite: e.target.value })}
                      disabled={!isEditing}
                      placeholder="https://yourbusiness.com"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="businessPhone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="businessPhone"
                      value={formData.businessPhone}
                      onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
                      disabled={!isEditing}
                      placeholder="(555) 123-4567"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="businessEmail">Business Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="businessEmail"
                    value={formData.businessEmail}
                    onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
                    disabled={!isEditing}
                    placeholder="contact@yourbusiness.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label>Business Logo</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    id="logoUpload"
                    accept="image/png, image/jpeg"
                    className="hidden"
                    onChange={async (e) => {
                      if (e.target.files?.[0]) {
                        const file = e.target.files[0];
                        const formData = new FormData();
                        formData.append('logo', file);
                        
                        try {
                          const res = await apiRequest('POST', '/api/enterprise/upload-logo', formData);
                          const data = await res.json();
                          setFormData(prev => ({...prev, businessLogo: data.url}));
                          if (businessData) {
                            businessData.businessLogo = data.url;
                          }
                        } catch (error) {
                          toast({
                            title: 'Upload Failed',
                            description: 'Could not upload logo. Please try again.',
                            variant: 'destructive'
                          });
                        }
                      }
                    }}
                    disabled={!isEditing}
                  />
                  <label
                    htmlFor="logoUpload"
                    className="cursor-pointer inline-flex items-center px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium transition-colors"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {formData.businessLogo ? 'Change Logo' : 'Upload Logo'}
                  </label>
                  {formData.businessLogo && (
                    <div className="mt-2">
                      <img 
                        src={formData.businessLogo} 
                        alt="Business Logo" 
                        className="h-20 w-20 rounded-md object-cover"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Recommended: 200x200px, JPG or PNG
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Business Verification
              </CardTitle>
              <CardDescription>
                Verify your business to unlock enterprise features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-semibold">Verification Status</h3>
                  <p className="text-sm text-muted-foreground">
                    Current status of your business verification
                  </p>
                </div>
                {getVerificationBadge()}
              </div>

              {businessData?.verificationStatus === 'pending' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Verification In Progress</h4>
                  <p className="text-sm text-blue-800">
                    Your business verification is currently being reviewed. This process typically takes 1-3 business days.
                  </p>
                </div>
              )}

              {businessData?.verificationStatus === 'verified' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Business Verified ✓</h4>
                  <p className="text-sm text-green-800">
                    Your business has been successfully verified. You now have access to all enterprise features.
                  </p>
                </div>
              )}

              {businessData?.verificationStatus === 'rejected' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-red-900 mb-2">Verification Rejected</h4>
                  <p className="text-sm text-red-800 mb-3">
                    Your business verification was rejected. Please review your information and resubmit.
                  </p>
                  <Button variant="outline" size="sm">
                    Contact Support
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="font-semibold">Verification Benefits</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Featured hub pins on map
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Priority in search results
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Advanced analytics
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Custom branding options
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Preferences</CardTitle>
              <CardDescription>
                Manage your account settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Account Status</h4>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable your business account
                  </p>
                </div>
                <Switch checked={businessData?.isActive} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Email Notifications</h4>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications about new applications
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Auto-Accept Applications</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatically accept qualified applications
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing & Subscription
              </CardTitle>
              <CardDescription>
                Manage your enterprise subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Enterprise Plan</h4>
                <p className="text-sm text-blue-800 mb-3">
                  You're currently on the free enterprise plan with basic features.
                </p>
                <Button variant="outline" size="sm">
                  Upgrade Plan
                </Button>
              </div>
            </CardContent>
          </Card>

          {businessData && (
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Account Created:</span>
                  <span>{format(new Date(businessData.createdAt), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span>{format(new Date(businessData.updatedAt), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Business ID:</span>
                  <span className="font-mono">{businessData.id}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 
