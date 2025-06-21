import React, { useState } from 'react';
import { User } from '@shared/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { ProfileImageUploader } from '@/components/profile/ProfileImageUploader';
import {
  Save,
  Bell,
  Mail,
  Shield,
  Download,
  Trash2,
  AlertCircle,
  Palette,
  User as UserIcon,
  Camera,
  Key,
  Globe,
  Smartphone
} from 'lucide-react';

interface SettingsContentProps {
  user: User;
}

const SettingsContent: React.FC<SettingsContentProps> = ({ user }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    newJobAlerts: true,
    paymentUpdates: true,
    marketingEmails: false,
  });

  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'job_contacts', // 'public', 'job_contacts', 'private'
    showOnlineStatus: true,
    allowLocationAccess: true,
    shareActivityStatus: false,
  });

  const handleNotificationToggle = (setting: string) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: !prev[setting as keyof typeof prev]
    }));
  };

  const handlePrivacyChange = (setting: string, value: any) => {
    setPrivacySettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    
    try {
      // Save notification settings
      const response = await apiRequest('PATCH', '/api/user/settings', {
        ...notificationSettings,
        ...privacySettings
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      // Update cache
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: 'Settings saved',
        description: 'Your settings have been updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error saving settings',
        description: 'There was a problem updating your settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = () => {
    toast({
      title: 'Data export requested',
      description: 'Your data export will be emailed to you within 24 hours.',
    });
  };

  const handleDeleteAccount = () => {
    toast({
      title: 'Account deletion',
      description: 'This feature is currently unavailable. Please contact support.',
      variant: 'destructive',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Account Settings</h2>
      </div>

      {/* Profile Picture Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Profile Picture
          </CardTitle>
          <CardDescription>Upload and manage your profile avatar</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileImageUploader user={user} className="w-full" />
          
          <div className="mt-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Your profile picture helps others recognize you across the platform
            </p>
            <p className="text-xs text-muted-foreground">
              Recommended: Square image, at least 200x200 pixels, max 5MB
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-primary" />
            Account Information
          </CardTitle>
          <CardDescription>View your basic account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={user.username || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Username cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={user.fullName || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Contact support to update</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={user.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed for security reasons</p>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifications
          </CardTitle>
          <CardDescription>Control how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications" className="text-base">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive emails about your account activity</p>
              </div>
              <Switch
                id="email-notifications"
                checked={notificationSettings.emailNotifications}
                onCheckedChange={() => handleNotificationToggle('emailNotifications')}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications" className="text-base">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications on your mobile device</p>
              </div>
              <Switch
                id="push-notifications"
                checked={notificationSettings.pushNotifications}
                onCheckedChange={() => handleNotificationToggle('pushNotifications')}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="new-job-alerts" className="text-base">New Job Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified when new jobs match your skills</p>
              </div>
              <Switch
                id="new-job-alerts"
                checked={notificationSettings.newJobAlerts}
                onCheckedChange={() => handleNotificationToggle('newJobAlerts')}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="payment-updates" className="text-base">Payment Updates</Label>
                <p className="text-sm text-muted-foreground">Get notified about payment status changes</p>
              </div>
              <Switch
                id="payment-updates"
                checked={notificationSettings.paymentUpdates}
                onCheckedChange={() => handleNotificationToggle('paymentUpdates')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Privacy & Security
          </CardTitle>
          <CardDescription>Control your privacy and visibility settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-visibility" className="text-base">Profile Visibility</Label>
              <select
                id="profile-visibility"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={privacySettings.profileVisibility}
                onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
              >
                <option value="public">Everyone</option>
                <option value="job_contacts">Job Contacts Only</option>
                <option value="private">Private</option>
              </select>
              <p className="text-sm text-muted-foreground">Controls who can see your profile information</p>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="online-status" className="text-base">Show Online Status</Label>
                <p className="text-sm text-muted-foreground">Let others see when you're active</p>
              </div>
              <Switch
                id="online-status"
                checked={privacySettings.showOnlineStatus}
                onCheckedChange={(checked) => handlePrivacyChange('showOnlineStatus', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="location-access" className="text-base">Allow Location Access</Label>
                <p className="text-sm text-muted-foreground">Required for finding nearby jobs</p>
              </div>
              <Switch
                id="location-access"
                checked={privacySettings.allowLocationAccess}
                onCheckedChange={(checked) => handlePrivacyChange('allowLocationAccess', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Appearance
          </CardTitle>
          <CardDescription>Customize the app's appearance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-medium">Theme</Label>
              <ThemeToggle variant="radio" />
            </div>
            
            <div className="pt-4">
              <div className="flex gap-4">
                <div className="flex-1 border rounded-lg overflow-hidden relative bg-background">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none"></div>
                  <div className="h-3 w-full bg-primary"></div>
                  <div className="p-3 text-center">
                    <div className="text-xs text-foreground">Current Theme</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data & Account Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Data & Account
          </CardTitle>
          <CardDescription>Manage your account data and settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleExportData}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Account Data
          </Button>
          
          <Separator />
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={handleDeleteAccount}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button 
          onClick={handleSaveSettings}
          disabled={isLoading}
          className="px-8"
        >
          {isLoading ? (
            <>Saving...</>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SettingsContent;