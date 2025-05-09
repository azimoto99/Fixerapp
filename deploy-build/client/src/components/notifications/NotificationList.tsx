import { useState } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationItem } from './NotificationItem';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BellIcon, CheckCircleIcon, Loader2 } from 'lucide-react';

interface NotificationListProps {
  limit?: number;
  showAll?: boolean;
  maxHeight?: string;
}

export function NotificationList({ 
  limit = 5, 
  showAll = false,
  maxHeight = "300px" 
}: NotificationListProps) {
  const { notifications, unreadCount, isLoading, markAllAsRead } = useNotifications();
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  
  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    if (isMarkingAll || unreadCount === 0) return;
    
    try {
      setIsMarkingAll(true);
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    } finally {
      setIsMarkingAll(false);
    }
  };
  
  // Calculate the number of notifications to display
  const displayLimit = showAll ? notifications.length : limit;
  const displayedNotifications = notifications.slice(0, displayLimit);
  const hasMore = notifications.length > displayLimit;
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">Loading notifications...</p>
      </div>
    );
  }
  
  // Empty state
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <div className="bg-muted rounded-full p-3 mb-3">
          <BellIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">No notifications</h3>
        <p className="text-sm text-muted-foreground">
          You don't have any notifications yet.
        </p>
      </div>
    );
  }
  
  return (
    <div className="notification-list w-full">
      {/* Header with action buttons */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium">Notifications</h3>
          {unreadCount > 0 && (
            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-[10px] text-primary-foreground font-semibold">
              {unreadCount}
            </div>
          )}
        </div>
        {unreadCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-xs"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
          >
            {isMarkingAll ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <CheckCircleIcon className="h-3 w-3 mr-1" />
            )}
            Mark all as read
          </Button>
        )}
      </div>
      
      {/* Notification list */}
      <ScrollArea className="w-full" style={{ maxHeight: maxHeight !== "none" ? maxHeight : 'auto' }}>
        <div className="divide-y">
          {displayedNotifications.map((notification) => (
            <NotificationItem 
              key={notification.id} 
              notification={notification}
              hideControls={!showAll}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}