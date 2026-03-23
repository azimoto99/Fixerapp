import { useState } from 'react';
import { Filter } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationItem } from '@/components/notifications';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NotificationFilter = 'all' | 'unread' | 'job' | 'payment' | 'review' | 'application' | 'system';

export default function NotificationsPage() {
  const { notifications, unreadCount } = useNotifications();
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  
  // Filter notifications based on the selected filter
  const filteredNotifications = notifications.filter(notification => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return !notification.isRead;
    
    // Filter by notification source type
    if (activeFilter === 'job') {
      return notification.sourceType === 'job' || 
             notification.type.includes('job_');
    }
    if (activeFilter === 'payment') {
      return notification.sourceType === 'payment' || 
             notification.type.includes('payment_');
    }
    if (activeFilter === 'review') {
      return notification.sourceType === 'review' || 
             notification.type.includes('review_');
    }
    if (activeFilter === 'application') {
      return notification.sourceType === 'application' || 
             notification.type.includes('application_');
    }
    if (activeFilter === 'system') {
      return notification.type === 'system_message';
    }
    
    return true;
  });
  
  // Get filter label with count
  const getFilterLabel = (filter: NotificationFilter) => {
    const count = filter === 'unread' 
      ? unreadCount 
      : notifications.filter(n => {
          if (filter === 'job') return n.sourceType === 'job' || n.type.includes('job_');
          if (filter === 'payment') return n.sourceType === 'payment' || n.type.includes('payment_');
          if (filter === 'review') return n.sourceType === 'review' || n.type.includes('review_');
          if (filter === 'application') return n.sourceType === 'application' || n.type.includes('application_');
          if (filter === 'system') return n.type === 'system_message';
          return false;
        }).length;
      
    const labels: Record<NotificationFilter, string> = {
      all: 'All',
      unread: 'Unread',
      job: 'Jobs',
      payment: 'Payments',
      review: 'Reviews',
      application: 'Applications',
      system: 'System'
    };
    
    return `${labels[filter]}${count > 0 ? ` (${count})` : ''}`;
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="page-shell panel-stack max-w-5xl">
        <Card className="surface-strong">
          <CardHeader className="page-header">
            <div>
              <Badge variant="outline" className="w-fit bg-background/70">
                Notification center
              </Badge>
              <CardTitle className="mt-3 text-3xl">Everything that needs your attention.</CardTitle>
              <CardDescription className="mt-2">
                Filter by type and move through updates without losing context.
              </CardDescription>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" />
                  <span>{getFilterLabel(activeFilter)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setActiveFilter('all')}>{getFilterLabel('all')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveFilter('unread')}>{getFilterLabel('unread')}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveFilter('job')}>{getFilterLabel('job')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveFilter('application')}>
                    {getFilterLabel('application')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveFilter('payment')}>
                    {getFilterLabel('payment')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveFilter('review')}>
                    {getFilterLabel('review')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveFilter('system')}>
                    {getFilterLabel('system')}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
        </Card>

        <Card className="surface-panel overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y divide-border/70">
              {filteredNotifications.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <h3 className="font-['Sora'] text-xl font-semibold tracking-tight text-foreground">No notifications yet</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    {activeFilter !== 'all'
                      ? `You do not have any ${activeFilter} notifications right now.`
                      : 'You are all caught up. New activity will appear here as jobs, payments, or messages change.'}
                  </p>
                  {activeFilter !== 'all' ? (
                    <Button variant="outline" className="mt-5" onClick={() => setActiveFilter('all')}>
                      View all notifications
                    </Button>
                  ) : null}
                </div>
              ) : (
                filteredNotifications.map((notification) => (
                  <div key={notification.id} className="notification-item">
                    <NotificationItem notification={notification} />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
