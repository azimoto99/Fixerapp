import { Notification } from "@shared/schema";
import { 
  Bell, 
  Calendar, 
  Check, 
  Briefcase, 
  UserCheck, 
  MessageCircle, 
  Star,
  Trash2,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { useNavigate } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/use-notifications";

interface NotificationItemProps {
  notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const { markAsRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();

  // Function to handle clicking on a notification
  const handleClick = () => {
    // If there's a link, navigate to that page
    if (notification.sourceType === 'job' && notification.sourceId) {
      navigate(`/job/${notification.sourceId}`);
    }
    
    // Mark notification as read
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
  };

  // Format the time to be displayed
  const formattedTime = useMemo(() => {
    if (!notification.createdAt) return '';
    const date = new Date(notification.createdAt);
    return formatDistanceToNow(date, { addSuffix: true });
  }, [notification.createdAt]);

  // Get appropriate icon based on notification type
  const Icon = useMemo(() => {
    switch (notification.type) {
      case 'job_posted':
        return Briefcase;
      case 'application_received':
        return UserCheck;
      case 'job_completed':
        return Check;
      case 'payment_processed':
        return Calendar;
      case 'review_received':
        return Star;
      case 'message_received':
        return MessageCircle;
      default:
        return Bell;
    }
  }, [notification.type]);

  return (
    <div 
      className={cn(
        "p-4 mb-2 rounded-lg border transition-colors",
        notification.isRead ? "bg-background" : "bg-muted border-primary/20"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-full",
          notification.isRead ? "text-muted-foreground bg-muted" : "text-primary bg-primary/10"
        )}>
          <Icon className="h-5 w-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h4 className="font-medium text-sm mb-1">{notification.title}</h4>
            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
              {formattedTime}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {notification.message}
          </p>
          
          <div className="flex gap-2 mt-2">
            {notification.sourceType === 'job' && notification.sourceId && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-2 text-xs"
                onClick={handleClick}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                View Job
              </Button>
            )}
            
            {!notification.isRead && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-xs"
                onClick={() => markAsRead(notification.id)}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Mark as Read
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs text-destructive hover:text-destructive"
              onClick={() => deleteNotification(notification.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}