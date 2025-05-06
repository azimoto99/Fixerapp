import { useState } from 'react';
import { NotificationList } from "@/components/notifications/NotificationList";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from 'lucide-react';

export default function NotificationsPage() {
  const { notifications, isLoading } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.isRead;
    if (filter === 'read') return notification.isRead;
    return true;
  });

  return (
    <div className="container max-w-4xl py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Notifications</h1>
        <p className="text-muted-foreground">
          Manage your notifications and stay updated on activities related to your account.
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={(value) => setFilter(value as any)}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="read">Read</TabsTrigger>
          </TabsList>
          
          {!isLoading && (
            <div className="text-sm text-muted-foreground">
              {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <TabsContent value="all" className="mt-0">
          <div className="border rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-20 text-center">
                <h3 className="text-lg font-medium mb-2">No notifications</h3>
                <p className="text-muted-foreground mb-4">
                  You don't have any notifications at the moment.
                </p>
                <Button variant="outline" asChild>
                  <a href="/">Go to home page</a>
                </Button>
              </div>
            ) : (
              <NotificationList 
                showAll={true} 
                maxHeight="none" 
              />
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="unread" className="mt-0">
          <div className="border rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-20 text-center">
                <h3 className="text-lg font-medium mb-2">No unread notifications</h3>
                <p className="text-muted-foreground mb-4">
                  You've read all your notifications.
                </p>
                <Button variant="outline" onClick={() => setFilter('all')}>
                  View all notifications
                </Button>
              </div>
            ) : (
              <NotificationList 
                showAll={true} 
                maxHeight="none" 
              />
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="read" className="mt-0">
          <div className="border rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-20 text-center">
                <h3 className="text-lg font-medium mb-2">No read notifications</h3>
                <p className="text-muted-foreground mb-4">
                  You don't have any previously read notifications.
                </p>
                <Button variant="outline" onClick={() => setFilter('all')}>
                  View all notifications
                </Button>
              </div>
            ) : (
              <NotificationList 
                showAll={true} 
                maxHeight="none" 
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}