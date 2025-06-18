import React from 'react';
import { DbUser } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from 'lucide-react';

interface NotificationsContentProps {
  user: DbUser;
}

export default function NotificationsContent({ user }: NotificationsContentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-500" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">You have no new notifications.</p>
          {/* TODO: Implement fetching and displaying user notifications */}
        </div>
      </CardContent>
    </Card>
  );
} 