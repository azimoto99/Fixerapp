import React, { useState } from 'react';
import { User } from '@shared/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { ProfileImageUploader } from '@/components/profile/ProfileImageUploader';
import {
  Save,
  Bell,
  Mail,
  Shield,
  Smartphone,
  Download,
  Trash2,
  AlertCircle,
  Palette,
  User as UserIcon
} from 'lucide-react';

interface SettingsContentProps {
  user: User;
}

const SettingsContent: React.FC<SettingsContentProps> = ({ user }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPrivacy, setIsLoadingPrivacy] = useState(true);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Notification settings - these should be fetched from user preferences
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: user.emailNotifications ?? true,
    pushNotifications: user.pushNotifications ?? true,
    newJobAlerts: user.newJobAlerts ?? true,
    paymentUpdates: user.paymentUpdates ?? true,
    marketingEmails: user.marketingEmails ?? false,
  });

  // Privacy settings - fetched from real API
  const [privacySettings, setPrivacySettings] = useState({
    showLocationToAll: false,
    showLocationToJobPosters: true,
    showLocationRadius: 1000,
    showPhoneToAll: false,
    showPhoneToJobPosters: true,
    showEmailToAll: false,
    showEmailToJobPosters: false,
    showFullNameToAll: false,
    showFullNameToJobPosters: true,
    showProfilePictureToAll: true,
    showRatingsToAll: true,
    showJobHistoryToAll: false,
    allowMessagesFromAll: false,
    allowMessagesFromJobPostersOnly: true,
    allowJobRecommendations: true,
    allowMarketingEmails: false,
    allowPushNotifications: true,
    dataRetentionPeriod: 0,
  });

  const handleToggle = (setting: string) => {
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
      // This would actually save to a user_settings table in a real app
      // For now we'll just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
          <TabsTrigger value="profile" className="text-xs flex-col h-auto py-2">
            <UserIcon className="h-4 w-4 mb-1" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="text-xs flex-col h-auto py-2">
            <Shield className="h-4 w-4 mb-1" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs flex-col h-auto py-2">
            <Bell className="h-4 w-4 mb-1" />
            <span className="hidden sm:inline">Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="text-xs flex-col h-auto py-2">
            <Shield className="h-4 w-4 mb-1" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="text-xs flex-col h-auto py-2">
            <Palette className="h-4 w-4 mb-1" />
            <span className="hidden sm:inline">Theme</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="text-xs flex-col h-auto py-2">
            <Download className="h-4 w-4 mb-1" />
            <span className="hidden sm:inline">Data</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Picture Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile Picture</CardTitle>
              <CardDescription>Upload and manage your profile avatar</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-6">
              <ProfileImageUploader
                user={user}
                className="w-full max-w-sm"
              />
              
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Your profile picture helps others recognize you across the platform
                </p>
                <p className="text-xs text-muted-foreground">
                  Recommended: Square image, at least 200x200 pixels
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile Information</CardTitle>
              <CardDescription>Manage your basic profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                <p className="text-xs text-muted-foreground">Email cannot be changed for security</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email Notifications</CardTitle>
              <CardDescription>Manage how you receive email notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="email-notifications" className="flex flex-col">
                  <span>Email Notifications</span>
                  <span className="text-sm text-muted-foreground">Receive emails about your account activity</span>
                </Label>
                <Switch
                  id="email-notifications"
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={() => handleToggle('emailNotifications')}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="new-job-alerts" className="flex flex-col">
                  <span>New Job Alerts</span>
                  <span className="text-sm text-muted-foreground">Get notified when new jobs match your skills</span>
                </Label>
                <Switch
                  id="new-job-alerts"
                  checked={notificationSettings.newJobAlerts}
                  onCheckedChange={() => handleToggle('newJobAlerts')}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="payment-updates" className="flex flex-col">
                  <span>Payment Updates</span>
                  <span className="text-sm text-muted-foreground">Get notified about payment status changes</span>
                </Label>
                <Switch
                  id="payment-updates"
                  checked={notificationSettings.paymentUpdates}
                  onCheckedChange={() => handleToggle('paymentUpdates')}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="marketing-emails" className="flex flex-col">
                  <span>Marketing Emails</span>
                  <span className="text-sm text-muted-foreground">Receive updates about new features and promotions</span>
                </Label>
                <Switch
                  id="marketing-emails"
                  checked={notificationSettings.marketingEmails}
                  onCheckedChange={() => handleToggle('marketingEmails')}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Push Notifications</CardTitle>
              <CardDescription>Control your mobile app notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="push-notifications" className="flex flex-col">
                  <span>Enable Push Notifications</span>
                  <span className="text-sm text-muted-foreground">Receive notifications on your mobile device</span>
                </Label>
                <Switch
                  id="push-notifications"
                  checked={notificationSettings.pushNotifications}
                  onCheckedChange={() => handleToggle('pushNotifications')}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile Visibility</CardTitle>
              <CardDescription>Control who can see your profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="profile-visibility">Profile Visibility</Label>
                <select
                  id="profile-visibility"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={privacySettings.profileVisibility}
                  onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                >
                  <option value="all">Everyone</option>
                  <option value="contacts">Job Contacts Only</option>
                  <option value="none">Private</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="online-status" className="flex flex-col">
                  <span>Show Online Status</span>
                  <span className="text-sm text-muted-foreground">Let others see when you're active</span>
                </Label>
                <Switch
                  id="online-status"
                  checked={privacySettings.showOnlineStatus}
                  onCheckedChange={(checked) => handlePrivacyChange('showOnlineStatus', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="activity-status" className="flex flex-col">
                  <span>Share Activity Status</span>
                  <span className="text-sm text-muted-foreground">Share your recent job activity</span>
                </Label>
                <Switch
                  id="activity-status"
                  checked={privacySettings.shareActivityStatus}
                  onCheckedChange={(checked) => handlePrivacyChange('shareActivityStatus', checked)}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Location Settings</CardTitle>
              <CardDescription>Manage how your location is used</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="location-access" className="flex flex-col">
                  <span>Allow Location Access</span>
                  <span className="text-sm text-muted-foreground">Required for finding nearby jobs</span>
                </Label>
                <Switch
                  id="location-access"
                  checked={privacySettings.allowLocationAccess}
                  onCheckedChange={(checked) => handlePrivacyChange('allowLocationAccess', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Theme Settings</CardTitle>
              <CardDescription>Customize the appearance of the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col space-y-4">
                <Label className="text-base font-medium mb-2">
                  Choose Theme
                </Label>
                <ThemeToggle variant="radio" />
              </div>
              
              <div className="pt-2">
                <h4 className="text-sm font-medium mb-4">Preview Themes</h4>
                <div className="flex gap-4">
                  <div className="flex-1 border rounded-lg overflow-hidden relative bg-background">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none"></div>
                    <div className="h-3 w-full bg-primary"></div>
                    <div className="p-2 text-center">
                      <div className="text-xs text-foreground">Current Theme</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Data</CardTitle>
              <CardDescription>Export or delete your account data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full flex items-center justify-center">
                <Download className="h-4 w-4 mr-2" />
                Export Account Data
              </Button>
              
              <div className="pt-2">
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 text-destructive" />
                  Danger Zone
                </h4>
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
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button 
          onClick={handleSaveSettings}
          disabled={isLoading}
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