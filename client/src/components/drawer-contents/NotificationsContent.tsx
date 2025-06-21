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
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4">Notifications</h3>
          
          <div className="text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No notifications yet</p>
            <p className="text-xs mt-2">You'll see job updates, messages, and system notifications here</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 