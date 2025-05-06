import { useState } from 'react';
import { Link } from 'wouter';
import { Loader2, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationItem } from './NotificationItem';
import { cn } from '@/lib/utils';

interface NotificationListProps {
  limit?: number;
  showAll?: boolean;
  maxHeight?: string;
}

export function NotificationList({ 
  limit = 5, 
  showAll = false,
  maxHeight = '400px'
}: NotificationListProps) {
  const { notifications, unreadCount, isLoading, markAllAsRead } = useNotifications();
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  
  const displayedNotifications = showAll
    ? notifications
    : notifications.slice(0, limit);
  
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || isMarkingAllRead) return;
    
    try {
      setIsMarkingAllRead(true);
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    } finally {
      setIsMarkingAllRead(false);
    }
  };
  
  return (
    <div className="flex flex-col">
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-medium">Notifications</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAllRead}
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
            <span>Mark all as read</span>
          </Button>
        )}
      </div>
      
      <div className={cn(
        "overflow-y-auto",
        maxHeight !== 'none' && `max-h-[${maxHeight}]`
      )}>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary/70" />
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div className="text-center py-10 px-4">
            <p className="text-sm text-muted-foreground mb-4">
              You don't have any notifications.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Find jobs</Link>
            </Button>
          </div>
        ) : (
          displayedNotifications.map((notification) => (
            <NotificationItem 
              key={notification.id} 
              notification={notification} 
            />
          ))
        )}
      </div>
      
      {!showAll && notifications.length > limit && (
        <div className="p-3 border-t">
          <Button variant="ghost" className="w-full" asChild>
            <Link href="/notifications">
              View all notifications
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}