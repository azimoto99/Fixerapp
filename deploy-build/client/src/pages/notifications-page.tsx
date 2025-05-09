import { useState } from 'react';
import { Filter } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationList, NotificationItem } from '@/components/notifications';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
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
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Notifications</h1>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                <span>{getFilterLabel(activeFilter)}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem 
                  onClick={() => setActiveFilter('all')}
                  className={activeFilter === 'all' ? 'bg-muted' : ''}
                >
                  {getFilterLabel('all')}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setActiveFilter('unread')}
                  className={activeFilter === 'unread' ? 'bg-muted' : ''}
                >
                  {getFilterLabel('unread')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setActiveFilter('job')}
                  className={activeFilter === 'job' ? 'bg-muted' : ''}
                >
                  {getFilterLabel('job')}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setActiveFilter('application')}
                  className={activeFilter === 'application' ? 'bg-muted' : ''}
                >
                  {getFilterLabel('application')}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setActiveFilter('payment')}
                  className={activeFilter === 'payment' ? 'bg-muted' : ''}
                >
                  {getFilterLabel('payment')}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setActiveFilter('review')}
                  className={activeFilter === 'review' ? 'bg-muted' : ''}
                >
                  {getFilterLabel('review')}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setActiveFilter('system')}
                  className={activeFilter === 'system' ? 'bg-muted' : ''}
                >
                  {getFilterLabel('system')}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="bg-card rounded-lg border shadow-sm">
          {/* Custom list to handle the filtered notifications */}
          <div className="divide-y">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12 px-4">
                <h3 className="text-lg font-medium mb-2">No notifications</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {activeFilter !== 'all' 
                    ? `You don't have any ${activeFilter} notifications.`
                    : "You don't have any notifications yet."}
                </p>
                <Button 
                  variant="outline"
                  onClick={() => setActiveFilter('all')}
                  className={activeFilter === 'all' ? 'hidden' : ''}
                >
                  View all notifications
                </Button>
              </div>
            ) : (
              filteredNotifications.map(notification => (
                <div key={notification.id} className="notification-item">
                  <NotificationItem 
                    notification={notification} 
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}