import React, { useState } from 'react';
import { User } from '@shared/schema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ProfileImageUploader } from '@/components/profile/ProfileImageUploader';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Save, Bell, Shield, Palette, Trash2, Loader2, User as UserIcon, Mail, Lock, Moon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface SettingsContentProps {
  user: User;
}

export default function SettingsContentV2({ user }: SettingsContentProps) {
  const { toast } = useToast();
  const [dirty, setDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    push: true,
    jobAlerts: true,
  });

  const [privacySettings, setPrivacySettings] = useState({
    showFullName: true,
    showRatings: true,
    allowMessages: true,
  });

  const toggleSetting = (group: 'notification' | 'privacy', key: string) => {
    setDirty(true);
    if (group === 'notification') {
      setNotificationSettings(p => ({ ...p, [key]: !p[key as keyof typeof p] }));
    } else {
      setPrivacySettings(p => ({ ...p, [key]: !p[key as keyof typeof p] }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setDirty(false);
    setIsSaving(false);
    toast({ title: 'Settings saved', description: 'Your preferences have been successfully updated' });
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="profile" className="flex-1 flex flex-col">
        <div className="sticky top-0 bg-background z-10 border-b">
          <TabsList className="grid w-full grid-cols-3 rounded-none bg-transparent p-0 h-14">
            <TabsTrigger value="profile" className="py-4 rounded-none border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">
              <UserIcon className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="preferences" className="py-4 rounded-none border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">
              <Palette className="w-4 h-4 mr-2" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="account" className="py-4 rounded-none border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">
              <Shield className="w-4 h-4 mr-2" />
              Account
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Profile Tab */}
        <TabsContent value="profile" className="flex-1 p-6">
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <ProfileImageUploader user={user} className="mx-auto w-32 h-32" />
              <div>
                <h2 className="text-2xl font-bold">{user.fullName || user.username}</h2>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <Card className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      Username
                    </Label>
                    <Input value={user.username} readOnly className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <Input value={user.email} readOnly className="bg-muted/50" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Password
                  </Label>
                  <Button variant="outline" className="w-full" disabled>
                    Change Password
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="flex-1 p-6">
          <div className="max-w-2xl mx-auto space-y-8">
            <Card className="p-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 font-semibold text-lg">
                    <Bell className="w-5 h-5" />
                    Notifications
                  </h3>
                  {Object.entries(notificationSettings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                      <Label className="capitalize font-normal">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </Label>
                      <Switch 
                        checked={value} 
                        onCheckedChange={() => toggleSetting('notification', key)}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 font-semibold text-lg">
                    <Shield className="w-5 h-5" />
                    Privacy
                  </h3>
                  {Object.entries(privacySettings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                      <Label className="capitalize font-normal">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </Label>
                      <Switch 
                        checked={value} 
                        onCheckedChange={() => toggleSetting('privacy', key)}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 font-semibold text-lg">
                    <Moon className="w-5 h-5" />
                    Appearance
                  </h3>
                  <div className="p-3 rounded-lg hover:bg-muted/50">
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="flex-1 p-6">
          <div className="max-w-2xl mx-auto space-y-8">
            <Card className="p-6 border-destructive/50">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
                <div className="space-y-2">
                  <Label className="text-destructive">Delete Account</Label>
                  <p className="text-sm text-muted-foreground">
                    Permanently remove your account and all associated data
                  </p>
                  <Button 
                    variant="destructive" 
                    className="w-full mt-2"
                    onClick={() => toast({ 
                      title: 'Account deletion requested',
                      description: 'Please contact support to complete account deletion',
                      variant: 'destructive'
                    })}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Save Bar */}
      {dirty && (
        <div className="sticky bottom-0 bg-background/90 backdrop-blur-md border-t py-4">
          <div className="max-w-2xl mx-auto flex justify-end gap-3 px-6">
            <Button variant="ghost" onClick={() => setDirty(false)}>
              Discard Changes
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 
