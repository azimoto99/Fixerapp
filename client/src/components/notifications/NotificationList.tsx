import { Notification } from "@shared/schema";
import { NotificationItem } from "./NotificationItem";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface NotificationListProps {
  maxHeight?: string;
  compact?: boolean;
}

export function NotificationList({ maxHeight = "400px", compact = false }: NotificationListProps) {
  const { notifications, unreadCount, isLoading, markAllAsRead } = useNotifications();
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const { toast } = useToast();

  // Handle marking all as read with loading state
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    setIsMarkingAll(true);
    try {
      await markAllAsRead();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">Loading notifications...</p>
      </div>
    );
  }

  // Render empty state
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <p className="text-sm text-muted-foreground mb-2">No notifications yet</p>
        <p className="text-xs text-muted-foreground text-center">
          Notifications will appear here when you have new job opportunities or updates.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with mark all as read button */}
      <div className="flex justify-between items-center px-4 py-2 border-b">
        <div>
          <h3 className="font-medium">Notifications</h3>
          <p className="text-xs text-muted-foreground">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
            className="text-xs h-8"
          >
            {isMarkingAll ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5 mr-1" />
            )}
            Mark all as read
          </Button>
        )}
      </div>
      
      {/* Notification list with scroll area */}
      <ScrollArea className={`w-full overflow-y-auto ${maxHeight ? `max-h-[${maxHeight}]` : ''}`}>
        <div className={compact ? "p-2" : "p-4"}>
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}