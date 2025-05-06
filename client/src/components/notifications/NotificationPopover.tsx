import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { NotificationList } from "./NotificationList";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export function NotificationPopover() {
  const { unreadCount } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span 
              className={cn(
                "absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground",
                unreadCount > 9 && "w-5" // Make the badge wider when there are double-digit notifications
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[350px] p-0 md:w-[400px]" 
        align="end"
        sideOffset={5}
      >
        <NotificationList compact={true} maxHeight="400px" />
        <div className="border-t p-2 flex justify-center">
          <Link to="/notifications" className="text-xs text-primary hover:underline">
            See all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}