import { useState } from 'react';
import { Link } from 'wouter';
import { formatDistanceToNow } from 'date-fns';
import { Notification } from '@shared/schema';
import { useNotifications } from '@/hooks/use-notifications';
import { 
  BellIcon, 
  CheckIcon, 
  ClockIcon, 
  TrashIcon, 
  XIcon, 
  UserIcon, 
  BriefcaseIcon, 
  FileTextIcon,
  DollarSignIcon,
  StarIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: Notification;
  hideControls?: boolean;
}

export function NotificationItem({ notification, hideControls = false }: NotificationItemProps) {
  const { markAsRead, deleteNotification } = useNotifications();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  
  // Format the notification date
  const formattedDate = notification.createdAt 
    ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
    : '';
  
  // Determine notification icon based on type
  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'job_posted':
        return <BriefcaseIcon className="h-5 w-5 text-blue-500" />;
      case 'job_assigned':
        return <FileTextIcon className="h-5 w-5 text-green-500" />;
      case 'job_completed':
        return <CheckIcon className="h-5 w-5 text-green-600" />;
      case 'application_received':
        return <UserIcon className="h-5 w-5 text-purple-500" />;
      case 'application_accepted':
        return <CheckIcon className="h-5 w-5 text-green-500" />;
      case 'application_rejected':
        return <XIcon className="h-5 w-5 text-red-500" />;
      case 'payment_received':
        return <DollarSignIcon className="h-5 w-5 text-emerald-500" />;
      case 'payment_sent':
        return <DollarSignIcon className="h-5 w-5 text-yellow-500" />;
      case 'review_received':
        return <StarIcon className="h-5 w-5 text-amber-500" />;
      case 'system_message':
      default:
        return <BellIcon className="h-5 w-5 text-slate-500" />;
    }
  };
  
  // Handle marking notification as read
  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.isRead || isMarking) return;
    
    try {
      setIsMarking(true);
      await markAsRead(notification.id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    } finally {
      setIsMarking(false);
    }
  };
  
  // Handle deleting notification
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;
    
    try {
      setIsDeleting(true);
      await deleteNotification(notification.id);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Determine the link destination based on notification type and source
  const getLinkDestination = () => {
    if (!notification.sourceId || !notification.sourceType) return null;
    
    switch (notification.sourceType) {
      case 'job':
        return `/job/${notification.sourceId}`;
      case 'application':
        return `/applications/${notification.sourceId}`;
      case 'review':
        return `/reviews/${notification.sourceId}`;
      case 'payment':
        return `/payments/${notification.sourceId}`;
      default:
        return null;
    }
  };
  
  const linkDestination = getLinkDestination();
  const contentWithLink = linkDestination ? (
    <Link href={linkDestination} className="block">
      <div className="notification-content cursor-pointer">
        {renderContent()}
      </div>
    </Link>
  ) : (
    <div className="notification-content">
      {renderContent()}
    </div>
  );
  
  function renderContent() {
    return (
      <div className={cn(
        "flex items-start p-3 border-b transition-colors",
        !notification.isRead && "bg-muted/20", 
        !hideControls && "hover:bg-muted/30"
      )}>
        <div className="flex-shrink-0 mt-0.5 mr-3">
          {getNotificationIcon()}
        </div>
        
        <div className="flex-grow min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className={cn(
              "text-sm font-medium truncate",
              !notification.isRead && "font-semibold"
            )}>
              {notification.title}
            </h4>
            {!notification.isRead && !hideControls && (
              <div className="ml-1 h-2 w-2 rounded-full bg-primary"></div>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center text-xs text-muted-foreground">
              <ClockIcon className="h-3 w-3 mr-1" />
              <span>{formattedDate}</span>
            </div>
            
            {!hideControls && (
              <div className="flex space-x-1">
                {!notification.isRead && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={handleMarkAsRead}
                    disabled={isMarking}
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                    <span className="sr-only">Mark as read</span>
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-destructive hover:text-destructive" 
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return contentWithLink;
}