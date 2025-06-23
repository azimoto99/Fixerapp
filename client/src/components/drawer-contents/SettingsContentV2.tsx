import React, { useState } from 'react';
import { User } from '@shared/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { ProfileImageUploader } from '@/components/profile/ProfileImageUploader';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Save, Bell, Shield, Palette, Trash2, Loader2, User as UserIcon } from 'lucide-react';

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

  /* ------------- helpers ------------- */
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
    await new Promise(r => setTimeout(r, 800)); // simulate request
    setDirty(false);
    setIsSaving(false);
    toast({ title: 'Settings saved' });
  };

  /* ------------- UI ------------- */
  const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <CardHeader className="flex items-center gap-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-t-md">
      <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <CardTitle className="text-base font-medium tracking-tight">{title}</CardTitle>
    </CardHeader>
  );

  return (
    <div className="user-settings-scroll space-y-6 overflow-y-auto h-full pr-2 pb-24">
      {/* Profile */}
      <Card>
        <SectionHeader icon={UserIcon} title="Profile" />
        <CardContent className="space-y-6 pt-6">
          <ProfileImageUploader user={user} className="mx-auto" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={user.username} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={user.fullName || ''} disabled className="bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <SectionHeader icon={Bell} title="Notifications" />
        <CardContent className="space-y-4 pt-6">
          {Object.entries(notificationSettings).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between">
              <Label className="capitalize">{k.replace(/([A-Z])/g, ' $1')}</Label>
              <Switch checked={v} onCheckedChange={() => toggleSetting('notification', k)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Privacy (accordion) */}
      <Card>
        <SectionHeader icon={Shield} title="Privacy" />
        <CardContent className="pt-2">
          <Accordion type="single" collapsible>
            <AccordionItem value="basic">
              <AccordionTrigger className="px-4 py-3">Visibility</AccordionTrigger>
              <AccordionContent className="space-y-4 px-2 pb-4">
                {Object.entries(privacySettings).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <Label className="capitalize">{k.replace(/([A-Z])/g, ' $1')}</Label>
                    <Switch checked={v} onCheckedChange={() => toggleSetting('privacy', k)} />
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <SectionHeader icon={Palette} title="Appearance" />
        <CardContent className="space-y-4 pt-6">
          <ThemeToggle />
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card>
        <SectionHeader icon={Trash2} title="Account" />
        <CardContent className="space-y-4 pt-6">
          <Button variant="destructive" className="w-full" onClick={() => toast({ title: 'Contact support to delete account' })}>
            Delete account
          </Button>
        </CardContent>
      </Card>

      {/* save bar */}
      {dirty && (
        <div className="fixed bottom-4 right-6 bg-background/90 backdrop-blur-md shadow-lg rounded-lg px-4 py-3 flex gap-3 z-[var(--z-index-emergency)]">
          <Button size="sm" variant="ghost" onClick={() => setDirty(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save changes
          </Button>
        </div>
      )}
    </div>
  );
} 