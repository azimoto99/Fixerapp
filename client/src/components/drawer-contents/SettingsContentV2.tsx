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
          <TabsList className="grid w-full grid-cols-3 rounded-none bg-transparent p-0 h-12">
            <TabsTrigger value="profile" className="py-3 px-2 rounded-none border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs">
              <UserIcon className="w-3 h-3 mr-1" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="preferences" className="py-3 px-2 rounded-none border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs">
              <Palette className="w-3 h-3 mr-1" />
              Prefs
            </TabsTrigger>
            <TabsTrigger value="account" className="py-3 px-2 rounded-none border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs">
              <Shield className="w-3 h-3 mr-1" />
              Account
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Profile Tab */}
        <TabsContent value="profile" className="flex-1 p-4 space-y-4">
          <div className="text-center space-y-3">
            <ProfileImageUploader user={user} compact={true} className="mx-auto" />
            <div>
              <h2 className="text-lg font-bold truncate">{user.fullName || user.username}</h2>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>

          <Card className="p-4">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <UserIcon className="w-3 h-3" />
                    Username
                  </Label>
                  <Input value={user.username} readOnly className="bg-muted/50 text-sm h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Mail className="w-3 h-3" />
                    Email
                  </Label>
                  <Input value={user.email} readOnly className="bg-muted/50 text-sm h-9" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Lock className="w-3 h-3" />
                  Password
                </Label>
                <Button variant="outline" size="sm" className="w-full h-9" disabled>
                  Change Password
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="flex-1 p-4 space-y-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-semibold text-sm">
                  <Bell className="w-4 h-4" />
                  Notifications
                </h3>
                {Object.entries(notificationSettings).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50">
                    <Label className="capitalize font-normal text-sm">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </Label>
                    <Switch 
                      checked={value} 
                      onCheckedChange={() => toggleSetting('notification', key)}
                      className="scale-75"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-semibold text-sm">
                  <Shield className="w-4 h-4" />
                  Privacy
                </h3>
                {Object.entries(privacySettings).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50">
                    <Label className="capitalize font-normal text-sm">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </Label>
                    <Switch 
                      checked={value} 
                      onCheckedChange={() => toggleSetting('privacy', key)}
                      className="scale-75"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-semibold text-sm">
                  <Moon className="w-4 h-4" />
                  Appearance
                </h3>
                <div className="py-2 px-2 rounded-lg hover:bg-muted/50">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="flex-1 p-4">
          <Card className="p-4 border-destructive/50">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
              <div className="space-y-2">
                <Label className="text-destructive text-sm">Delete Account</Label>
                <p className="text-xs text-muted-foreground">
                  Permanently remove your account and all associated data
                </p>
                <Button 
                  variant="destructive" 
                  size="sm"
                  className="w-full h-9"
                  onClick={() => toast({ 
                    title: 'Account deletion requested',
                    description: 'Please contact support to complete account deletion',
                    variant: 'destructive'
                  })}
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Delete Account
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Bar */}
      {dirty && (
        <div className="sticky bottom-0 bg-background/90 backdrop-blur-md border-t py-3">
          <div className="flex justify-end gap-2 px-4">
            <Button variant="ghost" size="sm" onClick={() => setDirty(false)}>
              Discard
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 
