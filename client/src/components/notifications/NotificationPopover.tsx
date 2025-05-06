import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { BellIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationList } from './NotificationList';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';

interface NotificationPopoverProps {
  className?: string;
}

export function NotificationPopover({ className }: NotificationPopoverProps) {
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  
  // When unread count increases, show animation
  useEffect(() => {
    if (unreadCount > 0) {
      setHasNewNotifications(true);
      
      // Clear the animation after 3 seconds
      const timeout = setTimeout(() => {
        setHasNewNotifications(false);
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [unreadCount]);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative h-9 w-9", className)}
          onClick={() => setOpen(true)}
        >
          <BellIcon className="h-[1.2rem] w-[1.2rem]" />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white",
              hasNewNotifications && "animate-pulse"
            )}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <NotificationList limit={5} />
      </PopoverContent>
    </Popover>
  );
}