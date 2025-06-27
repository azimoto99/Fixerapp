import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface PosterSettingsData {
  autoApproveApplications: boolean;
  defaultJobDescription: string;
  receiveApplicationAlerts: boolean;
}

export default function PosterSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<PosterSettingsData | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['/api/settings/poster', user?.id],
    queryFn: () => apiRequest('GET', '/api/settings/poster'),
    enabled: !!user,
    onSuccess: (data) => {
      if (data.settings) {
        setSettings(data.settings);
      }
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (updatedSettings: PosterSettingsData) =>
      apiRequest('PUT', '/api/settings/poster', { settings: updatedSettings }),
    onSuccess: () => {
      toast({ title: 'Settings Updated', description: 'Your settings have been saved.' });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/poster', user?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Updating Settings',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });

  const handleSettingChange = (key: keyof PosterSettingsData, value: any) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleSaveChanges = () => {
    if (settings) {
      updateSettingsMutation.mutate(settings);
    }
  };

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Poster Settings</CardTitle>
        <CardDescription>Manage your job posting and application preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="application-alerts" className="flex flex-col space-y-1">
            <span>Receive Application Alerts</span>
            <span className="font-normal leading-snug text-muted-foreground">
              Get notified via email when a new application is received.
            </span>
          </Label>
          <Switch
            id="application-alerts"
            checked={settings?.receiveApplicationAlerts || false}
            onCheckedChange={(checked) => handleSettingChange('receiveApplicationAlerts', checked)}
          />
        </div>

        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="auto-approve" className="flex flex-col space-y-1">
            <span>Auto-Approve Applications</span>
            <span className="font-normal leading-snug text-muted-foreground">
              Automatically approve applications from workers with high ratings.
            </span>
          </Label>
          <Switch
            id="auto-approve"
            checked={settings?.autoApproveApplications || false}
            onCheckedChange={(checked) => handleSettingChange('autoApproveApplications', checked)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="default-description">Default Job Description</Label>
          <p className="text-sm text-muted-foreground">
            Set a default description template for new job postings.
          </p>
          <Input
            id="default-description"
            placeholder="e.g., 'Looking for a reliable worker...'"
            value={settings?.defaultJobDescription || ''}
            onChange={(e) => handleSettingChange('defaultJobDescription', e.target.value)}
          />
        </div>

        <Button onClick={handleSaveChanges} disabled={updateSettingsMutation.isPending}>
          {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
}
