import { useState } from 'react';
import { 
  BellOff,
  BellPlus, 
  Bell, 
  CalendarClock, 
  Filter, 
  CheckCheck, 
  Trash2 
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationList } from '@/components/notifications';
import { useNotifications } from '@/hooks/use-notifications';

export default function NotificationsPage() {
  const [filter, setFilter] = useState<string>('all');
  const { markAllAsRead, unreadCount, notifications } = useNotifications();

  // Count notifications by type
  const notificationCounts = {
    all: notifications.length,
    unread: unreadCount,
    job: notifications.filter(n => n.type === 'job_nearby' || n.type === 'job_application').length,
    message: notifications.filter(n => n.type === 'message').length,
    alert: notifications.filter(n => n.type === 'alert').length
  };

  const getEmptyState = () => {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <BellOff className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">No notifications</h3>
        <p className="text-muted-foreground mt-1 max-w-sm">
          You don't have any notifications in this category yet. They'll appear here when you receive them.
        </p>
      </div>
    );
  };

  return (
    <div className="container max-w-4xl py-6 md:py-10 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0 
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'All caught up! No unread notifications'}
          </p>
        </div>
        
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              className="h-9"
              onClick={() => markAllAsRead()}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Your notifications</CardTitle>
            <div className="flex items-center gap-2">
              <Select 
                value={filter} 
                onValueChange={setFilter}
              >
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All notifications</SelectItem>
                  <SelectItem value="unread">Unread only</SelectItem>
                  <SelectItem value="read">Read only</SelectItem>
                  <SelectItem value="recent">Last 7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <CardDescription>Manage and view all your notifications in one place</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="all" className="w-full">
            <div className="border-b px-4">
              <TabsList className="mb-0 bg-transparent h-11">
                <TabsTrigger value="all" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  <Bell className="h-4 w-4 mr-2" />
                  All
                  {notificationCounts.all > 0 && (
                    <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                      {notificationCounts.all}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="job" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  <BellPlus className="h-4 w-4 mr-2" />
                  Jobs
                  {notificationCounts.job > 0 && (
                    <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                      {notificationCounts.job}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="message" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  <BellPlus className="h-4 w-4 mr-2" />
                  Messages
                  {notificationCounts.message > 0 && (
                    <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                      {notificationCounts.message}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="alert" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  <CalendarClock className="h-4 w-4 mr-2" />
                  Alerts
                  {notificationCounts.alert > 0 && (
                    <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                      {notificationCounts.alert}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all">
              {notificationCounts.all === 0 ? (
                getEmptyState()
              ) : (
                <NotificationList showAll={true} />
              )}
            </TabsContent>

            <TabsContent value="job">
              {notificationCounts.job === 0 ? (
                getEmptyState()
              ) : (
                <div className="divide-y">
                  {notifications
                    .filter(n => n.type === 'job_nearby' || n.type === 'job_application')
                    .map(notification => (
                      <div key={notification.id} className="py-4 px-4">
                        <NotificationList showAll={true} />
                      </div>
                    ))
                  }
                </div>
              )}
            </TabsContent>

            <TabsContent value="message">
              {notificationCounts.message === 0 ? (
                getEmptyState()
              ) : (
                <div className="divide-y">
                  {notifications
                    .filter(n => n.type === 'message')
                    .map(notification => (
                      <div key={notification.id} className="py-4 px-4">
                        <NotificationList showAll={true} />
                      </div>
                    ))
                  }
                </div>
              )}
            </TabsContent>

            <TabsContent value="alert">
              {notificationCounts.alert === 0 ? (
                getEmptyState()
              ) : (
                <div className="divide-y">
                  {notifications
                    .filter(n => n.type === 'alert')
                    .map(notification => (
                      <div key={notification.id} className="py-4 px-4">
                        <NotificationList showAll={true} />
                      </div>
                    ))
                  }
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}