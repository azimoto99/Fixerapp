import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Check, MapPin, Clock, Trash2, AlertCircle, Bell } from 'lucide-react';
import { Notification } from '@shared/schema';
import { useNotifications } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const getIcon = (type: string) => {
  switch (type) {
    case 'job_nearby':
      return <MapPin className="h-4 w-4" />;
    case 'reminder':
      return <Clock className="h-4 w-4" />;
    case 'alert':
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

interface NotificationItemProps {
  notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const { markAsRead, deleteNotification } = useNotifications();
  
  const handleMarkAsRead = async () => {
    if (notification.isRead || isMarkingRead) return;
    
    try {
      setIsMarkingRead(true);
      await markAsRead(notification.id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    } finally {
      setIsMarkingRead(false);
    }
  };
  
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
  
  const formattedDate = notification.createdAt 
    ? new Date(notification.createdAt)
    : new Date();
  
  const timeAgo = formatDistanceToNow(formattedDate, { addSuffix: true });
  const fullDate = format(formattedDate, 'PPP p');
  
  return (
    <div
      className={cn(
        "flex items-start p-4 border-b transition-colors relative group",
        notification.isRead ? 'bg-background' : 'bg-muted/30',
        !notification.isRead && 'hover:bg-muted/50',
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={handleMarkAsRead}
    >
      <div className={cn(
        "flex-shrink-0 rounded-full p-2 mr-3",
        notification.isRead ? 'bg-muted' : 'bg-primary/10'
      )}>
        {getIcon(notification.type)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className={cn(
            "text-sm font-medium",
            !notification.isRead && "font-semibold"
          )}>
            {notification.title}
          </p>
          
          <div className="flex items-center gap-2">
            {!notification.isRead && (
              <div className="h-2 w-2 rounded-full bg-primary"></div>
            )}
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{fullDate}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
        
        {(isHovering || isDeleting) && (
          <div className="flex items-center justify-end gap-2 mt-2">
            {!notification.isRead && (
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 text-xs"
                onClick={handleMarkAsRead}
                disabled={isMarkingRead}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                <span>Mark as read</span>
              </Button>
            )}
            
            <Button 
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}