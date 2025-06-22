import React, { useState, useEffect } from 'react';
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
import { useMutation, useQuery } from '@tanstack/react-query';
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
  Smartphone,
  Phone,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface SettingsContentProps {
  user: User;
}

const SettingsContent: React.FC<SettingsContentProps> = ({ user }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Fetch user settings from API
  const { data: userSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/user/settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/user/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch user settings');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Notification settings - initialize with API data or defaults
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: userSettings?.emailNotifications ?? true,
    pushNotifications: userSettings?.pushNotifications ?? true,
    newJobAlerts: userSettings?.newJobAlerts ?? true,
    paymentUpdates: userSettings?.paymentUpdates ?? true,
    marketingEmails: userSettings?.marketingEmails ?? false,
  });

  // Privacy settings - initialize with API data or defaults
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: userSettings?.profileVisibility ?? 'job_contacts', // 'public', 'job_contacts', 'private'
    showOnlineStatus: userSettings?.showOnlineStatus ?? true,
    allowLocationAccess: userSettings?.allowLocationAccess ?? true,
    shareActivityStatus: userSettings?.shareActivityStatus ?? false,
  });

  // Update settings when API data is loaded
  useEffect(() => {
    if (userSettings) {
      setNotificationSettings({
        emailNotifications: userSettings.emailNotifications ?? true,
        pushNotifications: userSettings.pushNotifications ?? true,
        newJobAlerts: userSettings.newJobAlerts ?? true,
        paymentUpdates: userSettings.paymentUpdates ?? true,
        marketingEmails: userSettings.marketingEmails ?? false,
      });
      
      setPrivacySettings({
        profileVisibility: userSettings.profileVisibility ?? 'job_contacts',
        showOnlineStatus: userSettings.showOnlineStatus ?? true,
        allowLocationAccess: userSettings.allowLocationAccess ?? true,
        shareActivityStatus: userSettings.shareActivityStatus ?? false,
      });
    }
  }, [userSettings]);

  // Phone verification state
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [verificationTimer, setVerificationTimer] = useState(0);

  // Phone verification mutations
  const sendVerificationMutation = useMutation({
    mutationFn: async (phone: string) => {
      const response = await apiRequest('POST', '/api/user/phone/send-verification', { phoneNumber: phone });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send verification code');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setIsVerificationSent(true);
      setVerificationTimer(600); // 10 minutes
      toast({
        title: 'Verification Code Sent',
        description: 'Check your phone for the verification code',
      });
      // In development, show the code
      if (data.verificationCode) {
        toast({
          title: 'Development Mode',
          description: `Verification code: ${data.verificationCode}`,
          duration: 10000,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  });

  const verifyPhoneMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/user/phone/verify', { verificationCode: code });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to verify phone number');
      }
      return response.json();
    },
    onSuccess: () => {
      setIsVerificationSent(false);
      setVerificationCode('');
      setVerificationTimer(0);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({
        title: 'Phone Verified',
        description: 'Your phone number has been successfully verified',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: error.message,
      });
    }
  });

  // Timer countdown effect - FIX: Add verificationTimer to dependency array
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (verificationTimer > 0) {
      interval = setInterval(() => {
        setVerificationTimer(prev => {
          if (prev <= 1) {
            setIsVerificationSent(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [verificationTimer]);

  const handleSendVerification = () => {
    if (!phoneNumber.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a phone number',
      });
      return;
    }
    sendVerificationMutation.mutate(phoneNumber);
  };

  const handleVerifyPhone = () => {
    if (!verificationCode.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter the verification code',
      });
      return;
    }
    verifyPhoneMutation.mutate(verificationCode);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

      {/* Phone Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Phone Verification
          </CardTitle>
          <CardDescription>Verify your phone number</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone-number">Phone Number</Label>
            <Input
              id="phone-number"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="verification-code">Verification Code</Label>
            <Input
              id="verification-code"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
            />
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="verification-status">Verification Status</Label>
            <p className="text-sm text-muted-foreground">
              {isVerificationSent ? formatTime(verificationTimer) : 'Not sent'}
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={handleSendVerification}
            >
              Send Verification Code
            </Button>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={handleVerifyPhone}
            >
              Verify Phone
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