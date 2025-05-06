import { useState } from 'react';
import { Loader2, Bell, CheckCheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { NotificationItem } from './NotificationItem';
import { useNotifications } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';

interface NotificationListProps {
  maxHeight?: string;
  hideControls?: boolean;
  limit?: number;
  showAll?: boolean;
}

export function NotificationList({ 
  maxHeight = '400px', 
  hideControls = false, 
  limit = 5,
  showAll = false
}: NotificationListProps) {
  const { notifications, isLoading, unreadCount, markAllAsRead } = useNotifications();
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // Limit the number of notifications shown based on the limit prop
  const displayedNotifications = showAll 
    ? notifications 
    : notifications.slice(0, limit);

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    try {
      setMarkingAllRead(true);
      await markAllAsRead();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Bell className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">
        All caught up! You have no new notifications.
      </p>
    </div>
  );

  const LoadingState = () => (
    <div className="flex justify-center items-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="flex flex-col">
      {/* Controls */}
      {!hideControls && unreadCount > 0 && (
        <>
          <div className="p-3 flex justify-between items-center">
            <span className="text-sm font-medium">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-8"
              onClick={handleMarkAllAsRead}
              disabled={markingAllRead || unreadCount === 0}
            >
              {markingAllRead ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <CheckCheckIcon className="h-3.5 w-3.5 mr-1" />
              )}
              Mark all as read
            </Button>
          </div>
          <Separator />
        </>
      )}

      {/* Notification List */}
      <div 
        className={cn(
          "overflow-y-auto",
          maxHeight && `max-h-[${maxHeight}]`
        )}
        style={{ maxHeight }}  // Style prop as backup since template literals in className don't always work
      >
        {isLoading ? (
          <LoadingState />
        ) : displayedNotifications.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y">
            {displayedNotifications.map((notification) => (
              <NotificationItem 
                key={notification.id} 
                notification={notification}
                hideControls={hideControls}
              />
            ))}
          </div>
        )}
      </div>

      {/* "See all notifications" link if we're showing a limited number */}
      {!showAll && notifications.length > limit && (
        <div className="px-3 py-2 border-t">
          <Button 
            variant="link" 
            size="sm" 
            className="w-full justify-center text-sm"
            asChild
          >
            <a href="/notifications">
              See all notifications
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}