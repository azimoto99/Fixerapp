import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { CheckCheck, Trash2, MapPin, BriefcaseBusiness, Bell, Mail, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Notification } from '@shared/schema';
import { useNotifications } from '@/hooks/use-notifications';
import { useLocation } from 'wouter';

interface NotificationItemProps {
  notification: Notification;
  hideControls?: boolean;
}

export function NotificationItem({ notification, hideControls = false }: NotificationItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const { markAsRead, deleteNotification } = useNotifications();
  const [_, navigate] = useLocation();

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'job_nearby':
        return <MapPin className="h-4 w-4 text-emerald-500" />;
      case 'job_application':
        return <BriefcaseBusiness className="h-4 w-4 text-blue-500" />;
      case 'message':
        return <Mail className="h-4 w-4 text-indigo-500" />;
      case 'alert':
        return <Bell className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleMarkAsRead = async () => {
    try {
      setIsMarkingRead(true);
      await markAsRead(notification.id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteNotification(notification.id);
    } catch (error) {
      console.error('Error deleting notification:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClick = () => {
    // If the notification has a sourceId and sourceType, navigate to the source
    if (notification.sourceId && notification.sourceType) {
      switch (notification.sourceType) {
        case 'job':
          navigate(`/job/${notification.sourceId}`);
          break;
        case 'application':
          navigate(`/applications/${notification.sourceId}`);
          break;
        // Add more source types as needed
        default:
          break;
      }
    }

    // If the notification is not read, mark it as read
    if (!notification.isRead) {
      handleMarkAsRead();
    }
  };

  // Format the notification date
  const formattedDate = notification.createdAt ? 
    formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }) : 
    'Unknown date';

  return (
    <div 
      className={cn(
        "flex justify-between p-4 cursor-pointer hover:bg-muted/40 transition-colors group relative",
        !notification.isRead && "bg-muted/20 border-l-4 border-primary"
      )}
      onClick={handleClick}
    >
      <div className="flex gap-3 items-start">
        <div className="mt-0.5">
          {getNotificationIcon()}
        </div>
        <div className="space-y-1">
          <div className="font-medium">{notification.title}</div>
          <div className="text-sm text-muted-foreground">{notification.message}</div>
          <div className="text-xs text-muted-foreground/80 flex items-center gap-1">
            {formattedDate}
            
            {notification.sourceId && notification.sourceType && (
              <button 
                className="ml-1 inline-flex items-center text-xs text-primary hover:underline" 
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3 ml-1" />
                View details
              </button>
            )}
          </div>
        </div>
      </div>
      
      {!hideControls && (
        <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.isRead && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                handleMarkAsRead();
              }}
              disabled={isMarkingRead}
            >
              <CheckCheck className="h-4 w-4 text-primary" />
              <span className="sr-only">Mark as read</span>
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      )}
    </div>
  );
}